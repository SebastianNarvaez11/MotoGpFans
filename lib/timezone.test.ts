import { describe, expect, it, vi } from "vitest";

/**
 * `getTimeZone` lee la cookie y las cabeceras de la petición, así que se
 * simula `next/headers` para comprobar la lógica de prioridad y validación sin
 * levantar un servidor.
 */
const request = {
  cookie: undefined as string | undefined,
  geoHeader: undefined as string | undefined,
};

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "mgpf_tz" && request.cookie !== undefined
        ? { value: request.cookie }
        : undefined,
  }),
  headers: async () => ({
    get: (name: string) =>
      name === "x-vercel-ip-timezone" ? (request.geoHeader ?? null) : null,
  }),
}));

const { FALLBACK_TIMEZONE, getTimeZone } = await import("./timezone");

function scenario({ cookie, geo }: { cookie?: string; geo?: string }) {
  request.cookie = cookie;
  request.geoHeader = geo;
}

describe("getTimeZone — orden de preferencia", () => {
  it("la elección del usuario manda sobre la geolocalización", () => {
    // Alguien en Colombia que eligió ver los horarios en hora de Madrid.
    scenario({ cookie: "Europe/Madrid", geo: "America/Bogota" });
    return expect(getTimeZone()).resolves.toBe("Europe/Madrid");
  });

  it("sin cookie, usa la zona deducida de la IP", async () => {
    // El caso que motivó el cambio: primera visita desde Colombia mostraba
    // los horarios en hora de Madrid.
    scenario({ geo: "America/Bogota" });
    expect(await getTimeZone()).toBe("America/Bogota");
  });

  it("sin cookie ni geolocalización, cae a la zona por defecto", async () => {
    scenario({});
    expect(await getTimeZone()).toBe(FALLBACK_TIMEZONE);
  });
});

describe("getTimeZone — validación", () => {
  it("canoniza la capitalización de la cookie", async () => {
    scenario({ cookie: "america/bogota" });
    expect(await getTimeZone()).toBe("America/Bogota");
  });

  it("ignora una cookie manipulada y sigue con la geolocalización", async () => {
    scenario({ cookie: "Marte/Olympus_Mons", geo: "America/Bogota" });
    expect(await getTimeZone()).toBe("America/Bogota");

    scenario({ cookie: "'; DROP TABLE events; --", geo: "Asia/Tokyo" });
    expect(await getTimeZone()).toBe("Asia/Tokyo");
  });

  it("ignora una cabecera de geolocalización inválida", async () => {
    // No debería ocurrir viniendo de Vercel, pero un valor basura no puede
    // tumbar el formateo de la página entera.
    scenario({ geo: "no-es-una-zona" });
    expect(await getTimeZone()).toBe(FALLBACK_TIMEZONE);
  });

  it("acepta UTC si es lo que se recibió de verdad", async () => {
    scenario({ cookie: "UTC" });
    expect(await getTimeZone()).toBe("UTC");
  });

  it("una cookie vacía no bloquea la geolocalización", async () => {
    scenario({ cookie: "", geo: "America/Lima" });
    expect(await getTimeZone()).toBe("America/Lima");
  });
});
