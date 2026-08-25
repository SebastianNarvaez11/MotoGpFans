import Image from "next/image";

/** Iniciales de un nombre completo: "Ai Ogura" → "AO". */
export function initialsOf(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0]![0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]![0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * Retrato del piloto con reserva a iniciales.
 *
 * La fuente deja la foto en `null` para algunos pilotos, así que el estado sin
 * imagen no es un caso raro sino uno normal, y está diseñado como tal.
 */
export function RiderAvatar({
  fullName,
  pictureUrl,
  size = 38,
  accent,
}: {
  fullName: string;
  pictureUrl?: string | null;
  size?: number;
  accent?: string | null;
}) {
  const dimension = { width: size, height: size };

  if (!pictureUrl) {
    return (
      <span
        aria-hidden
        style={{
          ...dimension,
          borderColor: accent ? `${accent}66` : undefined,
        }}
        className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[.08] font-extrabold text-white/75"
      >
        <span style={{ fontSize: Math.round(size * 0.32) }}>
          {initialsOf(fullName)}
        </span>
      </span>
    );
  }

  return (
    <span
      style={{ ...dimension, borderColor: accent ? `${accent}66` : undefined }}
      className="relative inline-block shrink-0 overflow-hidden rounded-full border border-white/15 bg-white/[.06]"
    >
      <Image
        src={pictureUrl}
        alt=""
        fill
        sizes={`${size}px`}
        className="object-cover object-top"
      />
    </span>
  );
}
