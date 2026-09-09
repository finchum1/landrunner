export function formatMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

export function formatAcres(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '0';
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

// Stored as a decimal fraction (e.g. 0.5287684), displayed as a percentage.
export function formatInterest(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${(n * 100).toLocaleString('en-US', { maximumFractionDigits: 4 })}%`;
}

export function legalDescription(p: {
  target_area?: string | null;
  section?: string | null;
  township?: string | null;
  range?: string | null;
  county?: string | null;
}): string {
  const parts: string[] = [];
  if (p.section) parts.push(`Sec. ${p.section}`);
  if (p.township && p.range) parts.push(`${p.township}-${p.range}`);
  else if (p.township) parts.push(p.township);
  else if (p.range) parts.push(p.range);
  let str = parts.join(', ');
  if (p.target_area) str = str ? `${p.target_area} of ${str}` : p.target_area;
  if (p.county) str = str ? `${str}, ${p.county} County` : `${p.county} County`;
  return str;
}

export function formatLeaseTerm(months: number | null | undefined): string {
  if (!months) return '—';
  if (months % 12 === 0) {
    const years = months / 12;
    return `${years} year${years === 1 ? '' : 's'}`;
  }
  return `${months} month${months === 1 ? '' : 's'}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
