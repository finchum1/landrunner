import type { OrNote, OrRun } from './types';

// The person's own name inside an ownership-report line: drops the "Known and
// Unknown Heirs, Devisees … of" wrapper, "Deceased", a/k/a asides and c/o parts.
export function coreName(line: string): string {
  let s = line
    .replace(/the\s+known\s+and\s+unknown\s+heirs[\s\S]*?(immediate\s+and\s+remote,?|assigns,?)\s*(of|to)\s+/i, '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/,?\s*a\/?k\/?a\b.*$/i, '')
    .replace(/,?\s*(deceased|dec'?d)\b.*$/i, '')
    .replace(/\bc\/o\b.*$/i, '');
  s = s.split(/,|\band\b|&/i)[0];
  return s.replace(/\s+/g, ' ').trim();
}

const tokens = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2);

// Runsheet instruments that plausibly concern this name: both its first and
// last word appear in the grantor, grantee, legal or notes of the row.
export function runsheetFor(runs: OrRun[], lineNames: string[]): OrRun[] {
  const needs = lineNames
    .map((n) => tokens(coreName(n)))
    .filter((t) => t.length > 0)
    .map((t) => [t[0], t[t.length - 1]]);
  if (needs.length === 0) return [];
  return runs.filter((r) => {
    const hay = ` ${tokens(`${r.grantor ?? ''} ${r.grantee ?? ''} ${r.notes ?? ''}`).join(' ')} `;
    return needs.some(([a, b]) => hay.includes(` ${a} `) && hay.includes(` ${b} `));
  });
}

// "2, 2-A" -> ["2", "2-A"]
export function splitRefs(refs: string | null | undefined): string[] {
  return (refs ?? '').split(/[,;]/).map((x) => x.trim()).filter(Boolean);
}

// Subject notes whose number is cited by these lines.
export function notesForRefs(notes: OrNote[], refs: string[]): OrNote[] {
  const set = new Set(refs.map((r) => r.toLowerCase()));
  return notes.filter((n) => n.kind === 'subject' && n.ref && set.has(n.ref.toLowerCase()));
}
