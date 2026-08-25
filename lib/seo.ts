import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { env } from "@/lib/env";

const BASE_URL = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

/**
 * Construye la metadata de una página con sus alternativas de idioma.
 *
 * El `hreflang` es lo que evita que un buscador trate `/es/calendario` y
 * `/en/calendario` como contenido duplicado: le dice que son la misma página
 * en dos idiomas y que muestre la que corresponda a cada visitante.
 */
export function buildMetadata({
  locale,
  path,
  title,
  description,
  image,
}: {
  locale: string;
  /** Ruta sin el prefijo de idioma: "", "/calendario", "/gp/aragon". */
  path: string;
  title: string;
  description: string;
  image?: string | null;
}): Metadata {
  const canonical = `${BASE_URL}/${locale}${path}`;

  const languages = Object.fromEntries(
    routing.locales.map((alt) => [alt, `${BASE_URL}/${alt}${path}`]),
  );

  return {
    title,
    description,
    metadataBase: new URL(BASE_URL),
    alternates: {
      canonical,
      languages: {
        ...languages,
        "x-default": `${BASE_URL}/${routing.defaultLocale}${path}`,
      },
    },
    openGraph: {
      type: "website",
      siteName: "MotoGP Fans",
      title,
      description,
      url: canonical,
      locale,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

/**
 * Datos estructurados de un Gran Premio (schema.org/SportsEvent).
 *
 * Es lo que permite que un buscador muestre la fecha y el lugar del GP
 * directamente en sus resultados, sin que nadie tenga que entrar.
 */
export function sportsEventJsonLd({
  name,
  startsAt,
  endsAt,
  circuitName,
  countryIso,
  url,
  image,
}: {
  name: string;
  startsAt: Date;
  endsAt: Date;
  circuitName: string;
  countryIso: string;
  url: string;
  image?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name,
    startDate: startsAt.toISOString(),
    endDate: endsAt.toISOString(),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: circuitName,
      address: { "@type": "PostalAddress", addressCountry: countryIso },
    },
    sport: "Motorcycle racing",
    url,
    ...(image ? { image: [image] } : {}),
  };
}
