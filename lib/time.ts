/**
 * Presentación de fechas y horas en la zona del usuario.
 *
 * Todo lo que llega de la base de datos son instantes en UTC. La conversión a
 * hora local ocurre **solo aquí**, al renderizar. Así "hora de Colombia" no es
 * un caso especial: es una zona más entre las que puede elegir cualquiera.
 */

/** Estado de una sesión respecto al momento actual. */
export type SessionState = "past" | "live" | "upcoming";

/** Duración asumida cuando la fuente no da hora de fin. */
const ASSUMED_SESSION_MS = 45 * 60 * 1000;

/**
 * Determina si una sesión ya se corrió, está en marcha o está por venir.
 * `now` se pasa explícitamente para que sea comprobable con tests.
 */
export function sessionState(
  startsAt: Date,
  endsAt: Date | null,
  now: Date,
): SessionState {
  const start = startsAt.getTime();
  const end = endsAt?.getTime() ?? start + ASSUMED_SESSION_MS;
  const t = now.getTime();

  if (t < start) return "upcoming";
  if (t <= end) return "live";
  return "past";
}

/**
 * Hora del día en la zona indicada: "7:00 a. m." / "7:00 AM".
 *
 * Se fija `hourCycle: "h12"` en lugar de `hour12: true` porque no son
 * equivalentes: con `hour12` el español usa el ciclo h11 y muestra el mediodía
 * como "0:00 p. m." y la medianoche como "0:00 a. m.". Justo las horas de
 * varias carreras, y justo el dato más importante de la pantalla.
 */
export function formatTime(
  instant: Date,
  timeZone: string,
  locale: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h12",
  }).format(instant);
}

/** Etiqueta de día para agrupar sesiones: "VIE 28". */
export function formatDayLabel(
  instant: Date,
  timeZone: string,
  locale: string,
): string {
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "short",
    day: "numeric",
  }).formatToParts(instant);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";

  // Se quita el punto que algunos idiomas añaden al día abreviado ("vie.").
  return `${weekday.replace(/\.$/, "").toUpperCase()} ${day}`;
}

/** Rango de fechas de un GP: "28–30 ago". */
export function formatDateRange(
  start: Date,
  end: Date,
  timeZone: string,
  locale: string,
): string {
  const dayOf = (d: Date) =>
    new Intl.DateTimeFormat(locale, { timeZone, day: "numeric" }).format(d);
  const monthOf = (d: Date) =>
    new Intl.DateTimeFormat(locale, { timeZone, month: "short" })
      .format(d)
      .replace(/\.$/, "");

  const startMonth = monthOf(start);
  const endMonth = monthOf(end);

  return startMonth === endMonth
    ? `${dayOf(start)}–${dayOf(end)} ${startMonth}`
    : `${dayOf(start)} ${startMonth} – ${dayOf(end)} ${endMonth}`;
}

/** Fecha corta para listas: "11–13 sep". */
export function formatShortDate(
  instant: Date,
  timeZone: string,
  locale: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "numeric",
    month: "short",
  })
    .format(instant)
    .replace(/\.$/, "");
}

/**
 * Desplazamiento respecto a UTC, como lo espera un usuario: "GMT-5".
 *
 * Se calcula con `Intl` en lugar de a mano porque depende de la fecha: media
 * Europa cambia de horario dos veces al año, y una carrera de noviembre no
 * tiene el mismo desplazamiento que una de agosto.
 */
export function formatUtcOffset(timeZone: string, instant: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(instant);

  const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";

  // "GMT+05:30" se conserva; "GMT-05:00" se abrevia a "GMT-5".
  return raw
    .replace(/^GMT([+-])0?(\d+):00$/, "GMT$1$2")
    .replace(/^GMT$/, "UTC");
}

/**
 * Nombre legible de una zona horaria: "Bogotá" a partir de "America/Bogota".
 * Se usa cuando no hay una etiqueta escogida por el usuario.
 */
export function timeZoneCityName(timeZone: string): string {
  const last = timeZone.split("/").pop() ?? timeZone;
  return last.replace(/_/g, " ");
}

/** Clave estable de día (en la zona dada) para agrupar sesiones. */
export function dayKey(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/**
 * Agrupa sesiones por día natural **en la zona del usuario**.
 *
 * El detalle que importa: para alguien en Colombia, la carrera del domingo a
 * las 14:00 en España cae el domingo a las 7:00 —mismo día—, pero una sesión
 * nocturna en Australia puede caer el día anterior. Agrupar por el día del
 * circuito daría cabeceras equivocadas.
 */
export function groupByDay<T extends { startsAt: Date }>(
  items: readonly T[],
  timeZone: string,
): { key: string; date: Date; items: T[] }[] {
  const groups = new Map<string, { key: string; date: Date; items: T[] }>();

  for (const item of items) {
    const key = dayKey(item.startsAt, timeZone);
    const group = groups.get(key);
    if (group) {
      group.items.push(item);
    } else {
      groups.set(key, { key, date: item.startsAt, items: [item] });
    }
  }

  return [...groups.values()].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
}

/** Formatea puntos del campeonato: 197.5 → "197,5"; 240 → "240". */
export function formatPoints(points: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  }).format(points);
}
