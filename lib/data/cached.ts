import "server-only";
import { unstable_cache } from "next/cache";
import type { CategoryAcronym, CategoryFilter } from "./queries";
import * as queries from "./queries";
import { reviveDates } from "./revive";

/**
 * Capa de caché sobre las consultas.
 *
 * Los datos solo cambian cuando corre la ingesta, así que consultarlos en cada
 * visita es desperdicio: las páginas siguen renderizándose por petición —hace
 * falta para convertir las horas a la zona de cada visitante— pero el resultado
 * de las consultas se reutiliza entre visitas.
 *
 * La invalidación es por **etiqueta**: `/api/ingest` la dispara al terminar,
 * de modo que los datos nuevos aparecen enseguida sin esperar a que caduque
 * nada. El `revalidate` es solo una red de seguridad por si esa señal se
 * pierde.
 *
 * Estas funciones no pueden leer cookies ni cabeceras: lo que devuelven se
 * comparte entre todos los visitantes. La zona horaria se aplica después, al
 * renderizar.
 */

/** Etiqueta única: los datos son pocos y se refrescan juntos tras cada ingesta. */
export const DATA_TAG = "motogp-data";

/** Red de seguridad si la invalidación por etiqueta no llegara (10 minutos). */
const SAFETY_REVALIDATE = 600;

/**
 * Envuelve una consulta con caché por etiqueta.
 *
 * El `reviveDates` de la salida no es opcional: la caché serializa el
 * resultado, así que los `Date` de Prisma vuelven convertidos en texto y
 * cualquier formateo de hora fallaría con "Invalid time value".
 */
function cached<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  keyParts: string[],
) {
  const withCache = unstable_cache(fn, keyParts, {
    tags: [DATA_TAG],
    revalidate: SAFETY_REVALIDATE,
  });

  return async (...args: Args): Promise<Result> =>
    reviveDates(await withCache(...args));
}

export const getCurrentSeason = cached(
  () => queries.getCurrentSeason(),
  ["current-season"],
);

export const getSeasonEvents = cached(
  (seasonId: string) => queries.getSeasonEvents(seasonId),
  ["season-events"],
);

export const getEventBySlug = cached(
  (seasonId: string, slug: string) => queries.getEventBySlug(seasonId, slug),
  ["event-by-slug"],
);

export const getEventSessions = cached(
  (eventId: string, filter: CategoryFilter) =>
    queries.getEventSessions(eventId, filter),
  ["event-sessions"],
);

export const getStandings = cached(
  (seasonId: string, category: CategoryAcronym) =>
    queries.getStandings(seasonId, category),
  ["standings"],
);

export const getSessionResults = cached(
  (sessionId: string, take?: number) =>
    queries.getSessionResults(sessionId, take),
  ["session-results"],
);

export const getRecentRaceWinners = cached(
  (seasonId: string, category: CategoryAcronym, take?: number) =>
    queries.getRecentRaceWinners(seasonId, category, take),
  ["recent-race-winners"],
);

/**
 * El próximo GP **no** se cachea por `now`: la fecha cambia a cada segundo y
 * sería una clave distinta cada vez. Se deriva del calendario, que sí está en
 * caché, filtrando en memoria.
 */
export async function getNextEvent(seasonId: string, now = new Date()) {
  const events = await getSeasonEvents(seasonId);
  return events.find((event) => event.endsAt >= now) ?? null;
}

export {
  ALL_CATEGORIES,
  CATEGORY_ORDER,
  isCategoryAcronym,
  isCategoryFilter,
} from "./queries";
export type { CategoryFilter } from "./queries";
