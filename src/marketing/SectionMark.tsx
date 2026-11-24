// Placeholder mark: a section split into quarters with the SE quarter filled ("SE/4").
export function SectionMark({ size = 30, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <rect x="16" y="16" width="14" height="14" fill="#f2a81d" />
      <rect x="2" y="2" width="28" height="28" stroke="currentColor" strokeWidth="2.6" />
      <path d="M16 2v28M2 16h28" stroke="currentColor" strokeWidth="2.6" />
    </svg>
  );
}

export function Wordmark({ size = 30, tone = "ink" }: { size?: number; tone?: "ink" | "paper" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${tone === "paper" ? "text-[color:var(--jsl-tail-fg)]" : "text-ink"}`}>
      <SectionMark size={size} />
      <span className="cond flex flex-col leading-none">
        <span className="font-bold tracking-tight" style={{ fontSize: size * 0.72 }}>
          JillSpoon
        </span>
        <span
          className="font-semibold uppercase"
          style={{ fontSize: size * 0.34, letterSpacing: "0.34em", marginTop: size * 0.04, color: tone === "paper" ? "#f2a81d" : "var(--jsl-amber-text)" }}
        >
          Leasing
        </span>
      </span>
    </span>
  );
}
