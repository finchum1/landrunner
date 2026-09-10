import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { deleteProject, updateProject, type ProjectInput } from '../lib/projects';
import { fetchLatestActivityByProject, fetchOwners, updateOwner, type LatestActivity } from '../lib/owners';
import type { MineralOwner, OwnerStatus, Project } from '../lib/types';
import { CONTACT_STATUSES, STATUS_LABELS, STATUS_ORDER } from '../lib/types';
import {
  formatAcres,
  formatDate,
  formatInterest,
  formatLeaseTerm,
  formatMoney,
  legalDescription,
  truncate,
} from '../lib/format';
import ProjectFormModal from '../components/ProjectFormModal';
import AddOwnerModal from '../components/AddOwnerModal';
import ImportOwnersModal from '../components/ImportOwnersModal';
import OwnerDrawer from '../components/OwnerDrawer';
import StatusSelect from '../components/StatusSelect';

type SortKey = 'name' | 'nma' | 'interest_decimal' | 'phone' | 'email' | 'status' | 'last_contacted_at';
type SortDir = 'asc' | 'desc';

// Sort a value to the end regardless of direction (nulls/blanks always last).
function isBlank(v: unknown): boolean {
  return v === null || v === undefined || v === '';
}

function compareOwners(a: MineralOwner, b: MineralOwner, key: SortKey, dir: SortDir): number {
  const aVal = key === 'status' ? STATUS_ORDER.indexOf(a.status) : a[key];
  const bVal = key === 'status' ? STATUS_ORDER.indexOf(b.status) : b[key];

  const aBlank = key !== 'status' && isBlank(aVal);
  const bBlank = key !== 'status' && isBlank(bVal);
  if (aBlank && bBlank) return 0;
  if (aBlank) return 1;
  if (bBlank) return -1;

  let cmp: number;
  if (typeof aVal === 'number' && typeof bVal === 'number') {
    cmp = aVal - bVal;
  } else {
    cmp = String(aVal).localeCompare(String(bVal));
  }
  return dir === 'asc' ? cmp : -cmp;
}

function SortableHeader({
  sortKeyValue,
  activeKey,
  dir,
  onToggle,
  children,
}: {
  sortKeyValue: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onToggle: (key: SortKey) => void;
  children: ReactNode;
}) {
  const active = activeKey === sortKeyValue;
  return (
    <th className="px-4 py-2">
      <button
        type="button"
        onClick={() => onToggle(sortKeyValue)}
        className={`flex items-center gap-1 hover:text-stone-700 dark:hover:text-stone-200 ${
          active ? 'text-stone-700 dark:text-stone-200' : ''
        }`}
      >
        {children}
        <span className="text-[10px] leading-none">{active ? (dir === 'asc' ? '▲' : '▼') : ''}</span>
      </button>
    </th>
  );
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [owners, setOwners] = useState<MineralOwner[]>([]);
  const [latestNotes, setLatestNotes] = useState<Record<string, LatestActivity>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OwnerStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('nma');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [showEdit, setShowEdit] = useState(false);
  const [showAddOwner, setShowAddOwner] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<MineralOwner | null>(null);

  async function load() {
    if (!id) return;
    setError(null);
    try {
      const [{ data: projectRow, error: projectError }, ownerRows, latestActivityRows] = await Promise.all([
        supabase.from('projects').select('*').eq('id', id).single(),
        fetchOwners(id),
        fetchLatestActivityByProject(id),
      ]);
      if (projectError) throw projectError;
      setProject(projectRow);
      setOwners(ownerRows);
      setLatestNotes(Object.fromEntries(latestActivityRows.map((a) => [a.owner_id, a])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this project.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const stats = useMemo(() => {
    const totalNma = owners.reduce((sum, o) => sum + o.nma, 0);
    const leased = owners.filter((o) => o.status === 'leased');
    const leasedNma = leased.reduce((sum, o) => sum + o.nma, 0);
    const rate = project?.offer_rate_per_acre ?? 0;
    return {
      ownerCount: owners.length,
      totalNma,
      leasedCount: leased.length,
      leasedNma,
      totalBonus: rate * totalNma,
      leasedBonus: rate * leasedNma,
    };
  }, [owners, project]);

  const filteredOwners = useMemo(() => {
    return owners
      .filter((o) => {
        if (statusFilter !== 'all' && o.status !== statusFilter) return false;
        if (search.trim() && !o.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => compareOwners(a, b, sortKey, sortDir));
  }, [owners, search, statusFilter, sortKey, sortDir]);

  const selectedOwnerIndex = selectedOwner ? filteredOwners.findIndex((o) => o.id === selectedOwner.id) : -1;

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  async function handleEditSubmit(input: ProjectInput) {
    if (!project) return;
    const updated = await updateProject(project.id, input);
    setProject(updated);
    setShowEdit(false);
  }

  async function handleDeleteProject() {
    if (!project) return;
    if (!confirm(`Delete "${project.name}" and all its owner records? This can't be undone.`)) return;
    try {
      await deleteProject(project.id);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this project.');
    }
  }

  async function handleOwnerStatusChange(owner: MineralOwner, next: OwnerStatus) {
    setOwners((prev) => prev.map((o) => (o.id === owner.id ? { ...o, status: next } : o)));
    try {
      const wasUncontacted = STATUS_ORDER.indexOf(owner.status) === 0;
      const movesToContactStatus = CONTACT_STATUSES.includes(next);
      const patch: { status: OwnerStatus; last_contacted_at?: string } = { status: next };
      if (wasUncontacted && movesToContactStatus) patch.last_contacted_at = new Date().toISOString();
      const updated = await updateOwner(owner.id, patch);
      setOwners((prev) => prev.map((o) => (o.id === owner.id ? updated : o)));
    } catch {
      setOwners((prev) => prev.map((o) => (o.id === owner.id ? owner : o)));
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-stone-400">Loading…</div>;
  }

  if (error && !project) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
          {error}
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200">
        ← All projects
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">{project.name}</h1>
            {project.prospect_number && (
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                #{project.prospect_number}
              </span>
            )}
          </div>
          {legalDescription(project) && (
            <p className="text-sm text-stone-500 dark:text-stone-400">{legalDescription(project)}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowEdit(true)}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Edit
          </button>
          <button
            onClick={handleDeleteProject}
            className="rounded-md border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-900/20"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-x-6 gap-y-2 rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm dark:border-stone-800 dark:bg-stone-900">
        <div>
          <span className="text-stone-400">Offer: </span>
          <span className="font-medium text-stone-800 dark:text-stone-200">
            {formatMoney(project.offer_rate_per_acre)}/acre
          </span>
        </div>
        <div>
          <span className="text-stone-400">Royalty: </span>
          <span className="font-medium text-stone-800 dark:text-stone-200">{project.offer_royalty_label ?? '—'}</span>
        </div>
        <div>
          <span className="text-stone-400">Term: </span>
          <span className="font-medium text-stone-800 dark:text-stone-200">
            {formatLeaseTerm(project.offer_lease_term_months)}
          </span>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Owners', value: stats.ownerCount },
          { label: 'Total NMA', value: formatAcres(stats.totalNma) },
          { label: 'Leased', value: `${stats.leasedCount} / ${formatAcres(stats.leasedNma)} NMA` },
          { label: 'Est. Total Bonus', value: formatMoney(stats.totalBonus) },
          { label: 'Est. Leased Bonus', value: formatMoney(stats.leasedBonus) },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
            <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">{s.value}</div>
            <div className="text-xs text-stone-400">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search owners…"
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OwnerStatus | 'all')}
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
          >
            <option value="all">All statuses</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Upload Spreadsheet
          </button>
          <button
            onClick={() => setShowAddOwner(true)}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
          >
            + Add Owner
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase text-stone-500 dark:bg-stone-800 dark:text-stone-400">
            <tr>
              <SortableHeader sortKeyValue="name" activeKey={sortKey} dir={sortDir} onToggle={toggleSort}>
                Name
              </SortableHeader>
              <SortableHeader sortKeyValue="nma" activeKey={sortKey} dir={sortDir} onToggle={toggleSort}>
                NMA
              </SortableHeader>
              <SortableHeader sortKeyValue="interest_decimal" activeKey={sortKey} dir={sortDir} onToggle={toggleSort}>
                Interest
              </SortableHeader>
              <SortableHeader sortKeyValue="phone" activeKey={sortKey} dir={sortDir} onToggle={toggleSort}>
                Phone
              </SortableHeader>
              <SortableHeader sortKeyValue="email" activeKey={sortKey} dir={sortDir} onToggle={toggleSort}>
                Email
              </SortableHeader>
              <SortableHeader sortKeyValue="status" activeKey={sortKey} dir={sortDir} onToggle={toggleSort}>
                Status
              </SortableHeader>
              <SortableHeader sortKeyValue="last_contacted_at" activeKey={sortKey} dir={sortDir} onToggle={toggleSort}>
                Last Contacted
              </SortableHeader>
              <th className="px-4 py-2">Recent Log</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 bg-white dark:divide-stone-800 dark:bg-stone-900">
            {filteredOwners.map((o) => (
              <tr
                key={o.id}
                onClick={() => setSelectedOwner(o)}
                className="cursor-pointer text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800/60"
              >
                <td className="px-4 py-2 font-medium text-stone-900 dark:text-stone-100">{o.name}</td>
                <td className="px-4 py-2">{formatAcres(o.nma)}</td>
                <td className="px-4 py-2">{formatInterest(o.interest_decimal)}</td>
                <td className="px-4 py-2">
                  {o.phone || <span className="text-stone-400">—</span>}
                </td>
                <td className="px-4 py-2">
                  {o.email || <span className="text-stone-400">—</span>}
                </td>
                <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                  <StatusSelect value={o.status} onChange={(next) => handleOwnerStatusChange(o, next)} />
                </td>
                <td className="px-4 py-2 text-stone-500 dark:text-stone-400">{formatDate(o.last_contacted_at)}</td>
                <td className="max-w-xs px-4 py-2 text-stone-500 dark:text-stone-400">
                  {latestNotes[o.id] ? (
                    <span title={latestNotes[o.id].note}>
                      {truncate(latestNotes[o.id].note, 40)}
                      <span className="ml-1 text-xs text-stone-400">{formatDate(latestNotes[o.id].created_at)}</span>
                    </span>
                  ) : (
                    <span className="text-stone-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredOwners.length === 0 && (
          <div className="p-8 text-center text-sm text-stone-400">
            {owners.length === 0
              ? 'No owners yet — upload a spreadsheet or add one manually.'
              : 'No owners match your filters.'}
          </div>
        )}
      </div>

      {showEdit && <ProjectFormModal project={project} onClose={() => setShowEdit(false)} onSubmit={handleEditSubmit} />}

      {showAddOwner && (
        <AddOwnerModal
          projectId={project.id}
          onClose={() => setShowAddOwner(false)}
          onCreated={(owner) => {
            // Display order is fully controlled by the table's own sort
            // (see filteredOwners) -- no need to pre-sort this raw list.
            setOwners((prev) => [...prev, owner]);
            setShowAddOwner(false);
          }}
        />
      )}

      {showImport && (
        <ImportOwnersModal projectId={project.id} onClose={() => setShowImport(false)} onImported={load} />
      )}

      {selectedOwner && (
        <OwnerDrawer
          key={selectedOwner.id}
          owner={selectedOwner}
          onClose={() => setSelectedOwner(null)}
          onChanged={(updated) => {
            setOwners((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
            setSelectedOwner(updated);
          }}
          onDeleted={(id) => {
            setOwners((prev) => prev.filter((o) => o.id !== id));
            setSelectedOwner(null);
          }}
          onActivityAdded={(ownerId, entry) => {
            setLatestNotes((prev) => ({ ...prev, [ownerId]: { owner_id: ownerId, note: entry.note, created_at: entry.created_at } }));
          }}
          hasPrev={selectedOwnerIndex > 0}
          hasNext={selectedOwnerIndex !== -1 && selectedOwnerIndex < filteredOwners.length - 1}
          onNavigate={(direction) => {
            if (selectedOwnerIndex === -1) return;
            const nextIndex = direction === 'prev' ? selectedOwnerIndex - 1 : selectedOwnerIndex + 1;
            const nextOwner = filteredOwners[nextIndex];
            if (nextOwner) setSelectedOwner(nextOwner);
          }}
        />
      )}
    </div>
  );
}
