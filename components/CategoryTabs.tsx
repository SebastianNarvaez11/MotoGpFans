import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CATEGORY_ORDER, type CategoryAcronym } from "@/lib/data/queries";

const LABELS: Record<CategoryAcronym, string> = {
  MGP: "MotoGP",
  MT2: "Moto2",
  MT3: "Moto3",
};

/**
 * Selector de clase en píldoras de vidrio.
 *
 * Son enlaces reales (no botones con estado en cliente) para que cada clase
 * tenga su propia URL: se puede compartir "los horarios de Moto3" y la página
 * se sirve renderizada desde el servidor.
 */
export function CategoryTabs({
  active,
  hrefFor,
}: {
  active: CategoryAcronym;
  hrefFor: (category: CategoryAcronym) => string;
}) {
  const t = useTranslations("standings");

  return (
    <nav aria-label={t("title")} className="flex gap-2">
      {CATEGORY_ORDER.map((category) => {
        const isActive = category === active;
        return (
          <Link
            key={category}
            href={hrefFor(category)}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "rounded-full border border-white/25 bg-white/[.16] px-[18px] py-[9px] text-[13px] font-extrabold backdrop-blur-[18px]"
                : "rounded-full border border-white/[.14] bg-white/[.06] px-[18px] py-[9px] text-[13px] font-bold text-white/55 backdrop-blur-[18px] transition-colors hover:text-white/85"
            }
          >
            {LABELS[category]}
          </Link>
        );
      })}
    </nav>
  );
}
