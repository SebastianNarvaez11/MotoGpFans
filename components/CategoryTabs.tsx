import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ALL_CATEGORIES,
  CATEGORY_ORDER,
  type CategoryFilter,
} from "@/lib/data/queries";

const LABELS: Record<CategoryFilter, string> = {
  MGP: "MotoGP",
  MT2: "Moto2",
  MT3: "Moto3",
  ALL: "",
};

/**
 * Selector de clase en píldoras de vidrio.
 *
 * Son enlaces reales (no botones con estado en cliente) para que cada clase
 * tenga su propia URL: se puede compartir "los horarios de Moto3" y la página
 * se sirve renderizada desde el servidor.
 *
 * La opción "Todas" existe porque un domingo son tres carreras seguidas
 * —Moto3, Moto2 y MotoGP— y filtrando por una sola clase el día queda a medias.
 */
export function CategoryTabs({
  active,
  hrefFor,
  size = "md",
}: {
  active: CategoryFilter;
  hrefFor: (filter: CategoryFilter) => string;
  size?: "sm" | "md";
}) {
  const t = useTranslations("gp");
  const options: CategoryFilter[] = [...CATEGORY_ORDER, ALL_CATEGORIES];

  const padding =
    size === "sm"
      ? "px-[14px] py-[7px] text-xs"
      : "px-[18px] py-[9px] text-[13px]";

  return (
    <nav aria-label={t("classFilter")} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = option === active;
        const label =
          option === ALL_CATEGORIES ? t("allClasses") : LABELS[option];
        return (
          <Link
            key={option}
            href={hrefFor(option)}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? `rounded-full border border-white/25 bg-white/[.16] font-extrabold backdrop-blur-[18px] ${padding}`
                : `rounded-full border border-white/[.14] bg-white/[.06] font-bold text-white/55 backdrop-blur-[18px] transition-colors hover:text-white/85 ${padding}`
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
