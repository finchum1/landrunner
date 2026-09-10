// Oil derrick mark: an A-frame lattice tower with a crown block and base
// platform, evoking oil & mineral extraction. Fixed amber (matches the app's
// brand accent regardless of theme, same reasoning as the amber buttons
// used throughout) rather than currentColor, so the mark reads consistently
// wherever it's placed.
function DerrickIcon({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden="true"
    >
      <g stroke="#d97706" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {/* mast tip above the crown block */}
        <path d="M24 3v5" />
        {/* crown block */}
        <path d="M19 8h10" />
        {/* legs */}
        <path d="M19 8L9 41" />
        <path d="M29 8l10 33" />
        {/* lattice cross-braces */}
        <path d="M15 21h18" />
        <path d="M11.5 33h25" />
        <path d="M15 21l21.5 12" />
        <path d="M33 21l-21.5 12" />
        {/* base platform */}
        <path d="M5 41h38" />
      </g>
    </svg>
  );
}

export default function Logo({
  iconOnly = false,
  size = 28,
  className = '',
}: {
  iconOnly?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <DerrickIcon size={size} />
      {!iconOnly && (
        <span
          style={{ fontFamily: "'Oswald', sans-serif", fontSize: `${Math.round(size * 0.68)}px` }}
          className="font-semibold tracking-wide text-stone-900 dark:text-stone-100"
        >
          Landrunner
        </span>
      )}
    </div>
  );
}
