import type { z } from "zod";
import {
  classificationSchema,
  eventsSchema,
  resultsCategoriesSchema,
  resultsEventsSchema,
  resultsSessionsSchema,
  ridersSchema,
  seasonsSchema,
  standingsSchema,
} from "./schemas";

const BASE_URL = "https://api.motogp.pulselive.com/motogp/v1";

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRIES = 3;

/** Error de red o HTTP al hablar con la fuente. */
export class MotoGpApiError extends Error {
  constructor(
    message: string,
    readonly url: string,
    readonly status?: number,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "MotoGpApiError";
  }
}

/** La respuesta llegó, pero no tiene la forma esperada. */
export class MotoGpSchemaError extends Error {
  constructor(
    message: string,
    readonly url: string,
    readonly issues: z.core.$ZodIssue[],
  ) {
    super(message);
    this.name = "MotoGpSchemaError";
  }
}

/** Los 5xx y el 429 son transitorios; los demás 4xx no se reintentan. */
function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 429;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Descarga y valida un recurso de la API.
 *
 * Reintenta los fallos transitorios con backoff exponencial más *jitter*
 * (el jitter evita que varios reintentos caigan a la vez sobre un servidor ya
 * tocado). Un fallo de validación **no** se reintenta: si el contrato cambió,
 * insistir no lo arregla, y conviene enterarse de inmediato.
 */
async function fetchAndValidate<T>(
  path: string,
  schema: z.ZodType<T>,
  {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
  }: { timeoutMs?: number; retries?: number } = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const backoff = 2 ** (attempt - 1) * 500;
      const jitter = Math.floor(Math.random() * 250);
      await sleep(backoff + jitter);
    }

    try {
      const response = await fetch(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
        // Los datos los cacheamos nosotros en Postgres: aquí siempre en vivo.
        cache: "no-store",
      });

      if (!response.ok) {
        const error = new MotoGpApiError(
          `HTTP ${response.status} al pedir ${path}`,
          url,
          response.status,
        );
        if (!isRetryableStatus(response.status)) throw error;
        lastError = error;
        continue;
      }

      const json: unknown = await response.json();
      const parsed = schema.safeParse(json);

      if (!parsed.success) {
        // Contrato roto: fallar de inmediato, sin reintentos.
        throw new MotoGpSchemaError(
          `La respuesta de ${path} no cumple el contrato esperado. ` +
            `Puede que la fuente haya cambiado.`,
          url,
          parsed.error.issues,
        );
      }

      return parsed.data;
    } catch (error) {
      if (error instanceof MotoGpSchemaError) throw error;
      if (error instanceof MotoGpApiError && error.status !== undefined) {
        if (!isRetryableStatus(error.status)) throw error;
      }
      lastError = error;
    }
  }

  throw new MotoGpApiError(
    `No se pudo obtener ${path} tras ${retries + 1} intentos`,
    url,
    undefined,
    lastError,
  );
}

/** Cliente de solo lectura de la API pública de MotoGP. */
export const motogpApi = {
  /** Temporadas del histórico, con la marca de cuál es la actual. */
  seasons: () => fetchAndValidate("/results/seasons", seasonsSchema),

  /** Categorías del API de resultados (espacio de UUID propio). */
  resultsCategories: (seasonUuid: string) =>
    fetchAndValidate(
      `/results/categories?seasonUuid=${seasonUuid}`,
      resultsCategoriesSchema,
    ),

  /** Calendario completo del año: eventos con sus sesiones y multimedia. */
  events: (year: number) =>
    fetchAndValidate(`/events?seasonYear=${year}`, eventsSchema, {
      // Es la respuesta más pesada de todas (varios MB).
      timeoutMs: 30_000,
    }),

  /** Todos los pilotos, con fotos oficiales y equipo. */
  riders: () =>
    fetchAndValidate("/riders", ridersSchema, { timeoutMs: 30_000 }),

  /** Clasificación del campeonato para una temporada y categoría. */
  standings: (seasonUuid: string, categoryUuid: string) =>
    fetchAndValidate(
      `/results/standings?seasonUuid=${seasonUuid}&categoryUuid=${categoryUuid}`,
      standingsSchema,
    ),

  /** Eventos ya finalizados, en el espacio de IDs del API de resultados. */
  finishedEvents: (seasonUuid: string) =>
    fetchAndValidate(
      `/results/events?seasonUuid=${seasonUuid}&isFinished=true`,
      resultsEventsSchema,
    ),

  /** Sesiones de un evento en el API de resultados. */
  resultsSessions: (eventUuid: string, categoryUuid: string) =>
    fetchAndValidate(
      `/results/sessions?eventUuid=${eventUuid}&categoryUuid=${categoryUuid}`,
      resultsSessionsSchema,
    ),

  /** Clasificación final de una sesión ya corrida. */
  classification: (sessionUuid: string) =>
    fetchAndValidate(
      `/results/session/${sessionUuid}/classification?test=false`,
      classificationSchema,
    ),
};

export type MotoGpApi = typeof motogpApi;
