import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppHeader } from "@/components/AppHeader";
import { CountryFlag } from "@/components/CountryFlag";
import { EventHero } from "@/components/EventHero";
import { GlassCard } from "@/components/GlassCard";
import { RiderAvatar } from "@/components/RiderAvatar";
import { ScheduleCard } from "@/components/ScheduleCard";
import { LocationSheet } from "@/components/LocationSheet";
import { Link } from "@/i18n/navigation";
import {
  getCurrentSeason,
  getEventSessions,
  getNextEvent,
  getRecentRaceWinners,
  getSeasonEvents,
  getStandings,
} from "@/lib/data/cached";
import { toSessionRows } from "@/lib/data/view";
import { formatPoints, formatShortDate } from "@/lib/time";
import { buildMetadata } from "@/lib/seo";
import { getTimeZone } from "@/lib/timezone";

/** Los datos solo cambian con la ingesta: se revalidan cada 10 minutos. */
export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });
  const tGp = await getTranslations({ locale, namespace: "gpNames" });

  const season = await getCurrentSeason();
  const nextEvent = season ? await getNextEvent(season.id) : null;

  const title = nextEvent
    ? `${tGp(nextEvent.shortname as never)} — ${t("nextGp")} | MotoGP Fans`
    : "MotoGP Fans";

  return buildMetadata({
    locale,
    path: "",
    title,
    description: t("metaDescription"),
    image: nextEvent?.backgroundUrl,
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const tGp = await getTranslations("gpNames");
  const timeZone = await getTimeZone();
  const now = new Date();

  const season = await getCurrentSeason();
  if (!season) return <EmptyState message={t("noUpcoming")} />;

  const [nextEvent, events, standings, recent] = await Promise.all([
    getNextEvent(season.id, now),
    getSeasonEvents(season.id),
    getStandings(season.id, "MGP"),
    getRecentRaceWinners(season.id, "MGP", 3),
  ]);

  const sessions = nextEvent ? await getEventSessions(nextEvent.id, "MGP") : [];
  const rows = toSessionRows(sessions, now);
  const top = standings.slice(0, 3);

  return (
    <div className="flex flex-col gap-4 pt-[18px] md:gap-7 md:pt-8">
      <AppHeader
        chips={
          <LocationSheet current={timeZone} referenceIso={now.toISOString()} />
        }
      />

      {nextEvent ? (
        <>
          {/* Móvil: hero compacto. Escritorio: hero grande, como el artboard 06. */}
          <div className="md:hidden">
            <EventHero
              event={nextEvent}
              totalRounds={events.length}
              locale={locale}
              kicker={t("nextGp")}
            />
          </div>
          <div className="hidden md:block">
            <EventHero
              event={nextEvent}
              totalRounds={events.length}
              locale={locale}
              kicker={t("nextGp")}
              size="lg"
            />
          </div>
        </>
      ) : (
        <EmptyState message={t("noUpcoming")} />
      )}

      {/* Una columna en móvil; tres en escritorio. */}
      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr] md:items-start md:gap-5">
        {nextEvent ? (
          <ScheduleCard
            sessions={rows}
            timeZone={timeZone}
            locale={locale}
            title={t("schedule")}
          >
            <Link
              href={`/gp/${nextEvent.slug}`}
              className="bg-race rounded-full px-5 py-[13px] text-center text-sm font-extrabold text-white shadow-[0_10px_34px_rgba(224,24,46,.4)] transition-opacity hover:opacity-90"
            >
              {t("seeGpDetail")}
            </Link>
          </ScheduleCard>
        ) : null}

        <GlassCard className="flex flex-col gap-3 p-[18px]">
          <h2 className="text-base font-black tracking-[.04em] uppercase">
            {t("standingsTitle", { category: "MotoGP" })}
          </h2>
          <div className="flex flex-col gap-[10px]">
            {top.map((entry) => (
              <div
                key={entry.id}
                className="grid grid-cols-[18px_34px_1fr_auto] items-center gap-[10px]"
              >
                <span
                  className={`text-sm font-black ${
                    entry.position === 1 ? "" : "text-white/70"
                  }`}
                >
                  {entry.position}
                </span>
                <RiderAvatar
                  fullName={entry.rider.fullName}
                  pictureUrl={entry.rider.profilePictureUrl}
                  size={34}
                  accent={entry.rider.teamColor}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-extrabold">
                    <CountryFlag
                      iso={entry.rider.countryIso}
                      className="mr-1"
                    />
                    {entry.rider.fullName}
                  </span>
                  <span className="truncate text-[11px] text-white/50">
                    {entry.teamName}
                  </span>
                </span>
                <span className="tabular text-race-hot text-base font-black">
                  {formatPoints(entry.points, locale)}
                </span>
              </div>
            ))}
          </div>
          <Link href="/posiciones" className="text-[13px] font-bold">
            {t("seeFullStandings")} →
          </Link>
        </GlassCard>

        {/* Resultados recientes: solo en escritorio, como en el diseño. */}
        {recent.length > 0 ? (
          <GlassCard className="hidden flex-col gap-[14px] p-[18px] md:flex">
            <h2 className="text-base font-black tracking-[.04em] uppercase">
              {t("recentResults")}
            </h2>
            <div className="flex flex-col gap-3">
              {recent.map((race) => (
                <Link
                  key={race.id}
                  href={`/gp/${race.event.slug}`}
                  className="flex min-w-0 flex-col transition-opacity hover:opacity-80"
                >
                  <span className="truncate text-[13px] font-extrabold">
                    <CountryFlag iso={race.event.countryIso} className="mr-1" />
                    {tGp(race.event.shortname as never)}
                  </span>
                  <span className="truncate text-[11px] text-white/50">
                    {race.winner ? t("wonBy", { rider: race.winner }) : "—"} ·{" "}
                    {formatShortDate(race.startsAt, timeZone, locale)}
                  </span>
                </Link>
              ))}
            </div>
          </GlassCard>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <GlassCard className="p-[18px]">
      <p className="text-[13px] text-white/55">{message}</p>
    </GlassCard>
  );
}
