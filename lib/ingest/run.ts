import "server-only";
import { prisma } from "@/lib/prisma";
import {
  type SyncResult,
  hasNewScoringSession,
  syncCalendar,
  syncResults,
  syncRiders,
  syncSeasons,
  syncStandings,
} from "./sync";

/** Tareas de ingesta disponibles. */
export const INGEST_TASKS = [
  "seasons",
  "calendar",
  "riders",
  "standings",
  "results",
] as const;

export type IngestTask = (typeof INGEST_TASKS)[number];

export function isIngestTask(value: string): value is IngestTask {
  return (INGEST_TASKS as readonly string[]).includes(value);
}

/**
 * Conjuntos de tareas según la cadencia del cron.
 *
 * `full` corre a diario: el calendario cambia poco pero conviene refrescarlo.
 * `live` corre cada hora durante los fines de semana de carrera, donde lo único
 * que se mueve son clasificaciones y resultados.
 */
export const INGEST_PRESETS = {
  full: ["seasons", "calendar", "riders", "standings", "results"],
  live: ["standings", "results"],
} as const satisfies Record<string, readonly IngestTask[]>;

export type IngestPreset = keyof typeof INGEST_PRESETS;

export function isIngestPreset(value: string): value is IngestPreset {
  return value in INGEST_PRESETS;
}

/** Ajustes que el endpoint puede pasar a las tareas. */
export type IngestOptions = {
  /** Tope de GPs cuyos resultados se sincronizan por ejecución. */
  maxEvents?: number;
  /** Reingerir resultados ya almacenados (p. ej. tras una sanción antigua). */
  force?: boolean;
};

const RUNNERS: Record<
  IngestTask,
  (year: number, options: IngestOptions) => Promise<SyncResult>
> = {
  seasons: () => syncSeasons(),
  calendar: (year) => syncCalendar(year),
  riders: () => syncRiders(),
  standings: (year, options) => runStandings(year, options),
  results: (year, options) => syncResults(year, options),
};

/**
 * La clasificación solo se descarga si terminó una carrera o un sprint desde la
 * última vez. En un fin de semana sin Gran Premio —la mayoría del año— la tarea
 * termina en milisegundos sin llamar a la fuente.
 *
 * `skipGuard` permite forzarla igualmente, por ejemplo tras una corrección de
 * la fuente o al poblar una base de datos nueva.
 */
async function runStandings(
  year: number,
  options: IngestOptions,
): Promise<SyncResult> {
  if (!options.force && !(await hasNewScoringSession(year))) {
    return { read: 0, upserted: 0 };
  }
  return syncStandings(year);
}

export type TaskOutcome = {
  task: IngestTask;
  status: "success" | "failed";
  durationMs: number;
  read: number;
  upserted: number;
  error?: string;
};

/**
 * Ejecuta una tarea dejando rastro en `ingest_runs`.
 *
 * La bitácora no es decorativa: es la que permite a `/api/health` responder si
 * los datos están frescos y a la interfaz avisar de que lleva tiempo sin
 * actualizarse cuando la fuente falla.
 */
export async function runTask(
  task: IngestTask,
  year: number,
  options: IngestOptions = {},
): Promise<TaskOutcome> {
  const startedAt = Date.now();
  const run = await prisma.ingestRun.create({
    data: { task, status: "RUNNING" },
    select: { id: true },
  });

  try {
    const { read, upserted } = await RUNNERS[task](year, options);
    const durationMs = Date.now() - startedAt;

    await prisma.ingestRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date(),
        durationMs,
        recordsRead: read,
        recordsUpserted: upserted,
      },
    });

    return { task, status: "success", durationMs, read, upserted };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : String(error);

    await prisma.ingestRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        durationMs,
        // Se recorta: un fallo de validación de Zod puede ser enorme.
        error: message.slice(0, 2000),
      },
    });

    return {
      task,
      status: "failed",
      durationMs,
      read: 0,
      upserted: 0,
      error: message,
    };
  }
}

/**
 * Ejecuta varias tareas en orden.
 *
 * El orden importa —`standings` y `results` necesitan que `seasons` y
 * `calendar` hayan corrido antes— por eso van en serie y no en paralelo. Una
 * tarea que falla no detiene a las siguientes: es preferible refrescar parte de
 * los datos que ninguno, y la bitácora deja constancia de lo que falló.
 */
export async function runIngest(
  tasks: readonly IngestTask[],
  year: number,
  options: IngestOptions = {},
): Promise<{ ok: boolean; year: number; tasks: TaskOutcome[] }> {
  const outcomes: TaskOutcome[] = [];

  for (const task of tasks) {
    const outcome = await runTask(task, year, options);
    outcomes.push(outcome);

    console.log(
      JSON.stringify({
        level: outcome.status === "success" ? "info" : "error",
        event: "ingest.task",
        task: outcome.task,
        status: outcome.status,
        durationMs: outcome.durationMs,
        read: outcome.read,
        upserted: outcome.upserted,
        ...(outcome.error ? { error: outcome.error } : {}),
      }),
    );
  }

  return {
    ok: outcomes.every((o) => o.status === "success"),
    year,
    tasks: outcomes,
  };
}

/** Temporada a ingerir: la marcada como actual, o el año en curso. */
export async function resolveTargetYear(): Promise<number> {
  const current = await prisma.season.findFirst({
    where: { current: true },
    select: { year: true },
  });
  return current?.year ?? new Date().getUTCFullYear();
}
