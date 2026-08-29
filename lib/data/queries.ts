import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Consultas de lectura para las pantallas.
 *
 * Se seleccionan siempre los campos concretos que la interfaz usa (en vez de
 * traer la fila entera) para que el contrato entre base de datos y vista sea
 * explícito y las consultas no engorden solas al crecer el esquema.
 */

/** Acrónimos de clase, en el orden en que se muestran. */
export const CATEGORY_ORDER = ["MGP", "MT2", "MT3"] as const;
export type CategoryAcronym = (typeof CATEGORY_ORDER)[number];

export function isCategoryAcronym(value: string): value is CategoryAcronym {
  return (CATEGORY_ORDER as readonly string[]).includes(value);
}

/**
 * Filtro de clase para los horarios, con una opción extra: "todas".
 *
 * Existe porque un domingo de MotoGP son tres carreras seguidas —Moto3, Moto2
 * y MotoGP— y filtrando por una sola clase el aficionado no ve el día completo.
 */
export const ALL_CATEGORIES = "ALL" as const;
export type CategoryFilter = CategoryAcronym | typeof ALL_CATEGORIES;

export function isCategoryFilter(value: string): value is CategoryFilter {
  return value === ALL_CATEGORIES || isCategoryAcronym(value);
}

const eventSummary = {
  id: true,
  shortname: true,
  slug: true,
  round: true,
  additionalName: true,
  countryIso: true,
  circuitName: true,
  circuitTimeZone: true,
  startsAt: true,
  endsAt: true,
  status: true,
  hasResults: true,
  backgroundUrl: true,
  flagUrl: true,
  trackSvgUrl: true,
} as const;

/** Temporada activa. */
export async function getCurrentSeason() {
  return (
    (await prisma.season.findFirst({
      where: { current: true },
      select: { id: true, year: true },
    })) ??
    prisma.season.findFirst({
      orderBy: { year: "desc" },
      select: { id: true, year: true },
    })
  );
}

/** Próximo Gran Premio que aún no ha terminado. */
export async function getNextEvent(seasonId: string, now = new Date()) {
  return prisma.event.findFirst({
    where: { seasonId, endsAt: { gte: now } },
    orderBy: { startsAt: "asc" },
    select: eventSummary,
  });
}

/** Último Gran Premio ya disputado. */
export async function getLastEvent(seasonId: string, now = new Date()) {
  return prisma.event.findFirst({
    where: { seasonId, endsAt: { lt: now } },
    orderBy: { startsAt: "desc" },
    select: eventSummary,
  });
}

/** Calendario completo de la temporada. */
export async function getSeasonEvents(seasonId: string) {
  return prisma.event.findMany({
    where: { seasonId },
    orderBy: { round: "asc" },
    select: eventSummary,
  });
}

/** Un GP por su slug, dentro de la temporada. */
export async function getEventBySlug(seasonId: string, slug: string) {
  return prisma.event.findUnique({
    where: { seasonId_slug: { seasonId, slug } },
    select: { ...eventSummary, circuitCity: true, trackPngUrl: true },
  });
}

/**
 * Sesiones deportivas de un GP para una clase, en orden cronológico.
 * Se excluyen las de tipo MEDIA: la interfaz solo muestra sesiones de pista.
 */
export async function getEventSessions(
  eventId: string,
  filter: CategoryFilter,
) {
  return prisma.session.findMany({
    where: {
      eventId,
      type: "SESSION",
      category:
        filter === ALL_CATEGORIES
          ? { acronym: { in: [...CATEGORY_ORDER] } }
          : { acronym: filter },
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      shortname: true,
      name: true,
      kind: true,
      startsAt: true,
      endsAt: true,
      status: true,
      // Se necesita para etiquetar cada fila cuando se muestran todas juntas.
      category: { select: { acronym: true } },
      _count: { select: { results: true } },
    },
  });
}

/** Clasificación del campeonato de pilotos de una clase. */
export async function getStandings(
  seasonId: string,
  categoryAcronym: CategoryAcronym,
) {
  return prisma.standingEntry.findMany({
    where: { seasonId, category: { acronym: categoryAcronym } },
    orderBy: { position: "asc" },
    select: {
      id: true,
      position: true,
      points: true,
      teamName: true,
      constructorName: true,
      rider: {
        select: {
          id: true,
          fullName: true,
          number: true,
          countryIso: true,
          flagUrl: true,
          profilePictureUrl: true,
          teamColor: true,
        },
      },
    },
  });
}

/** Podio de una sesión concreta, para las tarjetas de resultados. */
export async function getSessionResults(sessionId: string, take?: number) {
  return prisma.sessionResult.findMany({
    where: { sessionId },
    orderBy: [{ position: { sort: "asc", nulls: "last" } }],
    take,
    select: {
      id: true,
      position: true,
      points: true,
      time: true,
      gapToFirst: true,
      status: true,
      teamName: true,
      constructorName: true,
      rider: {
        select: {
          id: true,
          fullName: true,
          number: true,
          countryIso: true,
          flagUrl: true,
          profilePictureUrl: true,
        },
      },
    },
  });
}

/**
 * Ganadores de las últimas carreras disputadas, para la tarjeta de
 * "resultados recientes" de la portada en escritorio.
 */
export async function getRecentRaceWinners(
  seasonId: string,
  categoryAcronym: CategoryAcronym,
  take = 3,
) {
  const races = await prisma.session.findMany({
    where: {
      shortname: "RAC",
      category: { acronym: categoryAcronym },
      event: { seasonId },
      results: { some: {} },
    },
    orderBy: { startsAt: "desc" },
    take,
    select: {
      id: true,
      startsAt: true,
      event: {
        select: {
          slug: true,
          shortname: true,
          countryIso: true,
          flagUrl: true,
          backgroundUrl: true,
        },
      },
      results: {
        where: { position: 1 },
        take: 1,
        select: { rider: { select: { fullName: true } } },
      },
    },
  });

  return races.map((race) => ({
    id: race.id,
    startsAt: race.startsAt,
    event: race.event,
    winner: race.results[0]?.rider.fullName ?? null,
  }));
}

/** Marca temporal de la última ingesta correcta, para el aviso de frescura. */
export async function getLastIngestAt(): Promise<Date | null> {
  const run = await prisma.ingestRun.findFirst({
    where: { status: "SUCCESS" },
    orderBy: { startedAt: "desc" },
    select: { finishedAt: true, startedAt: true },
  });
  return run?.finishedAt ?? run?.startedAt ?? null;
}
