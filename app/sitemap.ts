import type { MetadataRoute } from "next";
import { getCurrentSeason, getSeasonEvents } from "@/lib/data/cached";
import { env } from "@/lib/env";
import { routing } from "@/i18n/routing";

/**
 * Mapa del sitio, generado desde la base de datos.
 *
 * Incluye las páginas fijas y una entrada por Gran Premio, en los dos idiomas.
 * Cada URL declara sus alternativas con `hreflang` para que un buscador
 * entienda que son la misma página en otro idioma y no contenido duplicado.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

  const staticPaths = ["", "/calendario", "/posiciones"];

  const season = await getCurrentSeason();
  const events = season ? await getSeasonEvents(season.id) : [];
  const eventPaths = events.map((event) => `/gp/${event.slug}`);

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
