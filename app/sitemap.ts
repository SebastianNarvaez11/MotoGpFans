import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getCurrentSeason, getSeasonEvents } from "@/lib/data/cached";
import { env } from "@/lib/env";

/**
 * Mapa del sitio.
 *
 * Se genera **por petición y no al construir** a propósito: la lista de Grandes
 * Premios sale de la base de datos, y prerenderizarla ataría cada despliegue a
 * que la base estuviera despierta y accesible en ese momento. Un sitemap lo
 * piden los rastreadores de tarde en tarde, así que generarlo al vuelo no
 * cuesta nada — y las consultas ya vienen de caché.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const staticPaths = ["", "/calendario", "/posiciones"];

  // Si la base de datos no responde, se devuelve un sitemap válido con las
  // páginas fijas en lugar de un error: es preferible que un buscador vea
  // parte del sitio a que no vea nada.
  let eventPaths: string[] = [];
  try {
    const season = await getCurrentSeason();
    const events = season ? await getSeasonEvents(season.id) : [];
    eventPaths = events.map((event) => `/gp/${event.slug}`);
  } catch (error) {
    console.error("No se pudieron listar los GP para el sitemap:", error);
  }

  const allPaths = [...staticPaths, ...eventPaths];

  return allPaths.flatMap((path) =>
    routing.locales.map((locale) => ({
      url: `${base}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: (path === "" ? "hourly" : "daily") as "hourly" | "daily",
      priority: path === "" ? 1 : 0.8,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((alt) => [alt, `${base}/${alt}${path}`]),
        ),
      },
    })),
  );
}
