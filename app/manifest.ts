import type { MetadataRoute } from "next";

/**
 * Manifiesto de aplicación web.
 *
 * Permite instalar el sitio en la pantalla de inicio del móvil, que es donde se
 * consulta un calendario de carreras. `theme_color` tiñe la barra del navegador
 * del mismo negro del fondo para que no rompa el diseño a pantalla completa.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MotoGP Fans",
    short_name: "MotoGP Fans",
    description:
      "Horarios de MotoGP en tu hora local, calendario y posiciones del campeonato.",
    start_url: "/",
    display: "standalone",
    background_color: "#08080b",
    theme_color: "#08080b",
    orientation: "portrait",
    categories: ["sports"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
