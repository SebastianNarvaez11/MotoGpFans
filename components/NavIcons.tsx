/** Iconos de la navegación, calcados del handoff de diseño. */

const SIZE = "h-[15px] w-[15px]";

export function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className={SIZE} aria-hidden>
      <path
        d="M4 11 L12 4 L20 11 V20 H4 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className={SIZE} aria-hidden>
      <rect
        x="4"
        y="6"
        width="16"
        height="14"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="4"
        y1="11"
        x2="20"
        y2="11"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export function StandingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className={SIZE} aria-hidden>
      <rect x="4" y="12" width="4" height="8" fill="currentColor" />
      <rect x="10" y="7" width="4" height="13" fill="currentColor" />
      <rect x="16" y="14" width="4" height="6" fill="currentColor" />
    </svg>
  );
}
