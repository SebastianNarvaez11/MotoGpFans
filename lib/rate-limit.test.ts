import { afterEach, describe, expect, it, vi } from "vitest";
import { rateLimit, resetRateLimits } from "./rate-limit";

afterEach(() => {
  resetRateLimits();
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("permite hasta el límite y bloquea después", () => {
    for (let i = 0; i < 3; i++) {
      expect(rateLimit("ip", { limit: 3, windowMs: 1000 }).allowed).toBe(true);
    }
    const blocked = rateLimit("ip", { limit: 3, windowMs: 1000 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("descuenta las peticiones restantes", () => {
    expect(rateLimit("ip", { limit: 3 }).remaining).toBe(2);
    expect(rateLimit("ip", { limit: 3 }).remaining).toBe(1);
    expect(rateLimit("ip", { limit: 3 }).remaining).toBe(0);
  });

  it("aísla cada clave", () => {
    rateLimit("ip-a", { limit: 1 });
    expect(rateLimit("ip-a", { limit: 1 }).allowed).toBe(false);
    // Otra IP no debe verse afectada.
    expect(rateLimit("ip-b", { limit: 1 }).allowed).toBe(true);
  });

  it("se reabre al expirar la ventana", () => {
    vi.useFakeTimers();
    rateLimit("ip", { limit: 1, windowMs: 1000 });
    expect(rateLimit("ip", { limit: 1, windowMs: 1000 }).allowed).toBe(false);

    vi.advanceTimersByTime(1001);
    expect(rateLimit("ip", { limit: 1, windowMs: 1000 }).allowed).toBe(true);
  });
});
