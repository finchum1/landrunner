import { addDays } from './callOutcomes';

export type BillingKind = 'hours' | 'miles' | 'expense';

export interface BillingEntry {
  id: string;
  project_id: string;
  entry_date: string; // YYYY-MM-DD
  kind: BillingKind;
  quantity: number; // hours or miles (0 for expenses)
  amount: number | null; // dollars, for expenses
  description: string | null;
  invoice_number: string | null;
  billed_at: string | null;
  created_at: string;
}

export interface Rates {
  hourly: number | null;
  mileage: number | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// Dollar value of one entry at the project's rates (null if the rate is unset).
export function entryAmount(e: Pick<BillingEntry, 'kind' | 'quantity' | 'amount'>, rates: Rates): number | null {
  if (e.kind === 'expense') return e.amount ?? 0;
  const rate = e.kind === 'hours' ? rates.hourly : rates.mileage;
  return rate == null ? null : round2(e.quantity * rate);
}

export interface BillingSummary {
  hours: number;
  miles: number;
  laborTotal: number;
  mileageTotal: number;
  expenseTotal: number;
  total: number;
  missingRate: boolean; // some hours/miles couldn't be priced
}

export function summarize(entries: BillingEntry[], rates: Rates): BillingSummary {
  const s: BillingSummary = { hours: 0, miles: 0, laborTotal: 0, mileageTotal: 0, expenseTotal: 0, total: 0, missingRate: false };
  for (const e of entries) {
    const amt = entryAmount(e, rates);
    if (e.kind === 'hours') s.hours += e.quantity;
    if (e.kind === 'miles') s.miles += e.quantity;
    if (amt === null) {
      if (e.quantity > 0) s.missingRate = true;
      continue;
    }
    if (e.kind === 'hours') s.laborTotal += amt;
    else if (e.kind === 'miles') s.mileageTotal += amt;
    else s.expenseTotal += amt;
  }
  s.hours = round2(s.hours);
  s.miles = round2(s.miles);
  s.laborTotal = round2(s.laborTotal);
  s.mileageTotal = round2(s.mileageTotal);
  s.expenseTotal = round2(s.expenseTotal);
  s.total = round2(s.laborTotal + s.mileageTotal + s.expenseTotal);
  return s;
}

export type RangeKey = 'all' | 'this_month' | 'last_month' | 'custom';

// Inclusive [from, to] date strings for a preset; null bound = open-ended.
export function rangeFor(key: RangeKey, today: string, custom?: { from: string; to: string }): { from: string | null; to: string | null } {
  if (key === 'all') return { from: null, to: null };
  if (key === 'custom') return { from: custom?.from || null, to: custom?.to || null };
  const [y, m] = today.split('-').map(Number);
  const first = (yy: number, mm: number) => `${yy}-${String(mm).padStart(2, '0')}-01`;
  if (key === 'this_month') return { from: first(y, m), to: addDays(first(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1), -1) };
  const ly = m === 1 ? y - 1 : y;
  const lm = m === 1 ? 12 : m - 1;
  return { from: first(ly, lm), to: addDays(first(y, m), -1) };
}

export function filterEntries(
  entries: BillingEntry[],
  range: { from: string | null; to: string | null },
  unbilledOnly: boolean
): BillingEntry[] {
  return entries.filter(
    (e) =>
      (!range.from || e.entry_date >= range.from) &&
      (!range.to || e.entry_date <= range.to) &&
      (!unbilledOnly || !e.billed_at)
  );
}
