import "server-only";
import { z } from "zod";

/**
 * Validación de variables de entorno en el arranque.
 *
 * Si falta o es inválida una variable, el proceso falla de inmediato con un
 * mensaje claro — en vez de propagar `undefined` hasta un error opaco en
 * producción. Este módulo es server-only: importarlo desde un componente de
 * cliente es un error de compilación, así que los secretos no pueden filtrarse
 * al navegador.
 */
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  /** Postgres (Neon). En la app usamos la cadena *pooled*. */
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL es obligatoria")
    .refine(
      (v) => v.startsWith("postgres://") || v.startsWith("postgresql://"),
      "DATABASE_URL debe ser una cadena de conexión de PostgreSQL",
    ),

  /** Conexión directa (sin pooler): la usa Prisma Migrate. */
  DIRECT_URL: z
    .string()
    .refine(
      (v) => v.startsWith("postgres://") || v.startsWith("postgresql://"),
      "DIRECT_URL debe ser una cadena de conexión de PostgreSQL",
    )
    .optional(),

  /**
   * Secreto que autoriza POST /api/ingest. Lo envía el cron de GitHub Actions.
   * Mínimo 32 caracteres: se compara en tiempo constante, pero un secreto corto
   * sigue siendo un secreto débil.
   */
  INGEST_SECRET: z
    .string()
    .min(32, "INGEST_SECRET debe tener al menos 32 caracteres"),

  /** URL base pública, para metadata absoluta (OG, sitemap, hreflang). */
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});

function load() {
  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `  · ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Variables de entorno inválidas:\n${detail}\n\nRevisa tu .env — usa .env.example como referencia.`,
    );
  }

  return parsed.data;
}

export const env = load();

export type Env = z.infer<typeof schema>;
