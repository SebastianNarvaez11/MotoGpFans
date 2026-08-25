import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppHeader } from "@/components/AppHeader";
import { CountryFlag } from "@/components/CountryFlag";
import { GlassCard } from "@/components/GlassCard";
import { LocationSheet } from "@/components/LocationSheet";
import { Link } from "@/i18n/navigation";
import {
  getCurrentSeason,
  getEventSessions,
  getSeasonEvents,
} from "@/lib/data/cached";
import { formatDateRange, formatTime } from "@/lib/time";
import { buildMetadata } from "@/lib/seo";
import { getTimeZone } from "@/lib/timezone";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "calendar" });

  return buildMetadata({
    locale,
    path: "/calendario",
    title: `${t("title")} | MotoGP Fans`,
    description: t("metaDescription"),
  });
}

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("calendar");
  const tGp = await getTranslations("gpNames");
  const timeZone = await getTimeZone();
  const now = new Date();

  const season = await getCurrentSeason();
  const events = season ? await getSeasonEvents(season.id) : [];

  const past = events.filter((e) => e.endsAt < now);
  const nextEvent = events.find((e) => e.endsAt >= now) ?? null;
  const upcoming = events.filter(
    (e) => e.endsAt >= now && e.id !== nextEvent?.id,
  );

  // Hora de la carrera del próximo GP, para anunciarla en la tarjeta destacada.
  const nextRace = nextEvent
    ? (await getEventSessions(nextEvent.id, "MGP")).find(
        (s) => s.shortname === "RAC",
      )
    : null;

  return (
    <div className="flex flex-col gap-[14px] pt-[18px] md:pt-8">
      <AppHeader
        chips={
          <LocationSheet current={timeZone} referenceIso={now.toISOString()} />
        }
      />

      <div className="flex flex-col gap-[2px]">
        <h1 className="text-[34px] font-black tracking-[-.01em] uppercase">
          {t("title")}
        </h1>
        <p className="text-[13px] text-white/55">
          {t("season", { year: season?.year ?? "" })} ·{" "}
          {t("progress", { done: past.length, total: events.length })}
        </p>
      </div>

      {/* Rondas ya corridas: atenuadas, como en el diseño. */}
      {past.length > 0 ? (
        <ol className="flex flex-col gap-[6px] opacity-55">
          {past.map((event) => (
            <li key={event.id}>
              <Link
                href={`/gp/${event.slug}`}
                className="grid grid-cols-[26px_1fr_auto_16px] items-center gap-[10px] rounded-[14px] border border-white/[.08] bg-[rgba(15,16,22,.45)] px-3 py-[9px] backdrop-blur-[20px] transition-opacity hover:opacity-100"
              >
                <span className="text-xs font-black text-white/50">
                  {String(event.round).padStart(2, "0")}
                </span>
                <span className="truncate text-[13px] font-bold">
                  <CountryFlag iso={event.countryIso} className="mr-1" />
                  {tGp(event.shortname as never)}
                </span>
                <span className="text-xs text-white/50">
                  {formatDateRange(
                    event.startsAt,
                    event.endsAt,
                    event.circuitTimeZone,
                    locale,
                  )}
                </span>
                <span
                  aria-label={t("done")}
                  className="text-checkered font-extrabold"
                >
                  ✓
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : null}

      {/* Próxima ronda destacada. */}
      {nextEvent ? (
        <GlassCard
          as={Link}
          variant="hot"
          href={`/gp/${nextEvent.slug}`}
          className="relative flex flex-col gap-[10px] overflow-hidden p-5"
        >
          <span
            aria-hidden
            className="numeral-ghost absolute -top-6 -right-2 text-[120px]"
          >
            {nextEvent.round}
          </span>
          <span className="text-race-label text-[11px] font-extrabold tracking-[.22em] uppercase">
            {t("nextRound")}
          </span>
          <h2 className="m-0 text-[26px] leading-none font-black uppercase">
            <CountryFlag iso={nextEvent.countryIso} className="mr-2" />
            {tGp(nextEvent.shortname as never)}
          </h2>
          <span className="text-[13px] text-white/65">
            {nextEvent.circuitName} ·{" "}
            {formatDateRange(
              nextEvent.startsAt,
              nextEvent.endsAt,
              nextEvent.circuitTimeZone,
              locale,
            )}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-[10px]">
            <span className="bg-race rounded-full px-[18px] py-[10px] text-[13px] font-extrabold text-white shadow-[0_8px_26px_rgba(224,24,46,.4)]">
              {t("seeSchedule")}
            </span>
            {nextRace ? (
              <span className="text-xs font-bold text-white/60">
                {t("race")} · {formatTime(nextRace.startsAt, timeZone, locale)}
              </span>
            ) : null}
          </span>
        </GlassCard>
      ) : null}

      {/* Rondas futuras. */}
      {upcoming.length > 0 ? (
        <ol className="flex flex-col gap-2">
          {upcoming.map((event) => {
            const isFinale = event.round === events.length;
            return (
              <li key={event.id}>
                <Link
                  href={`/gp/${event.slug}`}
                  className="glass rounded-tile grid grid-cols-[26px_1fr_auto] items-center gap-[10px] px-[14px] py-[13px] transition-colors hover:bg-[rgba(25,26,34,.6)]"
                >
                  <span className="text-[13px] font-black text-white/55">
                    {event.round}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-bold">
                      <CountryFlag iso={event.countryIso} className="mr-1" />
                      {tGp(event.shortname as never)} · {event.circuitName}
                    </span>
                    {isFinale ? (
                      <span className="text-race-label text-[10px] font-extrabold tracking-[.16em] uppercase">
                        {t("seasonFinale")}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-white/55">
                    {formatDateRange(
                      event.startsAt,
                      event.endsAt,
                      event.circuitTimeZone,
                      locale,
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
}
