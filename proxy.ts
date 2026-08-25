import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * Convención "proxy" de Next.js 16 (antes "middleware").
 * Resuelve el idioma y prefija las rutas con /es o /en.
 */
export default createMiddleware(routing);

export const config = {
  // Todo excepto rutas de API, internos de Next/Vercel y archivos con extensión
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
