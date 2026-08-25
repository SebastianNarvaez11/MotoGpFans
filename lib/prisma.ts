import "server-only";
import { PrismaClient } from "@prisma/client";

/**
 * Cliente Prisma como singleton.
 *
 * En desarrollo, el hot-reload de Next.js reevalúa los módulos en cada cambio;
 * sin este caché en `globalThis` se abriría una conexión nueva cada vez hasta
 * agotar el pool de Postgres.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
