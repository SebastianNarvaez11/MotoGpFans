import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryTabs } from "@/components/CategoryTabs";
import { CountryFlag } from "@/components/CountryFlag";
import { EventHero } from "@/components/EventHero";
import { GlassCard } from "@/components/GlassCard";
import { RiderAvatar } from "@/components/RiderAvatar";
import { ScheduleCard } from "@/components/ScheduleCard";
import { LocationSheet } from "@/components/LocationSheet";
import { Link } from "@/i18n/navigation";
import {
  getCurrentSeason,
  getEventBySlug,
  getEventSessions,
  getSeasonEvents,
  getSessionResults,
  isCategoryAcronym,
} from "@/lib/data/cached";
import { toSessionRows } from "@/lib/data/view";
import { formatPoints } from "@/lib/time";
import { buildMetadata, sportsEventJsonLd } from "@/lib/seo";
import { env } from "@/lib/env";
import { getTimeZone } from "@/lib/timezone";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "gp" });
  const tGp = await getTranslations({ locale, namespace: "gpNames" });

  const season = await getCurrentSeason();
  const event = season ? await getEventBySlug(season.id, slug) : null;
  if (!event) return { title: "MotoGP Fans" };

  const name = tGp(event.shortname as never);

  return buildMetadata({
    locale,
    path: `/gp/${slug}`,
    title: `${name} — ${t("schedule")} | MotoGP Fans`,
    description: t("metaDescription", { gp: name }),
    image: event.backgroundUrl,
  });
}

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ clase?: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const { clase } = await searchParams;
  const category = clase && isCategoryAcronym(clase) ? clase : "MGP";

  const t = await getTranslations("gp");
  const tGpNames = await getTranslations("gpNames");
  const timeZone = await getTimeZone();
  const now = new Date();

  const season = await getCurrentSeason();
  if (!season) notFound();

  const event = await getEventBySlug(season.id, slug);
  if (!event) notFound();

  const [sessions, events] = await Promise.all([
    getEventSessions(event.id, category),
    getSeasonEvents(season.id),
  ]);

  const rows = toSessionRows(sessions, now);

  // Si el GP ya se corrió, se muestra el podio de la carrera bajo los horarios.
  const race = sessions.find((s) => s.shortname === "RAC");
  const podium =
    race && race._count.results > 0 ? await getSessionResults(race.id, 3) : [];

  // Datos estructurados: permiten a un buscador mostrar fecha y lugar del GP
  // directamente en sus resultados.
  const jsonLd = sportsEventJsonLd({
    name: `${tGpNames(event.shortname as never)} ${season.year}`,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    circuitName: event.circuitName,
    countryIso: event.countryIso,
    url: `${env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}/${locale}/gp/${slug}`,
    image: event.backgroundUrl,
  });

  return (
    <div className="flex flex-col gap-[14px] pt-[18px] md:pt-8">
      <script
        type="application/ld+json"
        // El contenido lo generamos nosotros desde la base de datos: no hay
        // entrada de usuario que pudiera inyectar nada.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="flex items-center justify-between gap-[10px]">
        <Link
          href="/calendario"
          aria-label={t("back")}
          className="glass-chip inline-flex h-9 w-9 items-center justify-center rounded-full text-base"
        >
          ←
        </Link>
        <LocationSheet
          current={timeZone}
          referenceIso={now.toISOString()}
          variant="accent"
        />
      </header>

      <EventHero
        event={event}
        totalRounds={events.length}
        locale={locale}
        kicker={event.endsAt < now ? t("results") : t("schedule")}
      />

      <CategoryTabs
        active={category}
        hrefFor={(c) =>
          c === "MGP" ? `/gp/${slug}` : `/gp/${slug}?clase=${c}`
        }
      />

      <ScheduleCard
        sessions={rows}
        timeZone={timeZone}
        locale={locale}
        title={t("schedule")}
        showTimeZone={false}
      />

      {podium.length > 0 ? (
        <GlassCard className="flex flex-col gap-3 p-[18px]">
          <h2 className="text-base font-black tracking-[.04em] uppercase">
            {t("podium")}
          </h2>
          {podium.map((result) => (
            <div
              key={result.id}
              className="grid grid-cols-[20px_38px_1fr_auto] items-center gap-[11px]"
            >
              <span
                className={`text-sm font-black ${
                  result.position === 1 ? "text-race-label" : "text-white/70"
                }`}
              >
                {result.position}
              </span>
              <RiderAvatar
                fullName={result.rider.fullName}
                pictureUrl={result.rider.profilePictureUrl}
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-extrabold">
                  <CountryFlag iso={result.rider.countryIso} className="mr-1" />
                  {result.rider.fullName}
                </span>
                <span className="truncate text-[11px] text-white/50">
                  {result.teamName}
                </span>
              </span>
              <span className="tabular flex flex-col items-end">
                <span className="text-[13px] font-bold">
                  {result.position === 1
                    ? result.time
                    : (result.gapToFirst ?? result.time)}
                </span>
                <span className="text-race-hot text-[11px] font-black">
                  {formatPoints(result.points, locale)} pts
                </span>
              </span>
            </div>
          ))}
        </GlassCard>
      ) : null}

      <p className="text-center text-[11px] text-white/40">{t("legend")}</p>
    </div>
  );
}
