import { useTranslations } from "next-intl";
import { GlassCard } from "@/components/GlassCard";
import { SessionRow, type SessionForRow } from "@/components/SessionRow";
import { LocationSheet } from "@/components/LocationSheet";
import { formatDayLabel, groupByDay } from "@/lib/time";

/**
 * Horarios del fin de semana agrupados por día.
 *
 * Los días se calculan en la zona del usuario, no en la del circuito: para
 * alguien en América una sesión europea de mañana puede caer de madrugada, y
 * agrupar por el día del circuito daría cabeceras que no coinciden con su
 * calendario.
 */
export function ScheduleCard({
  sessions,
  timeZone,
  locale,
  title,
  showTimeZone = true,
  size = "md",
  children,
}: {
  sessions: readonly SessionForRow[];
  timeZone: string;
  locale: string;
  title: string;
  showTimeZone?: boolean;
  size?: "sm" | "md";
  children?: React.ReactNode;
}) {
  const t = useTranslations("gp");
  const days = groupByDay(sessions, timeZone);

  return (
    <GlassCard className="flex flex-col gap-[14px] p-[18px]">
      <div className="flex items-center justify-between gap-[10px]">
        <h2 className="text-base font-black tracking-[.04em] uppercase">
          {title}
        </h2>
        {showTimeZone ? (
          <LocationSheet
            current={timeZone}
            referenceIso={(sessions[0]?.startsAt ?? new Date()).toISOString()}
            variant="accent"
          />
        ) : null}
      </div>

      {days.length === 0 ? (
        <p className="text-[13px] text-white/50">{t("noSessions")}</p>
      ) : (
        days.map((day) => (
          <div key={day.key} className="flex flex-col gap-[6px]">
            <h3 className="border-b border-white/[.08] pb-[5px] text-[11px] font-bold tracking-[.18em] text-white/45 uppercase">
              {formatDayLabel(day.date, timeZone, locale)}
            </h3>
            {day.items.map((session) => (
              <SessionRow
                key={session.shortname + session.startsAt.toISOString()}
                session={session}
                timeZone={timeZone}
                locale={locale}
                size={size}
              />
            ))}
          </div>
        ))
      )}

      {children}
    </GlassCard>
  );
}
