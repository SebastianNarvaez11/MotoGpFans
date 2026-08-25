import { describe, expect, it } from "vitest";
import { reviveDates } from "./revive";

/**
 * `unstable_cache` serializa lo que devuelve la consulta, así que los `Date`
 * de Prisma vuelven convertidos en cadenas ISO. Sin revivirlos, el formateo de
 * horas falla con "Invalid time value" y la página entera se cae —y solo se
 * nota en la segunda visita, cuando la caché ya está caliente.
 */
describe("reviveDates", () => {
  it("convierte las cadenas ISO de los campos de fecha", () => {
    const fromCache = { startsAt: "2026-08-30T12:00:00.000Z" };
    const revived = reviveDates(fromCache);

    expect(revived.startsAt).toBeInstanceOf(Date);
    expect((revived.startsAt as unknown as Date).toISOString()).toBe(
      "2026-08-30T12:00:00.000Z",
    );
  });

  it("recorre listas y objetos anidados", () => {
    const fromCache = {
      sessions: [
        {
          shortname: "RAC",
          startsAt: "2026-08-30T12:00:00.000Z",
          endsAt: null,
        },
        { shortname: "FP1", startsAt: "2026-08-28T07:00:00.000Z" },
      ],
      event: { startsAt: "2026-08-28T06:00:00.000Z" },
    };

    const revived = reviveDates(fromCache);
    expect(revived.sessions[0]!.startsAt).toBeInstanceOf(Date);
    expect(revived.sessions[1]!.startsAt).toBeInstanceOf(Date);
    expect(revived.event.startsAt).toBeInstanceOf(Date);
    expect(revived.sessions[0]!.endsAt).toBeNull();
  });

  it("no toca los textos que no son campos de fecha", () => {
    // Valores reales de un resultado: se parecen a horas pero son texto.
    const fromCache = {
      time: "39:45.930",
      gapToFirst: "+2.538",
      fullName: "Raul Fernandez",
      shortname: "RAC",
    };

    expect(reviveDates(fromCache)).toEqual(fromCache);
  });

  it("deja intactos los Date que ya lo son", () => {
    const date = new Date("2026-08-30T12:00:00.000Z");
    expect(reviveDates({ startsAt: date }).startsAt).toBe(date);
  });

  it("conserva una cadena de fecha inválida en vez de producir Invalid Date", () => {
    const revived = reviveDates({ startsAt: "no es una fecha" });
    expect(revived.startsAt).toBe("no es una fecha");
  });

  it("respeta null, undefined y números", () => {
    const fromCache = { startsAt: null, endsAt: undefined, points: 197.5 };
    expect(reviveDates(fromCache)).toEqual(fromCache);
  });

  it("el resultado revivido se puede formatear con Intl", () => {
    // La garantía que de verdad importa: que no vuelva a lanzar.
    const revived = reviveDates({ startsAt: "2026-08-30T12:00:00.000Z" });
    const formatted = new Intl.DateTimeFormat("es", {
      timeZone: "America/Bogota",
      hour: "numeric",
      minute: "2-digit",
      hourCycle: "h12",
    }).format(revived.startsAt as unknown as Date);

    expect(formatted).toMatch(/^7:00/);
  });
});
