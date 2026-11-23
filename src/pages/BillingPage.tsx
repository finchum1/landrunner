import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { updateProject } from '../lib/projects';
import {
  entryAmount,
  filterEntries,
  rangeFor,
  summarize,
  type BillingEntry,
  type BillingKind,
  type RangeKey,
} from '../lib/billing';
import { addBillingEntry, deleteBillingEntry, fetchBillingEntries, markEntriesBilled } from '../lib/billingApi';
import { formatDateOnly, formatMoney, legalDescription, todayDateString } from '../lib/format';
import type { Project } from '../lib/types';

const INPUT =
  'rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100';

const KIND_LABEL: Record<BillingKind, string> = { hours: 'Hours', miles: 'Mileage', expense: 'Expense' };

function qty(e: BillingEntry): string {
  if (e.kind === 'hours') return `${e.quantity} hr`;
  if (e.kind === 'miles') return `${e.quantity} mi`;
  return '';
}

export default function BillingPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [entries, setEntries] = useState<BillingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hourly, setHourly] = useState('');
  const [mileage, setMileage] = useState('');

  const [rangeKey, setRangeKey] = useState<RangeKey>('all');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [unbilledOnly, setUnbilledOnly] = useState(true);

  const [date, setDate] = useState(todayDateString());
  const [kind, setKind] = useState<BillingKind>('hours');
  const [value, setValue] = useState('');
  const [desc, setDesc] = useState('');
  const [adding, setAdding] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [{ data: p, error: pe }, rows] = await Promise.all([
          supabase.from('projects').select('*').eq('id', id).single(),
          fetchBillingEntries(id),
        ]);
        if (pe) throw pe;
        setProject(p);
        setHourly(p.hourly_rate != null ? String(p.hourly_rate) : '');
        setMileage(p.mileage_rate != null ? String(p.mileage_rate) : '');
        setEntries(rows);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load billing.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const rates = useMemo(
    () => ({ hourly: hourly.trim() === '' ? null : Number(hourly), mileage: mileage.trim() === '' ? null : Number(mileage) }),
    [hourly, mileage]
  );
  const range = rangeFor(rangeKey, todayDateString(), custom);
  const shown = useMemo(() => filterEntries(entries, range, unbilledOnly), [entries, range.from, range.to, unbilledOnly]); // eslint-disable-line react-hooks/exhaustive-deps
  const sum = useMemo(() => summarize(shown, rates), [shown, rates]);

  async function saveRates() {
    if (!project) return;
    try {
      await updateProject(project.id, { hourly_rate: rates.hourly, mileage_rate: rates.mileage });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the rates.');
    }
  }

  async function handleAdd() {
    if (!project) return;
    const n = parseFloat(value);
    if (!Number.isFinite(n) || n <= 0) {
      setError(kind === 'expense' ? 'Enter the expense amount.' : `Enter the number of ${kind === 'hours' ? 'hours' : 'miles'}.`);
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const created = await addBillingEntry(project.id, {
        entry_date: date,
        kind,
        quantity: kind === 'expense' ? 0 : n,
        amount: kind === 'expense' ? n : null,
        description: desc.trim() || null,
      });
      setEntries((prev) => [...prev, created].sort((a, b) => a.entry_date.localeCompare(b.entry_date)));
      setValue('');
      setDesc('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that entry.');
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(e: BillingEntry) {
    if (!confirm('Delete this entry?')) return;
    try {
      await deleteBillingEntry(e.id);
      setEntries((prev) => prev.filter((x) => x.id !== e.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete that entry.');
    }
  }

  async function handleMarkBilled() {
    const ids = shown.filter((e) => !e.billed_at).map((e) => e.id);
    if (ids.length === 0) return;
    if (!confirm(`Mark ${ids.length} entr${ids.length === 1 ? 'y' : 'ies'} as billed${invoiceNo.trim() ? ` on invoice ${invoiceNo.trim()}` : ''}?`)) return;
    try {
      const today = todayDateString();
      await markEntriesBilled(ids, invoiceNo.trim() || null, today);
      setEntries((prev) =>
        prev.map((e) => (ids.includes(e.id) ? { ...e, billed_at: today, invoice_number: invoiceNo.trim() || null } : e))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark those as billed.');
    }
  }

  async function handleExcel() {
    if (!project) return;
    const XLSX = await import('xlsx');
    const rows: (string | number)[][] = [
      ['Date', 'Type', 'Quantity', 'Description', 'Amount', 'Invoice', 'Billed'],
      ...shown.map((e) => [e.entry_date, KIND_LABEL[e.kind], e.kind === 'expense' ? '' : e.quantity, e.description ?? '', entryAmount(e, rates) ?? '', e.invoice_number ?? '', e.billed_at ?? '']),
      [],
      ['', '', '', 'Labor', sum.laborTotal],
      ['', '', '', 'Mileage', sum.mileageTotal],
      ['', '', '', 'Expenses', sum.expenseTotal],
      ['', '', '', 'Total', sum.total],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [12, 10, 10, 44, 12, 12, 12].map((wch) => ({ wch }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Billing');
    const safe = project.name.replace(/[^\w\- ]+/g, '').trim() || 'Project';
    XLSX.writeFile(wb, `${safe} billing ${todayDateString()}.xlsx`);
  }

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-8 text-sm text-stone-400">Loading…</div>;
  if (!project) return <div className="mx-auto max-w-4xl px-4 py-8 text-sm text-rose-600">{error ?? 'Project not found.'}</div>;

  const periodLabel =
    range.from || range.to
      ? `${range.from ? formatDateOnly(range.from) : 'Start'} – ${range.to ? formatDateOnly(range.to) : 'present'}`
      : 'All dates';

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 print:max-w-none print:p-0">
      <div className="print:hidden">
        <Link to={`/projects/${project.id}`} className="mb-4 inline-block text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400">
          ← Back to project
        </Link>
        <h1 className="mb-1 text-xl font-semibold text-stone-900 dark:text-stone-100">Billing — {project.name}</h1>
        <p className="mb-5 text-sm text-stone-500 dark:text-stone-400">
          Track hours, mileage and expenses against prospect {project.prospect_number ? `#${project.prospect_number}` : '(no number set)'}, then print an invoice.
        </p>

        <div className="mb-5 flex flex-wrap items-end gap-4 rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">Hourly rate ($)</label>
            <input type="number" step="0.01" min="0" value={hourly} onChange={(e) => setHourly(e.target.value)} onBlur={saveRates} className={`${INPUT} w-28`} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">Mileage rate ($/mile)</label>
            <input type="number" step="0.001" min="0" value={mileage} onChange={(e) => setMileage(e.target.value)} onBlur={saveRates} className={`${INPUT} w-28`} />
          </div>
          <p className="text-xs text-stone-400">Saved with the project; changing a rate reprices every entry.</p>
        </div>

        <div className="mb-5 flex flex-wrap items-end gap-2 rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">Type</label>
            <select value={kind} onChange={(e) => setKind(e.target.value as BillingKind)} className={INPUT}>
              <option value="hours">Hours</option>
              <option value="miles">Mileage</option>
              <option value="expense">Expense ($)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">
              {kind === 'hours' ? 'Hours' : kind === 'miles' ? 'Miles' : 'Amount ($)'}
            </label>
            <input type="number" step="0.01" min="0" value={value} onChange={(e) => setValue(e.target.value)} className={`${INPUT} w-24`} />
          </div>
          <div className="min-w-[12rem] flex-1">
            <label className="mb-1 block text-xs font-medium text-stone-500">Description</label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Phone calls to mineral owners, courthouse research…"
              className={`${INPUT} w-full`}
            />
          </div>
          <button onClick={handleAdd} disabled={adding} className="rounded-md bg-amber-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60">
            Add
          </button>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select value={rangeKey} onChange={(e) => setRangeKey(e.target.value as RangeKey)} className={INPUT}>
            <option value="all">All dates</option>
            <option value="this_month">This month</option>
            <option value="last_month">Last month</option>
            <option value="custom">Custom range…</option>
          </select>
          {rangeKey === 'custom' && (
            <>
              <input type="date" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className={INPUT} />
              <span className="text-sm text-stone-400">to</span>
              <input type="date" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className={INPUT} />
            </>
          )}
          <label className="flex items-center gap-1.5 text-sm text-stone-700 dark:text-stone-300">
            <input type="checkbox" checked={unbilledOnly} onChange={(e) => setUnbilledOnly(e.target.checked)} />
            Unbilled only
          </label>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button onClick={handleExcel} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800">
              Download Excel
            </button>
            <button onClick={() => window.print()} className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700" title="Opens the print dialog — choose “Save as PDF”">
              Print invoice / PDF
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">{error}</div>
        )}
        {sum.missingRate && (
          <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            Set the hourly / mileage rate above — some entries can’t be priced yet.
          </div>
        )}
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-8 text-stone-900 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none dark:border-stone-800 dark:bg-white">
        <div className="mb-5 border-b-2 border-amber-600 pb-3">
          <div className="text-xs font-semibold uppercase tracking-widest text-amber-700">Invoice{invoiceNo.trim() ? ` ${invoiceNo.trim()}` : ''}</div>
          <h2 className="mt-1 text-xl font-bold">{project.name}</h2>
          <div className="text-sm text-stone-600">
            {[legalDescription(project), project.prospect_number ? `Prospect #${project.prospect_number}` : ''].filter(Boolean).join(' · ')}
          </div>
          <div className="text-sm text-stone-600">
            {project.operator_name ? `Bill to: ${project.operator_name} · ` : ''}Period: {periodLabel} · Dated {formatDateOnly(todayDateString())}
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-400">No entries for this selection.</p>
        ) : (
          <table className="mb-4 w-full text-left text-sm">
            <thead className="border-b border-stone-300 text-xs uppercase text-stone-500">
              <tr>
                <th className="py-1.5 pr-3">Date</th>
                <th className="py-1.5 pr-3">Type</th>
                <th className="py-1.5 pr-3">Description</th>
                <th className="py-1.5 pr-3 text-right">Qty</th>
                <th className="py-1.5 text-right">Amount</th>
                <th className="w-6 print:hidden" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {shown.map((e) => {
                const amt = entryAmount(e, rates);
                return (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap py-1.5 pr-3">{formatDateOnly(e.entry_date)}</td>
                    <td className="py-1.5 pr-3">{KIND_LABEL[e.kind]}</td>
                    <td className="py-1.5 pr-3">
                      {e.description}
                      {e.billed_at && (
                        <span className="ml-2 rounded bg-emerald-100 px-1 text-[10px] font-semibold uppercase text-emerald-700 print:hidden">
                          Billed{e.invoice_number ? ` ${e.invoice_number}` : ''}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-right">{qty(e)}</td>
                    <td className="py-1.5 text-right">{amt != null ? formatMoney(amt) : '—'}</td>
                    <td className="py-1.5 pl-2 text-right print:hidden">
                      <button onClick={() => handleDelete(e)} className="text-stone-300 hover:text-rose-500" aria-label="Delete entry">
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-stone-500">Labor ({sum.hours} hr{rates.hourly != null ? ` × ${formatMoney(rates.hourly)}` : ''})</span><span>{formatMoney(sum.laborTotal)}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Mileage ({sum.miles} mi{rates.mileage != null ? ` × ${formatMoney(rates.mileage)}` : ''})</span><span>{formatMoney(sum.mileageTotal)}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Expenses</span><span>{formatMoney(sum.expenseTotal)}</span></div>
          <div className="flex justify-between border-t border-stone-300 pt-1 text-base font-bold"><span>Total due</span><span>{formatMoney(sum.total)}</span></div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 print:hidden">
        <input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="Invoice # (optional)" className={`${INPUT} w-44`} />
        <button
          onClick={handleMarkBilled}
          disabled={shown.every((e) => e.billed_at)}
          className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          Mark these entries as billed
        </button>
        <span className="text-xs text-stone-400">Do this after you send the invoice so they drop out of “Unbilled only”.</span>
      </div>
    </div>
  );
}
