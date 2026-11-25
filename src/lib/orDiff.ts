import { normName, type ParsedInterest, type ParsedNote, type ParsedOr, type ParsedRun } from './orParse';
import type { OrInterest, OrNote, OrReport, OrRun, OrTract } from './types';

const TOL = 0.0005;
const near = (a: number | null | undefined, b: number | null | undefined) => Math.abs((a ?? 0) - (b ?? 0)) <= TOL;
const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// Pair each line of a new report with the same line of the old one: same name,
// Nth occurrence of that name <-> Nth occurrence (heirs lines repeat names).
// Returns, for each new line, the index of its old line, or null if it's new.
export function matchLines(oldLines: { name: string }[], newLines: { name: string }[]): (number | null)[] {
  const pools = [(s: string) => normName(s), compact];
  const taken = new Set<number>();
  const result: (number | null)[] = newLines.map(() => null);
  for (const key of pools) {
    const index = new Map<string, number[]>();
    oldLines.forEach((o, i) => {
      if (taken.has(i)) return;
      const k = key(o.name);
      if (k) index.set(k, [...(index.get(k) ?? []), i]);
    });
    const seen = new Map<string, number>();
    newLines.forEach((n, ni) => {
      if (result[ni] !== null) return;
      const k = key(n.name);
      if (!k) return;
      const nth = seen.get(k) ?? 0;
      seen.set(k, nth + 1);
      const oi = index.get(k)?.[nth];
      if (oi !== undefined && !taken.has(oi)) {
        taken.add(oi);
        result[ni] = oi;
      }
    });
  }
  return result;
}

export interface LineChange {
  old: OrInterest;
  now: ParsedInterest;
  what: string[];
}
export interface OrDiff {
  facts: { label: string; from: string; to: string }[];
  added: ParsedInterest[]; // lines with acres that are new
  removed: OrInterest[]; // lines with acres that are gone
  changed: LineChange[];
  zeroAdded: number;
  zeroRemoved: number;
  notesAdded: ParsedNote[];
  notesChanged: ParsedNote[];
  notesRemoved: OrNote[];
  runsheetAdded: ParsedRun[];
  oldNet: number;
  newNet: number;
  // old line id -> index of the matching new line (null if the line is gone)
  matches: Map<string, number | null>;
  isEmpty: boolean;
}

function describe(old: OrInterest, now: ParsedInterest): string[] {
  const what: string[] = [];
  if (!near(old.net_acres, now.netAcres)) what.push(`net acres ${old.net_acres ?? 0} → ${now.netAcres ?? 0}`);
  const labels = new Set([...Object.keys(old.tract_acres), ...Object.keys(now.tractAcres)]);
  for (const l of [...labels].sort()) {
    const a = old.tract_acres[l];
    const b = now.tractAcres[l];
    if (!near(a, b)) what.push(`Tract ${l} ${a ?? 0} → ${b ?? 0}`);
  }
  if ((old.note_refs ?? '').replace(/\s+/g, '') !== (now.noteRefs ?? '').replace(/\s+/g, '')) what.push(`note ${old.note_refs || '—'} → ${now.noteRefs || '—'}`);
  if ((old.address ?? '').replace(/\s+/g, ' ').trim() !== (now.address ?? '').replace(/\s+/g, ' ').trim()) what.push('address');
  return what;
}

export function diffOr(
  prev: { report: OrReport; tracts: OrTract[]; interests: OrInterest[]; notes: OrNote[]; runsheet: OrRun[] },
  next: ParsedOr
): OrDiff {
  const m = matchLines(prev.interests, next.interests);
  const matchedOld = new Set<number>();
  const added: ParsedInterest[] = [];
  const changed: LineChange[] = [];
  let zeroAdded = 0;
  const matches = new Map<string, number | null>(prev.interests.map((o) => [o.id, null]));
  next.interests.forEach((n, ni) => {
    const oi = m[ni];
    if (oi === null) {
      if ((n.netAcres ?? 0) > 0) added.push(n);
      else zeroAdded += 1;
      return;
    }
    matchedOld.add(oi);
    matches.set(prev.interests[oi].id, ni);
    const what = describe(prev.interests[oi], n);
    if (what.length) changed.push({ old: prev.interests[oi], now: n, what });
  });
  const removed = prev.interests.filter((_, i) => !matchedOld.has(i) && (prev.interests[i].net_acres ?? 0) > 0);
  const zeroRemoved = prev.interests.filter((o, i) => !matchedOld.has(i) && !((o.net_acres ?? 0) > 0)).length;

  const facts: OrDiff['facts'] = [];
  const f = (label: string, from: string | null | undefined, to: string | null | undefined) => {
    if ((from ?? '').trim() !== (to ?? '').trim()) facts.push({ label, from: from?.trim() || '—', to: to?.trim() || '—' });
  };
  f('Report date', prev.report.or_date, next.report.orDate);
  f('Last entry (book/page)', prev.report.last_entry, next.report.lastEntry);
  f('Examiner', prev.report.examiner, next.report.examiner);
  f('Prospect', prev.report.prospect_number, next.report.prospectNumber);
  f('Runsheet through', prev.report.end_date, next.report.endDate);
  for (const t of next.tracts) {
    const o = prev.tracts.find((x) => x.label === t.label);
    if (!o) facts.push({ label: `Tract ${t.label}`, from: '—', to: `${t.description} (${t.grossAcres ?? '?'} ac)` });
    else if (!near(o.gross_acres, t.grossAcres) || (o.description ?? '') !== t.description) facts.push({ label: `Tract ${t.label}`, from: `${o.description} (${o.gross_acres ?? '?'} ac)`, to: `${t.description} (${t.grossAcres ?? '?'} ac)` });
  }
  for (const o of prev.tracts) if (!next.tracts.some((t) => t.label === o.label)) facts.push({ label: `Tract ${o.label}`, from: `${o.description}`, to: 'no longer in the report' });

  const key = (k: string, r: string | null) => `${k}:${r ?? ''}`;
  const oldNotes = new Map(prev.notes.map((n) => [key(n.kind, n.ref), n]));
  const newKeys = new Set<string>();
  const notesAdded: ParsedNote[] = [];
  const notesChanged: ParsedNote[] = [];
  for (const n of next.notes) {
    const k = key(n.kind, n.ref);
    newKeys.add(k);
    const o = oldNotes.get(k);
    if (!o) notesAdded.push(n);
    else if (o.body.replace(/\s+/g, ' ').trim() !== n.body.replace(/\s+/g, ' ').trim()) notesChanged.push(n);
  }
  const notesRemoved = prev.notes.filter((n) => !newKeys.has(key(n.kind, n.ref)));

  const runKey = (bp: string | null, inst: string | null, g: string | null) => `${(bp ?? '').trim()}|${(inst ?? '').trim()}|${normName(g ?? '').slice(0, 30)}`;
  const oldRuns = new Set(prev.runsheet.map((r) => runKey(r.book_page, r.instrument, r.grantor)));
  const runsheetAdded = next.runsheet.filter((r) => !oldRuns.has(runKey(r.bookPage, r.instrument, r.grantor)));

  const oldNet = prev.interests.reduce((s, i) => s + (i.net_acres ?? 0), 0);
  const newNet = next.interests.reduce((s, i) => s + (i.netAcres ?? 0), 0);
  const isEmpty = !facts.length && !added.length && !removed.length && !changed.length && !notesAdded.length && !notesChanged.length && !notesRemoved.length && !runsheetAdded.length && !zeroAdded && !zeroRemoved;
  return { facts, added, removed, changed, zeroAdded, zeroRemoved, notesAdded, notesChanged, notesRemoved, runsheetAdded, oldNet, newNet, matches, isEmpty };
}

// Which saved LPRs cover a line that changed or disappeared.
export function lprImpact(
  lprs: { id: string; lessor: string; interestIds: string[] }[],
  diff: OrDiff
): { id: string; lessor: string; reasons: string[] }[] {
  const changedById = new Map(diff.changed.map((c) => [c.old.id, c]));
  const removedIds = new Set(diff.removed.map((r) => r.id));
  const out: { id: string; lessor: string; reasons: string[] }[] = [];
  for (const l of lprs) {
    const reasons: string[] = [];
    for (const id of l.interestIds) {
      const c = changedById.get(id);
      if (c) reasons.push(`${shortName(c.old.name)}: ${c.what.join(', ')}`);
      if (removedIds.has(id)) reasons.push(`${shortName(diff.removed.find((r) => r.id === id)!.name)} is no longer in the report`);
    }
    if (reasons.length) out.push({ id: l.id, lessor: l.lessor, reasons });
  }
  return out;
}
const shortName = (n: string) => (n.length > 48 ? n.slice(0, 46).trim() + '…' : n);
