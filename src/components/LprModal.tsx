import { useMemo, useState } from 'react';
import type { MineralOwner, OrInterest, Project, ProjectOfferTerms } from '../lib/types';
import type { OrBundle } from '../lib/orApi';
import { buildLprDraft, deriveFromLines, lprTotals, type LprData, type LprTractRow } from '../lib/lpr';
import { downloadLpr, saveLpr, type LprRecord } from '../lib/lprApi';
import { compactKey } from '../lib/orLink';
import { formatAcres, formatMoney, formatNma, todayDateString } from '../lib/format';

const INPUT =
  'w-full rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100';

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-0.5 block text-xs font-medium text-stone-500 dark:text-stone-400">{label}</span>
      {children}
    </label>
  );
}
function YN({ value, onChange, options = ['Y', 'N'] }: { value: string; onChange: (v: string) => void; options?: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={INPUT}>
      {!options.includes(value) && <option value={value}>{value}</option>}
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

// Build, check and save a Lease Purchase Request for one lessor from the
// ownership report. Everything the report knows is filled in; the few things
// only you know (capacity wording, marital status, delivery) are left to edit.
export default function LprModal({
  project,
  owner,
  bundle,
  terms,
  buyer,
  groupName,
  existing,
  onClose,
  onSaved,
}: {
  project: Project;
  owner: MineralOwner | null;
  bundle: OrBundle;
  terms: ProjectOfferTerms | undefined;
  buyer: string;
  groupName: string | null;
  existing?: LprRecord;
  onClose: () => void;
  onSaved: (rec: LprRecord) => void;
}) {
  const allLines = bundle.interests.filter((i) => (i.net_acres ?? 0) > 0 || existing?.data.interestIds.includes(i.id));
  // the lines already tied to this owner, else any line carrying the same name
  const initialIds = useMemo(() => {
    if (existing) return existing.data.interestIds;
    if (!owner) return [] as string[];
    const linked = bundle.interests.filter((i) => i.owner_id === owner.id);
    if (linked.length) return linked.map((i) => i.id);
    const k = compactKey(owner.name);
    return bundle.interests.filter((i) => (i.net_acres ?? 0) > 0 && compactKey(i.name) === k).map((i) => i.id);
  }, [existing, owner, bundle]);

  const [picked, setPicked] = useState<Set<string>>(new Set(initialIds));
  const [search, setSearch] = useState('');
  const [data, setData] = useState<LprData>(() =>
    existing
      ? existing.data
      : buildLprDraft({
          project,
          report: bundle.report,
          tracts: bundle.tracts,
          notes: bundle.notes,
          lines: bundle.interests.filter((i) => initialIds.includes(i.id)),
          owner,
          buyer,
          terms,
          today: todayDateString(),
          groupName,
        })
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tooMany, setTooMany] = useState(false);

  const set = <K extends keyof LprData>(k: K, v: LprData[K]) => setData((d) => ({ ...d, [k]: v }));

  function applyLines(ids: Set<string>) {
    setPicked(ids);
    const lines: OrInterest[] = bundle.interests.filter((i) => ids.has(i.id));
    const d = deriveFromLines(bundle.report, bundle.tracts, lines, bundle.notes, project);
    setTooMany(d.tooManyTracts);
    setData((cur) => ({
      ...cur,
      tracts: d.tracts,
      tractNumbers: d.tractNumbers,
      orTitleNote: d.orTitleNote,
      orTitleNoteNums: d.orTitleNoteNums,
      curativeRequired: d.curativeRequired,
      curativeNotes: d.curativeNotes,
      titleVerif: lines.some((l) => /known and unknown heirs/i.test(l.name)) ? 'Y' : cur.titleVerif,
      interestIds: [...ids],
    }));
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allLines
      .filter((i) => picked.has(i.id) || !q || `${i.name} ${i.address ?? ''}`.toLowerCase().includes(q))
      .filter((i) => picked.has(i.id) || q || i.owner_id === owner?.id || allLines.length < 40)
      .slice(0, 80);
  }, [allLines, search, picked, owner]);

  const totals = lprTotals(data);
  const setTract = (i: number, k: keyof LprTractRow, v: string) =>
    setData((d) => ({
      ...d,
      tracts: d.tracts.map((t, j) => (j === i ? { ...t, [k]: k === 'gross' || k === 'net' ? (v === '' ? null : Number(v)) : v } : t)),
    }));

  async function save(download: boolean) {
    if (!data.lessor.trim()) return setError('Enter the lessor’s name.');
    if (data.tracts.length === 0) return setError('Pick the ownership report lines this LPR covers (or add a tract row).');
    setBusy(true);
    setError(null);
    try {
      const rec = await saveLpr(project.id, owner?.id ?? existing?.owner_id ?? null, data, existing?.id);
      if (download) await downloadLpr(data);
      onSaved(rec);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the LPR.');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-3" onClick={onClose}>
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col rounded-xl bg-white shadow-xl dark:bg-stone-900" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-stone-200 px-6 py-4 dark:border-stone-800">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Lease Purchase Request</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {project.name} · prospect {data.prospect || '—'} · filled from the ownership report dated {bundle.report.or_date ?? '—'}
          </p>
        </div>

        {data.orChange && (
          <div className="mx-6 mt-3 flex items-start justify-between gap-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            <span>{data.orChange} Review the tract rows and notes below, then mark this as a revised LPR if it was already sent.</span>
            <button type="button" onClick={() => setData((d) => ({ ...d, orChange: undefined, revised: 'Y', prevLprDate: d.prevLprDate || d.lprDate }))} className="shrink-0 text-xs font-medium underline">Mark revised</button>
          </div>
        )}
        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto px-6 py-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)]">
          {/* which lines of the report this LPR covers */}
          <div className="flex flex-col lg:min-h-0">
            <div className="mb-1 text-sm font-medium text-stone-700 dark:text-stone-300">Ownership report lines covered</div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search the report to add a line…" className={`${INPUT} mb-2`} />
            <div className="max-h-64 min-h-[10rem] flex-1 overflow-y-auto rounded-md border lg:max-h-none border-stone-200 dark:border-stone-800">
              {visible.length === 0 && <p className="p-3 text-xs text-stone-400">Search to find the report line(s) for this lessor.</p>}
              {visible.map((i) => (
                <label key={i.id} className="flex cursor-pointer items-start gap-2 border-b border-stone-100 px-3 py-2 text-sm last:border-b-0 hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-800/60">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={picked.has(i.id)}
                    onChange={() => {
                      const next = new Set(picked);
                      if (next.has(i.id)) next.delete(i.id);
                      else next.add(i.id);
                      applyLines(next);
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-stone-800 dark:text-stone-200" title={i.name}>{i.name}</span>
                    <span className="block text-xs text-stone-400">
                      {formatNma(i.net_acres)} NMA{Object.entries(i.tract_acres).map(([t, a]) => ` · Tr ${t}: ${formatNma(a)}`).join('')}
                      {i.note_refs ? ` · Note ${i.note_refs}` : ''}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-stone-400">Changing the lines rebuilds the tract rows and the title note below.</p>
            {tooMany && <p className="mt-1 text-xs text-amber-700">The form has room for 3 tract rows; only the first three are shown. Write “see OR” in the legal for the rest.</p>}
          </div>

          <div className="space-y-5">
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Lessor</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Lessor (exact legal wording, e.g. “Jane Doe, a single woman”)" className="col-span-2"><input value={data.lessor} onChange={(e) => set('lessor', e.target.value)} className={INPUT} /></Field>
                <Field label="Marital status">
                  <select value={data.marital} onChange={(e) => set('marital', e.target.value)} className={INPUT}>
                    {['', 'Single', 'Married', 'Widow', 'Widower', 'Divorced', 'N/A'].map((m) => <option key={m} value={m}>{m || '—'}</option>)}
                  </select>
                </Field>
                <Field label="Phone"><input value={data.phone} onChange={(e) => set('phone', e.target.value)} className={INPUT} /></Field>
                <Field label="Address" className="col-span-2"><input value={data.address} onChange={(e) => set('address', e.target.value)} className={INPUT} /></Field>
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Lease terms</h3>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                <Field label="Lease date"><input type="date" value={data.leaseDate} onChange={(e) => set('leaseDate', e.target.value)} className={INPUT} /></Field>
                <Field label="Term (yrs)"><input value={data.leaseTerm} onChange={(e) => set('leaseTerm', e.target.value)} className={INPUT} /></Field>
                <Field label="Option term"><input value={data.optionTerm} onChange={(e) => set('optionTerm', e.target.value)} className={INPUT} /></Field>
                <Field label="Royalty"><input value={data.royalty} onChange={(e) => set('royalty', e.target.value)} className={INPUT} /></Field>
                <Field label="$ / acre"><input type="number" value={data.pricePerAcre ?? ''} onChange={(e) => set('pricePerAcre', e.target.value === '' ? null : Number(e.target.value))} className={INPUT} /></Field>
                <Field label="Option price"><input value={data.optionPrice} onChange={(e) => set('optionPrice', e.target.value)} className={INPUT} /></Field>
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Tracts</h3>
              <div className="space-y-1.5">
                {data.tracts.map((t, i) => (
                  <div key={i} className="grid grid-cols-[1fr_3.5rem_5rem_6rem] gap-2">
                    <input value={t.legal} onChange={(e) => setTract(i, 'legal', e.target.value)} className={INPUT} placeholder="Legal" />
                    <input value={t.tr} onChange={(e) => setTract(i, 'tr', e.target.value)} className={INPUT} placeholder="Tr #" />
                    <input type="number" value={t.gross ?? ''} onChange={(e) => setTract(i, 'gross', e.target.value)} className={INPUT} placeholder="Gross" />
                    <input type="number" step="any" value={t.net ?? ''} onChange={(e) => setTract(i, 'net', e.target.value)} className={INPUT} placeholder="Net" />
                  </div>
                ))}
                {data.tracts.length === 0 && <p className="text-xs text-stone-400">Pick report lines on the left to fill the tract rows.</p>}
              </div>
              <p className="mt-2 text-sm text-stone-700 dark:text-stone-300">
                Gross <b>{formatAcres(totals.gross)}</b> · Net <b>{totals.net}</b> NMA · Total bonus <b>{totals.bonus !== null ? formatMoney(totals.bonus) : '—'}</b>
              </p>
              <Field label="Legal description" className="mt-2"><textarea rows={3} value={data.legalDescription} onChange={(e) => set('legalDescription', e.target.value)} className={INPUT} /></Field>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Request</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Buyer"><input value={data.buyer} onChange={(e) => set('buyer', e.target.value)} className={INPUT} /></Field>
                <Field label="Project manager"><input value={data.projectManager} onChange={(e) => set('projectManager', e.target.value)} className={INPUT} /></Field>
                <Field label="Delivery"><YN value={data.delivery} onChange={(v) => set('delivery', v)} options={['Mail', 'Email', 'Hand Deliver']} /></Field>
                <Field label="RUSH"><YN value={data.rush} onChange={(v) => set('rush', v)} /></Field>
                <Field label="Part of group" className="col-span-2"><input value={data.partOfGroup} onChange={(e) => set('partOfGroup', e.target.value)} className={INPUT} /></Field>
                <Field label="Revised LPR"><YN value={data.revised} onChange={(v) => set('revised', v)} /></Field>
                <Field label="Previous LPR date"><input value={data.prevLprDate} onChange={(e) => set('prevLprDate', e.target.value)} className={INPUT} placeholder="if revised" /></Field>
                <Field label="LPR date"><input type="date" value={data.lprDate} onChange={(e) => set('lprDate', e.target.value)} className={INPUT} /></Field>
                <Field label="Mail date"><input type="date" value={data.mailDate} onChange={(e) => set('mailDate', e.target.value)} className={INPUT} /></Field>
                <Field label="LPR #"><input value={data.lprNumber} onChange={(e) => set('lprNumber', e.target.value)} className={INPUT} /></Field>
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Title and lease checks</h3>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                <Field label="Title verif needed"><YN value={data.titleVerif} onChange={(v) => set('titleVerif', v)} /></Field>
                <Field label="Surface owner"><YN value={data.surfaceOwner} onChange={(v) => set('surfaceOwner', v)} /></Field>
                <Field label="Record owner"><YN value={data.recordOwner} onChange={(v) => set('recordOwner', v)} options={['Yes', 'N']} /></Field>
                <Field label="OR title note"><YN value={data.orTitleNote} onChange={(v) => set('orTitleNote', v)} /></Field>
                <Field label="OR note #s"><input value={data.orTitleNoteNums} onChange={(e) => set('orTitleNoteNums', e.target.value)} className={INPUT} /></Field>
                <Field label="Curative required"><YN value={data.curativeRequired} onChange={(v) => set('curativeRequired', v)} /></Field>
                <Field label="Curative attached"><YN value={data.curativeAttached} onChange={(v) => set('curativeAttached', v)} /></Field>
                <Field label="Lease form"><input value={data.leaseForm} onChange={(e) => set('leaseForm', e.target.value)} className={INPUT} /></Field>
                <Field label="Exhibit attached"><YN value={data.exhibitAttached} onChange={(v) => set('exhibitAttached', v)} /></Field>
                <Field label="Exhibit name"><input value={data.exhibitName} onChange={(e) => set('exhibitName', e.target.value)} className={INPUT} /></Field>
                <Field label="Approval email"><YN value={data.approvalEmail} onChange={(v) => set('approvalEmail', v)} /></Field>
                <Field label="Trust/corp docs"><YN value={data.trustDocs} onChange={(v) => set('trustDocs', v)} /></Field>
                <Field label="Memo of lease"><YN value={data.memoOfLease} onChange={(v) => set('memoOfLease', v)} /></Field>
              </div>
            </section>

            <section className="grid gap-3 md:grid-cols-2">
              <Field label="Curative / title notes"><textarea rows={8} value={data.curativeNotes} onChange={(e) => set('curativeNotes', e.target.value)} className={INPUT} /></Field>
              <Field label="Lease form / exhibit / signor notes"><textarea rows={8} value={data.leaseNotes} onChange={(e) => set('leaseNotes', e.target.value)} className={INPUT} /></Field>
            </section>
          </div>
        </div>

        {error && <p className="mx-6 mb-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-stone-200 px-6 py-3 dark:border-stone-800">
          <button onClick={onClose} className="rounded-md px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">Cancel</button>
          <button onClick={() => save(false)} disabled={busy} className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-60 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800">Save draft</button>
          <button onClick={() => save(true)} disabled={busy} className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60">
            {busy ? 'Working…' : 'Save and download .xlsx'}
          </button>
        </div>
      </div>
    </div>
  );
}
