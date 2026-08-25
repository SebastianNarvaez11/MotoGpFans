import "server-only";
import type { Prisma } from "@prisma/client";
import { mapWithConcurrency } from "@/lib/concurrency";
import { motogpApi } from "@/lib/motogp/client";
import { sessionKey } from "@/lib/motogp/schemas";
import { prisma } from "@/lib/prisma";
import {
  SUPPORTED_CATEGORIES,
  isGrandPrix,
  isSportSession,
  mapBroadcast,
  mapEvent,
  mapRider,
} from "./mappers";

/**
 * Sincronización de la fuente hacia nuestra base de datos.
 *
 * Todas las operaciones son **upserts sobre claves naturales**, así que la
 * ingesta es idempotente: ejecutarla dos veces seguidas deja exactamente el
 * mismo estado. Cada evento se escribe dentro de una transacción junto con sus
 * sesiones, de modo que nunca queda un GP a medias; se evita a propósito una
 * única transacción gigante para toda la temporada, que sería lenta y frágil.
 */

export type SyncResult = { read: number; upserted: number };

/** Índice acrónimo → id de categoría, para resolver las relaciones. */
async function categoryIdByAcronym(): Promise<Map<string, string>> {
  const rows = await prisma.category.findMany({
    select: { id: true, acronym: true },
  });
  return new Map(rows.map((c) => [c.acronym, c.id]));
}

/**
 * Alinea las temporadas con `/results/seasons`, que es el único sitio donde
 * aparece el UUID que necesitan las consultas de resultados y clasificaciones.
 */
export async function syncSeasons(): Promise<SyncResult> {
  const seasons = await motogpApi.seasons();
  // Solo las temporadas que la aplicación puede llegar a mostrar.
  const relevant = seasons.filter((s) => s.year >= 2024);

  for (const season of relevant) {
    await prisma.season.upsert({
      where: { year: season.year },
      update: { resultsUuid: season.id, current: season.current },
      create: {
        year: season.year,
        current: season.current,
        resultsUuid: season.id,
      },
    });
  }

  return { read: seasons.length, upserted: relevant.length };
}

/**
 * Sincroniza el calendario: temporada, categorías, Grandes Premios y todas sus
 * sesiones. Es la ingesta que sostiene la función principal del producto.
 */
export async function syncCalendar(year: number): Promise<SyncResult> {
  const events = await motogpApi.events(year);
  const grandsPrix = events.filter(isGrandPrix);

  if (grandsPrix.length === 0) {
    throw new Error(
      `La fuente no devolvió ningún Gran Premio para ${year}: se aborta para no vaciar el calendario.`,
    );
  }

  // La temporada se identifica por año; el UUID del calendario es otra columna
  // puente distinta de la del API de resultados.
  const first = grandsPrix[0]!;
  const season = await prisma.season.upsert({
    where: { year },
    update: { broadcastUuid: first.season.id },
    create: {
      year,
      broadcastUuid: first.season.id,
      current: first.season.current ?? false,
    },
  });

  // Las categorías se siembran, pero se refrescan aquí para que el sistema se
  // recupere solo si la BD se creó sin seed.
  for (const event of grandsPrix) {
    for (const category of event.categories ?? []) {
      if (!SUPPORTED_CATEGORIES.has(category.acronym)) continue;
      await prisma.category.upsert({
        where: { acronym: category.acronym },
        update: { broadcastUuid: category.id, name: category.name },
        create: {
          acronym: category.acronym,
          name: category.name,
          priority: category.priority ?? 0,
          broadcastUuid: category.id,
        },
      });
    }
  }

  const categories = await categoryIdByAcronym();
  let upserted = 0;

  for (const event of grandsPrix) {
    const row = mapEvent(event);
    const sessions = (event.broadcasts ?? [])
      .filter(isSportSession)
      .map(mapBroadcast);

    // Un GP y sus sesiones entran juntos o no entran.
    await prisma.$transaction(async (tx) => {
      const saved = await tx.event.upsert({
        where: {
          seasonId_shortname: {
            seasonId: season.id,
            shortname: row.shortname,
          },
        },
        update: { ...row, seasonId: season.id },
        create: { ...row, seasonId: season.id },
      });

      for (const session of sessions) {
        const categoryId = categories.get(session.categoryAcronym);
        if (!categoryId) continue;

        const { categoryAcronym: _ignored, ...data } = session;
        await tx.session.upsert({
          where: { broadcastUuid: data.broadcastUuid },
          update: { ...data, eventId: saved.id, categoryId },
          create: { ...data, eventId: saved.id, categoryId },
        });
      }
    });

    upserted += 1 + sessions.length;
  }

  return { read: events.length, upserted };
}

/** Sincroniza los pilotos y su multimedia oficial. */
export async function syncRiders(): Promise<SyncResult> {
  const riders = await motogpApi.riders();
  const categories = await categoryIdByAcronym();

  // El API de pilotos nombra la categoría ("MotoGP"), no su acrónimo.
  const byName = new Map<string, string>([
    ["MotoGP", categories.get("MGP") ?? ""],
    ["Moto2", categories.get("MT2") ?? ""],
    ["Moto3", categories.get("MT3") ?? ""],
  ]);

  let upserted = 0;

  for (const rider of riders) {
    const { categoryName, ...row } = mapRider(rider);
    const categoryId = categoryName ? byName.get(categoryName) || null : null;

    await prisma.rider.upsert({
      where: { ridersApiUuid: row.ridersApiUuid },
      update: { ...row, categoryId },
      create: { ...row, categoryId },
    });
    upserted++;
  }

  return { read: riders.length, upserted };
}

/**
 * Encuentra o crea el piloto al que apunta una fila de resultados.
 *
 * El API de resultados usa un identificador propio y expone `riders_api_uuid`
 * como puente hacia el catálogo con fotos. Si un piloto aparece en resultados
 * antes de estar en el catálogo, se crea un registro mínimo para no perder el
 * resultado; la siguiente pasada de `syncRiders` lo completará.
 */
async function resolveRiderId(entry: {
  id: string;
  full_name: string;
  number?: number | null;
  riders_api_uuid?: string | null;
  country?: { iso: string; name?: string | null } | null;
}): Promise<string | null> {
  const bridge = entry.riders_api_uuid;

  if (bridge) {
    const existing = await prisma.rider.findUnique({
      where: { ridersApiUuid: bridge },
      select: { id: true },
    });
    if (existing) {
      await prisma.rider.update({
        where: { id: existing.id },
        data: { resultsRiderUuid: entry.id },
      });
      return existing.id;
    }
  }

  const byResultsId = await prisma.rider.findUnique({
    where: { resultsRiderUuid: entry.id },
    select: { id: true },
  });
  if (byResultsId) return byResultsId.id;

  if (!bridge) return null;

  const [firstName = "", ...rest] = entry.full_name.trim().split(" ");
  const created = await prisma.rider.create({
    data: {
      ridersApiUuid: bridge,
      resultsRiderUuid: entry.id,
      firstName,
      lastName: rest.join(" "),
      fullName: entry.full_name.trim(),
      number: entry.number ?? null,
      countryIso: entry.country?.iso?.toUpperCase() ?? "XX",
      countryName: entry.country?.name ?? null,
    },
    select: { id: true },
  });
  return created.id;
}

/**
 * ¿Ha terminado alguna sesión puntuable desde la última ingesta correcta?
 *
 * La clasificación del campeonato solo se mueve cuando acaba una carrera o un
 * sprint. Comprobarlo contra nuestra propia base de datos cuesta una consulta y
 * evita descargar tres clasificaciones completas en las semanas sin carrera
 * —que son la mayoría del año: 22 Grandes Premios reparten 52 fines de semana.
 */
export async function hasNewScoringSession(year: number): Promise<boolean> {
  const lastRun = await prisma.ingestRun.findFirst({
    where: { task: "standings", status: "SUCCESS" },
    orderBy: { startedAt: "desc" },
    select: { startedAt: true },
  });

  // Sin ingesta previa hay que sincronizar sí o sí.
  if (!lastRun) return true;

  const finished = await prisma.session.count({
    where: {
      shortname: { in: ["SPR", "RAC"] },
      event: { season: { year } },
      // Terminó después de la última sincronización y ya pasó.
      startsAt: { gt: lastRun.startedAt, lte: new Date() },
    },
  });

  return finished > 0;
}

/** Sincroniza la clasificación del campeonato de pilotos de las tres clases. */
export async function syncStandings(year: number): Promise<SyncResult> {
  const season = await prisma.season.findUnique({ where: { year } });
  if (!season?.resultsUuid) {
    throw new Error(
      `La temporada ${year} no tiene resultsUuid: ejecuta syncSeasons antes.`,
    );
  }

  const categories = await prisma.category.findMany({
    where: { acronym: { in: [...SUPPORTED_CATEGORIES] } },
  });

  let read = 0;
  let upserted = 0;

  for (const category of categories) {
    if (!category.resultsUuid) continue;

    const { classification } = await motogpApi.standings(
      season.resultsUuid,
      category.resultsUuid,
    );
    read += classification.length;

    for (const entry of classification) {
      const riderId = await resolveRiderId(entry.rider);
      if (!riderId) continue;

      const data = {
        position: entry.position,
        points: entry.points,
        teamName: entry.team?.name ?? null,
        constructorName: entry.constructor?.name ?? null,
        raceWins: entry.race_wins ?? 0,
        podiums: entry.podiums ?? 0,
        sprintWins: entry.sprint_wins ?? 0,
        sprintPodiums: entry.sprint_podiums ?? 0,
        positionChange: entry.position_change ?? 0,
      };

      await prisma.standingEntry.upsert({
        where: {
          seasonId_categoryId_riderId: {
            seasonId: season.id,
            categoryId: category.id,
            riderId,
          },
        },
        update: data,
        create: {
          ...data,
          seasonId: season.id,
          categoryId: category.id,
          riderId,
        },
      });
      upserted++;
    }
  }

  return { read, upserted };
}

/** Ventana en la que un resultado ya guardado puede aún corregirse (sanciones). */
const RESULTS_REFRESH_WINDOW_MS = 48 * 60 * 60 * 1000;

/** Cuántas clasificaciones se descargan a la vez. */
const CLASSIFICATION_CONCURRENCY = 6;

export type SyncResultsOptions = {
  /**
   * Cuántos Grandes Premios sincronizar, del más reciente hacia atrás.
   * Por defecto uno: el último corrido.
   */
  maxEvents?: number;
  /** Reingerir aunque ya haya resultados guardados. */
  force?: boolean;
};

/**
 * Sincroniza los resultados del último Gran Premio corrido.
 *
 * Decisión de producto: **no se rellena el histórico de la temporada**. Cada
 * ejecución mira solo el GP más reciente, de modo que la base se va llenando
 * carrera a carrera a medida que se disputan. Así una ejecución hace unas pocas
 * decenas de peticiones en lugar de casi trescientas, y entra de sobra en el
 * límite de duración del entorno serverless.
 *
 * Sigue siendo idempotente: si el último GP ya está guardado y pasaron más de
 * 48 h (la ventana en la que aún pueden llegar sanciones), no se descarga nada.
 *
 * Consecuencia asumida: si el sitio estuviera caído justo cuando se corre un GP
 * y para la siguiente ejecución ya hubiera otro más reciente, ese GP se quedaría
 * sin resultados. Se puede recuperar a mano con `?maxEvents=N` o `?force=true`.
 */
export async function syncResults(
  year: number,
  options: SyncResultsOptions = {},
): Promise<SyncResult> {
  const { maxEvents = 1, force = false } = options;

  const season = await prisma.season.findUnique({ where: { year } });
  if (!season?.resultsUuid) {
    throw new Error(
      `La temporada ${year} no tiene resultsUuid: ejecuta syncSeasons antes.`,
    );
  }

  const finished = await motogpApi.finishedEvents(season.resultsUuid);
  const categories = await prisma.category.findMany({
    where: { acronym: { in: [...SUPPORTED_CATEGORIES] } },
  });

  // Se emparejan los eventos de la fuente con los nuestros y se ordenan del más
  // reciente al más antiguo: el orden que devuelve la API no está garantizado.
  const candidates: { remoteId: string; eventId: string; startsAt: Date }[] =
    [];

  for (const remoteEvent of finished) {
    if (remoteEvent.test) continue;
    const event = await prisma.event.findUnique({
      where: {
        seasonId_shortname: {
          seasonId: season.id,
          shortname: remoteEvent.short_name.toUpperCase(),
        },
      },
      select: { id: true, startsAt: true },
    });
    if (!event) continue;
    candidates.push({
      remoteId: remoteEvent.id,
      eventId: event.id,
      startsAt: event.startsAt,
    });
  }

  candidates.sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
  const targets = candidates.slice(0, Math.max(1, maxEvents));

  const now = Date.now();
  let read = 0;
  let upserted = 0;

  for (const target of targets) {
    // Qué sesiones necesitan trabajo: se resuelve contra nuestra base de datos,
    // sin gastar ni una petición a la fuente.
    const sessions = await prisma.session.findMany({
      where: {
        eventId: target.eventId,
        type: "SESSION",
        startsAt: { lte: new Date(now) },
      },
      select: {
        id: true,
        shortname: true,
        categoryId: true,
        startsAt: true,
        _count: { select: { results: true } },
      },
    });

    const pending = sessions.filter((s) => {
      if (force) return true;
      if (s._count.results === 0) return true;
      // Recién corrida: aún puede corregirse por sanciones.
      return now - s.startsAt.getTime() < RESULTS_REFRESH_WINDOW_MS;
    });

    if (pending.length === 0) continue;

    await prisma.event.update({
      where: { id: target.eventId },
      data: { resultsUuid: target.remoteId, hasResults: true },
    });

    const pendingByKey = new Map(
      pending.map((s) => [`${s.categoryId}:${s.shortname}`, s]),
    );

    for (const category of categories) {
      if (!category.resultsUuid) continue;
      const needsCategory = pending.some((s) => s.categoryId === category.id);
      if (!needsCategory) continue;

      const remoteSessions = await motogpApi.resultsSessions(
        target.remoteId,
        category.resultsUuid,
      );

      const toFetch = remoteSessions.flatMap((remote) => {
        const shortname = sessionKey(remote.type, remote.number);
        const session = pendingByKey.get(`${category.id}:${shortname}`);
        return session ? [{ remote, session }] : [];
      });

      const fetched = await mapWithConcurrency(
        toFetch,
        CLASSIFICATION_CONCURRENCY,
        async ({ remote, session }) => ({
          session,
          remoteId: remote.id,
          classification: (await motogpApi.classification(remote.id))
            .classification,
        }),
      );

      for (const { session, remoteId, classification } of fetched) {
        read += classification.length;

        const rows: Prisma.SessionResultCreateManyInput[] = [];
        for (const entry of classification) {
          const riderId = await resolveRiderId(entry.rider);
          if (!riderId) continue;
          rows.push({
            sessionId: session.id,
            riderId,
            position: entry.position ?? null,
            points: entry.points ?? 0,
            teamName: entry.team?.name ?? null,
            constructorName: entry.constructor?.name ?? null,
            time: entry.time ?? null,
            gapToFirst: entry.gap?.first ?? null,
            totalLaps: entry.total_laps ?? null,
            averageSpeed: entry.average_speed ?? null,
            status: entry.status ?? null,
          });
        }

        // La clasificación se reemplaza entera: si la fuente corrige posiciones
        // tras una sanción, no deben quedar restos de la versión anterior.
        await prisma.$transaction([
          prisma.sessionResult.deleteMany({ where: { sessionId: session.id } }),
          prisma.sessionResult.createMany({ data: rows }),
          prisma.session.update({
            where: { id: session.id },
            data: { resultsUuid: remoteId },
          }),
        ]);

        upserted += rows.length;
      }
    }
  }

  return { read, upserted };
}
