import { describe, expect, it } from "vitest";
import {
  cleanName,
  isValidTimeZone,
  normalizeTimeZone,
  slugify,
} from "./normalize";

/**
 * Las 18 zonas horarias distintas que devuelve la fuente para los 22 GPs de
 * 2026 (`/v1/events` → `time_zone`), tal cual las envía: en mayúsculas.
 */
const TIME_ZONES_FROM_SOURCE = [
  "AMERICA/CHICAGO",
  "AMERICA/SAO_PAULO",
  "ASIA/BANGKOK",
  "ASIA/KUALA_LUMPUR",
  "ASIA/MAKASSAR",
  "ASIA/QATAR",
  "ASIA/TOKYO",
  "AUSTRALIA/MELBOURNE",
  "EUROPE/AMSTERDAM",
  "EUROPE/BERLIN",
  "EUROPE/BUDAPEST",
  "EUROPE/LISBON",
  "EUROPE/LONDON",
  "EUROPE/MADRID",
  "EUROPE/PARIS",
  "EUROPE/PRAGUE",
  "EUROPE/ROME",
  "EUROPE/VIENNA",
];

describe("normalizeTimeZone", () => {
  it("canoniza la capitalización que envía la fuente", () => {
    expect(normalizeTimeZone("EUROPE/MADRID")).toBe("Europe/Madrid");
    expect(normalizeTimeZone("ASIA/TOKYO")).toBe("Asia/Tokyo");
    expect(normalizeTimeZone("AUSTRALIA/MELBOURNE")).toBe(
      "Australia/Melbourne",
    );
    expect(normalizeTimeZone("AMERICA/SAO_PAULO")).toBe("America/Sao_Paulo");
  });

  it("normaliza todas las zonas reales de la temporada 2026", () => {
    for (const raw of TIME_ZONES_FROM_SOURCE) {
      const normalized = normalizeTimeZone(raw);
      // Es válida...
      expect(isValidTimeZone(normalized)).toBe(true);
      // ...y es un punto fijo: normalizar de nuevo no la cambia.
      expect(normalizeTimeZone(normalized)).toBe(normalized);
      // ...y designa exactamente la misma zona que la entrada cruda.
      expect(offsetAt(normalized, "2026-08-30T12:00:00Z")).toBe(
        offsetAt(raw, "2026-08-30T12:00:00Z"),
      );
    }
  });

  it("es idempotente sobre valores ya canónicos", () => {
    expect(normalizeTimeZone("Europe/Madrid")).toBe("Europe/Madrid");
    expect(normalizeTimeZone("UTC")).toBe("UTC");
  });

  it("cae a UTC ante entradas vacías o desconocidas", () => {
    expect(normalizeTimeZone("")).toBe("UTC");
    expect(normalizeTimeZone("   ")).toBe("UTC");
    // Una zona inventada no debe propagarse: rompería el formateo más adelante.
    expect(normalizeTimeZone("Marte/Olympus_Mons")).toBe("UTC");
  });
});

/** Hora local en una zona para un instante dado — sirve para comparar zonas. */
function offsetAt(timeZone: string, iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

describe("isValidTimeZone", () => {
  it("acepta identificadores IANA y rechaza los inventados", () => {
    expect(isValidTimeZone("Europe/Madrid")).toBe(true);
    // Intl es insensible a mayúsculas, así que esta también es válida.
    expect(isValidTimeZone("EUROPE/MADRID")).toBe(true);
    expect(isValidTimeZone("Marte/Olympus_Mons")).toBe(false);
  });
});

describe("slugify", () => {
  it("convierte nombres de GP en slugs de URL", () => {
    expect(slugify("ARAGON")).toBe("aragon");
    expect(slugify("GREAT BRITAIN")).toBe("great-britain");
    expect(slugify("SAN MARINO")).toBe("san-marino");
  });

  it("elimina acentos y símbolos", () => {
    expect(slugify("MotorLand Aragón")).toBe("motorland-aragon");
    expect(slugify("MICHELIN® GRAND PRIX")).toBe("michelin-grand-prix");
  });

  it("no deja guiones sueltos en los extremos", () => {
    expect(slugify("  FRANCE  ")).toBe("france");
    expect(slugify("---USA---")).toBe("usa");
  });
});

describe("cleanName", () => {
  it("quita el espacio final que trae la fuente", () => {
    // Valor literal de la API para Aragón 2026.
    expect(cleanName("MICHELIN® GRAND PRIX OF ARAGON ")).toBe(
      "MICHELIN® GRAND PRIX OF ARAGON",
    );
  });

  it("colapsa espacios internos", () => {
    expect(cleanName("GRAND  PRIX   OF  SPAIN")).toBe("GRAND PRIX OF SPAIN");
  });
});
