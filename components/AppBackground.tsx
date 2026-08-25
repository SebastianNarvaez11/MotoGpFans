import Image from "next/image";

type Glow = "home" | "top" | "left" | "calm";

const GLOWS: Record<Glow, string> = {
  home: "radial-gradient(70% 36% at 72% 12%, rgba(224,24,46,.42), transparent 70%), radial-gradient(90% 50% at 15% 100%, rgba(120,8,22,.30), transparent 70%), linear-gradient(180deg, rgba(8,8,12,.55), rgba(8,8,12,.82) 55%, rgba(8,8,12,.92))",
  top: "radial-gradient(80% 34% at 50% 0%, rgba(224,24,46,.40), transparent 72%), linear-gradient(180deg, rgba(8,8,12,.50), rgba(8,8,12,.85) 45%, rgba(8,8,12,.94))",
  left: "radial-gradient(70% 30% at 20% 0%, rgba(224,24,46,.32), transparent 70%), linear-gradient(180deg, rgba(8,8,12,.65), rgba(8,8,12,.90) 40%, rgba(8,8,12,.94))",
  calm: "radial-gradient(70% 30% at 80% 0%, rgba(224,24,46,.30), transparent 70%), linear-gradient(180deg, rgba(8,8,12,.70), rgba(8,8,12,.90) 40%, rgba(8,8,12,.94))",
};

/**
 * Fondo único a pantalla completa sobre el que se monta toda la interfaz.
 * La foto (oficial, del CDN de MotoGP) es opcional: sin ella queda el degradado base.
 */
export function AppBackground({
  imageUrl,
  alt = "",
  glow = "home",
}: {
  imageUrl?: string | null;
  alt?: string;
  glow?: Glow;
}) {
  return (
    <div aria-hidden className="bg-ink fixed inset-0 -z-10">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={alt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,#101015,#08080b)]" />
      )}
      <div className="absolute inset-0" style={{ background: GLOWS[glow] }} />
    </div>
  );
}
