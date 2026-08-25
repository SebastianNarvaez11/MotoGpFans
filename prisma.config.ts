import path from "node:path";
import { defineConfig } from "prisma/config";

/**
 * Configuración de Prisma CLI.
 * Sustituye a la clave `prisma` de package.json, deprecada desde Prisma 6.19.
 *
 * Ojo: en cuanto existe este archivo, Prisma deja de cargar `.env` por su
 * cuenta, así que hay que hacerlo explícitamente o las migraciones no
 * encontrarían DATABASE_URL / DIRECT_URL.
 */
try {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
} catch {
  // Sin .env (p. ej. en CI, donde las variables llegan del entorno): seguimos.
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
