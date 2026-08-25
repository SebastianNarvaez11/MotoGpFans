import { describe, expect, it } from "vitest";
import {
  FEATURED_TIME_ZONES,
  allTimeZones,
  describeTimeZone,
  searchTimeZones,
} from "./timezone-catalog";

describe("allTimeZones", () => {
  it("devuelve el catálogo del runtime", () => {
    const zones = allTimeZones();
    expect(zones.length).toBeGreaterThan(100);
    expect(zones).toContain("America/Bogota");
    expect(zones).toContain("Europe/Madrid");
  });

  it("incluye todas las zonas destacadas", () => {
    const zones = allTimeZones();
    for (const featured of FEATURED_TIME_ZONES) {
      expect(zones).toContain(featured);
    }
  });
});

describe("searchTimeZones", () => {
  const zones = allTimeZones();

  it("encuentra por ciudad", () => {
    expect(searchTimeZones(zones, "bogota")).toContain("America/Bogota");
    expect(searchTimeZones(zones, "madrid")).toContain("Europe/Madrid");
  });

  it("encuentra ciudades de dos palabras escritas con espacio", () => {
    // El identificador es "Buenos_Aires": quien busca escribe "buenos aires".
    expect(searchTimeZones(zones, "buenos aires")).toContain(
      "America/Buenos_Aires",
    );
    expect(searchTimeZones(zones, "sao paulo")).toContain("America/Sao_Paulo");
  });

  it("las zonas destacadas son las canónicas del catálogo", () => {
    // `America/Argentina/Buenos_Aires` es un alias válido para Intl pero no
    // aparece en `supportedValuesOf`, así que usarlo rompería la comparación
    // con la lista y la zona nunca saldría marcada.
    for (const featured of FEATURED_TIME_ZONES) {
      const canonical = new Intl.DateTimeFormat("en", {
        timeZone: featured,
      }).resolvedOptions().timeZone;
      expect(canonical).toBe(featured);
    }
  });

  it("encuentra por región o país", () => {
    expect(searchTimeZones(zones, "argentina").length).toBeGreaterThan(0);
    expect(searchTimeZones(zones, "europe").length).toBeGreaterThan(10);
  });

  it("ignora mayúsculas y espacios sobrantes", () => {
    expect(searchTimeZones(zones, "  BOGOTA  ")).toContain("America/Bogota");
  });

  it("devuelve vacío cuando no hay coincidencias", () => {
    expect(searchTimeZones(zones, "olympus mons")).toEqual([]);
  });

  it("respeta el límite de resultados", () => {
    expect(searchTimeZones(zones, "a", 5)).toHaveLength(5);
  });

  it("sin consulta devuelve el principio de la lista", () => {
    expect(searchTimeZones(zones, "", 3)).toHaveLength(3);
  });
});

describe("describeTimeZone", () => {
  it("separa ciudad y región", () => {
    expect(describeTimeZone("America/Bogota")).toEqual({
      city: "Bogota",
      region: "America",
    });
  });

  it("usa el último segmento como ciudad en identificadores de tres partes", () => {
    expect(describeTimeZone("America/Argentina/Buenos_Aires")).toEqual({
      city: "Buenos Aires",
      region: "America",
    });
  });
});
