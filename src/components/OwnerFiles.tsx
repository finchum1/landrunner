import { useEffect, useRef, useState } from 'react';
import {
  deleteOwnerFile,
  downloadOwnerFile,
  fetchOwnerFiles,
  uploadOwnerFile,
  type OwnerFile,
} from '../lib/files';
import { MAX_FILE_BYTES, formatBytes } from '../lib/fileFormat';
import { formatDate } from '../lib/format';

// Leases, division orders, title docs etc. attached to one owner.
export default function OwnerFiles({ ownerId }: { ownerId: string }) {
  const [files, setFiles] = useState<OwnerFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    fetchOwnerFiles(ownerId)
      .then((rows) => mounted && setFiles(rows))
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [ownerId]);

  async function handlePick(list: FileList | null) {
    if (!list || list.length === 0) return;
    setBusy(true);
    setError(null);
    const added: OwnerFile[] = [];
    try {
      for (const f of Array.from(list)) {
        if (f.size > MAX_FILE_BYTES) {
          setError(`${f.name} is over 25 MB and was skipped.`);
          continue;
        }
        added.push(await uploadOwnerFile(ownerId, f));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      if (added.length) setFiles((prev) => [...added, ...prev]);
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  async function handleDelete(f: OwnerFile) {
    if (!confirm(`Delete “${f.name}”? This can't be undone.`)) return;
    try {
      await deleteOwnerFile(f);
      setFiles((prev) => prev.filter((x) => x.id !== f.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete that file.');
    }
  }

  return (
    <div className="mt-4 rounded-md border border-stone-200 p-3 dark:border-stone-800">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Files{files.length > 0 ? ` (${files.length})` : ''}
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="text-xs font-medium text-amber-700 hover:underline disabled:opacity-60 dark:text-amber-400"
        >
          {busy ? 'Uploading…' : '+ Upload'}
        </button>
        <input ref={input} type="file" multiple className="hidden" onChange={(e) => handlePick(e.target.files)} />
      </div>
      {loading && <p className="text-xs text-stone-400">Loading…</p>}
      {!loading && files.length === 0 && (
        <p className="text-xs text-stone-400">No files yet — leases, division orders, title documents…</p>
      )}
      <ul className="space-y-1">
        {files.map((f) => (
          <li key={f.id} className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => downloadOwnerFile(f).catch((err) => setError(err instanceof Error ? err.message : 'Download failed.'))}
              className="min-w-0 flex-1 truncate text-left text-stone-700 hover:text-amber-700 hover:underline dark:text-stone-300 dark:hover:text-amber-400"
              title={f.name}
            >
              {f.name}
            </button>
            <span className="shrink-0 text-xs text-stone-400">
              {formatBytes(f.size)} · {formatDate(f.created_at)}
            </span>
            <button
              type="button"
              onClick={() => handleDelete(f)}
              className="shrink-0 text-stone-300 hover:text-rose-500"
              aria-label={`Delete ${f.name}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
