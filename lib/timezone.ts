import "server-only";
import { cookies } from "next/headers";
import { isValidTimeZone, normalizeTimeZone } from "./normalize";
import { TIMEZONE_COOKIE } from "./timezone-cookie";

export { TIMEZONE_COOKIE };

/**
 * Zona por defecto cuando el visitante aún no ha elegido ninguna.
 * Se usa Madrid porque es la del calendario oficial: así los horarios que se
 * ven de entrada coinciden con los que publica MotoGP.
 */
export const FALLBACK_TIMEZONE = "Europe/Madrid";

/**
 * Zona horaria activa para esta petición.
 *
 * Se lee de una **cookie**, no de `localStorage`, precisamente para que el
 * servidor ya renderice las horas correctas: si dependiera del navegador,
 * la primera pintura mostraría una hora equivocada y saltaría al corregirse.
 *
 * El valor se valida siempre: una cookie la puede manipular cualquiera, y una
 * zona inventada haría reventar el formateo de toda la página.
 */
export async function getTimeZone(): Promise<string> {
  const store = await cookies();
  const raw = store.get(TIMEZONE_COOKIE)?.value;

  if (!raw) return FALLBACK_TIMEZONE;

  // Se comprueba el valor crudo, no el normalizado: `normalizeTimeZone`
  // convierte lo desconocido en "UTC", que es una zona válida, así que
  // normalizar primero convertiría una cookie manipulada en horarios de UTC en
  // lugar de devolver al usuario a la zona por defecto.
  if (!isValidTimeZone(raw.trim())) return FALLBACK_TIMEZONE;

  return normalizeTimeZone(raw);
}
