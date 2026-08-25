import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Umbral a partir del cual los datos se consideran obsoletos (26 h). */
const STALE_AFTER_MS = 26 * 60 * 60 * 1000;

/**
 * GET /api/health — estado del servicio.
 *
 * No basta con responder "vivo": lo que de verdad puede fallar en silencio aquí
 * es que la ingesta lleve días sin funcionar y el sitio siga sirviendo horarios
 * viejos. Por eso el health check también mira la antigüedad del último dato.
 *
 * Devuelve 503 si la base de datos no responde o si los datos están obsoletos,
 * para que la monitorización externa lo detecte.
 */
export async function GET() {
  const startedAt = Date.now();

  try {
    const [lastSuccess, lastFailure, counts] = await Promise.all([
      prisma.ingestRun.findFirst({
        where: { status: "SUCCESS" },
        orderBy: { startedAt: "desc" },
        select: { task: true, startedAt: true, finishedAt: true },
      }),
      prisma.ingestRun.findFirst({
        where: { status: "FAILED" },
        orderBy: { startedAt: "desc" },
        select: { task: true, startedAt: true, error: true },
      }),
      Promise.all([
        prisma.event.count(),
        prisma.session.count(),
        prisma.rider.count(),
        prisma.standingEntry.count(),
      ]),
    ]);

    const [events, sessions, riders, standings] = counts;
    const lastSuccessAt =
      lastSuccess?.finishedAt ?? lastSuccess?.startedAt ?? null;
    const ageMs = lastSuccessAt ? Date.now() - lastSuccessAt.getTime() : null;

    // Sin ingesta previa la base está vacía: es un despliegue nuevo, no un fallo.
    const neverIngested = lastSuccessAt === null;
    const stale = ageMs !== null && ageMs > STALE_AFTER_MS;
    const healthy = !stale && !neverIngested;

    return NextResponse.json(
      {
        status: healthy ? "ok" : neverIngested ? "sin-datos" : "obsoleto",
        database: "ok",
        latencyMs: Date.now() - startedAt,
        lastSuccessfulIngest: lastSuccessAt?.toISOString() ?? null,
        dataAgeSeconds: ageMs === null ? null : Math.round(ageMs / 1000),
        lastFailure: lastFailure
          ? {
              task: lastFailure.task,
              at: lastFailure.startedAt.toISOString(),
              error: lastFailure.error?.slice(0, 300) ?? null,
            }
          : null,
        counts: { events, sessions, riders, standings },
      },
      { status: healthy ? 200 : 503 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        database: "inaccesible",
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }
}
