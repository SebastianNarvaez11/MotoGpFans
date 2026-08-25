"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

/**
 * Error de renderizado dentro de una ruta con idioma.
 *
 * Ofrece reintentar en vez de dejar la pantalla muerta: la causa más probable
 * es que la base de datos no respondiera en ese instante, y un segundo intento
 * suele bastar.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    console.error("Error al renderizar la ruta:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
      <div className="glass rounded-card flex max-w-sm flex-col gap-3 p-6">
        <h1 className="text-xl font-black uppercase">{t("error")}</h1>
        {error.digest ? (
          <p className="text-[11px] text-white/40">ref: {error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="bg-race mt-1 rounded-full px-5 py-3 text-sm font-extrabold text-white shadow-[0_10px_34px_rgba(224,24,46,.4)] transition-opacity hover:opacity-90"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
