import type { MineralOwner, OrInterest, OrNote, OrReport, OrTract, Project, ProjectOfferTerms } from './types';
import { notesForRefs, splitRefs } from './orMatch';

// A Lease Purchase Request: one lessor's page of the office's LPR form.
export interface LprTractRow {
  legal: string;
  tr: string;
  gross: number | null;
  net: number | null;
}
export interface LprData {
  prospect: string;
  orDate: string;
  lprDate: string; // YYYY-MM-DD
  examiner: string;
  revised: string; // Y / N
  prevLprDate: string;
  lastBp: string;
  buyer: string;
  orType: string;
  projectManager: string;
  titleVerif: string;
  rush: string;
  delivery: string;
  partOfGroup: string;
  section: string;
  township: string;
  range: string;
  county: string; // "Kay County, OK"
  tractNumbers: string; // "6 and 7"
  legalDescription: string;
  lessee: string;
  lessor: string;
  marital: string;
  address: string;
  phone: string;
  leaseDate: string; // YYYY-MM-DD
  leaseTerm: string;
  optionTerm: string;
  royalty: string;
  pricePerAcre: number | null;
  optionPrice: string;
  tracts: LprTractRow[]; // the form has room for three
  surfaceOwner: string;
  leaseForm: string;
  recordOwner: string;
  exhibitAttached: string;
  orTitleNote: string;
  exhibitName: string;
  orTitleNoteNums: string;
  approvalEmail: string;
  curativeRequired: string;
  trustDocs: string;
  curativeAttached: string;
  memoOfLease: string;
  curativeNotes: string;
  leaseNotes: string;
  lprNumber: string;
  mailDate: string; // YYYY-MM-DD or ''
  // which ownership-report lines this LPR covers (so it can be reopened)
  interestIds: string[];
}

const STATES: Record<string, string> = { oklahoma: 'OK', texas: 'TX', kansas: 'KS', colorado: 'CO', 'new mexico': 'NM', arkansas: 'AR' };
export const stateAbbr = (s: string | null | undefined) => (s ? STATES[s.trim().toLowerCase()] ?? s.trim() : 'OK');

// "SE4 SE4" -> "SE/4 SE/4", "N2 SE4" -> "N/2 SE/4"
export function formatTractLegal(desc: string | null | undefined): string {
  return (desc ?? '').replace(/\b([NSEW]{1,2})(\d)\b/g, '$1/$2').replace(/\s+/g, ' ').trim();
}
const acres2 = (n: number | null) => (n === null ? '' : n.toFixed(2));
const nma3 = (n: number) => n.toFixed(3);
const spell = (v: string, dir: Record<string, string>) => {
  const m = v.match(/^0*(\d+)\s*([A-Za-z])$/);
  return m ? `${m[1]} ${dir[m[2].toUpperCase()] ?? m[2]}` : v;
};
const joinAnd = (xs: string[]) => (xs.length <= 1 ? xs.join('') : xs.length === 2 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const round = (n: number, d = 6) => Math.round(n * 10 ** d) / 10 ** d;

// The OR's own address block, minus the "c/o" lines, on one line.
export function mailingAddress(raw: string | null | undefined): string {
  return (raw ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/,$/, ''))
    .filter((l) => l && !/^c\/o\b/i.test(l))
    .join(', ');
}

export function lprTotals(d: Pick<LprData, 'tracts' | 'pricePerAcre'>) {
  const gross = round(d.tracts.reduce((s, t) => s + (t.gross ?? 0), 0));
  const net = round(d.tracts.reduce((s, t) => s + (t.net ?? 0), 0));
  return { gross, net, bonus: d.pricePerAcre != null ? round(net * d.pricePerAcre, 2) : null };
}

// Everything derived from WHICH ownership lines this LPR covers: the tract rows
// and the title wording. Re-run when the line selection changes.
export function deriveFromLines(report: OrReport | null, tracts: OrTract[], lines: OrInterest[], notes: OrNote[], project: Pick<Project, 'section' | 'township' | 'range' | 'county'>) {
  const sorted = [...tracts].sort((a, b) => a.sort_order - b.sort_order);
  const sums = new Map<string, number>();
  for (const l of lines) for (const [t, a] of Object.entries(l.tract_acres)) sums.set(t, round((sums.get(t) ?? 0) + a));
  let rows: LprTractRow[] = sorted
    .filter((t) => (sums.get(t.label) ?? 0) > 0)
    .map((t) => ({ legal: formatTractLegal(t.description), tr: t.label, gross: t.gross_acres, net: sums.get(t.label) ?? 0 }));
  if (rows.length === 0 && lines.some((l) => (l.net_acres ?? 0) > 0)) {
    rows = [{ legal: formatTractLegal(report?.description), tr: '', gross: report?.gross_acres ?? null, net: round(lines.reduce((s, l) => s + (l.net_acres ?? 0), 0)) }];
  }

  const refs = [...new Set(lines.flatMap((l) => splitRefs(l.note_refs)))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const refNotes = notesForRefs(notes, refs);
  const noteText = refNotes
    .map((n) => `OR Title Note ${n.ref}: ${n.body.length > 350 ? n.body.slice(0, 350).trim() + '… (see OR)' : n.body.trim()}`)
    .join('  ');

  const sect = report?.section || project.section || '';
  const twp = report?.township || project.township || '';
  const rge = report?.range || project.range || '';
  const county = report?.county || project.county || '';
  const desc = formatTractLegal(report?.description);
  const allTracts = sorted.map((t) => `Tract ${t.label} (${formatTractLegal(t.description)}, containing ${acres2(t.gross_acres)} acres, more or less)`);
  const total = report?.gross_acres ?? sorted.reduce((s, t) => s + (t.gross_acres ?? 0), 0);
  const legalDescription = `${desc ? desc + ' of ' : ''}Section ${sect}, Township ${spell(twp, { N: 'North', S: 'South' })}, Range ${spell(rge, { W: 'West', E: 'East' })}, ${county} County, ${report?.state || 'Oklahoma'}${
    allTracts.length ? `, being ${joinAnd(allTracts)}, containing ${acres2(total)} acres, more or less.` : '.'
  }`;

  const covers = lines
    .map((l) => {
      const parts = sorted.filter((t) => l.tract_acres[t.label]).map((t) => `${l.tract_acres[t.label]} NMA in Tract ${t.label}`);
      return `${l.name.replace(/\s+/g, ' ')} — ${parts.length ? joinAnd(parts) + ' ' : ''}(${nma3(l.net_acres ?? 0)} NMA)`;
    })
    .join('; ');
  const surface = `Surface ownership not examined per Ownership Report dated ${report?.or_date ?? '___'} (examiner ${report?.examiner ?? '___'}; last entry ${report?.last_entry ?? '___'}).${
    report?.begin_date ? ` Report updates the ${report.begin_date} DOTO and is limited to mineral ownership of the ${desc || 'tract'}.` : ''
  }${covers ? `  Covers the OR interest of: ${covers}.` : ''}${noteText ? `  ${noteText}` : ''}`;

  return {
    tracts: rows.slice(0, 3),
    tooManyTracts: rows.length > 3,
    tractNumbers: joinAnd(rows.map((r) => r.tr).filter(Boolean)),
    legalDescription,
    county: `${county} County, ${stateAbbr(report?.state)}`,
    section: sect,
    township: twp,
    range: rge,
    orTitleNote: refs.length ? 'Y' : 'N',
    orTitleNoteNums: refs.join(', '),
    curativeRequired: refs.length ? 'Y' : 'N',
    curativeNotes: surface,
  };
}

export interface LprInput {
  project: Pick<Project, 'operator_name' | 'project_manager' | 'prospect_number' | 'section' | 'township' | 'range' | 'county'>;
  report: OrReport | null;
  tracts: OrTract[];
  notes: OrNote[];
  lines: OrInterest[];
  owner: Pick<MineralOwner, 'name' | 'address' | 'phone'> | null;
  buyer: string;
  terms: Pick<ProjectOfferTerms, 'rate_per_acre' | 'royalty_label' | 'lease_term_months' | 'option_to_extend'> | undefined;
  today: string;
  groupName?: string | null;
}

export function buildLprDraft(i: LprInput): LprData {
  const d = deriveFromLines(i.report, i.tracts, i.lines, i.notes, i.project);
  const firstLine = i.lines[0];
  // unprobated heirs usually need heirship or probate before a lease can be taken
  const heirs = [i.owner?.name ?? '', ...i.lines.map((l) => l.name)].some((n) => /known and unknown heirs/i.test(n));
  const price = i.terms?.rate_per_acre ?? null;
  const years = i.terms?.lease_term_months ? i.terms.lease_term_months / 12 : null;
  const offer =
    price !== null && i.terms
      ? `Offer: $${Number.isInteger(price) ? price : price.toFixed(2)}/NMA, ${i.terms.royalty_label ?? ''} royalty, ${years ?? ''}-year term.`.replace(/ ,/g, ',')
      : '';
  const base: LprData = {
    prospect: i.report?.prospect_number || i.project.prospect_number || '',
    orDate: i.report?.or_date ?? '',
    lprDate: i.today,
    examiner: i.report?.examiner ?? '',
    revised: 'N',
    prevLprDate: '',
    lastBp: i.report?.last_entry ?? '',
    buyer: i.buyer,
    orType: i.report?.report_type ?? 'OR',
    projectManager: i.project.project_manager ?? '',
    titleVerif: heirs ? 'Y' : 'N',
    rush: 'N',
    delivery: 'Mail',
    partOfGroup: i.groupName ? `Y - ${i.groupName}` : 'N',
    section: d.section,
    township: d.township,
    range: d.range,
    county: d.county,
    tractNumbers: d.tractNumbers,
    legalDescription: d.legalDescription,
    lessee: i.project.operator_name ?? '',
    lessor: i.owner?.name ?? firstLine?.name ?? '',
    marital: '',
    address: mailingAddress(i.owner?.address ?? firstLine?.address),
    phone: i.owner?.phone ?? '',
    leaseDate: i.today,
    leaseTerm: years !== null ? String(years) : '',
    optionTerm: i.terms?.option_to_extend ? '' : '0',
    royalty: i.terms?.royalty_label ?? '',
    pricePerAcre: price,
    optionPrice: 'N/A',
    tracts: d.tracts,
    surfaceOwner: 'N',
    leaseForm: 'Client',
    recordOwner: 'Yes',
    exhibitAttached: 'N',
    orTitleNote: d.orTitleNote,
    exhibitName: 'Client',
    orTitleNoteNums: d.orTitleNoteNums,
    approvalEmail: 'N',
    curativeRequired: d.curativeRequired,
    trustDocs: 'N',
    curativeAttached: 'N',
    memoOfLease: 'N',
    curativeNotes: d.curativeNotes,
    leaseNotes: `Standard client lease form. ${offer}`.trim(),
    lprNumber: '',
    mailDate: '',
    interestIds: i.lines.map((l) => l.id),
  };
  return base;
}

// The form's file / tab name: "Kay County 26-013 LPR - Kathleen Bignell".
export function lprFileName(d: Pick<LprData, 'county' | 'prospect' | 'lessor'>): string {
  const county = d.county.split(',')[0];
  const who = d.lessor.replace(/[\\/:*?"<>|[\]]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 70) || 'Lessor';
  return `${county} ${d.prospect} LPR - ${who}.xlsx`.replace(/\s+/g, ' ');
}
export function lprSheetName(lessor: string): string {
  return (lessor.replace(/[\\/:*?"<>|[\]]+/g, ' ').replace(/\s+/g, ' ').trim() || 'LPR').slice(0, 31);
}
