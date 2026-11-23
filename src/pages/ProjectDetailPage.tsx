import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { deleteProject, updateProject, type ProjectInput } from '../lib/projects';
import {
  bulkDeleteOwners,
  bulkPatchOwners,
  fetchLatestActivityByProject,
  fetchOwners,
  updateOwner,
  type LatestActivity,
} from '../lib/owners';
import { exportOwnersXlsx } from '../lib/exportOwners';
import DatePickerModal from '../components/DatePickerModal';
import OfferLetterModal from '../components/OfferLetterModal';
import { bonusSummary } from '../lib/bonus';
import {
  createOfferTerms,
  deleteOfferTerms,
  fetchOfferTerms,
  updateOfferTerms,
  type OfferTermsInput,
} from '../lib/offerTerms';
import type { MineralOwner, OwnerStatus, Project, ProjectOfferTerms } from '../lib/types';
import { CONTACT_STATUSES, STATUS_COLORS, STATUS_LABELS, STATUS_ORDER } from '../lib/types';
import {
  formatAcres,
  formatDate,
  formatDateOnly,
  formatInterest,
  formatLeaseTerm,
  formatMoney,
  legalDescription,
  todayDateString,
  truncate,
} from '../lib/format';
import ProjectFormModal from '../components/ProjectFormModal';
import OfferTermsFormModal from '../components/OfferTermsFormModal';
import AddOwnerModal from '../components/AddOwnerModal';
import ImportOwnersModal from '../components/ImportOwnersModal';
import OwnerDrawer from '../components/OwnerDrawer';
import StatusSelect from '../components/StatusSelect';
import { buildCallQueue, hasAnyPhone, usablePhones } from '../lib/callQueue';
import { telHref } from '../lib/contact';

type ContactFilter = 'all' | 'no_phone' | 'no_email' | 'has_phone' | 'wrong_phone' | 'dnc';

const HIDE_ZERO_KEY = 'landrunnerHideZeroNma';
function readHideZero(): boolean {
  try {
    return localStorage.getItem(HIDE_ZERO_KEY) !== '0'; // on unless explicitly turned off
  } catch {
    return true;
  }
}

type SortKey =
  | 'name'
  | 'nma'
  | 'interest_decimal'
  | 'phone'
  | 'email'
  | 'status'
  | 'last_contacted_at'
  | 'next_contact_date';
type SortDir = 'asc' | 'desc';

// "YYYY-MM-DD" string compares chronologically with plain <, so this needs
// no date parsing -- but keep it a named helper for the two call sites.
function nextContactUrgency(dateStr: string | null, today: string): 'overdue' | 'today' | 'future' | null {
  if (!dateStr) return null;
  if (dateStr < today) return 'overdue';
  if (dateStr === today) return 'today';
  return 'future';
}

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
  const [searchParams, setSearchParams] = useSearchParams();
  // Bulk selection (owner ids) and the bulk "set next contact" date picker.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDatePicker, setBulkDatePicker] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  // Owners an offer letter is being prepared for (null = dialog closed).
  const [letterTargets, setLetterTargets] = useState<MineralOwner[] | null>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [owners, setOwners] = useState<MineralOwner[]>([]);
  const [offerTerms, setOfferTerms] = useState<ProjectOfferTerms[]>([]);
  const [latestNotes, setLatestNotes] = useState<Record<string, LatestActivity>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OwnerStatus | 'all'>('all');
  const [showFollowUpsOnly, setShowFollowUpsOnly] = useState(false);
  const [contactFilter, setContactFilter] = useState<ContactFilter>('all');
  const [hideZeroNma, setHideZeroNma] = useState(readHideZero);
  // Snapshot of owner ids being worked through in call-queue mode (null = off).
  const [queueIds, setQueueIds] = useState<string[] | null>(null);
  const [queueNotice, setQueueNotice] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('nma');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [showEdit, setShowEdit] = useState(false);
  const [showAddOwner, setShowAddOwner] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<MineralOwner | null>(null);
  // 'add' for a brand new set, a ProjectOfferTerms to edit an existing one, null to hide.
  const [termsModal, setTermsModal] = useState<'add' | ProjectOfferTerms | null>(null);

  async function load() {
    if (!id) return;
    setError(null);
    try {
      const [{ data: projectRow, error: projectError }, ownerRows, latestActivityRows, termsRows] =
        await Promise.all([
          supabase.from('projects').select('*').eq('id', id).single(),
          fetchOwners(id),
          fetchLatestActivityByProject(id),
          fetchOfferTerms(id),
        ]);
      if (projectError) throw projectError;
      setProject(projectRow);
      setOwners(ownerRows);
      setLatestNotes(Object.fromEntries(latestActivityRows.map((a) => [a.owner_id, a])));
      setOfferTerms(termsRows);
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

  // Deep link from the dashboard: /projects/:id?owner=<ownerId> opens that owner.
  const ownerParam = searchParams.get('owner');
  useEffect(() => {
    if (!ownerParam || owners.length === 0) return;
    const target = owners.find((o) => o.id === ownerParam);
    if (target) setSelectedOwner(target);
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerParam, owners.length]);

  const stats = useMemo(() => {
    const totalNma = owners.reduce((sum, o) => sum + o.nma, 0);
    const leased = owners.filter((o) => o.status === 'leased');
    const leasedNma = leased.reduce((sum, o) => sum + o.nma, 0);
    return {
      ownerCount: owners.length,
      totalNma,
      leasedCount: leased.length,
      leasedNma,
    };
  }, [owners]);

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<OwnerStatus, number>;
    for (const o of owners) counts[o.status] += 1;
    return counts;
  }, [owners]);

  const dueFollowUpCount = useMemo(() => {
    const today = todayDateString();
    return owners.filter((o) => o.next_contact_date && o.next_contact_date <= today).length;
  }, [owners]);

  const bonus = useMemo(() => bonusSummary(owners, offerTerms), [owners, offerTerms]);

  const zeroNmaCount = useMemo(() => owners.filter((o) => !(o.nma > 0)).length, [owners]);

  const callQueue = useMemo(
    () => buildCallQueue(owners, { today: todayDateString(), hideZeroNma }),
    [owners, hideZeroNma]
  );

  function toggleHideZero() {
    setHideZeroNma((prev) => {
      try {
        localStorage.setItem(HIDE_ZERO_KEY, prev ? '0' : '1');
      } catch {
        /* not remembered */
      }
      return !prev;
    });
  }

  const filteredOwners = useMemo(() => {
    const today = todayDateString();
    return owners
      .filter((o) => {
        if (hideZeroNma && !(o.nma > 0)) return false;
        if (statusFilter !== 'all' && o.status !== statusFilter) return false;
        if (contactFilter === 'no_phone' && hasAnyPhone(o)) return false;
        if (contactFilter === 'has_phone' && !hasAnyPhone(o)) return false;
        if (contactFilter === 'no_email' && o.email && o.email.trim()) return false;
        if (contactFilter === 'wrong_phone' && !o.phone_wrong) return false;
        if (contactFilter === 'dnc' && !o.do_not_contact) return false;
        if (search.trim() && !o.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
        if (showFollowUpsOnly && !(o.next_contact_date && o.next_contact_date <= today)) return false;
        return true;
      })
      .sort((a, b) => compareOwners(a, b, sortKey, sortDir));
  }, [owners, search, statusFilter, contactFilter, hideZeroNma, showFollowUpsOnly, sortKey, sortDir]);

  function toggleFollowUpsOnly() {
    setShowFollowUpsOnly((prev) => {
      const next = !prev;
      if (next) {
        // Most overdue first is the natural default once you're looking at
        // exactly "who needs a call" -- still fully re-sortable afterward.
        setSortKey('next_contact_date');
        setSortDir('asc');
      }
      return next;
    });
  }

  // The drawer's prev/next walks the call queue while it's running, otherwise
  // whatever the table currently shows.
  const navList = useMemo(() => {
    if (!queueIds) return filteredOwners;
    const byId = new Map(owners.map((o) => [o.id, o]));
    return queueIds.map((qid) => byId.get(qid)).filter((o): o is MineralOwner => !!o);
  }, [queueIds, filteredOwners, owners]);
  const selectedOwnerIndex = selectedOwner ? navList.findIndex((o) => o.id === selectedOwner.id) : -1;

  function startCalling() {
    if (callQueue.length === 0) return;
    setQueueNotice(null);
    setQueueIds(callQueue.map((o) => o.id));
    setSelectedOwner(callQueue[0]);
  }

  const allVisibleSelected = filteredOwners.length > 0 && filteredOwners.every((o) => selectedIds.has(o.id));
  const selectedCount = owners.filter((o) => selectedIds.has(o.id)).length;

  function toggleSelected(ownerId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(ownerId)) next.delete(ownerId);
      else next.add(ownerId);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) filteredOwners.forEach((o) => next.delete(o.id));
      else filteredOwners.forEach((o) => next.add(o.id));
      return next;
    });
  }

  async function runBulk(patch: Parameters<typeof bulkPatchOwners>[1]) {
    const ids = owners.filter((o) => selectedIds.has(o.id)).map((o) => o.id);
    if (ids.length === 0) return;
    setBulkBusy(true);
    setError(null);
    try {
      const updated = await bulkPatchOwners(ids, patch);
      const byId = new Map(updated.map((o) => [o.id, o]));
      setOwners((prev) => prev.map((o) => byId.get(o.id) ?? o));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update those owners.');
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleBulkDelete() {
    const ids = owners.filter((o) => selectedIds.has(o.id)).map((o) => o.id);
    if (ids.length === 0) return;
    if (!confirm(`Delete ${ids.length} owner${ids.length === 1 ? '' : 's'} and their call logs? This can't be undone.`)) return;
    setBulkBusy(true);
    try {
      await bulkDeleteOwners(ids);
      setOwners((prev) => prev.filter((o) => !selectedIds.has(o.id)));
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete those owners.');
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleExport() {
    if (!project) return;
    // Export the selection if there is one, otherwise whatever the table shows.
    const rows = selectedCount > 0 ? owners.filter((o) => selectedIds.has(o.id)) : filteredOwners;
    try {
      await exportOwnersXlsx(project, rows, latestNotes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the export.');
    }
  }

  function closeDrawer() {
    setSelectedOwner(null);
    setQueueIds(null);
  }

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
      navigate('/projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this project.');
    }
  }

  async function handleTermsSubmit(input: OfferTermsInput) {
    if (!project) return;
    if (termsModal === 'add') {
      const created = await createOfferTerms(project.id, input);
      setOfferTerms((prev) => [...prev, created]);
    } else if (termsModal) {
      const updated = await updateOfferTerms(termsModal.id, input);
      setOfferTerms((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    }
    setTermsModal(null);
  }

  async function handleDeleteTerms(termsId: string) {
    if (!confirm('Delete this set of terms?')) return;
    try {
      await deleteOfferTerms(termsId);
      setOfferTerms((prev) => prev.filter((t) => t.id !== termsId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete these terms.');
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
      <Link to="/projects" className="mb-4 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200">
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
          <Link
            to={`/projects/${project.id}/report`}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Client report
          </Link>
          <Link
            to={`/projects/${project.id}/billing`}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Billing
          </Link>
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

      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Offer Terms
          </h2>
          <button
            onClick={() => setTermsModal('add')}
            className="text-sm font-medium text-amber-700 hover:underline dark:text-amber-400"
          >
            + Add another set of terms
          </button>
        </div>
        {offerTerms.length === 0 ? (
          <div className="rounded-lg border border-dashed border-stone-300 p-4 text-center text-sm text-stone-400 dark:border-stone-700">
            No offer terms yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {offerTerms.map((t) => {
              const totalBonus = t.rate_per_acre != null ? t.rate_per_acre * stats.totalNma : null;
              const leasedBonus = t.rate_per_acre != null ? t.rate_per_acre * stats.leasedNma : null;
              return (
                <div
                  key={t.id}
                  className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium text-stone-900 dark:text-stone-100">{t.label || 'Untitled'}</span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setTermsModal(t)}
                        className="text-xs font-medium text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTerms(t.id)}
                        className="text-xs font-medium text-rose-500 hover:text-rose-600 dark:text-rose-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600 dark:text-stone-300">
                    <span>{formatMoney(t.rate_per_acre)}/acre</span>
                    <span>{t.royalty_label ?? '—'} royalty</span>
                    <span>{formatLeaseTerm(t.lease_term_months)}</span>
                  </div>
                  {totalBonus != null && (
                    <div className="mt-2 text-xs text-stone-400">
                      Est. total bonus: {formatMoney(totalBonus)} · Est. leased bonus: {formatMoney(leasedBonus)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: 'Owners', value: stats.ownerCount },
          { label: 'Total NMA', value: formatAcres(stats.totalNma) },
          { label: 'Leased', value: `${stats.leasedCount} / ${formatAcres(stats.leasedNma)} NMA` },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
            <div className="text-sm font-semibold text-stone-900 dark:text-stone-100">{s.value}</div>
            <div className="text-xs text-stone-400">{s.label}</div>
          </div>
        ))}
      </div>

      {bonus.owed > 0 && (
        <div className="mb-6 flex flex-wrap gap-x-6 gap-y-1 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm dark:border-stone-800 dark:bg-stone-900">
          <span className="text-stone-500 dark:text-stone-400">
            Leased bonus: <strong className="text-stone-900 dark:text-stone-100">{formatMoney(bonus.owed)}</strong>
          </span>
          <span className="text-stone-500 dark:text-stone-400">
            Paid: <strong className="text-emerald-600 dark:text-emerald-400">{formatMoney(bonus.paid)}</strong>
          </span>
          <span className="text-stone-500 dark:text-stone-400">
            Outstanding: <strong className="text-amber-600 dark:text-amber-400">{formatMoney(bonus.outstanding)}</strong>
            {bonus.unpaidCount > 0 && ` (${bonus.unpaidCount} owner${bonus.unpaidCount === 1 ? '' : 's'})`}
          </span>
        </div>
      )}

      <div className="mb-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Owners by Status
        </h2>
        <div className="flex flex-wrap gap-2">
          {STATUS_ORDER.map((s) => {
            const active = statusFilter === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter((prev) => (prev === s ? 'all' : s))}
                title={active ? 'Click to clear this filter' : `Show only ${STATUS_LABELS[s]}`}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${STATUS_COLORS[s]} ${
                  active
                    ? 'ring-2 ring-amber-500 ring-offset-1 dark:ring-offset-stone-950'
                    : 'hover:opacity-80'
                }`}
              >
                {STATUS_LABELS[s]}: {statusCounts[s]}
              </button>
            );
          })}
        </div>
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
          <select
            value={contactFilter}
            onChange={(e) => setContactFilter(e.target.value as ContactFilter)}
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
            title="Find owners that still need contact info"
          >
            <option value="all">Any contact info</option>
            <option value="no_phone">Missing phone</option>
            <option value="no_email">Missing email</option>
            <option value="has_phone">Has a phone</option>
            <option value="wrong_phone">Wrong number</option>
            <option value="dnc">Do not contact</option>
          </select>
          <button
            onClick={toggleHideZero}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              hideZeroNma
                ? 'bg-stone-800 text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900'
                : 'border border-stone-300 text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800'
            }`}
            title="Owners with 0 net mineral acres (usually surface-only or fully conveyed)"
          >
            Hide 0 NMA{hideZeroNma && zeroNmaCount > 0 ? ` (${zeroNmaCount} hidden)` : ''}
          </button>
          <button
            onClick={toggleFollowUpsOnly}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              showFollowUpsOnly
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'border border-stone-300 text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800'
            }`}
            title="Owners with a next-contact date that's today or overdue"
          >
            Follow-ups{dueFollowUpCount > 0 ? ` (${dueFollowUpCount})` : ''}
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={startCalling}
            disabled={callQueue.length === 0}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            title="Work through everyone who has a phone number and is due for a call, biggest first"
          >
            Start calling ({callQueue.length})
          </button>
          <button
            onClick={handleExport}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
            title={selectedCount > 0 ? 'Export the selected owners to Excel' : 'Export the owners shown to Excel'}
          >
            Export{selectedCount > 0 ? ` (${selectedCount})` : ''}
          </button>
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

      {queueNotice && (
        <div className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
          {queueNotice}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
          {error}
        </div>
      )}

      {selectedCount > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-900/20">
          <span className="font-medium text-stone-800 dark:text-stone-100">{selectedCount} selected</span>
          <select
            disabled={bulkBusy}
            value=""
            onChange={(e) => {
              if (e.target.value) runBulk({ status: e.target.value as OwnerStatus });
            }}
            className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
          >
            <option value="">Set status…</option>
            {STATUS_ORDER.map((st) => (
              <option key={st} value={st}>
                {STATUS_LABELS[st]}
              </option>
            ))}
          </select>
          <button
            disabled={bulkBusy}
            onClick={() => setBulkDatePicker(true)}
            className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
          >
            Set next contact…
          </button>
          <button
            disabled={bulkBusy}
            onClick={() => runBulk({ do_not_contact: true })}
            className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
          >
            Mark do-not-contact
          </button>
          <button
            disabled={bulkBusy || offerTerms.length === 0}
            onClick={() => setLetterTargets(owners.filter((o) => selectedIds.has(o.id)))}
            className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm hover:bg-stone-100 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
            title={offerTerms.length === 0 ? 'Add offer terms to this project first' : 'Create offer letters (.docx) for the selected owners'}
          >
            Offer letters…
          </button>
          <button
            disabled={bulkBusy}
            onClick={handleBulkDelete}
            className="rounded-md border border-rose-300 bg-white px-2 py-1 text-sm text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:bg-stone-950"
          >
            Delete
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-sm font-medium text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
          >
            Clear
          </button>
        </div>
      )}

      <div className="hidden overflow-x-auto rounded-lg border border-stone-200 dark:border-stone-800 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase text-stone-500 dark:bg-stone-800 dark:text-stone-400">
            <tr>
              <th className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                  aria-label="Select all shown"
                />
              </th>
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
              <SortableHeader sortKeyValue="next_contact_date" activeKey={sortKey} dir={sortDir} onToggle={toggleSort}>
                Next Contact
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
                <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(o.id)}
                    onChange={() => toggleSelected(o.id)}
                    aria-label={`Select ${o.name}`}
                  />
                </td>
                <td className="px-4 py-2 font-medium text-stone-900 dark:text-stone-100">{o.name}</td>
                <td className="px-4 py-2">{formatAcres(o.nma)}</td>
                <td className="px-4 py-2">{formatInterest(o.interest_decimal)}</td>
                <td className="px-4 py-2">
                  {o.phone ? (
                    <span className={o.phone_wrong ? 'text-stone-400 line-through' : ''} title={o.phone_wrong ? 'Marked as a wrong number' : undefined}>
                      {o.phone}
                    </span>
                  ) : (
                    <span className="text-stone-400">—</span>
                  )}
                  {o.extra_phones?.length > 0 && (
                    <span className="ml-1 text-xs text-stone-400" title="Additional numbers on file">
                      +{o.extra_phones.length}
                    </span>
                  )}
                  {o.do_not_contact && (
                    <span className="ml-1 rounded bg-rose-100 px-1 text-[10px] font-semibold uppercase text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                      DNC
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {o.email || <span className="text-stone-400">—</span>}
                </td>
                <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                  <StatusSelect value={o.status} onChange={(next) => handleOwnerStatusChange(o, next)} />
                </td>
                <td className="px-4 py-2 text-stone-500 dark:text-stone-400">{formatDate(o.last_contacted_at)}</td>
                <td className="px-4 py-2">
                  {(() => {
                    const urgency = nextContactUrgency(o.next_contact_date, todayDateString());
                    const urgencyClass =
                      urgency === 'overdue'
                        ? 'font-medium text-rose-600 dark:text-rose-400'
                        : urgency === 'today'
                          ? 'font-medium text-amber-600 dark:text-amber-400'
                          : 'text-stone-500 dark:text-stone-400';
                    return <span className={urgencyClass}>{formatDateOnly(o.next_contact_date)}</span>;
                  })()}
                </td>
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

      {/* Phones: the wide table doesn't fit, so show one card per owner. */}
      <div className="space-y-2 md:hidden">
        {filteredOwners.map((o) => {
          const urgency = nextContactUrgency(o.next_contact_date, todayDateString());
          const callable = usablePhones(o)[0];
          return (
            <div
              key={o.id}
              onClick={() => setSelectedOwner(o)}
              className="flex items-start gap-3 rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(o.id)}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleSelected(o.id)}
                aria-label={`Select ${o.name}`}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-stone-900 dark:text-stone-100">{o.name}</span>
                  {o.do_not_contact && (
                    <span className="rounded bg-rose-100 px-1 text-[10px] font-semibold uppercase text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                      DNC
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                  {formatAcres(o.nma)} NMA · {formatInterest(o.interest_decimal)}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[o.status]}`}>
                    {STATUS_LABELS[o.status]}
                  </span>
                  {o.next_contact_date && (
                    <span
                      className={`text-xs ${
                        urgency === 'overdue'
                          ? 'font-medium text-rose-600 dark:text-rose-400'
                          : urgency === 'today'
                            ? 'font-medium text-amber-600 dark:text-amber-400'
                            : 'text-stone-500 dark:text-stone-400'
                      }`}
                    >
                      Next: {formatDateOnly(o.next_contact_date)}
                    </span>
                  )}
                </div>
              </div>
              {callable && (
                <a
                  href={telHref(callable)}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Call
                </a>
              )}
            </div>
          );
        })}
        {filteredOwners.length === 0 && (
          <div className="p-6 text-center text-sm text-stone-400">
            {owners.length === 0 ? 'No owners yet.' : 'No owners match your filters.'}
          </div>
        )}
      </div>

      {letterTargets && (
        <OfferLetterModal
          project={project}
          owners={letterTargets}
          terms={offerTerms}
          onClose={() => setLetterTargets(null)}
          onMarked={(updated) => {
            const byId = new Map(updated.map((o) => [o.id, o]));
            setOwners((prev) => prev.map((o) => byId.get(o.id) ?? o));
            setSelectedOwner((cur) => (cur ? byId.get(cur.id) ?? cur : cur));
          }}
        />
      )}

      {bulkDatePicker && (
        <DatePickerModal
          value={null}
          onSelect={(date) => {
            setBulkDatePicker(false);
            runBulk({ next_contact_date: date });
          }}
          onClear={() => {
            setBulkDatePicker(false);
            runBulk({ next_contact_date: null });
          }}
          onClose={() => setBulkDatePicker(false)}
        />
      )}

      {showEdit && <ProjectFormModal project={project} onClose={() => setShowEdit(false)} onSubmit={handleEditSubmit} />}

      {termsModal && (
        <OfferTermsFormModal
          terms={termsModal === 'add' ? undefined : termsModal}
          onClose={() => setTermsModal(null)}
          onSubmit={handleTermsSubmit}
        />
      )}

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
          onClose={closeDrawer}
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
          hasNext={selectedOwnerIndex !== -1 && selectedOwnerIndex < navList.length - 1}
          queueLabel={queueIds && selectedOwnerIndex !== -1 ? `${selectedOwnerIndex + 1} of ${navList.length}` : undefined}
          offerTerms={offerTerms}
          onOfferLetter={() => setLetterTargets([selectedOwner])}
          onOutcomeLogged={(updated) => {
            if (!queueIds) return;
            // Auto-advance to the next owner still in the queue.
            const idx = navList.findIndex((o) => o.id === updated.id);
            const next = idx !== -1 ? navList[idx + 1] : undefined;
            if (next) setSelectedOwner(next);
            else {
              setQueueNotice(`Call queue finished — you worked through ${navList.length} owner${navList.length === 1 ? '' : 's'}.`);
              closeDrawer();
            }
          }}
          onNavigate={(direction) => {
            if (selectedOwnerIndex === -1) return;
            const nextIndex = direction === 'prev' ? selectedOwnerIndex - 1 : selectedOwnerIndex + 1;
            const nextOwner = navList[nextIndex];
            if (nextOwner) setSelectedOwner(nextOwner);
          }}
        />
      )}
    </div>
  );
}
