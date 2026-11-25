// Reads a title company's Ownership Report workbook. Layouts differ by county
// and by how the tracts are laid out, so nothing here depends on a fixed tab
// name or cell address: every tab is recognized by what is written on it
// (headers and labels), and anything it cannot place is reported as a warning.

export type Cell = string | number | boolean | Date | null | undefined;
export interface RawSheet {
  name: string;
  rows: Cell[][];
}

export interface ParsedTract {
  label: string;
  description: string;
  grossAcres: number | null;
  sheetName: string;
}
export interface ParsedInterest {
  name: string;
  address: string;
  interest: number | null;
  netAcres: number | null;
  noteRefs: string;
  tractAcres: Record<string, number>;
  rowOrder: number;
}
export interface ParsedNote {
  kind: 'general' | 'subject' | 'stranger';
  ref: string;
  body: string;
}
export interface ParsedRun {
  bookPage: string;
  instrument: string;
  effectiveDate: string;
  fileDate: string;
  grantor: string;
  grantee: string;
  legal: string;
  conveyance: string;
  notes: string;
}
export interface ParsedReport {
  prospectNumber: string;
  section: string;
  township: string;
  range: string;
  county: string;
  state: string;
  description: string;
  grossAcres: number | null;
  orDate: string;
  lastEntry: string;
  examiner: string;
  reportType: string;
  beginDate: string;
  endDate: string;
}
export interface ParsedOr {
  report: ParsedReport;
  tracts: ParsedTract[];
  interests: ParsedInterest[];
  notes: ParsedNote[];
  runsheet: ParsedRun[];
  warnings: string[];
  sheets: { name: string; role: 'plat' | 'summary' | 'tract' | 'runsheet' | 'ignored' }[];
}

// ---------- small helpers ----------
export function cellText(v: Cell): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return fmtDate(v);
  return String(v).replace(/ /g, ' ').trim();
}
function fmtDate(d: Date): string {
  // Excel dates arrive at UTC midnight; read them in UTC so the day doesn't shift.
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
}
export function cellNumber(v: Cell): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[,$%\s]/g, ''));
    return Number.isFinite(n) && /\d/.test(v) ? n : null;
  }
  return null;
}
export function normName(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').replace(/[^a-z0-9 ]/g, '').trim();
}
const lines = (rows: Cell[][], n = rows.length) => rows.slice(0, n).map((r) => r.map(cellText).join(' | ')).join('\n');

function findHeaderRow(rows: Cell[][], test: (t: string) => boolean, limit = 40): number {
  for (let i = 0; i < Math.min(rows.length, limit); i++) if (rows[i].some((c) => test(cellText(c)))) return i;
  return -1;
}
function colWhere(row: Cell[], test: (t: string) => boolean): number {
  return row.findIndex((c) => test(cellText(c)));
}
// The value written to the right of a label ("DESCRIPTION:" -> "SE4").
function valueAfter(rows: Cell[][], label: RegExp, limit = rows.length): string {
  for (let r = 0; r < Math.min(rows.length, limit); r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const t = cellText(row[c]);
      if (!label.test(t)) continue;
      // "BEGINNING DATE: 12/3/2013" style: value inside the same cell
      const inline = t.replace(label, '').replace(/^[\s:]+/, '').trim();
      if (inline) return inline;
      for (let k = c + 1; k < row.length; k++) {
        const v = cellText(row[k]);
        if (v) return /(:\s*$)|(dated\s*$)|^last entry|^examiner\s*:/i.test(v) ? '' : v;
      }
    }
  }
  return '';
}

// ---------- classify tabs ----------
type Role = 'plat' | 'summary' | 'tract' | 'runsheet' | 'ignored';
function classify(s: RawSheet, hasTractNamed: boolean): Role {
  const head = lines(s.rows, 60).toLowerCase();
  if (findHeaderRow(s.rows, (t) => /book\s*\/\s*page/i.test(t)) >= 0 && /instrument/.test(head)) return 'runsheet';
  const hdr = findHeaderRow(s.rows, (t) => /^mineral\s*owner/i.test(t));
  if (hdr >= 0) {
    const row = s.rows[hdr];
    const tractLike = /tract\s*[\w-]+/i.test(s.name) || colWhere(row, (t) => /lease\s*#|leasehold/i.test(t)) >= 0 || s.rows.slice(0, hdr).some((r) => /^tract\s+\S+/i.test(cellText(r[0])));
    if (tractLike && !/summary/i.test(s.name)) return 'tract';
    return 'summary';
  }
  if (/prospect name|attachments:|examiner:/i.test(head)) return 'plat';
  void hasTractNamed;
  return 'ignored';
}

// ---------- tables of owners ----------
interface OwnerRow {
  name: string;
  interest: number | null;
  net: number | null;
  address: string;
  note: string;
}
function readOwnerTable(rows: Cell[][]): { header: number; list: OwnerRow[]; totalRow: number } {
  const header = findHeaderRow(rows, (t) => /^mineral\s*owner/i.test(t));
  if (header < 0) return { header, list: [], totalRow: -1 };
  const h = rows[header];
  const nameC = colWhere(h, (t) => /^mineral\s*owner/i.test(t));
  const intC = colWhere(h, (t) => /^interest/i.test(t));
  const netC = colWhere(h, (t) => /net\s*acres/i.test(t));
  const addrC = colWhere(h, (t) => /address/i.test(t));
  const noteC = colWhere(h, (t) => /note/i.test(t));
  const list: OwnerRow[] = [];
  let totalRow = -1;
  for (let r = header + 1; r < rows.length; r++) {
    const row = rows[r];
    const name = cellText(row[nameC]);
    if (/^total\b/i.test(name)) {
      totalRow = r;
      break;
    }
    const interest = intC >= 0 ? cellNumber(row[intC]) : null;
    const net = netC >= 0 ? cellNumber(row[netC]) : null;
    const address = addrC >= 0 ? cellText(row[addrC]) : '';
    const note = noteC >= 0 ? cellText(row[noteC]) : '';
    if (!name && interest === null && net === null) {
      // a continuation line of the address above (a second c/o line)
      if (address && list.length) list[list.length - 1].address += `\n${address}`;
      continue;
    }
    list.push({ name, interest, net, address, note });
  }
  return { header, list, totalRow };
}

// ---------- notes under the summary ----------
function parseNotes(rows: Cell[][], from: number): ParsedNote[] {
  const out: ParsedNote[] = [];
  let kind: ParsedNote['kind'] | null = null;
  let blob = '';
  const flush = () => {
    if (!kind || !blob.trim()) return;
    const parts = blob.split(/(?:^|\n)\s*\((\d+[A-Za-z]?(?:-[A-Za-z0-9]+)?)\)\s*/);
    // parts: [pre, ref1, body1, ref2, body2 ...]
    for (let i = 1; i < parts.length; i += 2) {
      const body = (parts[i + 1] ?? '').trim();
      if (body) out.push({ kind: kind, ref: parts[i], body });
    }
    blob = '';
  };
  for (let r = from; r < rows.length; r++) {
    const t = rows[r].map(cellText).filter(Boolean).join(' ').trim();
    if (!t) continue;
    if (/^general notes/i.test(t)) { flush(); kind = 'general'; continue; }
    if (/^subject notes/i.test(t)) { flush(); kind = 'subject'; continue; }
    if (/^strangers/i.test(t)) { flush(); kind = 'stranger'; continue; }
    if (/^subject to easements/i.test(t)) { flush(); kind = null; continue; }
    if (kind) blob += (blob ? '\n' : '') + (typeof rows[r][0] === 'string' ? String(rows[r][0]) : t);
  }
  flush();
  return out;
}

// ---------- plat page ----------
function readPlat(sheets: RawSheet[], summary: RawSheet | undefined): ParsedReport {
  const plat = sheets.find((s) => classify(s, false) === 'plat');
  const rows = plat?.rows ?? [];
  const get = (re: RegExp) => valueAfter(rows, re);
  const stateFull = get(/^state\s*:?$/i) || get(/^state$/i);
  let section = get(/^section\s*:?$/i);
  let township = get(/^township\s*:?$/i);
  let range = get(/^range\s*:?$/i);
  let county = get(/^county\s*:?$/i);
  const sumTop = summary ? lines(summary.rows, 12) : '';
  const m = sumTop.match(/section\s+(\d+)\W+township\s+(\d+)\s*(north|south|n|s)\W+range\s+(\d+)\s*(west|east|w|e)?/i);
  if (m) {
    section = section || m[1];
    township = township || `${m[2]}${m[3][0].toUpperCase()}`;
    range = range || `${m[4]}${(m[5] ?? 'W')[0].toUpperCase()}`;
  }
  const cm = sumTop.match(/([A-Za-z .]+?)\s+county\W+(\w+)/i);
  if (!county && cm) county = cm[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
  const trim0 = (s: string) => s.replace(/^0+(?=\d)/, '');

  // Which report line carries a date: the OR, a title-opinion update, or a cursory report.
  let orDate = '';
  let lastEntry = '';
  for (let r = 0; r < rows.length; r++) {
    const t = rows[r].map(cellText).join(' ');
    if (/(ownership report|title opinion update|cursory report)[^|]*dated/i.test(t)) {
      const d = valueAfter([rows[r]], /(ownership report|title opinion update|cursory report)[^:]*dated\s*:?/i);
      if (d && !orDate) {
        orDate = d;
        lastEntry = valueAfter([rows[r]], /last entry\s*:?/i);
      }
    }
  }
  const description = summary ? valueAfter(summary.rows, /^description\s*:?/i, 20) : '';
  const containing = summary ? cellNumber(valueAfter(summary.rows, /^containing\s*:?/i, 20)) : null;
  const platAcres = plat ? lines(plat.rows, 20).match(/containing\s+([\d,.]+)\s*acres/i) : null;
  return {
    prospectNumber: get(/prospect\s*name\s*:?/i) || get(/prospect\s*(#|no\.?|number)\s*:?/i),
    section: trim0(section),
    township: trim0(township),
    range: trim0(range),
    county,
    state: stateFull,
    description,
    grossAcres: containing ?? (platAcres ? cellNumber(platAcres[1]) : null),
    orDate,
    lastEntry,
    examiner: get(/^examiner\s*:?/i),
    reportType: 'OR',
    beginDate: '',
    endDate: '',
  };
}

// ---------- runsheet ----------
function readRunsheet(s: RawSheet): { rows: ParsedRun[]; begin: string; end: string } {
  const header = findHeaderRow(s.rows, (t) => /book\s*\/\s*page/i.test(t));
  const h = s.rows[header];
  const col = (re: RegExp) => colWhere(h, (t) => re.test(t));
  const c = {
    bp: col(/book\s*\/\s*page/i),
    inst: col(/instrument/i),
    eff: col(/effective/i),
    file: col(/file\s*date/i),
    gor: col(/grantor|assignor|lessor/i),
    gee: col(/grantee|assignee|lessee/i),
    legal: col(/legal/i),
    conv: col(/conveyance/i),
    notes: col(/notes|reservations/i),
  };
  const t = (row: Cell[], i: number) => (i >= 0 ? cellText(row[i]) : '');
  const out: ParsedRun[] = [];
  for (let r = header + 1; r < s.rows.length; r++) {
    const row = s.rows[r];
    const rec = { bookPage: t(row, c.bp), instrument: t(row, c.inst), effectiveDate: t(row, c.eff), fileDate: t(row, c.file), grantor: t(row, c.gor), grantee: t(row, c.gee), legal: t(row, c.legal), conveyance: t(row, c.conv), notes: t(row, c.notes) };
    if (!rec.bookPage && !rec.instrument && !rec.grantor && !rec.grantee) continue;
    out.push(rec);
  }
  const begin = (valueAfter(s.rows, /beginning\s*date\s*:?/i, header) || '').replace(/\s+/g, ' ');
  const end = (valueAfter(s.rows, /end(ing)?\s*date\s*:?/i, header) || '').replace(/\s+/g, ' ');
  return { rows: out, begin, end };
}

// ---------- main ----------
export function parseOrWorkbook(sheets: RawSheet[]): ParsedOr {
  const warnings: string[] = [];
  const roles = sheets.map((s) => ({ name: s.name, role: classify(s, sheets.some((x) => /tract/i.test(x.name))) as Role }));
  const by = (role: Role) => sheets.filter((_, i) => roles[i].role === role);

  const summarySheet = by('summary')[0];
  const tractSheets = by('tract');
  const runSheet = by('runsheet')[0];
  const report = readPlat(sheets, summarySheet ?? tractSheets[0]);

  // tracts
  const tracts: ParsedTract[] = [];
  const tractTables: { label: string; list: OwnerRow[] }[] = [];
  for (const s of tractSheets) {
    const nameM = s.name.match(/tract\s*([\w-]+)/i);
    let label = nameM ? nameM[1] : '';
    if (!label) {
      const a = s.rows.map((r) => cellText(r[0])).find((t) => /^tract\s+\S+/i.test(t));
      label = a ? a.replace(/^tract\s+/i, '').trim() : String(tracts.length + 1);
    }
    const description = valueAfter(s.rows, /^description\s*:?/i, 20);
    const gross = cellNumber(valueAfter(s.rows, /^containing\s*:?/i, 20));
    tracts.push({ label, description, grossAcres: gross, sheetName: s.name });
    tractTables.push({ label, list: readOwnerTable(s.rows).list });
  }

  // base list of ownership lines
  let base: ParsedInterest[] = [];
  let notes: ParsedNote[] = [];
  if (summarySheet) {
    const t = readOwnerTable(summarySheet.rows);
    base = t.list
      .filter((o) => o.name)
      .map((o, i) => ({ name: o.name, address: o.address, interest: o.interest, netAcres: o.net, noteRefs: o.note, tractAcres: {}, rowOrder: i }));
    if (t.totalRow >= 0) notes = parseNotes(summarySheet.rows, t.totalRow + 1);
  } else if (tractTables.length) {
    base = tractTables[0].list.filter((o) => o.name).map((o, i) => ({ name: o.name, address: '', interest: o.interest, netAcres: o.net, noteRefs: o.note, tractAcres: {}, rowOrder: i }));
    warnings.push('No summary tab found: owners were taken from the first tract tab and have no addresses.');
  } else {
    warnings.push('Could not find an ownership table (a tab with a MINERAL OWNER column).');
  }

  // Put each tract tab's net acres onto the matching owner line. Tract tabs
  // aren't typed from the summary, so names drift ("ofthe", reordered words,
  // a missing name), and the match goes in passes, strictest first:
  //  1. same name, Nth occurrence <-> Nth occurrence
  //  2. same letters ignoring spaces/punctuation
  //  3. most words in common
  //  4. position: an unnamed row that sits between two matched rows belongs to
  //     the one unmatched owner line between them
  const compact = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '');
  const words = (t: string) => new Set(t.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2));
  const overlap = (a: Set<string>, b: Set<string>) => {
    if (!a.size || !b.size) return 0;
    let n = 0;
    a.forEach((w) => b.has(w) && (n += 1));
    return n / Math.min(a.size, b.size);
  };
  for (const tt of tractTables) {
    const rowToBase = new Map<number, number>();
    const baseTaken = new Set<number>();
    const assign = (row: number, bi: number) => {
      rowToBase.set(row, bi);
      baseTaken.add(bi);
      const net = tt.list[row].net;
      if (net !== null && net !== 0) base[bi].tractAcres[tt.label] = net;
    };
    // pass 1: exact name, Nth occurrence
    {
      const index = new Map<string, number[]>();
      tt.list.forEach((o, i) => {
        const k = normName(o.name);
        if (k) index.set(k, [...(index.get(k) ?? []), i]);
      });
      const seen = new Map<string, number>();
      base.forEach((line, bi) => {
        const k = normName(line.name);
        const nth = seen.get(k) ?? 0;
        seen.set(k, nth + 1);
        const idx = index.get(k)?.[nth];
        if (idx !== undefined) assign(idx, bi);
      });
    }
    const unmatchedRows = () => tt.list.map((_, i) => i).filter((i) => !rowToBase.has(i) && (tt.list[i].net ?? 0) !== 0);
    // pass 2: same letters
    for (const r of unmatchedRows()) {
      const k = compact(tt.list[r].name);
      if (!k) continue;
      const bi = base.findIndex((l, i) => !baseTaken.has(i) && compact(l.name) === k);
      if (bi >= 0) assign(r, bi);
    }
    // pass 3: most words in common
    for (const r of unmatchedRows()) {
      const w = words(tt.list[r].name);
      let best = -1;
      let bestScore = 0.6;
      base.forEach((l, i) => {
        if (baseTaken.has(i) || !(l.netAcres ?? 0)) return;
        const sc = overlap(w, words(l.name));
        if (sc > bestScore) {
          best = i;
          bestScore = sc;
        }
      });
      if (best >= 0) assign(r, best);
    }
    // pass 4: by position between matched neighbours
    for (const r of unmatchedRows()) {
      let prev = -1;
      for (let i = r - 1; i >= 0; i--) if (rowToBase.has(i)) { prev = rowToBase.get(i)!; break; }
      let next = base.length;
      for (let i = r + 1; i < tt.list.length; i++) if (rowToBase.has(i)) { next = rowToBase.get(i)!; break; }
      const acres = tt.list[r].net ?? 0;
      const cands = base
        .map((_, i) => i)
        .filter((i) => i > prev && i < next && !baseTaken.has(i) && (base[i].netAcres ?? 0) >= acres - 0.001 && base[i].tractAcres[tt.label] === undefined);
      if (cands.length === 1) assign(r, cands[0]);
    }
    const lost = unmatchedRows();
    if (lost.length)
      warnings.push(`Tract ${tt.label}: ${lost.length} line(s) with acres could not be matched to an owner (${lost.slice(0, 3).map((i) => tt.list[i].name || '(no name)').join('; ')}).`);
  }

  // Cross-check: tract acres should add up to the owner's net acres.
  let off = 0;
  for (const l of base) {
    const sum = Object.values(l.tractAcres).reduce((a, b) => a + b, 0);
    if (l.netAcres && tractTables.length && Math.abs(sum - l.netAcres) > 0.01) off += 1;
  }
  if (off) warnings.push(`${off} owner line(s) have tract acres that don't add up to their net acres. Check them before relying on a tract split.`);

  let runsheet: ParsedRun[] = [];
  if (runSheet) {
    const rs = readRunsheet(runSheet);
    runsheet = rs.rows;
    report.beginDate = rs.begin;
    report.endDate = rs.end;
  }

  return {
    report,
    tracts,
    interests: base,
    notes,
    runsheet,
    warnings,
    sheets: roles,
  };
}
