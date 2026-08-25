import { describe, expect, it } from "vitest";
import eventsFixture from "@/lib/motogp/__fixtures__/events.json";
import ridersFixture from "@/lib/motogp/__fixtures__/riders.json";
import {
  classificationRowSchema,
  eventsSchema,
  ridersSchema,
  standingEntrySchema,
} from "@/lib/motogp/schemas";
import {
  isGrandPrix,
  isSportSession,
  mapBroadcast,
  mapEvent,
  mapRider,
  pickAsset,
} from "./mappers";

/**
 * Los fixtures son respuestas reales de api.motogp.pulselive.com grabadas el
 * 2026-08-24. Se validan con los mismos esquemas que usa producción: si el
 * contrato cambiara, estos tests lo detectarían sin depender de la red.
 */
const events = eventsSchema.parse(eventsFixture);
const riders = ridersSchema.parse(ridersFixture);

const aragon = events.find((e) => e.shortname === "ARA")!;
const britain = events.find((e) => e.shortname === "GBR")!;

describe("los fixtures cumplen el contrato", () => {
  it("valida el calendario y los pilotos con los esquemas de producción", () => {
    expect(events.length).toBeGreaterThan(0);
    expect(riders.length).toBeGreaterThan(0);
    expect(aragon).toBeDefined();
    expect(britain).toBeDefined();
  });
});

describe("isGrandPrix", () => {
  it("acepta los grandes premios reales", () => {
    expect(isGrandPrix(aragon)).toBe(true);
    expect(isGrandPrix(britain)).toBe(true);
  });

  it("descarta tests de pretemporada y eventos de medios", () => {
    expect(isGrandPrix({ ...aragon, kind: "TEST" })).toBe(false);
    expect(isGrandPrix({ ...aragon, type: "MEDIA" })).toBe(false);
    // Sin número de ronda no puede entrar en el calendario.
    expect(isGrandPrix({ ...aragon, sequence: null })).toBe(false);
  });

  it("descarta los eventos sin circuito", () => {
    // Caso real: las presentaciones de equipo y el lanzamiento de temporada
    // llegan en el mismo calendario con `circuit: null`.
    expect(isGrandPrix({ ...aragon, circuit: null })).toBe(false);
  });
});

describe("puntos fraccionarios (medios puntos)", () => {
  it("el esquema acepta los puntos con decimales del campeonato real", () => {
    // Moto2 2026: hay 197.5, 133.5, 67.5… MotoGP reparte medios puntos cuando
    // una carrera se detiene antes de dos tercios de distancia. Validarlos como
    // enteros truncaría la clasificación del campeonato.
    const entry = standingEntrySchema.parse({
      position: 1,
      points: 197.5,
      rider: { id: "r1", full_name: "Manuel Gonzalez", number: 18 },
    });
    expect(entry.points).toBe(197.5);
  });

  it("también en el resultado de una sesión suelta", () => {
    const row = classificationRowSchema.parse({
      position: 1,
      points: 12.5,
      rider: { id: "r1", full_name: "Piloto" },
    });
    expect(row.points).toBe(12.5);
  });
});

describe("mapEvent", () => {
  const row = mapEvent(aragon);

  it("extrae la identidad del GP de Aragón", () => {
    expect(row.shortname).toBe("ARA");
    expect(row.slug).toBe("aragon");
    expect(row.round).toBe(13);
    expect(row.countryIso).toBe("ES");
    expect(row.circuitName).toBe("MotorLand Aragón");
  });

  it("limpia el espacio final que trae el nombre de la fuente", () => {
    expect(row.sourceName).toBe("MICHELIN® GRAND PRIX OF ARAGON");
    expect(row.sourceName).not.toMatch(/\s$/);
  });

  it("canoniza la zona horaria del circuito", () => {
    // La fuente envía "EUROPE/MADRID".
    expect(row.circuitTimeZone).toBe("Europe/Madrid");
  });

  it("convierte las fechas a instantes UTC", () => {
    expect(row.startsAt).toBeInstanceOf(Date);
    expect(row.startsAt.toISOString()).toBe("2026-08-28T06:00:00.000Z");
    expect(row.endsAt.toISOString()).toBe("2026-08-30T16:00:00.000Z");
  });

  it("recoge el multimedia oficial", () => {
    expect(row.backgroundUrl).toContain("photos.motogp.com");
    expect(row.flagUrl).toContain(".svg");
    expect(row.trackSvgUrl).toContain("-info.svg");
    expect(row.trackPngUrl).toContain(".png");
  });

  it("genera slugs de URL para nombres de varias palabras", () => {
    expect(mapEvent(britain).slug).toBe("great-britain");
  });
});

describe("pickAsset", () => {
  it("prefiere la densidad @1x cuando hay varias", () => {
    const assets = [
      { type: "TOP", path: "top-4x.jpg", quality: "@4x" },
      { type: "TOP", path: "top-1x.jpg", quality: "@1x" },
    ];
    expect(pickAsset(assets, "TOP")).toBe("top-1x.jpg");
  });

  it("devuelve null cuando el tipo no existe o no hay assets", () => {
    expect(
      pickAsset([{ type: "FLAG", path: "f.svg" }], "BACKGROUND"),
    ).toBeNull();
    expect(pickAsset([], "FLAG")).toBeNull();
    expect(pickAsset(null, "FLAG")).toBeNull();
  });
});

describe("isSportSession", () => {
  const broadcasts = aragon.broadcasts ?? [];

  it("descarta ruedas de prensa y shows", () => {
    const media = broadcasts.filter((b) => b.type === "MEDIA");
    expect(media.length).toBeGreaterThan(0);
    for (const b of media) expect(isSportSession(b)).toBe(false);
  });

  it("descarta las clases fuera del MVP (p. ej. Baggers)", () => {
    const baggers = broadcasts.filter((b) => b.category.acronym === "BWC");
    // El fixture de Aragón incluye Baggers: si no, este test no probaría nada.
    expect(baggers.length).toBeGreaterThan(0);
    for (const b of baggers) expect(isSportSession(b)).toBe(false);
  });

  it("acepta las sesiones de MotoGP, Moto2 y Moto3", () => {
    const kept = broadcasts.filter(isSportSession);
    const acronyms = new Set(kept.map((b) => b.category.acronym));
    expect(acronyms).toEqual(new Set(["MGP", "MT2", "MT3"]));
    expect(kept.length).toBeGreaterThan(15);
  });
});

describe("mapBroadcast", () => {
  const broadcasts = aragon.broadcasts ?? [];
  const motogpSessions = broadcasts.filter(
    (b) => isSportSession(b) && b.category.acronym === "MGP",
  );

  it("convierte la carrera de MotoGP al instante UTC correcto", () => {
    const race = motogpSessions.find((b) => b.shortname === "RAC")!;
    const row = mapBroadcast(race);

    expect(row.shortname).toBe("RAC");
    expect(row.kind).toBe("RACE");
    expect(row.categoryAcronym).toBe("MGP");
    // La fuente dice 14:00+0200 → 12:00Z.
    expect(row.startsAt.toISOString()).toBe("2026-08-30T12:00:00.000Z");
  });

  it("la carrera cae a las 7:00 a.m. en Colombia", () => {
    // La promesa central del producto, comprobada de extremo a extremo.
    const race = motogpSessions.find((b) => b.shortname === "RAC")!;
    const { startsAt } = mapBroadcast(race);

    const bogota = new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(startsAt);

    expect(bogota).toBe("07:00");
  });

  it("cubre todo el fin de semana de MotoGP", () => {
    const shortnames = motogpSessions.map((b) => b.shortname).sort();
    expect(shortnames).toEqual(
      ["FP1", "FP2", "PR", "Q1", "Q2", "RAC", "SPR", "WUP"].sort(),
    );
  });

  it("acepta sesiones sin hora de fin", () => {
    const row = mapBroadcast({ ...motogpSessions[0]!, date_end: null });
    expect(row.endsAt).toBeNull();
  });
});

describe("mapRider", () => {
  it("compone el nombre completo y los datos de equipo", () => {
    const row = mapRider(riders[0]!);
    expect(row.fullName).toBe(`${row.firstName} ${row.lastName}`);
    expect(row.ridersApiUuid).toBeTruthy();
    expect(row.countryIso).toMatch(/^[A-Z]{2}$/);
  });

  it("tolera que falten las fotos opcionales", () => {
    // Caso real y frecuente: la fuente deja casco/moto/retrato en null.
    const withoutPictures = mapRider({
      ...riders[0]!,
      current_career_step: {
        ...riders[0]!.current_career_step,
        pictures: {
          profile: { main: null, secondary: null },
          bike: { main: null, secondary: null },
          helmet: { main: null, secondary: null },
          number: null,
          portrait: null,
        },
      },
    });

    expect(withoutPictures.profilePictureUrl).toBeNull();
    expect(withoutPictures.helmetUrl).toBeNull();
    // Pero la identidad se conserva: la UI puede caer a las iniciales.
    expect(withoutPictures.fullName).toBeTruthy();
  });

  it("tolera pilotos sin `current_career_step`", () => {
    const retired = mapRider({ ...riders[0]!, current_career_step: null });
    expect(retired.teamName).toBeNull();
    expect(retired.number).toBeNull();
    expect(retired.inGrid).toBe(false);
    expect(retired.fullName).toBeTruthy();
  });

  it("al menos un piloto del fixture trae foto de perfil", () => {
    const withPhoto = riders.map(mapRider).filter((r) => r.profilePictureUrl);
    expect(withPhoto.length).toBeGreaterThan(0);
    expect(withPhoto[0]!.profilePictureUrl).toContain("photos.motogp.com");
  });
});
