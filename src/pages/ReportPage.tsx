import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fetchOwners, fetchActivitySince } from '../lib/owners';
import { fetchOfferTerms } from '../lib/offerTerms';
import { addDays } from '../lib/callOutcomes';
import { buildReport, exportReportXlsx, type ActivityLite, type OwnerLine } from '../lib/report';
import { formatAcres, formatDateOnly, formatMoney, legalDescription, todayDateString } from '../lib/format';
import type { MineralOwner, Project, ProjectOfferTerms } from '../lib/types';
import { STATUS_LABELS } from '../lib/types';

function OwnerTable({ rows, showPaid }: { rows: OwnerLine[]; showPaid: boolean }) {
  if (rows.length === 0) return <p className="text-sm text-stone-400">None yet.</p>;
  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-stone-300 text-xs uppercase text-stone-500">
        <tr>
          <th className="py-1.5 pr-3">Owner</th>
          <th className="py-1.5 pr-3 text-right">NMA</th>
          <th className="py-1.5 pr-3">Terms</th>
          <th className="py-1.5 pr-3 text-right">Bonus</th>
          <th className="py-1.5">{showPaid ? 'Paid' : 'Status'}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-stone-100">
        {rows.map((l) => (
          <tr key={l.name + l.nma}>
            <td className="py-1.5 pr-3 font-medium">{l.name}</td>
            <td className="py-1.5 pr-3 text-right">{formatAcres(l.nma)}</td>
            <td className="py-1.5 pr-3">
              {l.tier}
              {l.rate != null ? ` · $${l.rate}/ac` : ''}
            </td>
            <td className="py-1.5 pr-3 text-right">{l.bonus != null ? formatMoney(l.bonus) : '—'}</td>
            <td className="py-1.5">{showPaid ? (l.paidAt ? formatDateOnly(l.paidAt) : 'Outstanding') : STATUS_LABELS[l.status]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [owners, setOwners] = useState<MineralOwner[]>([]);
  const [terms, setTerms] = useState<ProjectOfferTerms[]>([]);
  const [activity, setActivity] = useState<ActivityLite[]>([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const asOf = todayDateString();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    (async () => {
      try {
        const [{ data: p, error: pe }, o, t] = await Promise.all([
          supabase.from('projects').select('*').eq('id', id).single(),
          fetchOwners(id),
          fetchOfferTerms(id),
        ]);
        if (pe) throw pe;
        setProject(p);
        setOwners(o);
        setTerms(t);
        // Always load 30 days; the period picker just filters it.
        setActivity(await fetchActivitySince(o.map((x) => x.id), `${addDays(todayDateString(), -31)}T00:00:00`));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load the report.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const report = useMemo(
    () => (project ? buildReport(project, owners, terms, activity, asOf, days) : null),
    [project, owners, terms, activity, asOf, days]
  );

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-8 text-sm text-stone-400">Loading…</div>;
  if (error || !project || !report)
    return <div className="mx-auto max-w-4xl px-4 py-8 text-sm text-rose-600">{error ?? 'Project not found.'}</div>;
  const t = report.totals;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 print:max-w-none print:p-0">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to={`/projects/${project.id}`} className="text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400">
          ← Back to project
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
          >
            <option value={7}>Activity: last 7 days</option>
            <option value={14}>Activity: last 14 days</option>
            <option value={30}>Activity: last 30 days</option>
          </select>
          <button
            onClick={() => exportReportXlsx(report)}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Download Excel
          </button>
          <button
            onClick={() => window.print()}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
            title="Opens the print dialog — choose “Save as PDF”"
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-8 text-stone-900 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none dark:border-stone-800 dark:bg-white">
        <div className="mb-6 border-b-2 border-amber-600 pb-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-amber-700">Leasing status report</div>
          <h1 className="mt-1 text-2xl font-bold">{project.name}</h1>
          <div className="mt-1 text-sm text-stone-600">
            {[legalDescription(project), project.prospect_number ? `Prospect #${project.prospect_number}` : '']
              .filter(Boolean)
              .join(' · ')}
          </div>
          <div className="mt-1 text-sm text-stone-600">
            {project.operator_name ? `Prepared for ${project.operator_name} · ` : ''}Status as of {formatDateOnly(asOf)}
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Mineral owners', value: t.owners },
            { label: 'Total NMA', value: formatAcres(t.totalNma) },
            { label: 'Leased NMA', value: `${formatAcres(t.leasedNma)} (${t.pctLeasedNma}%)` },
            { label: 'Owners contacted', value: `${t.contactedOwners} of ${t.owners}` },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-stone-200 p-3">
              <div className="text-lg font-semibold">{s.value}</div>
              <div className="text-xs text-stone-500">{s.label}</div>
            </div>
          ))}
        </div>

        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">Progress by status</h2>
        <table className="mb-6 w-full text-left text-sm">
          <thead className="border-b border-stone-300 text-xs uppercase text-stone-500">
            <tr>
              <th className="py-1.5">Status</th>
              <th className="py-1.5 text-right">Owners</th>
              <th className="py-1.5 text-right">NMA</th>
              <th className="py-1.5 pl-4">% of NMA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {report.byStatus
              .filter((s) => s.owners > 0)
              .map((s) => (
                <tr key={s.status}>
                  <td className="py-1.5">{s.label}</td>
                  <td className="py-1.5 text-right">{s.owners}</td>
                  <td className="py-1.5 text-right">{formatAcres(s.nma)}</td>
                  <td className="py-1.5 pl-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 overflow-hidden rounded-full bg-stone-100">
                        <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, s.pctNma)}%` }} />
                      </div>
                      <span className="text-xs text-stone-500">{s.pctNma}%</span>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Activity — last {days} days
        </h2>
        <p className="mb-6 text-sm text-stone-700">
          {report.activity.calls} contact{report.activity.calls === 1 ? '' : 's'} logged across{' '}
          {report.activity.ownersTouched} owner{report.activity.ownersTouched === 1 ? '' : 's'};{' '}
          {report.activity.offersPrepared} offer letter{report.activity.offersPrepared === 1 ? '' : 's'} prepared.
        </p>

        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Leased ({report.leased.length})
        </h2>
        <div className="mb-2">
          <OwnerTable rows={report.leased} showPaid />
        </div>
        {t.bonusOwed > 0 && (
          <p className="mb-6 text-sm text-stone-700">
            Bonus owed on leased interests <strong>{formatMoney(t.bonusOwed)}</strong> · paid{' '}
            <strong>{formatMoney(t.bonusPaid)}</strong> · outstanding <strong>{formatMoney(t.bonusOutstanding)}</strong>
          </p>
        )}

        <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Offers out / negotiating ({report.inPlay.length})
        </h2>
        <OwnerTable rows={report.inPlay} showPaid={false} />
      </div>
    </div>
  );
}
