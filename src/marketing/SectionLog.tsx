import { OWNERS, STATUS_LABEL, STEP_STATUS, TOTAL_NMA, readout, type LogStatus } from "./logData";

// The Section Log: depth is net mineral acres, each owner is an interval whose
// thickness is their NMA, fill is their status, and two curves climb as acres
// are reached and leased. Pure function of (step) so it is easy to test.
function geometry(compact: boolean, bodyH: number) {
  const W = compact ? 372 : 520;
  const DEPTH_W = compact ? 36 : 54;
  const OWNER_X = DEPTH_W;
  const OWNER_W = compact ? 204 : 252;
  const CURVE_X = OWNER_X + OWNER_W;
  const CURVE_W = W - CURVE_X - 2;
  return { W, BODY_H: bodyH, DEPTH_W, OWNER_X, OWNER_W, CURVE_X, CURVE_W, yAt: (acres: number) => (acres / TOTAL_NMA) * bodyH };
}
type Geo = ReturnType<typeof geometry>;

const PAPER = "#eff4f0";
const KINDS: LogStatus[] = ["lea", "off", "neg", "con", "att", "dec", "unr"];

const cumulative = OWNERS.reduce<number[]>((acc, o) => [...acc, (acc.at(-1) ?? 0) + o.nma], [0]);

function curvePath(g: Geo, statuses: LogStatus[], include: (s: LogStatus) => boolean) {
  const { CURVE_X, CURVE_W, yAt } = g;
  let acc = 0;
  const x = (v: number) => CURVE_X + (v / TOTAL_NMA) * CURVE_W;
  const pts: string[] = [`M${x(0).toFixed(1)} 0`];
  OWNERS.forEach((o, i) => {
    const prevX = x(acc).toFixed(1);
    if (include(statuses[i])) acc += o.nma;
    pts.push(`L${prevX} ${yAt(cumulative[i]).toFixed(1)}`, `L${x(acc).toFixed(1)} ${yAt(cumulative[i + 1]).toFixed(1)}`);
  });
  return pts.join(" ");
}

function Patterns({ uid }: { uid: string }) {
  return (
    <defs>
      <pattern id={`p-${uid}-off`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="7" height="7" fill="rgba(29,79,158,0.08)" />
        <line x1="0" y1="0" x2="0" y2="7" stroke="#1d4f9e" strokeWidth="2" />
      </pattern>
      <pattern id={`p-${uid}-neg`} width="7" height="7" patternUnits="userSpaceOnUse">
        <rect width="7" height="7" fill="rgba(242,168,29,0.28)" />
        <path d="M0 7L7 0M-1 1L1 -1M6 8L8 6" stroke="#b5760b" strokeWidth="1.4" />
        <path d="M0 0L7 7M-1 6L1 8M6 -1L8 1" stroke="#b5760b" strokeWidth="1.4" />
      </pattern>
      <pattern id={`p-${uid}-con`} width="8" height="8" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill="rgba(29,79,158,0.05)" />
        <circle cx="2.5" cy="2.5" r="1.3" fill="#1d4f9e" />
        <circle cx="6.5" cy="6.5" r="1.3" fill="#1d4f9e" />
      </pattern>
      <pattern id={`p-${uid}-att`} width="10" height="6" patternUnits="userSpaceOnUse">
        <rect width="10" height="6" fill="rgba(46,154,160,0.07)" />
        <line x1="0" y1="3" x2="6" y2="3" stroke="#2e9aa0" strokeWidth="1.6" />
      </pattern>
      <pattern id={`p-${uid}-dec`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="rgba(196,53,43,0.08)" />
        <line x1="0" y1="0" x2="0" y2="6" stroke="#c4352b" strokeWidth="1.5" />
        <line x1="0" y1="0" x2="6" y2="0" stroke="#c4352b" strokeWidth="1.5" />
      </pattern>
      <pattern id={`p-${uid}-unr`} width="5" height="5" patternUnits="userSpaceOnUse">
        <rect width="5" height="5" fill="rgba(91,108,105,0.06)" />
        <line x1="2.5" y1="0" x2="2.5" y2="5" stroke="#5b6c69" strokeWidth="1" />
      </pattern>
    </defs>
  );
}

function fillFor(uid: string, kind: LogStatus) {
  return kind === "lea" ? "rgba(28,128,73,0.9)" : `url(#p-${uid}-${kind})`;
}

export function LogKey({ uid }: { uid: string }) {
  const kinds: LogStatus[] = ["lea", "off", "neg", "con", "att", "dec", "unr"];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Fill key">
      {kinds.map((k) => (
        <li key={k} className="flex items-center gap-1.5">
          <svg width="22" height="14" aria-hidden="true">
            <Patterns uid={uid} />
            <rect width="22" height="14" fill={fillFor(uid, k)} stroke="#12201f" strokeWidth="1" />
          </svg>
          <span className="cond text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-ink-2">{STATUS_LABEL[k]}</span>
        </li>
      ))}
    </ul>
  );
}

export default function SectionLog({ step, compact = false, bodyH = 440, uid }: { step: number; compact?: boolean; bodyH?: number; uid: string }) {
  const g = geometry(compact, bodyH);
  const { W, BODY_H, DEPTH_W, OWNER_X, OWNER_W, CURVE_X, CURVE_W, yAt } = g;
  const statuses = STEP_STATUS[step] ?? STEP_STATUS[0];
  const r = readout(statuses);
  const dReached = curvePath(g, statuses, (s) => s !== "nc");
  const dLeased = curvePath(g, statuses, (s) => s === "lea");
  const ticks: number[] = [];
  for (let a = 0; a <= TOTAL_NMA; a += 10) ticks.push(a);

  const summary = `Section log, step ${step + 1}. ${r.reached} of ${TOTAL_NMA} net mineral acres reached, ${r.leased} leased (${r.pctLeased} percent). Sample data.`;

  return (
    <figure className="w-full" aria-label="Sample section log">
      {/* log heading: every real log opens with a boxed header like this */}
      <div className="cell grid grid-cols-6 text-ink [&>div]:border-ink [&>div]:p-2">
        <div className="col-span-6 flex items-baseline justify-between border-b px-3 py-2">
          <span className="cond text-[1.15rem] font-bold uppercase tracking-[0.1em]">Section Log</span>
          <span className="label">sample data</span>
        </div>
        <div className="col-span-3 border-b border-r">
          <div className="label">Operator</div>
          <div className="cond text-[1.05rem] font-semibold leading-tight">Example Operating, LLC</div>
        </div>
        <div className="col-span-3 border-b">
          <div className="label">Prospect</div>
          <div className="num text-[0.95rem]">26-001</div>
        </div>
        <div className="col-span-3 border-r lg:col-span-2">
          <div className="label">County</div>
          <div className="cond text-[1.05rem] font-semibold">Grady</div>
        </div>
        <div className="order-last col-span-6 border-t lg:order-none lg:col-span-3 lg:border-r lg:border-t-0">
          <div className="label">Location</div>
          <div className="num text-[0.95rem]">SE/4 · Sec 14 · 21N · 4W</div>
        </div>
        <div className="col-span-3 lg:col-span-1">
          <div className="label">State</div>
          <div className="cond text-[1.05rem] font-semibold">OK</div>
        </div>
      </div>

      {/* track headers */}
      <div className="cell mt-[-1.5px] grid text-ink" style={{ gridTemplateColumns: `${(DEPTH_W / W) * 100}% ${(OWNER_W / W) * 100}% 1fr` }}>
        <div className="border-r border-ink px-1.5 py-1.5 text-center">
          <div className="label leading-tight">NMA</div>
          <div className="label hidden leading-tight lg:block">depth</div>
        </div>
        <div className="border-r border-ink px-2 py-1.5">
          <div className="label">Owner interval</div>
          <div className="hidden text-[0.72rem] leading-tight text-ink-2 lg:block">thickness = net mineral acres</div>
        </div>
        <div className="px-2 py-1.5">
          <div className="flex items-center justify-between">
            <span className="label"><span className="lg:hidden">Acres</span><span className="hidden lg:inline">Cumulative acres</span></span>
            <span className="num hidden text-[0.7rem] text-ink-2 lg:inline">0 → {TOTAL_NMA}</span>
          </div>
          <div className="flex flex-wrap gap-x-3 text-[0.72rem] leading-tight">
            <span className="flex items-center gap-1 text-red">
              <i className="inline-block h-[3px] w-4 bg-red" /> leased
            </span>
            <span className="flex items-center gap-1 text-blue">
              <i className="inline-block h-[2px] w-4 bg-blue" /> reached
            </span>
          </div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${BODY_H}`}
        className="mt-[-1.5px] block w-full border-[1.5px] border-ink bg-paper"
        role="img"
        aria-label={summary}
      >
        <Patterns uid={uid} />
        {/* grid */}
        {ticks.map((a) => (
          <line key={a} x1={0} x2={W} y1={yAt(a)} y2={yAt(a)} stroke={a % 50 === 0 ? "rgba(46,154,160,0.5)" : "rgba(46,154,160,0.2)"} strokeWidth={a % 50 === 0 ? 1.2 : 0.8} />
        ))}
        {Array.from({ length: 11 }, (_, i) => (
          <line key={i} x1={CURVE_X + (i / 10) * CURVE_W} x2={CURVE_X + (i / 10) * CURVE_W} y1={0} y2={BODY_H} stroke={i % 5 === 0 ? "rgba(46,154,160,0.5)" : "rgba(46,154,160,0.2)"} strokeWidth={i % 5 === 0 ? 1.2 : 0.8} />
        ))}
        {/* depth numerals */}
        {ticks
          .filter((a) => a % 50 === 0 && a > 0)
          .map((a) => (
            <text key={a} x={DEPTH_W - 6} y={yAt(a) - 4} textAnchor="end" className="num" fontSize="11" fill="#3d4d4b">
              {a}
            </text>
          ))}
        <text x={DEPTH_W - 6} y={12} textAnchor="end" className="num" fontSize="11" fill="#3d4d4b">
          0
        </text>
        <line x1={OWNER_X} x2={OWNER_X} y1={0} y2={BODY_H} stroke="#12201f" strokeWidth="1.5" />
        <line x1={CURVE_X} x2={CURVE_X} y1={0} y2={BODY_H} stroke="#12201f" strokeWidth="1.5" />

        {/* owner intervals: one overlay per fill kind, cross-faded by opacity */}
        {OWNERS.map((o, i) => {
          const y = yAt(cumulative[i]);
          const h = yAt(cumulative[i + 1]) - y;
          return (
            <g key={o.name}>
              <rect x={OWNER_X} y={y} width={OWNER_W} height={h} fill={PAPER} />
              {KINDS.map((k) => (
                <rect key={k} x={OWNER_X} y={y} width={OWNER_W} height={h} fill={fillFor(uid, k)} className="log-fade" opacity={statuses[i] === k ? 1 : 0} />
              ))}
              <line x1={OWNER_X} x2={CURVE_X} y1={y} y2={y} stroke="#12201f" strokeWidth="1" />
              {h >= 13 && (
                <g>
                  {statuses[i] !== "lea" && (
                    <>
                      <rect x={OWNER_X + 5} y={y + h / 2 - 8.5} width={o.name.length * (compact ? 5.9 : 6.3) + 8} height={17} fill={PAPER} opacity="0.94" />
                      <rect x={CURVE_X - 7 - (o.nma.toFixed(1).length * 7 + 6)} y={y + h / 2 - 8.5} width={o.nma.toFixed(1).length * 7 + 8} height={17} fill={PAPER} opacity="0.94" />
                    </>
                  )}
                  <text x={OWNER_X + 8} y={y + h / 2 + 4.2} fontSize={compact ? 12.5 : 13.5} className="cond" fontWeight="600" fill={statuses[i] === "lea" ? "#ffffff" : "#12201f"}>
                    {o.name}
                  </text>
                  <text x={CURVE_X - 7} y={y + h / 2 + 4} textAnchor="end" fontSize="11.5" className="num" fill={statuses[i] === "lea" ? "#ffffff" : "#12201f"}>
                    {o.nma.toFixed(1)}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        <line x1={OWNER_X} x2={CURVE_X} y1={BODY_H - 0.75} y2={BODY_H - 0.75} stroke="#12201f" strokeWidth="1.5" />

        {/* curves */}
        <path d={dReached} style={{ d: `path("${dReached}")` }} className="log-curve" fill="none" stroke="#1d4f9e" strokeWidth="1.8" strokeLinejoin="round" />
        <path d={dLeased} style={{ d: `path("${dLeased}")` }} className="log-curve" fill="none" stroke="#c4352b" strokeWidth="2.8" strokeLinejoin="round" />
      </svg>

      <figcaption className="cell mt-[-1.5px] flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2">
        <span className="cond text-[1.05rem] font-bold uppercase tracking-[0.08em]">TD {TOTAL_NMA} NMA</span>
        <span className="num text-[0.85rem] text-ink-2">
          reached <b className="text-blue">{r.reached}</b> · leased <b className="text-red">{r.leased}</b> ({r.pctLeased}%)
        </span>
      </figcaption>
    </figure>
  );
}
