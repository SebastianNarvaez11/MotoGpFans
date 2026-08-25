import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AppBackground } from "@/components/AppBackground";
import { BrandMark } from "@/components/BrandMark";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { PillNav } from "@/components/PillNav";
import { SiteFooter } from "@/components/SiteFooter";
import { routing } from "@/i18n/routing";
import "../globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

/** `viewport-fit=cover` es lo que activa las variables `env(safe-area-inset-*)`. */
export const viewport: Viewport = {
  themeColor: "#08080b",
  colorScheme: "dark",
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "MotoGP Fans",
  description:
    "Horarios de MotoGP en tu hora local, calendario y posiciones del campeonato.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${archivo.variable} h-full`}>
      <body className="min-h-full">
        <NextIntlClientProvider>
          <AppBackground />
          <PillNav brand={<BrandMark />} chips={<LocaleSwitcher />} />
          {/* El relleno inferior deja sitio al navbar flotante y añade el
              `safe-area` del dispositivo: sin él, en iPhone el navbar quedaría
              pisado por la barra de gestos del sistema. */}
          <main className="relative z-10 mx-auto w-full max-w-[1280px] px-[18px] pb-[calc(7rem+env(safe-area-inset-bottom))] md:px-12 md:pb-12">
            {children}
            <SiteFooter />
          </main>

          {/* Analítica de Vercel: sin cookies y sin identificar a nadie, así
              que no hace falta pedir consentimiento. Los scripts se sirven
              desde nuestro propio dominio (`/_vercel/...`), que es lo que
              permite que la CSP los admita con `'self'`. */}
          <Analytics />
          <SpeedInsights />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
