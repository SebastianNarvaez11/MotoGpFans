import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Compara dos secretos sin filtrar información por el tiempo de ejecución.
 *
 * Una comparación normal (`a === b`) corta en el primer carácter distinto, así
 * que su duración revela cuántos caracteres iniciales acertó quien lo intenta:
 * suficiente para deducir el secreto byte a byte. Aquí se comparan los hashes
 * SHA-256 —siempre de 32 bytes— con `timingSafeEqual`, de modo que el tiempo
 * es constante y además no depende de la longitud de la entrada.
 */
export function secretsMatch(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Extrae el token de una cabecera `Authorization: Bearer <token>`. */
export function bearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}
