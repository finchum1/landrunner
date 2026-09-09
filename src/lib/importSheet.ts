export type RawCell = string | number;
export type RawRow = RawCell[];

export async function parseSpreadsheetRaw(file: File): Promise<RawRow[]> {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const workbook = XLSX.read(buf, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows: RawRow[] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });
  return rows;
}

// Best-effort guess at which column holds which field, by header text.
export function guessColumnIndex(headers: string[], patterns: RegExp[]): number {
  for (const pattern of patterns) {
    const idx = headers.findIndex((h) => pattern.test(h));
    if (idx !== -1) return idx;
  }
  return -1;
}

export const NAME_PATTERNS = [/^owner\s*name$/i, /^name$/i, /owner/i, /^name/i];
export const NMA_PATTERNS = [/net\s*mineral\s*acres/i, /^nma$/i, /nma/i, /net\s*acres/i, /^acres$/i, /acres/i];
export const INTEREST_PATTERNS = [/interest/i, /^int\.?$/i, /decimal/i];
export const PHONE_PATTERNS = [/phone/i, /tel/i, /cell/i];
export const EMAIL_PATTERNS = [/e-?mail/i];
export const ADDRESS_PATTERNS = [/address/i, /mailing/i];
export const NOTES_PATTERNS = [/notes?/i, /comment/i, /remark/i];

// Real ownership reports (title opinions, division orders) often have several
// metadata lines above the real header row (legal description, county, tract,
// "containing X acres", etc). Guess which row is actually the header by
// scanning the first several rows for one that looks like Name + (NMA or
// Interest) column headers.
export function guessHeaderRowIndex(rawRows: RawRow[]): number {
  const limit = Math.min(rawRows.length, 25);
  let best = 0;
  let bestScore = -1;
  for (let i = 0; i < limit; i++) {
    const headers = rawRows[i].map((c) => String(c));
    const hasName = guessColumnIndex(headers, NAME_PATTERNS) !== -1;
    if (!hasName) continue;
    const hasAmount =
      guessColumnIndex(headers, NMA_PATTERNS) !== -1 || guessColumnIndex(headers, INTEREST_PATTERNS) !== -1;
    const nonEmpty = headers.filter((h) => h.trim() !== '').length;
    const score = (hasAmount ? 10 : 0) + nonEmpty;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

export function isTotalRow(name: string): boolean {
  return /^totals?:?$/i.test(name.trim());
}

export function parseNma(value: RawCell | undefined): number {
  if (value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[,$]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

// Interest columns in ownership reports are usually a decimal fraction
// (0.5288) but occasionally written as a percentage (52.88 or "52.88%").
// If the raw value looks like it's already >1 (and not a fraction typo),
// treat it as a percentage and convert down to a fraction for storage.
export function parseInterest(value: RawCell | undefined): number | null {
  if (value === undefined || value === '') return null;
  const isPercentString = typeof value === 'string' && value.trim().endsWith('%');
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[,%]/g, ''));
  if (!Number.isFinite(n)) return null;
  if (isPercentString || n > 1) return n / 100;
  return n;
}

export function cellToString(value: RawCell | undefined): string {
  if (value === undefined) return '';
  return String(value).trim();
}
