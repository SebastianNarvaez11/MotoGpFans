import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/**
 * Reglas para los rastreadores.
 *
 * Se permite indexar todo el contenido y se cierran las rutas de API: no
 * aportan nada a un buscador y cada visita suya consumiría cuota de ejecución.
 */
export default function robots(): MetadataRoute.Robots {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
