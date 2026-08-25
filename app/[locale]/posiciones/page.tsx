import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppHeader } from "@/components/AppHeader";
import { CategoryTabs } from "@/components/CategoryTabs";
import { GlassCard } from "@/components/GlassCard";
import { StandingsTable } from "@/components/StandingsTable";
import { LocationSheet } from "@/components/LocationSheet";
import {
  getCurrentSeason,
  getSeasonEvents,
  getStandings,
  isCategoryAcronym,
} from "@/lib/data/cached";
import { buildMetadata } from "@/lib/seo";
import { getTimeZone } from "@/lib/timezone";

export const revalidate = 600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "standings" });

  return buildMetadata({
    locale,
    path: "/posiciones",
    title: `${t("title")} | MotoGP Fans`,
    description: t("metaDescription"),
  });
}

export default async function StandingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ clase?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { clase } = await searchParams;
  const category = clase && isCategoryAcronym(clase) ? clase : "MGP";

  const t = await getTranslations("standings");
  const timeZone = await getTimeZone();
  const now = new Date();

  const season = await getCurrentSeason();
  const [rows, events] = season
    ? await Promise.all([
        getStandings(season.id, category),
        getSeasonEvents(season.id),
      ])
    : [[], []];

  const roundsRun = events.filter((e) => e.endsAt < now).length;

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
          {t("subtitle", { rounds: roundsRun })}
        </p>
      </div>

      <CategoryTabs
        active={category}
        hrefFor={(c) =>
          c === "MGP" ? "/posiciones" : `/posiciones?clase=${c}`
        }
      />

      {season ? (
        <StandingsTable rows={rows} locale={locale} />
      ) : (
        <GlassCard className="p-[18px]">
          <p className="text-[13px] text-white/55">{t("empty")}</p>
        </GlassCard>
      )}
    </div>
  );
}
