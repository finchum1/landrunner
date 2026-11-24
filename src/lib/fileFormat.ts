export const MAX_FILE_BYTES = 25 * 1024 * 1024; // matches the bucket's limit

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

// Storage keys can't hold everything a filename can; keep the readable name in the
// database and use a sanitized one in the path.
export function safeStorageName(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot + 1) : '';
  const clean = (s: string) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '');
  const b = clean(base).slice(0, 80) || 'file';
  const e = clean(ext).slice(0, 10);
  return e ? `${b}.${e}` : b;
}
