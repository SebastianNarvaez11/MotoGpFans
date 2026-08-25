/**
 * Restaura los objetos `Date` que la caché convierte en texto.
 *
 * `unstable_cache` serializa lo que devuelve la consulta, y en ese viaje un
 * `Date` se transforma en una cadena ISO. Al recuperarlo, cualquier
 * `Intl.DateTimeFormat` falla con "Invalid time value" — y como el fallo ocurre
 * al renderizar, no al cachear, la página entera se cae.
 *
 * La conversión es por **nombre de campo** y no por "parece una fecha": así es
 * predecible y no se arriesga a transformar un texto que solo se le parezca.
 * Al añadir un campo de fecha nuevo a las consultas hay que añadirlo aquí.
 */
const DATE_KEYS = new Set([
  "startsAt",
  "endsAt",
  "createdAt",
  "updatedAt",
  "startedAt",
  "finishedAt",
]);

export function reviveDates<T>(value: T): T {
  return revive(value) as T;
}

function revive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(revive);

  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value;

  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(source)) {
    if (DATE_KEYS.has(key) && typeof entry === "string") {
      const parsed = new Date(entry);
      result[key] = Number.isNaN(parsed.getTime()) ? entry : parsed;
    } else {
      result[key] = revive(entry);
    }
  }

  return result;
}
