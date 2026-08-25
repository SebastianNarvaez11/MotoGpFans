import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type Variant = "default" | "hot" | "chip" | "sheet";

const VARIANTS: Record<Variant, string> = {
  default: "glass rounded-card",
  hot: "glass-hot rounded-card shadow-[0_20px_60px_rgba(224,24,46,.22)]",
  chip: "glass-chip rounded-full",
  sheet: "glass-sheet rounded-t-[28px] border-b-0",
};

type GlassCardProps<T extends ElementType> = {
  as?: T;
  variant?: Variant;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

/** Panel de vidrio esmerilado — la superficie base de toda la interfaz. */
export function GlassCard<T extends ElementType = "div">({
  as,
  variant = "default",
  className = "",
  children,
  ...rest
}: GlassCardProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag className={`${VARIANTS[variant]} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
