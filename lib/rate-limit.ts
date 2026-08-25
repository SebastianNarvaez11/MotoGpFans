import "server-only";

/**
 * Limitador de peticiones en memoria (ventana deslizante simple).
 *
 * Suficiente para proteger `/api/ingest`, que solo invoca el cron: frena
 * ataques de fuerza bruta contra el secreto sin añadir dependencias externas.
 *
 * Limitación conocida y aceptada: el estado vive en el proceso, así que en un
 * despliegue con varias instancias el límite es por instancia. Para este uso es
 * suficiente; si algún día hay endpoints públicos que escriban, habrá que
 * mover esto a un almacén compartido (Redis / Upstash).
 */
type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  { limit = 10, windowMs = 60_000 } = {},
): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  entry.count++;
  const allowed = entry.count <= limit;

  return {
    allowed,
    remaining: Math.max(0, limit - entry.count),
    retryAfterSeconds: allowed ? 0 : Math.ceil((entry.resetAt - now) / 1000),
  };
}

/** Solo para tests: vacía el estado entre casos. */
export function resetRateLimits(): void {
  buckets.clear();
}
