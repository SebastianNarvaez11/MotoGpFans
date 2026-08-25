import { useTranslations } from "next-intl";

/**
 * Esqueleto de carga.
 *
 * Reproduce la silueta de la portada —hero y tarjetas de vidrio— para que el
 * salto al contenido real no desplace la página.
 */
export default function Loading() {
  const t = useTranslations("common");

  return (
    <div className="flex animate-pulse flex-col gap-4 pt-[18px] md:pt-8">
      <div className="h-6 w-40 rounded-full bg-white/[.08]" />

      <div className="flex flex-col gap-3 pt-6">
        <div className="h-3 w-48 rounded-full bg-white/[.08]" />
        <div className="h-12 w-4/5 rounded-lg bg-white/[.08]" />
        <div className="h-12 w-3/5 rounded-lg bg-white/[.08]" />
        <div className="h-24 w-40 rounded-lg bg-white/[.06]" />
      </div>

      <div className="glass rounded-card flex flex-col gap-4 p-[18px]">
        <div className="h-4 w-1/3 rounded-full bg-white/[.08]" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="h-3 w-24 rounded-full bg-white/[.08]" />
            <div className="h-4 w-16 rounded-full bg-white/[.08]" />
          </div>
        ))}
      </div>

      <span role="status" className="sr-only">
        {t("loading")}
      </span>
    </div>
  );
}
