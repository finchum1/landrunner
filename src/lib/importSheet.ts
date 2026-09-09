export interface ParsedSheet {
  headers: string[];
  rows: (string | number)[][];
}

export async function parseSpreadsheetFile(file: File): Promise<ParsedSheet> {
  const XLSX = await import('xlsx');
  const buf = await file.arrayBuffer();
  const workbook = XLSX.read(buf, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows: (string | number)[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0].map((h) => String(h).trim());
  return { headers, rows: rows.slice(1) };
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
export const NMA_PATTERNS = [/net\s*mineral\s*acres/i, /^nma$/i, /nma/i, /^acres$/i, /acres/i];
export const PHONE_PATTERNS = [/phone/i, /tel/i, /cell/i];
export const EMAIL_PATTERNS = [/e-?mail/i];
export const ADDRESS_PATTERNS = [/address/i, /mailing/i];

export function parseNma(value: string | number | undefined): number {
  if (value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/[,$]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function cellToString(value: string | number | undefined): string {
  if (value === undefined) return '';
  return String(value).trim();
}
