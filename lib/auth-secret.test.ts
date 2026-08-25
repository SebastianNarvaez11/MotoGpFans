import { describe, expect, it } from "vitest";
import { bearerToken, secretsMatch } from "./auth-secret";

describe("secretsMatch", () => {
  const secret = "un-secreto-de-mas-de-32-caracteres-para-pruebas";

  it("acepta el secreto correcto", () => {
    expect(secretsMatch(secret, secret)).toBe(true);
  });

  it("rechaza secretos distintos", () => {
    expect(secretsMatch("otro", secret)).toBe(false);
    expect(secretsMatch("", secret)).toBe(false);
  });

  it("rechaza un prefijo correcto del secreto", () => {
    // El caso que ataca una comparación ingenua: acertar los primeros bytes.
    expect(secretsMatch(secret.slice(0, -1), secret)).toBe(false);
    expect(secretsMatch(secret.slice(0, 5), secret)).toBe(false);
  });

  it("compara longitudes distintas sin lanzar", () => {
    // timingSafeEqual exige buffers del mismo tamaño; al hashear siempre son
    // de 32 bytes, así que una entrada larguísima no debe romper nada.
    expect(secretsMatch("x".repeat(10_000), secret)).toBe(false);
  });

  it("distingue mayúsculas", () => {
    expect(secretsMatch(secret.toUpperCase(), secret)).toBe(false);
  });
});

describe("bearerToken", () => {
  it("extrae el token de una cabecera bien formada", () => {
    expect(bearerToken("Bearer abc123")).toBe("abc123");
  });

  it("acepta la variante en minúsculas y con espacios de más", () => {
    expect(bearerToken("bearer  abc123  ")).toBe("abc123");
  });

  it("devuelve null si falta la cabecera o el esquema", () => {
    expect(bearerToken(null)).toBeNull();
    expect(bearerToken("")).toBeNull();
    expect(bearerToken("abc123")).toBeNull();
    expect(bearerToken("Basic abc123")).toBeNull();
    expect(bearerToken("Bearer ")).toBeNull();
  });
});
