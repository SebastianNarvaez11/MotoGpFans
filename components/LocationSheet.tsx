"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { formatUtcOffset, timeZoneCityName } from "@/lib/time";
import {
  FEATURED_TIME_ZONES,
  allTimeZones,
  describeTimeZone,
  detectTimeZone,
  searchTimeZones,
} from "@/lib/timezone-catalog";
import { TIMEZONE_COOKIE } from "@/lib/timezone-cookie";

/**
 * Chip de zona horaria y su panel de selección.
 *
 * Es el control que da sentido a todo lo demás: define en qué hora se leen los
 * horarios, así que está a un toque desde cualquier pantalla.
 *
 * La elección se guarda en una **cookie** —no en `localStorage`— para que el
 * servidor ya renderice las horas correctas en la siguiente petición, sin un
 * parpadeo inicial con la hora equivocada.
 */
export function LocationSheet({
  current,
  referenceIso,
  variant = "neutral",
}: {
  current: string;
  /** Instante de referencia: el desplazamiento cambia con el horario de verano. */
  referenceIso: string;
  variant?: "neutral" | "accent";
}) {
  const t = useTranslations("timezone");
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Se resuelve al abrir, no en un efecto: solo hace falta si el panel se usa.
  const [detected, setDetected] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const reference = useMemo(() => new Date(referenceIso), [referenceIso]);
  const zones = useMemo(() => (isOpen ? allTimeZones() : []), [isOpen]);
  const results = useMemo(
    () =>
      query.trim()
        ? searchTimeZones(zones, query, 40)
        : [...FEATURED_TIME_ZONES],
    [zones, query],
  );

  function open() {
    // La detección usa la zona del dispositivo; no pide ningún permiso.
    setDetected(detectTimeZone());
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
    setQuery("");
    // El foco vuelve al chip: quien navega con teclado no se pierde.
    triggerRef.current?.focus();
  }

  function choose(timeZone: string) {
    // Un año de vigencia; `SameSite=Lax` para que viaje en la navegación normal.
    document.cookie = `${TIMEZONE_COOKIE}=${encodeURIComponent(timeZone)}; path=/; max-age=31536000; samesite=lax`;
    setIsOpen(false);
    setQuery("");
    // Vuelve a renderizarse en el servidor, ya con la nueva zona.
    router.refresh();
  }

  // Cierre con Escape, foco atrapado y fondo sin desplazamiento.
  useEffect(() => {
    if (!isOpen) return;

    searchRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        setQuery("");
        triggerRef.current?.focus();
        return;
      }

      if (event.key !== "Tab") return;

      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, input, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;

      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const chipClass =
    variant === "accent"
      ? "inline-flex items-center gap-[6px] rounded-full border border-[rgba(255,70,90,.35)] bg-[rgba(224,24,46,.16)] px-[11px] py-[5px] text-[11px] font-bold text-race-soft transition-colors hover:bg-[rgba(224,24,46,.26)]"
      : "glass-chip inline-flex items-center gap-[6px] rounded-full px-[11px] py-[6px] text-xs font-bold transition-colors hover:bg-white/[.14]";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={chipClass}
      >
        {timeZoneCityName(current)} · {formatUtcOffset(current, reference)}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button
            type="button"
            aria-label={t("title")}
            onClick={close}
            className="absolute inset-0 bg-[rgba(5,5,8,.55)] backdrop-blur-[2px]"
          />

          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="glass-sheet relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col gap-4 rounded-t-[28px] px-5 pt-[14px] pb-6"
          >
            <span
              aria-hidden
              className="mx-auto h-[5px] w-11 rounded-full bg-white/25"
            />

            <div className="flex flex-col gap-[2px]">
              <h2 id={titleId} className="text-[22px] font-black uppercase">
                {t("title")}
              </h2>
              <p className="text-[13px] text-white/55">{t("description")}</p>
            </div>

            {detected ? (
              <button
                type="button"
                onClick={() => choose(detected)}
                className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-[18px] border border-[rgba(255,70,90,.4)] bg-[rgba(224,24,46,.14)] px-4 py-[14px] text-left transition-colors hover:bg-[rgba(224,24,46,.22)]"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[15px] font-extrabold">
                    {describeTimeZone(detected).city}
                  </span>
                  <span className="text-xs text-white/60">
                    {formatUtcOffset(detected, reference)} · {t("detected")}
                  </span>
                </span>
                {detected === current ? (
                  <span
                    aria-hidden
                    className="text-lg font-black text-[#ff5063]"
                  >
                    ✓
                  </span>
                ) : null}
              </button>
            ) : null}

            <label className="flex items-center gap-[10px] rounded-full border border-white/[.14] bg-white/[.07] px-[18px] py-[13px]">
              <span className="sr-only">{t("search")}</span>
              <SearchIcon />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search")}
                // `text-base` (16px) y no `text-sm`: Safari en iOS hace zoom
                // automático al enfocar un campo de menos de 16px, y salir de
                // ese zoom obliga al usuario a pellizcar la pantalla.
                className="text-paper w-full bg-transparent text-base outline-none placeholder:text-white/45"
              />
            </label>

            <div className="-mx-1 flex min-h-0 flex-1 flex-col overflow-y-auto px-1">
              {!query.trim() ? (
                <p className="pb-1 text-[11px] font-bold tracking-[.16em] text-white/40 uppercase">
                  {t("frequent")}
                </p>
              ) : null}

              {results.length === 0 ? (
                <p className="py-4 text-center text-[13px] text-white/50">
                  {t("noResults")}
                </p>
              ) : (
                results.map((zone) => {
                  const { city, region } = describeTimeZone(zone);
                  const isCurrent = zone === current;
                  return (
                    <button
                      key={zone}
                      type="button"
                      onClick={() => choose(zone)}
                      aria-current={isCurrent ? "true" : undefined}
                      className="grid grid-cols-[1fr_auto] items-center gap-[10px] border-b border-white/[.07] px-1 py-3 text-left transition-colors hover:bg-white/[.06]"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-bold">
                          {city}
                          {isCurrent ? (
                            <span className="ml-2 text-[#ff5063]">✓</span>
                          ) : null}
                        </span>
                        <span className="truncate text-[11px] text-white/45">
                          {region}
                        </span>
                      </span>
                      <span className="tabular text-[13px] font-extrabold text-white/55">
                        {formatUtcOffset(zone, reference)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={close}
              className="bg-race rounded-full px-5 py-[14px] text-[15px] font-extrabold text-white shadow-[0_10px_34px_rgba(224,24,46,.4)] transition-opacity hover:opacity-90"
            >
              {t("use")}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
      <circle
        cx="10.5"
        cy="10.5"
        r="6"
        fill="none"
        stroke="rgba(255,255,255,.5)"
        strokeWidth="2"
      />
      <line
        x1="15"
        y1="15"
        x2="20"
        y2="20"
        stroke="rgba(255,255,255,.5)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
