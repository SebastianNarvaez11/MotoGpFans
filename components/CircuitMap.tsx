/* eslint-disable @next/next/no-img-element */

/**
 * Trazado del circuito.
 *
 * Se usa `<img>` y no `next/image` a propósito: son SVG, que Next no optimiza,
 * y pasarlos por el optimizador solo gastaría cuota de transformaciones —el
 * límite más ajustado del plan gratuito— sin ganar nada.
 *
 * El SVG oficial viene en escala de grises; se invierte para que el trazado
 * resalte sobre el fondo oscuro, como en el diseño.
 */
export function CircuitMap({
  svgUrl,
  circuitName,
  className = "",
}: {
  svgUrl?: string | null;
  circuitName: string;
  className?: string;
}) {
  if (!svgUrl) return null;

  return (
    <img
      src={svgUrl}
      alt={circuitName}
      loading="lazy"
      decoding="async"
      className={`pointer-events-none opacity-90 invert select-none ${className}`}
    />
  );
}
