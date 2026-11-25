import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fetchOwners } from '../lib/owners';
import { addUnlinkedAsOwners, deleteOrReport, fetchOrBundle, fetchRunsheet, setInterestOwner, type OrBundle } from '../lib/orApi';
import type { MineralOwner, OrRun, Project } from '../lib/types';
import { formatAcres, formatInterest, formatNma, legalDescription } from '../lib/format';
import ImportOrModal from '../components/ImportOrModal';

type Tab = 'owners' | 'notes' | 'runsheet';

function LinkModal({ owners, onPick, onClose }: { owners: MineralOwner[]; onPick: (id: string | null) => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => owners.filter((o) => !q.trim() || o.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 60), [owners, q]);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-xl bg-white p-5 shadow-xl dark:bg-stone-900" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-base font-semibold text-stone-900 dark:text-stone-100">Link to an owner</h2>
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search owners…" className="mb-2 w-full rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100" />
        <div className="mb-3 min-h-0 flex-1 overflow-y-auto rounded-md border border-stone-200 dark:border-stone-800">
          {list.map((o) => (
            <button key={o.id} onClick={() => onPick(o.id)} className="flex w-full items-center justify-between gap-3 border-b border-stone-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-stone-50 dark:border-stone-800 dark:text-stone-200 dark:hover:bg-stone-800">
              <span className="truncate">{o.name}</span>
              <span className="shrink-0 text-xs text-stone-400">{formatAcres(o.nma)} NMA</span>
            </button>
          ))}
          {list.length === 0 && <p className="p-4 text-sm text-stone-400">No owners match.</p>}
        </div>
        <div className="flex justify-between">
          <button onClick={() => onPick(null)} className="text-sm text-rose-600 hover:underline">Unlink</button>
          <button onClick={onClose} className="text-sm text-stone-500 hover:text-stone-700">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function OwnershipReportPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [owners, setOwners] = useState<MineralOwner[]>([]);
  const [bundle, setBundle] = useState<OrBundle | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('owners');
  const [search, setSearch] = useState('');
  const [onlyAcres, setOnlyAcres] = useState(true);
  const [onlyUnlinked, setOnlyUnlinked] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const [runs, setRuns] = useState<OrRun[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!id) return;
    try {
      const [{ data: p, error: pe }, o, b] = await Promise.all([supabase.from('projects').select('*').eq('id', id).single(), fetchOwners(id), fetchOrBundle(id)]);
      if (pe) throw pe;
      setProject(p);
      setOwners(o);
      setBundle(b);
      setRuns(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the report.');
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => {
    if (tab === 'runsheet' && bundle && runs === null) fetchRunsheet(bundle.report.id).then(setRuns).catch((e) => setError(e.message));
  }, [tab, bundle, runs]);

  const ownerById = useMemo(() => new Map(owners.map((o) => [o.id, o])), [owners]);
  const interests = useMemo(() => {
    if (!bundle) return [];
    const q = search.trim().toLowerCase();
    return bundle.interests.filter((i) => {
      if (onlyAcres && !((i.net_acres ?? 0) > 0)) return false;
      if (onlyUnlinked && i.owner_id) return false;
      if (q && !`${i.name} ${i.address ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [bundle, search, onlyAcres, onlyUnlinked]);
  const unlinkedWithAcres = bundle ? bundle.interests.filter((i) => !i.owner_id && (i.net_acres ?? 0) > 0) : [];
  const filteredRuns = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (runs ?? []).filter((r) => !q || `${r.book_page} ${r.instrument} ${r.grantor} ${r.grantee} ${r.notes}`.toLowerCase().includes(q));
  }, [runs, search]);

  async function handleLink(ownerId: string | null) {
    if (!linking || !bundle) return;
    try {
      await setInterestOwner(linking, ownerId);
      setBundle({ ...bundle, interests: bundle.interests.map((i) => (i.id === linking ? { ...i, owner_id: ownerId } : i)) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not link that line.');
    }
    setLinking(null);
  }

  async function handleAddUnlinked() {
    if (!id || !bundle) return;
    if (!confirm(`Add ${unlinkedWithAcres.length} owner${unlinkedWithAcres.length === 1 ? '' : 's'} from this report to the project (every line that has acres but no matching person)?`)) return;
    setBusy(true);
    try {
      await addUnlinkedAsOwners(id, bundle.interests);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add those owners.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!bundle || !confirm('Remove this ownership report from the project? Owners and LPRs stay.')) return;
    try {
      await deleteOrReport(bundle.report.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the report.');
    }
  }

  if (!project || bundle === undefined) return <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-stone-400">{error ?? 'Loading…'}</div>;
  const rep = bundle?.report;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to={`/projects/${project.id}`} className="mb-4 inline-block text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400">← {project.name}</Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Ownership report</h1>
          {rep ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {legalDescription({ target_area: rep.description, section: rep.section, township: rep.township, range: rep.range, county: rep.county })}
              {rep.or_date ? ` · dated ${rep.or_date}` : ''}{rep.last_entry ? ` · last entry ${rep.last_entry}` : ''}{rep.examiner ? ` · ${rep.examiner}` : ''}
            </p>
          ) : (
            <p className="text-sm text-stone-500 dark:text-stone-400">The title company’s report for this project isn’t in the app yet.</p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700">{rep ? 'Import a newer report' : 'Import report'}</button>
          {rep && <button onClick={handleDelete} className="rounded-md border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-900/20">Remove</button>}
        </div>
      </div>

      {error && <div className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">{error}</div>}

      {!bundle && (
        <div className="rounded-xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
          Import the ownership report workbook to see title notes and chain of title on every owner, and to build lease purchase requests from it.
        </div>
      )}

      {bundle && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Tracts', bundle.tracts.map((t) => `${t.label} (${formatAcres(t.gross_acres)} ac)`).join(', ') || '—'],
              ['Owner lines', `${bundle.interests.length} (${bundle.interests.filter((i) => (i.net_acres ?? 0) > 0).length} with acres)`],
              ['Notes', String(bundle.notes.length)],
              ['Not in project yet', String(unlinkedWithAcres.length)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
                <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">{v}</div>
                <div className="text-xs text-stone-400">{k}</div>
              </div>
            ))}
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            {(['owners', 'notes', 'runsheet'] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === t ? 'bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900' : 'border border-stone-300 text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800'}`}>
                {t === 'owners' ? 'Owners' : t === 'notes' ? 'Title notes' : 'Runsheet'}
              </button>
            ))}
            {tab !== 'notes' && (
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100" />
            )}
            {tab === 'owners' && (
              <>
                <label className="flex items-center gap-1.5 text-sm text-stone-700 dark:text-stone-300"><input type="checkbox" checked={onlyAcres} onChange={(e) => setOnlyAcres(e.target.checked)} /> With acres</label>
                <label className="flex items-center gap-1.5 text-sm text-stone-700 dark:text-stone-300"><input type="checkbox" checked={onlyUnlinked} onChange={(e) => setOnlyUnlinked(e.target.checked)} /> Not in project</label>
                {unlinkedWithAcres.length > 0 && (
                  <button onClick={handleAddUnlinked} disabled={busy} className="ml-auto rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-60 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800">
                    Add {unlinkedWithAcres.length} to project
                  </button>
                )}
              </>
            )}
          </div>

          {tab === 'owners' && (
            <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 text-xs uppercase text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                  <tr>
                    <th className="px-3 py-2">Owner (as the report names them)</th>
                    <th className="px-3 py-2 text-right">Interest</th>
                    <th className="px-3 py-2 text-right">NMA</th>
                    {bundle.tracts.map((t) => (
                      <th key={t.id} className="px-3 py-2 text-right">Tr {t.label}</th>
                    ))}
                    <th className="px-3 py-2">Note</th>
                    <th className="px-3 py-2">In project</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 bg-white dark:divide-stone-800 dark:bg-stone-900">
                  {interests.map((i) => (
                    <tr key={i.id} className="align-top text-stone-700 dark:text-stone-300">
                      <td className="max-w-md px-3 py-2">
                        <div className="font-medium text-stone-900 dark:text-stone-100">{i.name || <span className="text-stone-400">(no name on report)</span>}</div>
                        {i.address && <div className="whitespace-pre-line text-xs text-stone-400">{i.address}</div>}
                      </td>
                      <td className="px-3 py-2 text-right">{formatInterest(i.interest)}</td>
                      <td className="px-3 py-2 text-right">{formatNma(i.net_acres)}</td>
                      {bundle.tracts.map((t) => (
                        <td key={t.id} className="px-3 py-2 text-right">{i.tract_acres[t.label] != null ? formatNma(i.tract_acres[t.label]) : '—'}</td>
                      ))}
                      <td className="px-3 py-2 text-xs">{i.note_refs || ''}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => setLinking(i.id)} className="text-left text-xs">
                          {i.owner_id ? <span className="text-emerald-700 hover:underline dark:text-emerald-400">{ownerById.get(i.owner_id)?.name ?? 'Linked'}</span> : (i.net_acres ?? 0) > 0 ? <span className="font-medium text-amber-700 hover:underline dark:text-amber-400">Link…</span> : <span className="text-stone-300">—</span>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {interests.length === 0 && <p className="p-6 text-center text-sm text-stone-400">No lines match.</p>}
            </div>
          )}

          {tab === 'notes' && (
            <div className="space-y-3">
              {bundle.notes.length === 0 && <p className="text-sm text-stone-400">No notes were found under the owner summary.</p>}
              {bundle.notes.map((n) => (
                <div key={n.id} className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
                  <div className="mb-1 text-xs font-semibold uppercase text-stone-400">{n.kind === 'general' ? 'General note' : n.kind === 'stranger' ? 'Stranger in title' : 'Note'} {n.ref}</div>
                  <p className="whitespace-pre-line text-sm text-stone-700 dark:text-stone-300">{n.body}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'runsheet' && (
            <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-800">
              {runs === null ? <p className="p-6 text-sm text-stone-400">Loading…</p> : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 text-xs uppercase text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                    <tr><th className="px-3 py-2">Book/Page</th><th className="px-3 py-2">Instrument</th><th className="px-3 py-2">Filed</th><th className="px-3 py-2">From</th><th className="px-3 py-2">To</th><th className="px-3 py-2">Notes</th></tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white dark:divide-stone-800 dark:bg-stone-900">
                    {filteredRuns.map((r) => (
                      <tr key={r.id} className="align-top text-stone-700 dark:text-stone-300">
                        <td className="whitespace-nowrap px-3 py-2">{r.book_page}</td>
                        <td className="px-3 py-2">{r.instrument}</td>
                        <td className="whitespace-nowrap px-3 py-2">{r.file_date}</td>
                        <td className="max-w-[16rem] px-3 py-2">{r.grantor}</td>
                        <td className="max-w-[16rem] px-3 py-2">{r.grantee}</td>
                        <td className="max-w-md whitespace-pre-line px-3 py-2 text-xs text-stone-500">{r.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {showImport && <ImportOrModal projectId={project.id} owners={owners} existing={rep ?? null} onClose={() => setShowImport(false)} onImported={load} />}
      {linking && <LinkModal owners={owners} onPick={handleLink} onClose={() => setLinking(null)} />}
    </div>
  );
}
