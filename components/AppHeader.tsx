import { BrandMark } from "./BrandMark";
import { LocaleSwitcher } from "./LocaleSwitcher";

/**
 * Cabecera de pantalla en móvil: logotipo + chips.
 * En desktop se oculta porque el navbar superior ya los contiene.
 */
export function AppHeader({ chips }: { chips?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-[10px] md:hidden">
      <BrandMark />
      <div className="flex gap-2">
        {chips}
        <LocaleSwitcher />
      </div>
    </header>
  );
}
