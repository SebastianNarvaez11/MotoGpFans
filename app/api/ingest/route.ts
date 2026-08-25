import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { bearerToken, secretsMatch } from "@/lib/auth-secret";
import { DATA_TAG } from "@/lib/data/cached";
import { env } from "@/lib/env";
import {
  INGEST_PRESETS,
  type IngestTask,
  isIngestPreset,
  isIngestTask,
  resolveTargetYear,
  runIngest,
} from "@/lib/ingest/run";
import { rateLimit } from "@/lib/rate-limit";

/** La ingesta escribe en la base de datos: nunca debe cachearse ni pre-renderizarse. */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * POST /api/ingest — refresca los datos desde la API de MotoGP.
 *
 * Lo invoca el cron de GitHub Actions con `Authorization: Bearer <INGEST_SECRET>`.
 *
 *   ?preset=full         seasons + calendar + riders + standings + results (diario)
 *   ?preset=live         standings + results (cada hora en fin de semana de GP)
 *   ?tasks=calendar,riders   selección explícita
 *   ?year=2026           temporada objetivo (por defecto, la marcada como actual)
 */
export async function POST(request: Request) {
  // Se limita por IP antes de mirar el secreto, para que el propio endpoint no
  // sirva de oráculo de fuerza bruta.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "desconocida";
  const limit = rateLimit(`ingest:${ip}`, { limit: 10, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Demasiadas peticiones" },
      {
        status: 429,
        headers: { "retry-after": String(limit.retryAfterSeconds) },
      },
    );
  }

  const token = bearerToken(request.headers.get("authorization"));
  if (!token || !secretsMatch(token, env.INGEST_SECRET)) {
    // Mismo mensaje para "sin token" y "token incorrecto": no se confirma
    // a un atacante si acertó el formato.
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const presetParam = url.searchParams.get("preset") ?? "full";
  const tasksParam = url.searchParams.get("tasks");
  const yearParam = url.searchParams.get("year");

  let tasks: readonly IngestTask[];

  if (tasksParam) {
    const requested = tasksParam.split(",").map((t) => t.trim());
    const invalid = requested.filter((t) => !isIngestTask(t));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Tareas desconocidas: ${invalid.join(", ")}` },
        { status: 400 },
      );
    }
    tasks = requested as IngestTask[];
  } else {
    if (!isIngestPreset(presetParam)) {
      return NextResponse.json(
        { error: `Preset desconocido: ${presetParam}` },
        { status: 400 },
      );
    }
    tasks = INGEST_PRESETS[presetParam];
  }

  let year: number;
  if (yearParam) {
    const parsed = Number.parseInt(yearParam, 10);
    if (!Number.isInteger(parsed) || parsed < 1949 || parsed > 2100) {
      return NextResponse.json({ error: "Año inválido" }, { status: 400 });
    }
    year = parsed;
  } else {
    year = await resolveTargetYear();
  }

  // `maxEvents` acota el trabajo de una ejecución para no chocar con el límite
  // de duración del entorno serverless; `force` permite reingerir resultados ya
  // almacenados cuando la fuente los corrige.
  const maxEventsParam = url.searchParams.get("maxEvents");
  const maxEvents = maxEventsParam
    ? Number.parseInt(maxEventsParam, 10)
    : undefined;
  if (
    maxEvents !== undefined &&
    (!Number.isInteger(maxEvents) || maxEvents < 1)
  ) {
    return NextResponse.json({ error: "maxEvents inválido" }, { status: 400 });
  }

  const result = await runIngest(tasks, year, {
    maxEvents,
    force: url.searchParams.get("force") === "true",
  });

  // Las páginas sirven las consultas desde caché; sin esta señal seguirían
  // mostrando los datos anteriores hasta que caducara la red de seguridad.
  // Se invalida aunque alguna tarea falle: lo que sí entró debe verse ya.
  const wroteSomething = result.tasks.some((task) => task.upserted > 0);
  if (wroteSomething) {
    // `{ expire: 0 }` caduca las entradas de inmediato. En Next 16 el segundo
    // argumento es obligatorio y define cuánta obsolescencia se tolera.
    revalidateTag(DATA_TAG, { expire: 0 });
  }

  // 207 cuando alguna tarea falló pero otras funcionaron: el cron debe notarlo
  // sin que un fallo parcial se confunda con un éxito.
  return NextResponse.json(
    { ...result, cacheInvalidated: wroteSomething },
    { status: result.ok ? 200 : 207 },
  );
}

/** Cualquier otro método se rechaza explícitamente. */
export async function GET() {
  return NextResponse.json(
    { error: "Método no permitido: usa POST" },
    { status: 405, headers: { allow: "POST" } },
  );
}
