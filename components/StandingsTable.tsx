import { useTranslations } from "next-intl";
import { CountryFlag } from "@/components/CountryFlag";
import { GlassCard } from "@/components/GlassCard";
import { RiderAvatar } from "@/components/RiderAvatar";
import { formatPoints } from "@/lib/time";

export type StandingRow = {
  id: string;
  position: number;
  points: number;
  teamName: string | null;
  rider: {
    fullName: string;
    number: number | null;
    countryIso: string;
    profilePictureUrl: string | null;
    teamColor: string | null;
  };
};

/**
 * Clasificación del campeonato de pilotos.
 *
 * El líder va aparte, en una tarjeta destacada con su dorsal gigante en
 * contorno, tal como en el diseño; el resto va en una lista compacta.
 */
export function StandingsTable({
  rows,
  locale,
}: {
  rows: readonly StandingRow[];
  locale: string;
}) {
  const t = useTranslations("standings");

  if (rows.length === 0) {
    return (
      <GlassCard className="p-[18px]">
        <p className="text-[13px] text-white/55">{t("empty")}</p>
      </GlassCard>
    );
  }

  const [leader, ...rest] = rows;

  return (
    <div className="flex flex-col gap-4">
      {leader ? <LeaderCard row={leader} locale={locale} /> : null}

      {rest.length > 0 ? (
        <GlassCard className="flex flex-col px-[14px] py-2">
          {rest.map((row, index) => (
            <div
              key={row.id}
              className={`grid grid-cols-[20px_38px_1fr_auto] items-center gap-[11px] py-[11px] ${
                index < rest.length - 1 ? "border-b border-white/[.07]" : ""
              }`}
            >
              <span className="text-sm font-black text-white/70">
                {row.position}
              </span>
              <RiderAvatar
                fullName={row.rider.fullName}
                pictureUrl={row.rider.profilePictureUrl}
                accent={row.rider.teamColor}
              />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-extrabold">
                  <CountryFlag iso={row.rider.countryIso} className="mr-1" />
                  {row.rider.fullName}
                </span>
                <span className="truncate text-[11px] text-white/50">
                  {row.teamName}
                  {row.rider.number != null ? ` · #${row.rider.number}` : ""}
                </span>
              </span>
              <span className="tabular text-race-hot text-[15px] font-black">
                {formatPoints(row.points, locale)}
              </span>
            </div>
          ))}
        </GlassCard>
      ) : null}

      <p className="text-center text-[11px] text-white/40">
        {t("noPhotoNote")}
      </p>
    </div>
  );
}

/** Tarjeta del líder del campeonato. */
function LeaderCard({ row, locale }: { row: StandingRow; locale: string }) {
  const t = useTranslations("standings");

  return (
    <GlassCard
      variant="hot"
      className="relative grid grid-cols-[22px_46px_1fr_auto] items-center gap-3 overflow-hidden rounded-[22px] p-4"
    >
      {row.rider.number != null ? (
        <span
          aria-hidden
          className="numeral-ghost absolute top-1/2 right-[66px] -translate-y-1/2 text-[88px]"
        >
          {row.rider.number}
        </span>
      ) : null}

      <span className="text-race-label text-base font-black">
        {row.position}
      </span>
      <RiderAvatar
        fullName={row.rider.fullName}
        pictureUrl={row.rider.profilePictureUrl}
        size={46}
        accent={row.rider.teamColor}
      />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-base font-black uppercase">
          <CountryFlag iso={row.rider.countryIso} className="mr-1" />
          {row.rider.fullName}
        </span>
        <span className="truncate text-[11px] text-white/55">
          {row.teamName}
          {row.rider.number != null ? ` · #${row.rider.number}` : ""}
        </span>
      </span>
      <span className="tabular text-race-hot relative text-xl font-black">
        {formatPoints(row.points, locale)}{" "}
        <span className="text-[10px] tracking-[.1em]">{t("points")}</span>
      </span>
    </GlassCard>
  );
}
