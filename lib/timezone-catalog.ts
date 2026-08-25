/**
 * Catálogo de zonas horarias para el selector.
 *
 * La lista completa la aporta el propio runtime (`Intl.supportedValuesOf`), que
 * conoce cientos de zonas y se actualiza con el navegador; aquí solo se define
 * el atajo a las más probables para el público del sitio y el modo de
 * presentarlas.
 */

/**
 * Zonas destacadas al abrir el selector, sin necesidad de buscar.
 *
 * Se usan los identificadores **canónicos** (los que devuelve
 * `Intl.supportedValuesOf`). Ojo con Argentina: `America/Argentina/Buenos_Aires`
 * funciona como alias pero no está en el catálogo, así que compararlo con la
 * lista fallaría y la zona nunca aparecería marcada como seleccionada.
 */
export const FEATURED_TIME_ZONES = [
  "America/Bogota",
  "America/Mexico_City",
  "America/Buenos_Aires",
  "America/Lima",
  "America/Santiago",
  "America/Sao_Paulo",
  "America/New_York",
  "Europe/Madrid",
  "Europe/London",
  "Europe/Rome",
] as const;

/** Lista completa de zonas del runtime, con reserva por si no está disponible. */
export function allTimeZones(): string[] {
  const supported = Intl.supportedValuesOf?.("timeZone");
  if (supported && supported.length > 0) return [...supported];
  return [...FEATURED_TIME_ZONES];
}

/** Zona horaria del dispositivo. */
export function detectTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Texto legible: "America/Bogota" → "Bogota · América". */
export function describeTimeZone(timeZone: string): {
  city: string;
  region: string;
} {
  const parts = timeZone.split("/");
  const city = (parts[parts.length - 1] ?? timeZone).replace(/_/g, " ");
  const region = (parts[0] ?? "").replace(/_/g, " ");
  return { city, region };
}

/**
 * Filtra zonas por texto libre.
 *
 * Se busca sobre el identificador entero con los guiones bajos convertidos en
 * espacios, de modo que "buenos aires", "argentina" o "america" encuentren
 * `America/Argentina/Buenos_Aires`.
 */
export function searchTimeZones(
  zones: readonly string[],
  query: string,
  limit = 40,
): string[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return zones.slice(0, limit);

  const matches: string[] = [];
  for (const zone of zones) {
    const haystack = zone.toLowerCase().replace(/_/g, " ");
    if (haystack.includes(needle)) {
      matches.push(zone);
      if (matches.length >= limit) break;
    }
  }
  return matches;
}
