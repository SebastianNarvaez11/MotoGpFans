import { useTranslations } from "next-intl";

/**
 * Pie con el aviso legal.
 *
 * No es decorativo: el sitio muestra fotografías y datos de MotoGP, marca de
 * Dorna Sports. Dejar claro y visible que se trata de un proyecto de fans sin
 * relación oficial —y citar la fuente— es lo correcto y lo que separa un
 * homenaje de una suplantación.
 */
export function SiteFooter() {
  const t = useTranslations("footer");

  return (
    <footer className="mt-10 flex flex-col items-center gap-2 border-t border-white/[.07] px-4 py-8 text-center">
      <p className="max-w-md text-[11px] leading-relaxed text-white/40">
        {t("disclaimer")}
      </p>
      <p className="text-[11px] text-white/30">{t("source")}</p>
    </footer>
  );
}
