import "server-only";
import { cookies, headers } from "next/headers";
import { isValidTimeZone, normalizeTimeZone } from "./normalize";
import { TIMEZONE_COOKIE } from "./timezone-cookie";

export { TIMEZONE_COOKIE };

/**
 * Cabecera que añade Vercel con la zona horaria deducida de la IP del
 * visitante, en formato IANA ("America/Bogota").
 */
const GEO_TIMEZONE_HEADER = "x-vercel-ip-timezone";

/**
 * Último recurso cuando no hay cookie ni geolocalización.
 * Se usa Madrid porque es la zona del calendario oficial: los horarios que se
 * ven coinciden entonces con los que publica MotoGP.
 */
export const FALLBACK_TIMEZONE = "Europe/Madrid";

/**
 * Zona horaria activa para esta petición, por orden de preferencia:
 *
 *  1. **La cookie** — lo que la persona eligió a mano manda siempre.
 *  2. **La geolocalización de Vercel** — acierta ya en la primera visita, antes
 *     de que el navegador ejecute nada. Sin esto, quien entrara por primera vez
 *     vería los horarios en hora de Madrid aunque estuviera en Bogotá.
 *  3. **Madrid** — en local, en los tests o si la cabecera no llega.
 *
 * Todos los valores se validan: una cookie la manipula cualquiera, y una zona
 * inventada haría fallar el formateo de la página entera.
 */
export async function getTimeZone(): Promise<string> {
  const store = await cookies();
  const fromCookie = store.get(TIMEZONE_COOKIE)?.value;
  const chosen = pickValid(fromCookie);
  if (chosen) return chosen;

  const requestHeaders = await headers();
  const fromGeo = pickValid(requestHeaders.get(GEO_TIMEZONE_HEADER));
  if (fromGeo) return fromGeo;

  return FALLBACK_TIMEZONE;
}

/** Devuelve la zona canónica si el valor es una zona real; si no, null. */
function pickValid(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  // Se comprueba el valor crudo: `normalizeTimeZone` convierte lo desconocido
  // en "UTC", que es válido, y eso enmascararía una entrada inventada.
  if (!isValidTimeZone(trimmed)) return null;
  return normalizeTimeZone(trimmed);
}
