import { cleanName, normalizeTimeZone, slugify } from "@/lib/normalize";
import type { Broadcast, MotoGpEvent, Rider } from "@/lib/motogp/schemas";

/**
 * Traducción de la forma de la fuente a la de nuestra base de datos.
 *
 * Todo aquí es puro: sin red y sin base de datos. Es donde vive la lógica que
 * de verdad puede equivocarse (fechas, filtros, multimedia), así que es lo que
 * cubren los tests con fixtures grabados de la API real.
 */

/** Acrónimos de las clases que cubre el producto. Descarta Baggers, MotoE, etc. */
export const SUPPORTED_CATEGORIES = new Set(["MGP", "MT2", "MT3"]);

/**
 * Un Gran Premio de verdad: ni test de pretemporada ni evento de medios.
 *
 * Se exige circuito porque la fuente lo deja en `null` en las presentaciones de
 * equipo y el lanzamiento de temporada, que llegan mezclados en el calendario.
 */
export function isGrandPrix(event: MotoGpEvent): boolean {
  return (
    event.type === "SPORT" &&
    event.kind === "GP" &&
    typeof event.sequence === "number" &&
    event.circuit != null
  );
}

/** Sesión deportiva (no rueda de prensa ni show) de una clase que cubrimos. */
export function isSportSession(broadcast: Broadcast): boolean {
  return (
    broadcast.type === "SESSION" &&
    SUPPORTED_CATEGORIES.has(broadcast.category.acronym)
  );
}

type Asset = { type: string; path: string; quality?: string | null };

/**
 * Elige un asset por tipo. Cuando hay varias resoluciones (el fondo del GP
 * viene en @1x…@4x) se queda con la de menor densidad: es la que sirve
 * `next/image` como base y la que menos pesa.
 */
export function pickAsset(
  assets: Asset[] | null | undefined,
  type: string,
): string | null {
  if (!assets?.length) return null;
  const matches = assets.filter((a) => a.type === type);
  if (matches.length === 0) return null;

  const preferred =
    matches.find((a) => a.quality === "@1x") ??
    matches.find((a) => !a.quality) ??
    matches[0];

  return preferred?.path ?? null;
}

export type EventRow = {
  shortname: string;
  slug: string;
  round: number;
  sourceName: string;
  additionalName: string | null;
  countryIso: string;
  circuitName: string;
  circuitCity: string | null;
  circuitTimeZone: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  hasResults: boolean;
  backgroundUrl: string | null;
  flagUrl: string | null;
  trackSvgUrl: string | null;
  trackPngUrl: string | null;
  broadcastUuid: string;
};

/**
 * Convierte un evento del calendario en una fila de `events`.
 * Presupone que `isGrandPrix(event)` es cierto (y, por tanto, que hay circuito).
 */
export function mapEvent(event: MotoGpEvent): EventRow {
  const additionalName = event.additional_name?.trim() || null;
  const circuit = event.circuit;

  if (!circuit) {
    throw new Error(
      `El evento ${event.shortname} no tiene circuito: filtra con isGrandPrix antes de mapear.`,
    );
  }

  return {
    shortname: event.shortname.trim().toUpperCase(),
    // El slug sale del nombre limpio ("ARAGON" → "aragon"); si faltara, del código.
    slug: slugify(additionalName ?? event.shortname),
    round: event.sequence as number,
    sourceName: cleanName(event.name),
    additionalName,
    countryIso: event.country.trim().toUpperCase(),
    circuitName: cleanName(circuit.name),
    circuitCity: circuit.city?.trim() || null,
    circuitTimeZone: normalizeTimeZone(event.time_zone),
    // `Date` normaliza a UTC cualquiera de los dos formatos de desplazamiento
    // que usa la fuente ("+02:00" y "+0200").
    startsAt: new Date(event.date_start),
    endsAt: new Date(event.date_end),
    status: event.status,
    hasResults: event.has_results ?? false,
    backgroundUrl: pickAsset(event.assets, "BACKGROUND"),
    flagUrl: pickAsset(event.assets, "FLAG"),
    trackSvgUrl: circuit.track?.assets?.info?.path ?? null,
    trackPngUrl: circuit.track?.assets?.simple?.path ?? null,
    broadcastUuid: event.id,
  };
}

export type SessionRow = {
  shortname: string;
  name: string;
  kind: string;
  type: string;
  startsAt: Date;
  endsAt: Date | null;
  status: string;
  gpDay: number | null;
  broadcastUuid: string;
  categoryAcronym: string;
};

/** Convierte una entrada de `broadcasts` en una fila de `sessions`. */
export function mapBroadcast(broadcast: Broadcast): SessionRow {
  return {
    shortname: broadcast.shortname.trim().toUpperCase(),
    name: cleanName(broadcast.name),
    kind: broadcast.kind,
    type: broadcast.type,
    startsAt: new Date(broadcast.date_start),
    endsAt: broadcast.date_end ? new Date(broadcast.date_end) : null,
    status: broadcast.status,
    gpDay: broadcast.gp_day ?? null,
    broadcastUuid: broadcast.id,
    categoryAcronym: broadcast.category.acronym,
  };
}

export type RiderRow = {
  ridersApiUuid: string;
  firstName: string;
  lastName: string;
  fullName: string;
  number: number | null;
  shortName: string | null;
  countryIso: string;
  countryName: string | null;
  flagUrl: string | null;
  teamName: string | null;
  teamColor: string | null;
  teamPictureUrl: string | null;
  constructorName: string | null;
  profilePictureUrl: string | null;
  portraitUrl: string | null;
  numberPictureUrl: string | null;
  helmetUrl: string | null;
  bikeUrl: string | null;
  careerSeason: number | null;
  inGrid: boolean;
  categoryName: string | null;
};

/**
 * Convierte un piloto en una fila de `riders`.
 *
 * Casi todo el detalle vive en `current_career_step`, que puede faltar (pilotos
 * retirados). Las fotos son opcionales por diseño: la interfaz muestra las
 * iniciales cuando no hay retrato.
 */
export function mapRider(rider: Rider): RiderRow {
  const step = rider.current_career_step;
  const pictures = step?.pictures;
  const team = step?.team;

  const firstName = rider.name.trim();
  const lastName = rider.surname.trim();

  return {
    ridersApiUuid: rider.id,
    firstName,
    lastName,
    fullName: cleanName(`${firstName} ${lastName}`),
    number: step?.number ?? null,
    shortName: step?.short_nickname?.trim() || null,
    countryIso: rider.country.iso.trim().toUpperCase(),
    countryName: rider.country.name?.trim() || null,
    flagUrl: rider.country.flag ?? null,
    // `sponsored_team` es el nombre comercial completo; `team.name` el corto.
    teamName: step?.sponsored_team?.trim() || team?.name?.trim() || null,
    teamColor: team?.color ?? null,
    teamPictureUrl: team?.picture ?? null,
    constructorName: team?.constructor?.name?.trim() || null,
    profilePictureUrl: pictures?.profile?.main ?? null,
    portraitUrl: pictures?.portrait ?? null,
    numberPictureUrl: pictures?.number ?? null,
    helmetUrl: pictures?.helmet?.main ?? null,
    bikeUrl: pictures?.bike?.main ?? null,
    careerSeason: step?.season ?? null,
    inGrid: step?.in_grid ?? false,
    categoryName: step?.category?.name?.trim() || null,
  };
}
