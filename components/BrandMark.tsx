import { useTranslations } from "next-intl";

/** Logotipo tipográfico: "MotoGP" en itálica negra + "FANS" espaciado. */
export function BrandMark({ size = "md" }: { size?: "md" | "sm" }) {
  const t = useTranslations("brand");
  const main = size === "md" ? "text-[17px]" : "text-[15px]";
  const suffix = size === "md" ? "text-[13px]" : "text-[11px]";

  return (
    <span className="flex items-baseline gap-[5px]">
      <span className={`font-black tracking-[-.01em] italic ${main}`}>
        {t("name")}
      </span>
      <span className={`font-normal tracking-[.28em] text-white/70 ${suffix}`}>
        {t("suffix")}
      </span>
    </span>
  );
}
