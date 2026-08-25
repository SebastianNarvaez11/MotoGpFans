import { describe, expect, it } from "vitest";
import {
  dayKey,
  formatDateRange,
  formatDayLabel,
  formatPoints,
  formatTime,
  formatUtcOffset,
  groupByDay,
  sessionState,
  timeZoneCityName,
} from "./time";

/** Carrera de MotoGP en Aragón 2026: 14:00 en Madrid = 12:00 UTC. */
const ARAGON_RACE = new Date("2026-08-30T12:00:00Z");

describe("formatTime", () => {
  it("convierte la carrera a la hora de cada país", () => {
    // La promesa del producto, en las zonas que más importan al usuario.
    expect(formatTime(ARAGON_RACE, "America/Bogota", "es")).toMatch(/7:00/);
    expect(formatTime(ARAGON_RACE, "Europe/Madrid", "es")).toMatch(/2:00/);
    expect(formatTime(ARAGON_RACE, "America/Mexico_City", "es")).toMatch(
      /6:00/,
    );
    expect(
      formatTime(ARAGON_RACE, "America/Argentina/Buenos_Aires", "es"),
    ).toMatch(/9:00/);
  });

  it("distingue mañana de tarde", () => {
    const bogota = formatTime(ARAGON_RACE, "America/Bogota", "es");
    const madrid = formatTime(ARAGON_RACE, "Europe/Madrid", "es");
    expect(bogota).toMatch(/a\.?\s?m\.?/i);
    expect(madrid).toMatch(/p\.?\s?m\.?/i);
  });

  it("muestra el mediodía como 12, no como 0", () => {
    // En español, `hour12: true` produce el ciclo h11 y escribe "0:00 p. m.".
    // Varias carreras arrancan a mediodía en alguna zona, así que sería un
    // error visible en el dato más importante de la pantalla.
    expect(formatTime(ARAGON_RACE, "UTC", "es")).toMatch(/^12:00/);
    expect(formatTime(ARAGON_RACE, "UTC", "en")).toMatch(/^12:00/);
  });

  it("muestra la medianoche como 12 a. m.", () => {
    const medianoche = new Date("2026-08-30T00:00:00Z");
    expect(formatTime(medianoche, "UTC", "es")).toMatch(/^12:00/);
    expect(formatTime(medianoche, "UTC", "es")).toMatch(/a\.?\s?m\.?/i);
  });

  it("no altera las horas normales", () => {
    expect(formatTime(ARAGON_RACE, "America/Bogota", "es")).toMatch(/^7:00/);
    expect(formatTime(ARAGON_RACE, "Europe/Madrid", "es")).toMatch(/^2:00/);
    expect(formatTime(ARAGON_RACE, "Asia/Tokyo", "es")).toMatch(/^9:00/);
  });
});

describe("sessionState", () => {
  const start = new Date("2026-08-30T12:00:00Z");
  const end = new Date("2026-08-30T13:00:00Z");

  it("marca como próxima una sesión que no ha empezado", () => {
    expect(sessionState(start, end, new Date("2026-08-30T11:59:00Z"))).toBe(
      "upcoming",
    );
  });

  it("marca EN VIVO mientras transcurre", () => {
    expect(sessionState(start, end, new Date("2026-08-30T12:30:00Z"))).toBe(
      "live",
    );
    // También justo en los bordes.
    expect(sessionState(start, end, start)).toBe("live");
    expect(sessionState(start, end, end)).toBe("live");
  });

  it("marca como corrida una vez terminada", () => {
    expect(sessionState(start, end, new Date("2026-08-30T13:01:00Z"))).toBe(
      "past",
    );
  });

  it("asume una duración cuando falta la hora de fin", () => {
    // Caso real: la fuente deja `date_end` en null en algunas sesiones.
    expect(sessionState(start, null, new Date("2026-08-30T12:30:00Z"))).toBe(
      "live",
    );
    expect(sessionState(start, null, new Date("2026-08-30T13:00:00Z"))).toBe(
      "past",
    );
  });
});

describe("formatUtcOffset", () => {
  it("abrevia los desplazamientos en horas enteras", () => {
    expect(formatUtcOffset("America/Bogota", ARAGON_RACE)).toBe("GMT-5");
    expect(formatUtcOffset("Europe/Madrid", ARAGON_RACE)).toBe("GMT+2");
  });

  it("conserva los minutos en las zonas que no van en horas enteras", () => {
    expect(formatUtcOffset("Asia/Kolkata", ARAGON_RACE)).toBe("GMT+05:30");
  });

  it("tiene en cuenta el horario de verano según la fecha", () => {
    // Madrid es GMT+2 en agosto y GMT+1 en noviembre: no puede estar fijo.
    const noviembre = new Date("2026-11-29T13:00:00Z");
    expect(formatUtcOffset("Europe/Madrid", ARAGON_RACE)).toBe("GMT+2");
    expect(formatUtcOffset("Europe/Madrid", noviembre)).toBe("GMT+1");
  });

  it("muestra UTC sin sufijo", () => {
    // Este caso falló solo en CI: macOS devuelve "GMT" e Intl en Linux
    // "GMT+0". Ahora el desfase se calcula numéricamente, así que el
    // resultado no depende de la plataforma.
    expect(formatUtcOffset("UTC", ARAGON_RACE)).toBe("UTC");
    expect(
      formatUtcOffset("Europe/London", new Date("2026-01-15T12:00:00Z")),
    ).toBe("UTC");
  });

  it("da el mismo resultado en cualquier plataforma", () => {
    // Se comprueba contra el desfase calculado a mano, sin depender del
    // texto que produzca `Intl` en el sistema donde corran los tests.
    const casos: [string, string, number][] = [
      ["America/Bogota", "GMT-5", -300],
      ["Europe/Madrid", "GMT+2", 120],
      ["Asia/Kolkata", "GMT+05:30", 330],
      ["Asia/Tokyo", "GMT+9", 540],
      ["Australia/Melbourne", "GMT+10", 600],
      ["UTC", "UTC", 0],
    ];

    for (const [zona, esperado, minutos] of casos) {
      expect(formatUtcOffset(zona, ARAGON_RACE)).toBe(esperado);

      // Y el desfase declarado coincide de verdad con la hora que se muestra.
      const local = new Intl.DateTimeFormat("en-US", {
        timeZone: zona,
        hourCycle: "h23",
        hour: "2-digit",
        minute: "2-digit",
      }).format(ARAGON_RACE);
      const esperadaUtc = new Date(ARAGON_RACE.getTime() + minutos * 60_000);
      const esperada = new Intl.DateTimeFormat("en-US", {
        timeZone: "UTC",
        hourCycle: "h23",
        hour: "2-digit",
        minute: "2-digit",
      }).format(esperadaUtc);
      expect(local).toBe(esperada);
    }
  });
});

describe("formatDayLabel", () => {
  it("produce etiquetas cortas en mayúsculas y sin punto", () => {
    const label = formatDayLabel(ARAGON_RACE, "America/Bogota", "es");
    expect(label).toMatch(/^DOM 30$/);
  });

  it("usa el día correcto de la zona del usuario, no el del circuito", () => {
    // Sesión nocturna en Australia: allí es sábado, en Colombia aún viernes.
    const nocturna = new Date("2026-10-24T02:00:00Z");
    expect(formatDayLabel(nocturna, "Australia/Melbourne", "es")).toMatch(
      /24$/,
    );
    expect(formatDayLabel(nocturna, "America/Bogota", "es")).toMatch(/23$/);
  });
});

describe("dayKey y groupByDay", () => {
  it("agrupa las sesiones por el día natural del usuario", () => {
    const sesiones = [
      { name: "FP1", startsAt: new Date("2026-08-28T08:45:00Z") },
      { name: "PR", startsAt: new Date("2026-08-28T13:00:00Z") },
      { name: "RAC", startsAt: ARAGON_RACE },
    ];

    const grupos = groupByDay(sesiones, "America/Bogota");
    expect(grupos).toHaveLength(2);
    expect(grupos[0]!.items.map((s) => s.name)).toEqual(["FP1", "PR"]);
    expect(grupos[1]!.items.map((s) => s.name)).toEqual(["RAC"]);
  });

  it("separa en dos días lo que en otra zona sería el mismo", () => {
    // 04:30 y 05:30 UTC caen a ambos lados de la medianoche en Bogotá
    // (23:30 del 27 y 00:30 del 28), pero son la misma mañana en Madrid.
    // Es justo el motivo de agrupar por la zona del usuario y no por la del circuito.
    const sesiones = [
      { startsAt: new Date("2026-08-28T04:30:00Z") },
      { startsAt: new Date("2026-08-28T05:30:00Z") },
    ];
    expect(groupByDay(sesiones, "Europe/Madrid")).toHaveLength(1);
    expect(groupByDay(sesiones, "America/Bogota")).toHaveLength(2);
  });

  it("devuelve los grupos en orden cronológico", () => {
    const desordenadas = [
      { startsAt: ARAGON_RACE },
      { startsAt: new Date("2026-08-28T08:45:00Z") },
    ];
    const grupos = groupByDay(desordenadas, "America/Bogota");
    expect(grupos[0]!.date.getTime()).toBeLessThan(grupos[1]!.date.getTime());
  });

  it("dayKey es estable para el mismo día", () => {
    const a = new Date("2026-08-30T12:00:00Z");
    const b = new Date("2026-08-30T20:00:00Z");
    expect(dayKey(a, "America/Bogota")).toBe(dayKey(b, "America/Bogota"));
  });
});

describe("formatDateRange", () => {
  it("comprime el mes cuando el GP no lo cruza", () => {
    const inicio = new Date("2026-08-28T06:00:00Z");
    const fin = new Date("2026-08-30T16:00:00Z");
    expect(formatDateRange(inicio, fin, "Europe/Madrid", "es")).toMatch(
      /^28–30 ago/,
    );
  });

  it("muestra ambos meses cuando el GP los cruza", () => {
    // Caso real: el GP de Malasia 2026 va del 30 oct al 1 nov.
    const inicio = new Date("2026-10-30T06:00:00Z");
    const fin = new Date("2026-11-01T09:00:00Z");
    const rango = formatDateRange(inicio, fin, "Asia/Kuala_Lumpur", "es");
    expect(rango).toMatch(/oct/);
    expect(rango).toMatch(/nov/);
  });
});

describe("formatPoints", () => {
  it("muestra los enteros sin decimales", () => {
    expect(formatPoints(240, "es")).toBe("240");
  });

  it("conserva los medios puntos", () => {
    // Moto2 2026: 197,5 puntos. Redondear falsearía el campeonato.
    expect(formatPoints(197.5, "es")).toBe("197,5");
    expect(formatPoints(197.5, "en")).toBe("197.5");
  });
});

describe("timeZoneCityName", () => {
  it("extrae la ciudad del identificador IANA", () => {
    expect(timeZoneCityName("America/Bogota")).toBe("Bogota");
    expect(timeZoneCityName("America/Sao_Paulo")).toBe("Sao Paulo");
    expect(timeZoneCityName("UTC")).toBe("UTC");
  });
});
