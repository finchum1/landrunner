import { useEffect, useState } from 'react';
import type { MineralOwner, OwnerActivity, OwnerStatus } from '../lib/types';
import { STATUS_ORDER } from '../lib/types';
import { addActivity, deleteOwner, fetchActivity, updateOwner } from '../lib/owners';
import { formatDateTime, formatInterest } from '../lib/format';
import StatusSelect from './StatusSelect';

export default function OwnerDrawer({
  owner,
  onClose,
  onChanged,
  onDeleted,
  onActivityAdded,
}: {
  owner: MineralOwner;
  onClose: () => void;
  onChanged: (updated: MineralOwner) => void;
  onDeleted: (id: string) => void;
  onActivityAdded?: (ownerId: string, entry: OwnerActivity) => void;
}) {
  const [nma, setNma] = useState(String(owner.nma ?? ''));
  const [interestPercent, setInterestPercent] = useState(
    owner.interest_decimal != null ? String(owner.interest_decimal * 100) : ''
  );
  const [phone, setPhone] = useState(owner.phone ?? '');
  const [email, setEmail] = useState(owner.email ?? '');
  const [address, setAddress] = useState(owner.address ?? '');
  const [notes, setNotes] = useState(owner.notes ?? '');
  const [status, setStatus] = useState<OwnerStatus>(owner.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activity, setActivity] = useState<OwnerActivity[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchActivity(owner.id)
      .then((rows) => {
        if (mounted) setActivity(rows);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoadingActivity(false);
      });
    return () => {
      mounted = false;
    };
  }, [owner.id]);

  async function handleStatusChange(next: OwnerStatus) {
    setStatus(next);
    setError(null);
    try {
      const wasUncontacted = STATUS_ORDER.indexOf(owner.status) === 0;
      const isMovingForward = STATUS_ORDER.indexOf(next) > 0;
      const patch: Parameters<typeof updateOwner>[1] = { status: next };
      if (wasUncontacted && isMovingForward) {
        patch.last_contacted_at = new Date().toISOString();
      }
      const updated = await updateOwner(owner.id, patch);
      onChanged(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update status.');
      setStatus(owner.status);
    }
  }

  async function handleSaveDetails() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateOwner(owner.id, {
        nma: nma ? parseFloat(nma) : 0,
        interest_decimal: interestPercent ? parseFloat(interestPercent) / 100 : null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      });
      onChanged(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddNote() {
    if (!newNote.trim()) return;
    setAddingNote(true);
    setError(null);
    try {
      const entry = await addActivity(owner.id, newNote.trim());
      setActivity((prev) => [entry, ...prev]);
      setNewNote('');
      onActivityAdded?.(owner.id, entry);
      const updated = await updateOwner(owner.id, { last_contacted_at: new Date().toISOString() });
      onChanged(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add note.');
    } finally {
      setAddingNote(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete ${owner.name}? This can't be undone.`)) return;
    try {
      await deleteOwner(owner.id);
      onDeleted(owner.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this owner.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white p-6 shadow-xl dark:bg-stone-900">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">{owner.name}</h2>
            <p className="text-sm text-stone-500 dark:text-stone-400">{formatInterest(owner.interest_decimal)} interest</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-5">
          <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Status</label>
          <StatusSelect value={status} onChange={handleStatusChange} />
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">NMA</label>
              <input
                type="number"
                step="0.01"
                value={nma}
                onChange={(e) => setNma(e.target.value)}
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
                Interest (%)
              </label>
              <input
                type="number"
                step="0.0001"
                value={interestPercent}
                onChange={(e) => setInterestPercent(e.target.value)}
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 555-5555"
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@example.com"
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
            />
          </div>
          <button
            onClick={handleSaveDetails}
            disabled={saving}
            className="self-start rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
          >
            {saving ? 'Saving…' : 'Save details'}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            Call log
          </div>
        </div>
        <div className="mb-3 flex gap-2">
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddNote();
            }}
            placeholder="Log a call or note…"
            className="flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
          />
          <button
            onClick={handleAddNote}
            disabled={addingNote || !newNote.trim()}
            className="rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
          >
            Log
          </button>
        </div>

        <div className="flex-1 space-y-3">
          {loadingActivity && <p className="text-sm text-stone-400">Loading…</p>}
          {!loadingActivity && activity.length === 0 && (
            <p className="text-sm text-stone-400">No calls logged yet.</p>
          )}
          {activity.map((a) => (
            <div key={a.id} className="rounded-md border border-stone-100 p-3 text-sm dark:border-stone-800">
              <p className="text-stone-700 dark:text-stone-300">{a.note}</p>
              <p className="mt-1 text-xs text-stone-400">{formatDateTime(a.created_at)}</p>
            </div>
          ))}
        </div>

        <button
          onClick={handleDelete}
          className="mt-6 self-start text-sm font-medium text-rose-600 hover:underline dark:text-rose-400"
        >
          Delete owner
        </button>
      </div>
    </div>
  );
}
