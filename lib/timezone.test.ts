import { describe, expect, it, vi } from "vitest";

/**
 * `getTimeZone` lee la cookie de la petición, así que se simula `next/headers`
 * para poder comprobar la lógica de validación sin levantar un servidor.
 */
const cookieValue = { current: undefined as string | undefined };

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "mgpf_tz" && cookieValue.current !== undefined
        ? { value: cookieValue.current }
        : undefined,
  }),
}));

const { FALLBACK_TIMEZONE, getTimeZone } = await import("./timezone");

function withCookie(value: string | undefined) {
  cookieValue.current = value;
}

describe("getTimeZone", () => {
  it("usa la zona por defecto cuando no hay cookie", async () => {
    withCookie(undefined);
    expect(await getTimeZone()).toBe(FALLBACK_TIMEZONE);
  });

  it("respeta una zona válida elegida por el usuario", async () => {
    withCookie("America/Bogota");
    expect(await getTimeZone()).toBe("America/Bogota");
  });

  it("canoniza la capitalización", async () => {
    withCookie("america/bogota");
    expect(await getTimeZone()).toBe("America/Bogota");
  });

  it("vuelve a la zona por defecto si la cookie fue manipulada", async () => {
    // Una cookie la puede editar cualquiera. El riesgo real no es de seguridad
    // sino de mostrar horarios de una zona que el usuario no eligió: si el
    // valor no es una zona real, hay que volver a la de por defecto y no a UTC.
    withCookie("Marte/Olympus_Mons");
    expect(await getTimeZone()).toBe(FALLBACK_TIMEZONE);

    withCookie("'; DROP TABLE events; --");
    expect(await getTimeZone()).toBe(FALLBACK_TIMEZONE);

    withCookie("");
    expect(await getTimeZone()).toBe(FALLBACK_TIMEZONE);
  });

  it("acepta UTC si es lo que el usuario eligió de verdad", async () => {
    withCookie("UTC");
    expect(await getTimeZone()).toBe("UTC");
  });
});
