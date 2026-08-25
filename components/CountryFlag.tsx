/**
 * Bandera de país como emoji, derivada del código ISO.
 *
 * Se usa el emoji en lugar del SVG oficial a propósito: son decenas de banderas
 * repetidas por toda la interfaz y cada imagen remota consumiría cuota de
 * optimización de imágenes, que es el límite más ajustado del plan gratuito.
 * El emoji no cuesta ninguna petición.
 */
export function CountryFlag({
  iso,
  className = "",
}: {
  iso: string;
  className?: string;
}) {
  const emoji = flagEmoji(iso);
  if (!emoji) return null;

  return (
    <span aria-hidden className={className}>
      {emoji}
    </span>
  );
}

/** "ES" → 🇪🇸. Devuelve null si el código no es un ISO de dos letras. */
export function flagEmoji(iso: string): string | null {
  const code = iso.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;

  // Los indicadores regionales ocupan el rango U+1F1E6..U+1F1FF ("A".."Z").
  const OFFSET = 0x1f1e6 - "A".charCodeAt(0);
  return String.fromCodePoint(
    code.charCodeAt(0) + OFFSET,
    code.charCodeAt(1) + OFFSET,
  );
}
