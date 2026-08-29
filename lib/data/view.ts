import type { SessionForRow } from "@/components/SessionRow";
import { sessionState } from "@/lib/time";

/** Sesión tal como la devuelven las consultas. */
type DbSession = {
  shortname: string;
  name: string;
  startsAt: Date;
  endsAt: Date | null;
  category?: { acronym: string };
};

/**
 * Prepara las sesiones para la vista, calculando su estado respecto a `now`.
 *
 * El instante se pasa explícitamente en vez de leer el reloj dentro de cada
 * fila: así todas las sesiones de una misma página se juzgan contra el mismo
 * momento y el resultado es reproducible en los tests.
 */
export function toSessionRows(
  sessions: readonly DbSession[],
  now: Date,
  { showCategory = false }: { showCategory?: boolean } = {},
): SessionForRow[] {
  return sessions.map((session) => ({
    shortname: session.shortname,
    name: session.name,
    startsAt: session.startsAt,
    state: sessionState(session.startsAt, session.endsAt, now),
    // La clase solo se etiqueta al mostrar varias juntas: en una lista
    // filtrada por una sola clase, repetirla en cada fila sería ruido.
    ...(showCategory && session.category
      ? { categoryAcronym: session.category.acronym }
      : {}),
  }));
}
