"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/** Chip de vidrio que alterna entre los idiomas disponibles (es / en). */
export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const next =
    routing.locales[
      (routing.locales.indexOf(locale as never) + 1) % routing.locales.length
    ];

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(() => router.replace(pathname, { locale: next }))
      }
      aria-label={`Idioma: ${locale.toUpperCase()}`}
      className="glass-chip inline-flex items-center gap-[6px] rounded-full px-[11px] py-[6px] text-xs font-bold uppercase transition-colors hover:bg-white/[.14] disabled:opacity-60"
    >
      {locale}
    </button>
  );
}
