import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "./concurrency";

describe("mapWithConcurrency", () => {
  it("procesa todos los elementos conservando el orden", async () => {
    const out = await mapWithConcurrency(
      [1, 2, 3, 4, 5],
      2,
      async (n) => n * 2,
    );
    expect(out).toEqual([2, 4, 6, 8, 10]);
  });

  it("nunca supera el límite de tareas en vuelo", async () => {
    let inFlight = 0;
    let peak = 0;

    await mapWithConcurrency(
      Array.from({ length: 20 }, (_, i) => i),
      4,
      async () => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await new Promise((r) => setTimeout(r, 5));
        inFlight--;
      },
    );

    expect(peak).toBeLessThanOrEqual(4);
    expect(peak).toBeGreaterThan(1); // y de verdad paraleliza
  });

  it("devuelve lista vacía sin lanzar tareas", async () => {
    expect(await mapWithConcurrency([], 4, async () => 1)).toEqual([]);
  });

  it("tolera un límite mayor que el número de elementos", async () => {
    expect(await mapWithConcurrency([1, 2], 10, async (n) => n)).toEqual([
      1, 2,
    ]);
  });

  it("propaga el error de un worker", async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error("fallo en 2");
        return n;
      }),
    ).rejects.toThrow("fallo en 2");
  });
});
