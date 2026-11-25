import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fetchOwners } from '../lib/owners';
import { fetchOrBundle, type OrBundle } from '../lib/orApi';
import { fetchOfferTerms } from '../lib/offerTerms';
import { fetchProfile } from '../lib/profile';
import { deleteLpr, downloadLpr, downloadLprZip, fetchLprs, setLprStatus, type LprRecord, type LprStatus } from '../lib/lprApi';
import { lprTotals } from '../lib/lpr';
import { formatDateOnly, formatMoney, todayDateString } from '../lib/format';
import type { MineralOwner, Project, ProjectOfferTerms } from '../lib/types';
import LprModal from '../components/LprModal';

const STATUSES: { key: LprStatus; label: string }[] = [
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent to leasing team' },
  { key: 'mailed', label: 'Lease mailed' },
  { key: 'signed', label: 'Signed' },
];
const STATUS_STYLE: Record<LprStatus, string> = {
  draft: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  mailed: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  signed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

export default function LprsPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [lprs, setLprs] = useState<LprRecord[]>([]);
  const [owners, setOwners] = useState<MineralOwner[]>([]);
  const [bundle, setBundle] = useState<OrBundle | null>(null);
  const [terms, setTerms] = useState<ProjectOfferTerms[]>([]);
  const [buyer, setBuyer] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<LprRecord | null>(null);
  const [filter, setFilter] = useState<LprStatus | 'all'>('all');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [{ data: p, error: pe }, l, o, b, t, prof] = await Promise.all([
          supabase.from('projects').select('*').eq('id', id).single(),
          fetchLprs(id),
          fetchOwners(id),
          fetchOrBundle(id),
          fetchOfferTerms(id),
          fetchProfile().catch(() => null),
        ]);
        if (pe) throw pe;
        setProject(p);
        setLprs(l);
        setOwners(o);
        setBundle(b);
        setTerms(t);
        setBuyer(prof?.full_name ?? '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load the LPRs.');
      }
    })();
  }, [id]);

  const shown = useMemo(() => lprs.filter((r) => filter === 'all' || r.status === filter), [lprs, filter]);
  const counts = useMemo(() => Object.fromEntries(STATUSES.map((s) => [s.key, lprs.filter((r) => r.status === s.key).length])) as Record<LprStatus, number>, [lprs]);

  async function changeStatus(rec: LprRecord, status: LprStatus) {
    try {
      const updated = await setLprStatus(rec, status, todayDateString());
      setLprs((prev) => prev.map((r) => (r.id === rec.id ? updated : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update that LPR.');
    }
  }
  async function handleDelete(rec: LprRecord) {
    if (!confirm(`Delete the LPR for ${rec.lessor}?`)) return;
    try {
      await deleteLpr(rec.id);
      setLprs((prev) => prev.filter((r) => r.id !== rec.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete that LPR.');
    }
  }
  async function handleZip() {
    const picked = lprs.filter((r) => sel.has(r.id));
    if (picked.length === 0) return;
    setBusy(true);
    try {
      await downloadLprZip(picked.map((r) => r.data), `${project?.name ?? 'Project'} LPRs ${todayDateString()}.zip`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the files.');
    } finally {
      setBusy(false);
    }
  }

  if (!project) return <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-stone-400">{error ?? 'Loading…'}</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to={`/projects/${project.id}`} className="mb-4 inline-block text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400">← {project.name}</Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Lease purchase requests</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">One per lessor, filled from the ownership report and sent to the leasing team as the office’s own LPR form.</p>
        </div>
        <button onClick={handleZip} disabled={sel.size === 0 || busy} className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50">
          {busy ? 'Creating…' : `Download selected (${sel.size}) .zip`}
        </button>
      </div>

      {error && <div className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">{error}</div>}
      {!bundle && <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Import the <Link className="underline" to={`/projects/${project.id}/or`}>ownership report</Link> first; LPRs are built from it.</p>}

      <div className="mb-3 flex flex-wrap gap-2">
        {([{ key: 'all', label: `All (${lprs.length})` }, ...STATUSES.map((s) => ({ key: s.key, label: `${s.label} (${counts[s.key]})` }))] as { key: LprStatus | 'all'; label: string }[]).map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`rounded-full px-3 py-1 text-xs font-medium ${filter === f.key ? 'bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900' : 'border border-stone-300 text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800'}`}>{f.label}</button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase text-stone-500 dark:bg-stone-800 dark:text-stone-400">
            <tr>
              <th className="w-8 px-3 py-2"><input type="checkbox" checked={shown.length > 0 && shown.every((r) => sel.has(r.id))} onChange={(e) => setSel(e.target.checked ? new Set(shown.map((r) => r.id)) : new Set())} aria-label="Select all" /></th>
              <th className="px-3 py-2">Lessor</th>
              <th className="px-3 py-2 text-right">NMA</th>
              <th className="px-3 py-2 text-right">Bonus</th>
              <th className="px-3 py-2">Delivery</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Dates</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 bg-white dark:divide-stone-800 dark:bg-stone-900">
            {shown.map((r) => {
              const t = lprTotals(r.data);
              return (
                <tr key={r.id} className="align-top text-stone-700 dark:text-stone-300">
                  <td className="px-3 py-2"><input type="checkbox" checked={sel.has(r.id)} onChange={() => setSel((prev) => { const n = new Set(prev); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })} aria-label={`Select ${r.lessor}`} /></td>
                  <td className="max-w-sm px-3 py-2">
                    <div className="font-medium text-stone-900 dark:text-stone-100">{r.lessor}</div>
                    <div className="text-xs text-stone-400">{r.data.address}</div>
                  </td>
                  <td className="px-3 py-2 text-right">{t.net}</td>
                  <td className="px-3 py-2 text-right">{t.bonus !== null ? formatMoney(t.bonus) : '—'}</td>
                  <td className="px-3 py-2">{r.data.delivery}{r.data.rush === 'Y' ? ' · RUSH' : ''}</td>
                  <td className="px-3 py-2">
                    <select value={r.status} onChange={(e) => changeStatus(r, e.target.value as LprStatus)} className={`rounded-full border-0 px-2 py-1 text-xs font-medium ${STATUS_STYLE[r.status]}`}>
                      {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-xs text-stone-500">
                    {r.sent_at && <div>Sent {formatDateOnly(r.sent_at)}</div>}
                    {r.mailed_at && <div>Mailed {formatDateOnly(r.mailed_at)}</div>}
                    {r.signed_at && <div>Signed {formatDateOnly(r.signed_at)}</div>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-xs">
                    <button onClick={() => downloadLpr(r.data).catch((e) => setError(e.message))} className="mr-3 font-medium text-amber-700 hover:underline dark:text-amber-400">Download</button>
                    <button onClick={() => setEditing(r)} disabled={!bundle} className="mr-3 font-medium text-stone-600 hover:underline disabled:opacity-40 dark:text-stone-300">Edit</button>
                    <button onClick={() => handleDelete(r)} className="text-rose-500 hover:underline">Delete</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {shown.length === 0 && <p className="p-8 text-center text-sm text-stone-400">{lprs.length === 0 ? 'No LPRs yet. Open an owner and choose “Prepare LPR…”, or select owners on the project page and make drafts for all of them.' : 'None with that status.'}</p>}
      </div>

      {editing && bundle && (
        <LprModal
          project={project}
          owner={owners.find((o) => o.id === editing.owner_id) ?? null}
          bundle={bundle}
          terms={terms[0]}
          buyer={buyer}
          groupName={null}
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={(rec) => {
            setLprs((prev) => prev.map((r) => (r.id === rec.id ? rec : r)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
