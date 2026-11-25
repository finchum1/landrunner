import type { LprRecord, LprStatus } from '../lib/lprApi';

const RANK: Record<LprStatus, number> = { draft: 0, sent: 1, mailed: 2, signed: 3 };
const LABEL: Record<LprStatus, string> = { draft: 'LPR draft', sent: 'LPR sent', mailed: 'Lease mailed', signed: 'Lease signed' };
const STYLE: Record<LprStatus, string> = {
  draft: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  mailed: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  signed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

export interface LprSummary {
  status: LprStatus; // the furthest along of this owner's LPRs
  count: number;
  changed: boolean; // a newer ownership report touched one of them
}

// One summary per owner: furthest status, how many LPRs, and whether any needs a look.
export function summarizeLprs(lprs: LprRecord[]): Map<string, LprSummary> {
  const out = new Map<string, LprSummary>();
  for (const l of lprs) {
    if (!l.owner_id) continue;
    const cur = out.get(l.owner_id);
    const changed = !!l.data.orChange;
    if (!cur) out.set(l.owner_id, { status: l.status, count: 1, changed });
    else out.set(l.owner_id, { status: RANK[l.status] > RANK[cur.status] ? l.status : cur.status, count: cur.count + 1, changed: cur.changed || changed });
  }
  return out;
}

export default function LprBadge({ info }: { info: LprSummary | undefined }) {
  if (!info) return null;
  return (
    <span
      className={`ml-2 inline-flex items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-0.5 align-middle text-[10px] font-medium ${STYLE[info.status]}`}
      title={`${info.count} LPR${info.count === 1 ? '' : 's'}; furthest along: ${LABEL[info.status]}${info.changed ? '. The ownership report changed since: check for a revised LPR.' : ''}`}
    >
      {LABEL[info.status]}
      {info.count > 1 ? ` ×${info.count}` : ''}
      {info.changed && <span aria-label="ownership report changed" className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />}
    </span>
  );
}
