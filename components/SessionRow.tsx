import { useTranslations } from "next-intl";
import { formatTime, type SessionState } from "@/lib/time";

/** Sesiones que la interfaz destaca: son las que el aficionado no quiere perderse. */
const HEADLINE = new Set(["Q1", "Q2", "SPR", "RAC"]);

export type SessionForRow = {
  shortname: string;
  name: string;
  startsAt: Date;
  state: SessionState;
};

/**
 * Una fila del horario: nombre de la sesión y su hora en la zona del usuario.
 *
 * La hora es el elemento más legible de la fila —es lo que la persona vino a
 * consultar— y las sesiones principales van en blanco y rojo mientras las
 * secundarias quedan atenuadas, como en el diseño.
 */
export function SessionRow({
  session,
  timeZone,
  locale,
  size = "md",
}: {
  session: SessionForRow;
  timeZone: string;
  locale: string;
  size?: "sm" | "md";
}) {
  const t = useTranslations("session");
  const headline = HEADLINE.has(session.shortname);
  const past = session.state === "past";

  const label = sessionLabel(session.shortname, t) ?? session.name;

  const nameColor = past
    ? "text-white/40"
    : headline
      ? "text-paper"
      : "text-white/60";

  const timeColor = past
    ? "text-white/40"
    : headline
      ? "text-race-hot"
      : "text-paper";

  const timeSize =
    size === "sm"
      ? headline
        ? "text-[15px]"
        : "text-[13px]"
      : headline
        ? "text-[20px]"
        : "text-[16px]";

  return (
    <div className="flex items-center justify-between gap-[10px] py-1">
      <span
        className={`flex items-center gap-[9px] text-sm font-bold ${nameColor}`}
      >
        <span
          aria-hidden
          className={`h-[7px] w-[7px] shrink-0 rounded-full ${
            past ? "bg-checkered/70" : headline ? "bg-race-hot" : "bg-white/25"
          }`}
        />
        {label}
        {session.state === "live" ? <LiveBadge label={t("live")} /> : null}
      </span>

      <time
        dateTime={session.startsAt.toISOString()}
        className={`tabular font-black ${timeColor} ${timeSize}`}
      >
        {formatTime(session.startsAt, timeZone, locale)}
      </time>
    </div>
  );
}

/** Distintivo pulsante de sesión en directo. */
function LiveBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-[5px] rounded-full border border-[rgba(255,70,90,.45)] bg-[rgba(224,24,46,.2)] px-[9px] py-[3px] text-[10px] font-black tracking-[.12em] text-[#ff5063]">
      <span
        aria-hidden
        className="motion-safe:animate-livepulse bg-race-hot h-[6px] w-[6px] rounded-full"
      />
      {label}
    </span>
  );
}

/** Traduce el código de sesión; devuelve null si no hay traducción propia. */
function sessionLabel(
  shortname: string,
  t: ReturnType<typeof useTranslations<"session">>,
): string | null {
  const keys: Record<string, string> = {
    FP1: "fp1",
    FP2: "fp2",
    PR: "practice",
    Q1: "q1",
    Q2: "q2",
    SPR: "sprint",
    WUP: "warmup",
    RAC: "race",
  };
  const key = keys[shortname];
  return key ? t(key as never) : null;
}
