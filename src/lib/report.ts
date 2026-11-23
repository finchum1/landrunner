import type { MineralOwner, OwnerStatus, Project, ProjectOfferTerms } from './types';
import { STATUS_LABELS, STATUS_ORDER } from './types';
import { bonusDue, termsFor } from './bonus';
import { addDays } from './callOutcomes';

export interface ActivityLite {
  owner_id: string;
  note: string;
  outcome: string | null;
  created_at: string;
}

export interface StatusRow {
  status: OwnerStatus;
  label: string;
  owners: number;
  nma: number;
  pctNma: number; // 0-100
}

export interface OwnerLine {
  name: string;
  nma: number;
  status: OwnerStatus;
  tier: string;
  rate: number | null;
  bonus: number | null;
  paidAt: string | null;
  nextContact: string | null;
}

export interface ReportModel {
  project: Pick<Project, 'name' | 'prospect_number' | 'operator_name'>;
  asOf: string;
  periodDays: number;
  periodStart: string;
  totals: {
    owners: number;
    totalNma: number;
    leasedOwners: number;
    leasedNma: number;
    pctLeasedNma: number;
    contactedOwners: number; // anyone past "not contacted"
    bonusOwed: number;
    bonusPaid: number;
    bonusOutstanding: number;
  };
  byStatus: StatusRow[];
  leased: OwnerLine[];
  inPlay: OwnerLine[]; // offer made / negotiating
  activity: {
    calls: number;
    ownersTouched: number;
    offersPrepared: number;
  };
}

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);
const round2 = (n: number) => Math.round(n * 100) / 100;

// A client-facing snapshot. Deliberately contains no phone numbers, emails,
// addresses or internal notes.
export function buildReport(
  project: Pick<Project, 'name' | 'prospect_number' | 'operator_name'>,
  owners: MineralOwner[],
  terms: ProjectOfferTerms[],
  activity: ActivityLite[],
  asOf: string,
  periodDays: number
): ReportModel {
  const periodStart = addDays(asOf, -periodDays);
  const totalNma = owners.reduce((s, o) => s + o.nma, 0);

  const byStatus: StatusRow[] = STATUS_ORDER.map((status) => {
    const mine = owners.filter((o) => o.status === status);
    const nma = mine.reduce((s, o) => s + o.nma, 0);
    return { status, label: STATUS_LABELS[status], owners: mine.length, nma: round2(nma), pctNma: pct(nma, totalNma) };
  });

  const line = (o: MineralOwner): OwnerLine => {
    const t = termsFor(o, terms);
    return {
      name: o.name,
      nma: o.nma,
      status: o.status,
      tier: t?.label ?? '',
      rate: t?.rate_per_acre ?? null,
      bonus: bonusDue(o, terms),
      paidAt: o.bonus_paid_at,
      nextContact: o.next_contact_date,
    };
  };
  const byNmaDesc = (a: OwnerLine, b: OwnerLine) => b.nma - a.nma || a.name.localeCompare(b.name);

  const leasedOwners = owners.filter((o) => o.status === 'leased');
  const leased = leasedOwners.map(line).sort(byNmaDesc);
  const inPlay = owners.filter((o) => o.status === 'offer_made' || o.status === 'negotiating').map(line).sort(byNmaDesc);

  const bonusOwed = leased.reduce((s, l) => s + (l.bonus ?? 0), 0);
  const bonusPaid = leased.reduce((s, l) => s + (l.paidAt ? l.bonus ?? 0 : 0), 0);

  // created_at is a timestamp; compare on its date part, in the period [start, asOf].
  const inPeriod = activity.filter((a) => {
    const d = a.created_at.slice(0, 10);
    return d > periodStart && d <= asOf;
  });
  const callLogs = inPeriod.filter((a) => a.outcome !== 'Offer letter');

  return {
    project,
    asOf,
    periodDays,
    periodStart,
    totals: {
      owners: owners.length,
      totalNma: round2(totalNma),
      leasedOwners: leasedOwners.length,
      leasedNma: round2(leasedOwners.reduce((s, o) => s + o.nma, 0)),
      pctLeasedNma: pct(leasedOwners.reduce((s, o) => s + o.nma, 0), totalNma),
      contactedOwners: owners.filter((o) => o.status !== 'not_contacted').length,
      bonusOwed: round2(bonusOwed),
      bonusPaid: round2(bonusPaid),
      bonusOutstanding: round2(bonusOwed - bonusPaid),
    },
    byStatus,
    leased,
    inPlay,
    activity: {
      calls: callLogs.length,
      ownersTouched: new Set(callLogs.map((a) => a.owner_id)).size,
      offersPrepared: new Set(inPeriod.filter((a) => a.outcome === 'Offer letter').map((a) => a.owner_id)).size,
    },
  };
}

export async function exportReportXlsx(r: ReportModel): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const add = (name: string, rows: (string | number)[][], widths: number[]) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = widths.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  };
  const t = r.totals;
  add(
    'Summary',
    [
      [r.project.name + (r.project.prospect_number ? ` (#${r.project.prospect_number})` : '')],
      [r.project.operator_name ? `Operator: ${r.project.operator_name}` : ''],
      [`Status as of ${r.asOf}`],
      [],
      ['Mineral owners', t.owners],
      ['Total net mineral acres', t.totalNma],
      ['Owners contacted', t.contactedOwners],
      ['Leased owners', t.leasedOwners],
      ['Leased NMA', t.leasedNma],
      ['% of NMA leased', t.pctLeasedNma],
      ['Bonus owed on leased', t.bonusOwed],
      ['Bonus paid', t.bonusPaid],
      ['Bonus outstanding', t.bonusOutstanding],
      [],
      [`Last ${r.periodDays} days`],
      ['Calls / contacts logged', r.activity.calls],
      ['Owners reached out to', r.activity.ownersTouched],
      ['Offer letters prepared', r.activity.offersPrepared],
    ],
    [30, 16]
  );
  add(
    'By status',
    [['Status', 'Owners', 'NMA', '% of NMA'], ...r.byStatus.map((s) => [s.label, s.owners, s.nma, s.pctNma])],
    [20, 10, 12, 10]
  );
  const ownerRows = (list: OwnerLine[]) => [
    ['Owner', 'NMA', 'Terms', '$/acre', 'Bonus', 'Bonus paid', 'Status', 'Next contact'],
    ...list.map((l) => [l.name, l.nma, l.tier, l.rate ?? '', l.bonus ?? '', l.paidAt ?? '', STATUS_LABELS[l.status], l.nextContact ?? '']),
  ];
  add('Leased', ownerRows(r.leased), [32, 10, 14, 9, 12, 12, 14, 13]);
  add('Offers out', ownerRows(r.inPlay), [32, 10, 14, 9, 12, 12, 14, 13]);
  const safe = r.project.name.replace(/[^\w\- ]+/g, '').trim() || 'Project';
  XLSX.writeFile(wb, `${safe} status report ${r.asOf}.xlsx`);
}
