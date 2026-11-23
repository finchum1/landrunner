import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchProjects } from '../lib/projects';
import { fetchDashboardOwners, type DashboardOwner } from '../lib/owners';
import { addDays } from '../lib/callOutcomes';
import { buildCallQueue, usablePhones } from '../lib/callQueue';
import { formatAcres, formatDateOnly, todayDateString } from '../lib/format';
import { telHref } from '../lib/contact';
import { STATUS_COLORS, STATUS_LABELS } from '../lib/types';
import type { Project } from '../lib/types';

function FollowUpRow({ o, project, overdue }: { o: DashboardOwner; project?: Project; overdue: boolean }) {
  const phone = usablePhones(o)[0];
  return (
    <div className="flex items-center gap-3 border-b border-stone-100 px-4 py-2.5 last:border-b-0 dark:border-stone-800">
      <Link to={`/projects/${o.project_id}?owner=${o.id}`} className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">{o.name}</div>
        <div className="truncate text-xs text-stone-500 dark:text-stone-400">
          {project?.name ?? 'Project'} · {formatAcres(o.nma)} NMA
        </div>
      </Link>
      <span className={`hidden rounded-full px-2 py-0.5 text-xs font-medium sm:inline ${STATUS_COLORS[o.status]}`}>
        {STATUS_LABELS[o.status]}
      </span>
      <span
        className={`w-24 shrink-0 text-right text-xs ${
          overdue ? 'font-medium text-rose-600 dark:text-rose-400' : 'text-stone-500 dark:text-stone-400'
        }`}
      >
        {formatDateOnly(o.next_contact_date)}
      </span>
      {phone ? (
        <a
          href={telHref(phone)}
          className="shrink-0 rounded-md border border-stone-300 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          Call
        </a>
      ) : (
        <span className="w-[52px] shrink-0" />
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [owners, setOwners] = useState<DashboardOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchProjects(), fetchDashboardOwners()])
      .then(([p, o]) => {
        setProjects(p);
        setOwners(o);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load the dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  const today = todayDateString();
  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const activeIds = useMemo(() => new Set(projects.filter((p) => !p.is_archived).map((p) => p.id)), [projects]);
  const live = useMemo(() => owners.filter((o) => activeIds.has(o.project_id)), [owners, activeIds]);

  const due = useMemo(
    () =>
      live
        .filter((o) => o.next_contact_date && o.next_contact_date <= today && !o.do_not_contact)
        .sort((a, b) => (a.next_contact_date as string).localeCompare(b.next_contact_date as string) || b.nma - a.nma),
    [live, today]
  );
  const weekEnd = addDays(today, 7);
  const upcoming = useMemo(
    () =>
      live
        .filter((o) => o.next_contact_date && o.next_contact_date > today && o.next_contact_date <= weekEnd)
        .sort((a, b) => (a.next_contact_date as string).localeCompare(b.next_contact_date as string)),
    [live, today, weekEnd]
  );

  const perProject = useMemo(
    () =>
      projects
        .filter((p) => !p.is_archived)
        .map((p) => {
          const mine = live.filter((o) => o.project_id === p.id);
          return {
            project: p,
            owners: mine.length,
            callReady: buildCallQueue(mine, { today, hideZeroNma: true }).length,
            leasedNma: mine.filter((o) => o.status === 'leased').reduce((s, o) => s + o.nma, 0),
            totalNma: mine.reduce((s, o) => s + o.nma, 0),
          };
        }),
    [projects, live, today]
  );

  const totals = useMemo(
    () => ({
      owners: live.length,
      totalNma: live.reduce((s, o) => s + o.nma, 0),
      leasedNma: live.filter((o) => o.status === 'leased').reduce((s, o) => s + o.nma, 0),
      callReady: perProject.reduce((s, p) => s + p.callReady, 0),
    }),
    [live, perProject]
  );

  if (loading) return <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-stone-400">Loading…</div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-xl font-semibold text-stone-900 dark:text-stone-100">Dashboard</h1>

      {error && (
        <div className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Calls due today', value: due.length, accent: due.length > 0 },
          { label: 'Ready to call', value: totals.callReady },
          { label: 'Mineral owners', value: totals.owners },
          { label: 'Leased NMA', value: `${formatAcres(totals.leasedNma)} / ${formatAcres(totals.totalNma)}` },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
            <div
              className={`text-lg font-semibold ${s.accent ? 'text-amber-600 dark:text-amber-400' : 'text-stone-900 dark:text-stone-100'}`}
            >
              {s.value}
            </div>
            <div className="text-xs text-stone-400">{s.label}</div>
          </div>
        ))}
      </div>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
        Follow-ups due ({due.length})
      </h2>
      <div className="mb-6 overflow-hidden rounded-lg border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        {due.length === 0 ? (
          <p className="p-4 text-sm text-stone-400">Nothing due. Nice.</p>
        ) : (
          due.map((o) => (
            <FollowUpRow key={o.id} o={o} project={projectById.get(o.project_id)} overdue={(o.next_contact_date as string) < today} />
          ))
        )}
      </div>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
        Coming up this week ({upcoming.length})
      </h2>
      <div className="mb-6 overflow-hidden rounded-lg border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        {upcoming.length === 0 ? (
          <p className="p-4 text-sm text-stone-400">No follow-ups scheduled in the next 7 days.</p>
        ) : (
          upcoming.map((o) => (
            <FollowUpRow key={o.id} o={o} project={projectById.get(o.project_id)} overdue={false} />
          ))
        )}
      </div>

      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Projects</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {perProject.map(({ project, owners: n, callReady, leasedNma, totalNma }) => (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            className="rounded-lg border border-stone-200 bg-white p-4 hover:border-amber-400 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-amber-600"
          >
            <div className="font-medium text-stone-900 dark:text-stone-100">{project.name}</div>
            <div className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              {n} owners · {formatAcres(leasedNma)} of {formatAcres(totalNma)} NMA leased
            </div>
            <div className="mt-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {callReady} ready to call
            </div>
          </Link>
        ))}
        {perProject.length === 0 && <p className="text-sm text-stone-400">No active projects.</p>}
      </div>
    </div>
  );
}
