import { useMemo, useState } from 'react';
import type { MineralOwner, OwnerGroup } from '../lib/types';
import { formatAcres } from '../lib/format';

// Link owners that belong together (an estate and its heirs, a couple, a
// family): one call covers them all, and they sit together in the table.
export default function GroupModal({
  owners,
  group,
  preselected,
  onClose,
  onSave,
}: {
  owners: MineralOwner[]; // every owner in the project
  group?: OwnerGroup; // set when adding to an existing group
  preselected: string[];
  onClose: () => void;
  onSave: (name: string, ownerIds: string[]) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set(preselected));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only owners not already in a group can be picked (plus the ones passed in).
  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return owners
      .filter((o) => (!o.group_id || preselected.includes(o.id)) && (!q || o.name.toLowerCase().includes(q)))
      .sort((a, b) => b.nma - a.nma);
  }, [owners, search, preselected]);

  const existingCount = group ? owners.filter((o) => o.group_id === group.id).length : 0;
  const need = group ? 1 : 2;
  const valid = picked.size >= need && (group ? true : name.trim().length > 0);

  async function save() {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await onSave(group ? group.name : name.trim(), [...picked]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the group.');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white p-6 shadow-xl dark:bg-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-semibold text-stone-900 dark:text-stone-100">
          {group ? `Add owners to “${group.name}”` : 'Link related owners'}
        </h2>
        <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
          {group
            ? `${existingCount} owner${existingCount === 1 ? '' : 's'} in this group now.`
            : 'Pick the owners that belong together, like an estate and its heirs. One logged call can cover the whole group.'}
        </p>
        {!group && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name, e.g. Calloway heirs"
            autoFocus
            className="mb-3 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
          />
        )}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search owners…"
          className="mb-2 w-full rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900 focus:border-amber-500 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
        />
        <div className="mb-3 min-h-0 flex-1 overflow-y-auto rounded-md border border-stone-200 dark:border-stone-800">
          {candidates.length === 0 && <p className="p-4 text-sm text-stone-400">No ungrouped owners match.</p>}
          {candidates.map((o) => (
            <label
              key={o.id}
              className="flex cursor-pointer items-center gap-3 border-b border-stone-100 px-3 py-2 text-sm last:border-b-0 hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-800/60"
            >
              <input
                type="checkbox"
                checked={picked.has(o.id)}
                onChange={() =>
                  setPicked((prev) => {
                    const next = new Set(prev);
                    if (next.has(o.id)) next.delete(o.id);
                    else next.add(o.id);
                    return next;
                  })
                }
              />
              <span className="min-w-0 flex-1 truncate text-stone-800 dark:text-stone-200">{o.name}</span>
              <span className="shrink-0 text-xs text-stone-400">{formatAcres(o.nma)} NMA</span>
            </label>
          ))}
        </div>
        {error && <p className="mb-2 text-sm text-rose-600">{error}</p>}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-stone-400">
            {picked.size} selected{!group && picked.size < 2 ? ' (pick at least 2)' : ''}
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-md px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={!valid || busy}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {busy ? 'Saving…' : group ? 'Add to group' : 'Create group'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
