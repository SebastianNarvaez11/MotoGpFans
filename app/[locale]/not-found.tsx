import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** Página no encontrada — p. ej. un GP cuyo slug no existe en esta temporada. */
export default function NotFound() {
  const t = useTranslations("nav");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
      <div className="glass rounded-card flex max-w-sm flex-col items-center gap-3 p-6">
        <span aria-hidden className="numeral-ghost text-[96px]">
          404
        </span>
        <Link
          href="/"
          className="bg-race rounded-full px-5 py-3 text-sm font-extrabold text-white shadow-[0_10px_34px_rgba(224,24,46,.4)] transition-opacity hover:opacity-90"
        >
          {t("home")}
        </Link>
      </div>
    </div>
  );
}
