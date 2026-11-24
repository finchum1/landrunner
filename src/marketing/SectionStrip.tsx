import { OWNERS, TOTAL_NMA, STEP_STATUS, readout, type LogStatus } from "./logData";
import { Patterns, fillFor } from "./SectionLog";

// The phone version of the Section Log: the same data laid on its side so it
// fits a narrow screen. Depth runs left to right; owners are bands whose width
// is their net mineral acres; the curves climb underneath.
const W = 360;
const PAD = 6;
const PLOT = W - PAD * 2;
const BAND_Y = 20;
const BAND_H = 50;
const CURVE_TOP = 84;
const CURVE_H = 62;
const H = CURVE_TOP + CURVE_H + 6;
const KINDS: LogStatus[] = ["lea", "off", "neg", "con", "att", "dec", "unr"];

const cum = OWNERS.reduce<number[]>((a, o) => [...a, (a.at(-1) ?? 0) + o.nma], [0]);
const xAt = (acres: number) => PAD + (acres / TOTAL_NMA) * PLOT;
const yCurve = (acres: number) => CURVE_TOP + CURVE_H - (acres / TOTAL_NMA) * CURVE_H;

function curve(statuses: LogStatus[], include: (s: LogStatus) => boolean) {
  let acc = 0;
  const pts = [`M${xAt(0).toFixed(1)} ${yCurve(0).toFixed(1)}`];
  OWNERS.forEach((o, i) => {
    if (include(statuses[i])) acc += o.nma;
    pts.push(`L${xAt(cum[i + 1]).toFixed(1)} ${yCurve(acc).toFixed(1)}`);
  });
  return pts.join(" ");
}

export default function SectionStrip({ step, uid }: { step: number; uid: string }) {
  const statuses = STEP_STATUS[step] ?? STEP_STATUS[0];
  const r = readout(statuses);
  const dReached = curve(statuses, (s) => s !== "nc");
  const dLeased = curve(statuses, (s) => s === "lea");
  const summary = `Section log strip. ${r.reached} of ${TOTAL_NMA} net mineral acres reached, ${r.leased} leased (${r.pctLeased} percent). Sample data.`;

  return (
    <figure className="w-full" aria-label="Sample section log">
      <div className="cell flex items-baseline justify-between gap-3 px-3 py-1.5">
        <span className="cond text-[1.05rem] font-bold uppercase tracking-[0.1em]">Section Log</span>
        <span className="num text-[0.72rem] text-ink-2">SE/4 · Sec 14 · 21N · 4W</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-[-1.5px] block w-full border-[1.5px] border-ink bg-paper" role="img" aria-label={summary}>
        <Patterns uid={uid} />
        {/* depth ruler */}
        {[0, 50, 100, 150].map((a) => (
          <g key={a}>
            <line x1={xAt(a)} x2={xAt(a)} y1={BAND_Y - 5} y2={BAND_Y} stroke="var(--jsl-ink)" strokeWidth="1" />
            <text x={xAt(a) + (a === 0 ? 2 : 0)} y={11} textAnchor={a === 0 ? "start" : "middle"} className="num" fontSize="9.5" fill="var(--jsl-ink-2)">
              {a}
            </text>
          </g>
        ))}
        <text x={W - PAD} y={11} textAnchor="end" className="num" fontSize="9.5" fill="var(--jsl-ink-3)">
          NMA
        </text>
        {/* curve grid */}
        {[0, 50, 100, 150].map((a) => (
          <line key={a} x1={xAt(a)} x2={xAt(a)} y1={CURVE_TOP} y2={CURVE_TOP + CURVE_H} stroke="color-mix(in srgb, var(--jsl-cyan) 40%, transparent)" strokeWidth="1" />
        ))}
        {[0, 0.5, 1].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={CURVE_TOP + CURVE_H * (1 - f)} y2={CURVE_TOP + CURVE_H * (1 - f)} stroke="color-mix(in srgb, var(--jsl-cyan) 28%, transparent)" strokeWidth="1" />
        ))}
        {/* owner bands */}
        {OWNERS.map((o, i) => {
          const x = xAt(cum[i]);
          const w = xAt(cum[i + 1]) - x;
          const label = o.short;
          return (
            <g key={o.name}>
              <rect x={x} y={BAND_Y} width={w} height={BAND_H} fill="var(--jsl-paper)" />
              {KINDS.map((k) => (
                <rect key={k} x={x} y={BAND_Y} width={w} height={BAND_H} fill={fillFor(uid, k)} className="log-fade" opacity={statuses[i] === k ? 1 : 0} />
              ))}
              <line x1={x} x2={x} y1={BAND_Y} y2={BAND_Y + BAND_H} stroke="var(--jsl-ink)" strokeWidth="1" />
              {label && w >= 36 && (
                <g>
                  {statuses[i] !== "lea" && <rect x={x + 3} y={BAND_Y + BAND_H / 2 - 8} width={Math.min(w - 6, label.length * 5.4 + 7)} height={16} fill="var(--jsl-paper)" opacity="0.94" />}
                  <text x={x + 6} y={BAND_Y + BAND_H / 2 + 3.6} fontSize="10" className="font-body" fontWeight="600" fill={statuses[i] === "lea" ? "#ffffff" : "var(--jsl-ink)"}>
                    {label}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        <line x1={W - PAD} x2={W - PAD} y1={BAND_Y} y2={BAND_Y + BAND_H} stroke="var(--jsl-ink)" strokeWidth="1" />
        <line x1={PAD} x2={W - PAD} y1={BAND_Y} y2={BAND_Y} stroke="var(--jsl-ink)" strokeWidth="1.5" />
        <line x1={PAD} x2={W - PAD} y1={BAND_Y + BAND_H} y2={BAND_Y + BAND_H} stroke="var(--jsl-ink)" strokeWidth="1.5" />
        {/* curves */}
        <path d={dReached} style={{ d: `path("${dReached}")` }} className="log-curve" fill="none" stroke="var(--jsl-blue)" strokeWidth="1.8" strokeLinejoin="round" />
        <path d={dLeased} style={{ d: `path("${dLeased}")` }} className="log-curve" fill="none" stroke="var(--jsl-red)" strokeWidth="2.8" strokeLinejoin="round" />
      </svg>
      <figcaption className="cell mt-[-1.5px] flex flex-wrap items-baseline justify-between gap-x-3 px-3 py-1.5">
        <span className="num text-[0.74rem] text-ink-2">
          reached <b className="text-blue">{r.reached}</b> · leased <b className="text-red">{r.leased}</b> ({r.pctLeased}%)
        </span>
        <span className="cond text-[0.95rem] font-bold uppercase tracking-[0.08em]">TD {TOTAL_NMA}</span>
      </figcaption>
    </figure>
  );
}
