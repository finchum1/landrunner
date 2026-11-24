// Placeholder identity for "JillSpoon Leasing". The mark is a section of land
// split into quarters with the SE quarter filled (a landman's "SE/4"); the
// wordmark is plain type, so the whole thing is trivial to swap when a real
// logo exists -- change this one file (plus public/favicon.* and the site).
export function SectionMark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <rect x="16" y="16" width="14" height="14" fill="#D97706" />
      <rect x="2" y="2" width="28" height="28" rx="2.5" stroke="currentColor" strokeWidth="2.6" />
      <path d="M16 2v28M2 16h28" stroke="currentColor" strokeWidth="2.6" />
    </svg>
  );
}

export default function Logo({
  iconOnly = false,
  height = 28,
  className = '',
}: {
  iconOnly?: boolean;
  height?: number;
  className?: string;
}) {
  const mark = Math.round(height * 0.78);
  return (
    <span
      role="img"
      aria-label="JillSpoon Leasing"
      className={`inline-flex items-center gap-2.5 text-stone-900 dark:text-stone-100 ${className}`}
      style={{ height }}
    >
      <SectionMark size={mark} />
      {!iconOnly && (
        <span className="flex flex-col leading-none">
          <span className="font-extrabold tracking-tight" style={{ fontSize: height * 0.4 }}>
            JillSpoon
          </span>
          <span
            className="font-semibold uppercase text-amber-700 dark:text-amber-500"
            style={{ fontSize: height * 0.22, letterSpacing: '0.28em', marginTop: height * 0.06 }}
          >
            Leasing
          </span>
        </span>
      )}
    </span>
  );
}
