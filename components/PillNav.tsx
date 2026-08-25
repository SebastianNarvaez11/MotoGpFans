"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { CalendarIcon, HomeIcon, StandingsIcon } from "./NavIcons";

const ITEMS = [
  { href: "/", key: "home", Icon: HomeIcon },
  { href: "/calendario", key: "calendar", Icon: CalendarIcon },
  { href: "/posiciones", key: "standings", Icon: StandingsIcon },
] as const;

function useActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * Navegación píldora de vidrio.
 * Móvil: flotante inferior, al alcance del pulgar. Desktop: centrada arriba,
 * con el logotipo y los chips (idioma / zona horaria) dentro de la misma píldora.
 */
export function PillNav({
  chips,
  brand,
}: {
  chips?: ReactNode;
  brand?: ReactNode;
}) {
  const t = useTranslations("nav");
  const isActive = useActive();

  const itemClass = (active: boolean) =>
    [
      "flex items-center gap-[7px] rounded-full px-4 py-[9px] text-xs transition-colors",
      active
        ? "bg-white/[.16] font-extrabold text-paper"
        : "font-bold text-white/60 hover:text-white/90",
    ].join(" ");

  return (
    <>
      {/* ── Desktop: píldora superior centrada ── */}
      <nav className="glass-nav sticky top-6 z-30 mx-auto hidden w-fit items-center gap-[22px] rounded-full py-2 pr-[10px] pl-[22px] md:flex">
        {brand ? <div className="mr-[10px]">{brand}</div> : null}
        <div className="flex gap-1">
          {ITEMS.map(({ href, key }) => (
            <Link key={href} href={href} className={itemClass(isActive(href))}>
              {t(key)}
            </Link>
          ))}
        </div>
        {chips ? <div className="flex gap-2">{chips}</div> : null}
      </nav>

      {/* ── Móvil: píldora flotante inferior ── */}
      <nav className="glass-nav fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-30 flex -translate-x-1/2 gap-1 rounded-full p-[6px] md:hidden">
        {ITEMS.map(({ href, key, Icon }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} className={itemClass(active)}>
              <Icon />
              {t(key)}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
