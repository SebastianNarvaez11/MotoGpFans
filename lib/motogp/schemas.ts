import { z } from "zod";

/**
 * Contrato con api.motogp.pulselive.com.
 *
 * La fuente no está documentada y puede cambiar de forma sin aviso, así que
 * **nada llega a la base de datos sin pasar por aquí**. Se valida solo lo que
 * consumimos: Zod descarta las claves desconocidas, de modo que si Dorna añade
 * campos nuevos la ingesta sigue funcionando; solo falla —de forma ruidosa y
 * localizada— si desaparece o cambia de tipo algo que sí usamos.
 */

/**
 * Copia un objeto sin prototipo.
 *
 * La fuente usa `constructor` como nombre de campo (el fabricante de la moto:
 * Ducati, Aprilia…). En JavaScript esa propiedad es traicionera: si la clave
 * no viene, `valor.constructor` no es `undefined` sino la función `Object`
 * heredada del prototipo, así que un `.nullish()` no protegería y la
 * validación fallaría con un error desconcertante. Copiando a un objeto de
 * prototipo nulo, la ausencia de la clave significa exactamente eso.
 *
 * La copia es superficial a propósito: `constructor` solo aparece en el primer
 * nivel de estas entradas.
 */
function withoutPrototype(value: unknown): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }
  return Object.assign(Object.create(null) as object, value);
}

/** Fecha ISO. La fuente mezcla "+02:00" y "+0200"; ambas las parsea `Date`. */
const isoDate = z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
  message: "fecha no parseable",
});

const uuid = z.string().min(1);

// ─── /v1/results/seasons ─────────────────────────────────────────────────────

export const seasonSchema = z.object({
  id: uuid,
  year: z.number().int(),
  current: z.boolean(),
});

export const seasonsSchema = z.array(seasonSchema);

// ─── /v1/results/categories ──────────────────────────────────────────────────

export const resultsCategorySchema = z.object({
  id: uuid,
  name: z.string(),
});

export const resultsCategoriesSchema = z.array(resultsCategorySchema);

// ─── /v1/events (calendario) ─────────────────────────────────────────────────

/** Categoría tal como aparece dentro del calendario (espacio de IDs propio). */
const broadcastCategorySchema = z.object({
  id: uuid,
  acronym: z.string(),
  name: z.string(),
  priority: z.number().int().nullish(),
});

/**
 * Una entrada de `broadcasts`. Mezcla sesiones deportivas (`type: "SESSION"`)
 * con contenido de medios (`type: "MEDIA"`: ruedas de prensa, shows).
 */
export const broadcastSchema = z.object({
  id: uuid,
  shortname: z.string(),
  name: z.string(),
  date_start: isoDate,
  date_end: isoDate.nullish(),
  type: z.string(),
  kind: z.string(),
  status: z.string(),
  gp_day: z.number().int().nullish(),
  category: broadcastCategorySchema,
});

const assetSchema = z.object({
  type: z.string(),
  path: z.string(),
  quality: z.string().nullish(),
  mimetype: z.string().nullish(),
});

const trackAssetSchema = z.object({
  path: z.string(),
  mimetype: z.string().nullish(),
});

const circuitSchema = z.object({
  id: uuid,
  name: z.string(),
  city: z.string().nullish(),
  track: z
    .object({
      assets: z
        .object({
          info: trackAssetSchema.nullish(),
          simple: trackAssetSchema.nullish(),
        })
        .nullish(),
    })
    .nullish(),
});

export const eventSchema = z.object({
  id: uuid,
  name: z.string(),
  shortname: z.string(),
  additional_name: z.string().nullish(),
  /** Número de ronda. Los tests pretemporada no lo traen. */
  sequence: z.number().int().nullish(),
  country: z.string(),
  time_zone: z.string(),
  date_start: isoDate,
  date_end: isoDate,
  status: z.string(),
  has_results: z.boolean().nullish(),
  /** "GP" para los grandes premios; los tests usan otros valores. */
  kind: z.string(),
  /** "SPORT" | "MEDIA" | "TEST" */
  type: z.string(),
  season: z.object({
    id: uuid,
    year: z.number().int(),
    current: z.boolean().nullish(),
  }),
  /** Null en los eventos de medios (presentaciones de equipo). Los GP siempre lo traen. */
  circuit: circuitSchema.nullish(),
  categories: z.array(broadcastCategorySchema).nullish(),
  assets: z.array(assetSchema).nullish(),
  broadcasts: z.array(broadcastSchema).nullish(),
});

export const eventsSchema = z.array(eventSchema);

// ─── /v1/riders ──────────────────────────────────────────────────────────────

const picturePairSchema = z.object({
  main: z.string().nullish(),
  secondary: z.string().nullish(),
});

const riderPicturesSchema = z.object({
  profile: picturePairSchema.nullish(),
  bike: picturePairSchema.nullish(),
  helmet: picturePairSchema.nullish(),
  number: z.string().nullish(),
  portrait: z.string().nullish(),
});

const teamSchema = z.object({
  id: uuid,
  name: z.string(),
  color: z.string().nullish(),
  picture: z.string().nullish(),
  constructor: z.object({ id: uuid, name: z.string() }).nullish(),
});

const careerStepSchema = z.object({
  season: z.number().int().nullish(),
  number: z.number().int().nullish(),
  sponsored_team: z.string().nullish(),
  short_nickname: z.string().nullish(),
  in_grid: z.boolean().nullish(),
  current: z.boolean().nullish(),
  team: teamSchema.nullish(),
  category: z.object({ id: uuid, name: z.string() }).nullish(),
  pictures: riderPicturesSchema.nullish(),
});

export const riderSchema = z.object({
  id: uuid,
  name: z.string(),
  surname: z.string(),
  country: z.object({
    iso: z.string(),
    name: z.string().nullish(),
    flag: z.string().nullish(),
  }),
  current_career_step: careerStepSchema.nullish(),
});

export const ridersSchema = z.array(riderSchema);

// ─── /v1/results/standings ───────────────────────────────────────────────────

/**
 * Piloto dentro del API de resultados. `riders_api_uuid` es el puente hacia
 * /v1/riders — sin él no podríamos asociar las fotos oficiales.
 */
const resultsRiderSchema = z.object({
  id: uuid,
  full_name: z.string(),
  number: z.number().int().nullish(),
  riders_api_uuid: z.string().nullish(),
  country: z.object({ iso: z.string(), name: z.string().nullish() }).nullish(),
});

const standingEntryFields = z.object({
  position: z.number().int(),
  /**
   * NO es entero: MotoGP reparte medios puntos cuando una carrera se detiene
   * antes de dos tercios de distancia. En Moto2 2026 hay valores como 197.5.
   */
  points: z.number(),
  rider: resultsRiderSchema,
  team: z.object({ name: z.string() }).nullish(),
  constructor: z.object({ name: z.string() }).nullish(),
  race_wins: z.number().int().nullish(),
  podiums: z.number().int().nullish(),
  sprint_wins: z.number().int().nullish(),
  sprint_podiums: z.number().int().nullish(),
  position_change: z.number().int().nullish(),
});

/** Envuelto para neutralizar la herencia de `constructor` — ver withoutPrototype. */
export const standingEntrySchema = z.preprocess(
  withoutPrototype,
  standingEntryFields,
);

export const standingsSchema = z.object({
  classification: z.array(standingEntrySchema),
});

// ─── /v1/results/events ──────────────────────────────────────────────────────

export const resultsEventSchema = z.object({
  id: uuid,
  name: z.string(),
  short_name: z.string(),
  season: z.object({ year: z.number().int() }).nullish(),
  status: z.string().nullish(),
  test: z.boolean().nullish(),
});

export const resultsEventsSchema = z.array(resultsEventSchema);

// ─── /v1/results/sessions ────────────────────────────────────────────────────

/**
 * Sesión en el API de resultados. Identificada por `type` + `number`
 * ("FP" + 1), mientras el calendario usa un único `shortname` ("FP1").
 * `sessionKey()` reconcilia ambos.
 */
export const resultsSessionSchema = z.object({
  id: uuid,
  type: z.string(),
  number: z.number().int().nullish(),
  category: z.object({ id: uuid, name: z.string().nullish() }).nullish(),
});

export const resultsSessionsSchema = z.array(resultsSessionSchema);

/** "FP" + 1 → "FP1"; "RAC" + null → "RAC". Coincide con el shortname del calendario. */
export function sessionKey(type: string, number?: number | null): string {
  return `${type}${number ?? ""}`;
}

// ─── /v1/results/session/{id}/classification ─────────────────────────────────

const classificationRowFields = z.object({
  position: z.number().int().nullish(),
  /** Fraccionario en carreras acortadas — ver `standingEntrySchema`. */
  points: z.number().nullish(),
  rider: resultsRiderSchema,
  team: z.object({ name: z.string() }).nullish(),
  constructor: z.object({ name: z.string() }).nullish(),
  time: z.string().nullish(),
  gap: z.object({ first: z.string().nullish() }).nullish(),
  total_laps: z.number().int().nullish(),
  average_speed: z.number().nullish(),
  status: z.string().nullish(),
});

/** Envuelto igual que la clasificación del campeonato. */
export const classificationRowSchema = z.preprocess(
  withoutPrototype,
  classificationRowFields,
);

export const classificationSchema = z.object({
  classification: z.array(classificationRowSchema),
});

export type Season = z.infer<typeof seasonSchema>;
export type MotoGpEvent = z.infer<typeof eventSchema>;
export type Broadcast = z.infer<typeof broadcastSchema>;
export type Rider = z.infer<typeof riderSchema>;
export type StandingEntryRaw = z.infer<typeof standingEntryFields>;
export type ResultsEvent = z.infer<typeof resultsEventSchema>;
export type ResultsSession = z.infer<typeof resultsSessionSchema>;
export type ClassificationRow = z.infer<typeof classificationRowFields>;
