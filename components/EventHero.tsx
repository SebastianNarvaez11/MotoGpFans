import { useTranslations } from "next-intl";
import { CircuitMap } from "@/components/CircuitMap";
import { CountryFlag } from "@/components/CountryFlag";
import { formatDateRange } from "@/lib/time";

export type HeroEvent = {
  shortname: string;
  round: number;
  countryIso: string;
  circuitName: string;
  circuitTimeZone: string;
  startsAt: Date;
  endsAt: Date;
  trackSvgUrl: string | null;
};

/**
 * Cabecera del Gran Premio: número de ronda en contorno, nombre en grande,
 * circuito y trazado. Es la primera pantalla del diseño y lo primero que ve
 * quien entra.
 */
export function EventHero({
  event,
  totalRounds,
  locale,
  kicker,
  size = "md",
}: {
  event: HeroEvent;
  totalRounds: number;
  locale: string;
  kicker: string;
  size?: "md" | "lg";
}) {
  const tGp = useTranslations("gpNames");
  const tHome = useTranslations("home");
  const name = tGp(event.shortname as never);

  const titleSize = size === "lg" ? "text-[84px]" : "text-[46px]";
  const numeralSize = size === "lg" ? "text-[300px]" : "text-[170px]";

  // Las fechas del GP se muestran en la hora del circuito: es "el finde del GP",
  // no un instante que dependa de dónde esté quien mira.
  const dates = formatDateRange(
    event.startsAt,
    event.endsAt,
    event.circuitTimeZone,
    locale,
  );

  const texto = (
    <div className="relative flex flex-col gap-[10px]">
      <p className="text-race-label text-xs font-bold tracking-[.22em] uppercase">
        {kicker} · {tHome("round", { round: event.round, total: totalRounds })}
      </p>

      <h1
        className={`m-0 leading-[.95] font-black tracking-[-.015em] uppercase ${titleSize}`}
      >
        {name}
      </h1>

      <p className="flex items-center gap-2 text-[13px] text-white/75">
        <CountryFlag iso={event.countryIso} className="text-[17px]" />
        <span>{event.circuitName}</span>
      </p>

      <p>
        <span className="glass-chip inline-flex rounded-full px-[14px] py-[7px] text-[13px] font-bold uppercase">
          {dates}
        </span>
      </p>
    </div>
  );

  // En escritorio el trazado y el número comparten la columna derecha, como en
  // el diseño; en móvil el trazado va bajo el texto, a todo el ancho.
  if (size === "lg") {
    return (
      <div className="relative grid min-h-[340px] grid-cols-[1fr_auto] items-center gap-10 py-6">
        {texto}
        <div className="relative flex items-center">
          <CircuitMap
            svgUrl={event.trackSvgUrl}
            circuitName={event.circuitName}
            className="relative z-10 h-[300px] w-auto"
          />
          <span aria-hidden className={`numeral-ghost -ml-8 ${numeralSize}`}>
            {event.round}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[270px] pt-[22px] pb-[6px]">
      <span
        aria-hidden
        className={`numeral-ghost absolute -top-[6px] -right-[6px] ${numeralSize}`}
      >
        {event.round}
      </span>

      {texto}

      <CircuitMap
        svgUrl={event.trackSvgUrl}
        circuitName={event.circuitName}
        className="relative mx-auto mt-2 h-[190px] w-auto"
      />
    </div>
  );
}
