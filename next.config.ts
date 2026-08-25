import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * Política de seguridad de contenido.
 *
 * Declara de dónde puede cargar cosas la página; todo lo demás lo bloquea el
 * navegador. Es la defensa de fondo contra la inyección de scripts.
 *
 * `'unsafe-inline'` en los scripts no es un descuido: Next.js inserta el estado
 * de hidratación como script en línea, y usar nonces obligaría a renderizar
 * cada página de forma dinámica sin caché. Los estilos van igual porque
 * Tailwind y `next/font` inyectan CSS en línea.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  // Las fotos oficiales y los trazados de circuito viven en el CDN de MotoGP.
  "img-src 'self' data: blob: https://photos.motogp.com https://resources.motogp.com",
  // `next/font` auto-hospeda Archivo: no hace falta abrir ningún dominio de fuentes.
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Fuerza HTTPS durante dos años, subdominios incluidos.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No usamos ninguna de estas capacidades: se desactivan explícitamente.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    // Multimedia oficial servida desde el CDN de MotoGP.
    remotePatterns: [
      { protocol: "https", hostname: "photos.motogp.com" },
      { protocol: "https", hostname: "resources.motogp.com" },
    ],
    /**
     * El plan gratuito de Vercel incluye 5.000 transformaciones de imagen al
     * mes, y es el límite más ajustado para un diseño lleno de fotos: **cada
     * combinación de imagen y ancho cuenta como una transformación**.
     *
     * Por eso la lista de anchos se recorta a los que el diseño usa de verdad
     * (retratos de piloto de 34-46 px y fondos a pantalla completa) en lugar de
     * los ocho anchos que Next genera por defecto.
     */
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [32, 48, 96],
    // Un mes en caché: estas fotos no cambian, y así no se regeneran.
    minimumCacheTTL: 2_678_400,
    formats: ["image/webp"],
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  // No revelar la versión del framework.
  poweredByHeader: false,
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
