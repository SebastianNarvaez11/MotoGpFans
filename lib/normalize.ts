/**
 * Normalizaciones de los datos crudos de la fuente.
 *
 * Funciones puras y sin dependencias: son la frontera entre el JSON de
 * api.motogp.pulselive.com (inconsistente en mayúsculas, con espacios sobrantes
 * y nombres patrocinados) y nuestro modelo de datos.
 */

/**
 * Devuelve el identificador IANA canónico de una zona horaria.
 *
 * La fuente entrega la zona del circuito en mayúsculas ("EUROPE/MADRID").
 * `Intl` la acepta igualmente (es insensible a mayúsculas), pero guardamos la
 * forma canónica para que las comparaciones y los agrupamientos por zona sean
 * fiables y para poder mostrarla tal cual al usuario.
 *
 * La canonicalización la hace el propio motor de `Intl` en vez de una tabla
 * mantenida a mano: es la autoridad sobre la base de datos IANA y se actualiza
 * con el runtime. Ante una zona desconocida cae a UTC en lugar de propagar un
 * valor con el que después fallaría el formateo.
 */
export function normalizeTimeZone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "UTC";

  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: trimmed,
    }).resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/** Comprueba que una zona horaria es válida para `Intl` en este runtime. */
export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Convierte un nombre a un slug apto para URL.
 * "GREAT BRITAIN" → "great-britain"; "SAN MARINO" → "san-marino";
 * "MICHELIN® GRAND PRIX" → "michelin-grand-prix".
 */
export function slugify(raw: string): string {
  return (
    raw
      .normalize("NFD")
      // Elimina los diacríticos (á → a) ya separados por NFD.
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}

/**
 * Limpia el nombre crudo de un evento: la fuente los entrega con espacios
 * sobrantes al final y dobles espacios internos.
 */
export function cleanName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}
