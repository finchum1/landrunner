import { useEffect, useState } from 'react';
import type { ExtraPhone, MineralOwner, OwnerActivity, OwnerStatus, ProjectOfferTerms } from '../lib/types';
import { CONTACT_STATUSES, STATUS_LABELS, STATUS_ORDER } from '../lib/types';
import { addActivity, deleteOwner, fetchActivity, updateOwner } from '../lib/owners';
import { formatDateOnly, formatDateTime, formatInterest, todayDateString } from '../lib/format';
import { CALL_OUTCOMES, planOutcome, type CallOutcome } from '../lib/callOutcomes';
import { usablePhones } from '../lib/callQueue';
import { bonusDue } from '../lib/bonus';
import { formatMoney } from '../lib/format';
import { mailtoHref, smsHref, telHref } from '../lib/contact';
import StatusSelect from './StatusSelect';
import DatePickerModal from './DatePickerModal';
import ContactActionButton from './ContactActionButton';

const PhoneIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const TextIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const MailIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 6-10 7L2 6" />
  </svg>
);

export default function OwnerDrawer({
  owner,
  onClose,
  onChanged,
  onDeleted,
  onActivityAdded,
  onNavigate,
  hasPrev,
  hasNext,
  queueLabel,
  onOutcomeLogged,
  offerTerms = [],
  onOfferLetter,
}: {
  owner: MineralOwner;
  onClose: () => void;
  onChanged: (updated: MineralOwner) => void;
  onDeleted: (id: string) => void;
  onActivityAdded?: (ownerId: string, entry: OwnerActivity) => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  // Set while working through the call queue ("3 of 47"); shown in the header.
  queueLabel?: string;
  // Fired after a call outcome is logged, so the queue can advance.
  onOutcomeLogged?: (updated: MineralOwner) => void;
  offerTerms?: ProjectOfferTerms[];
  onOfferLetter?: () => void;
}) {
  const [nma, setNma] = useState(String(owner.nma ?? ''));
  const [interestPercent, setInterestPercent] = useState(
    owner.interest_decimal != null ? String(owner.interest_decimal * 100) : ''
  );
  const [phone, setPhone] = useState(owner.phone ?? '');
  const [email, setEmail] = useState(owner.email ?? '');
  const [address, setAddress] = useState(owner.address ?? '');
  const [nextContactDate, setNextContactDate] = useState(owner.next_contact_date ?? '');
  const [notes, setNotes] = useState(owner.notes ?? '');
  const [status, setStatus] = useState<OwnerStatus>(owner.status);
  const [phoneWrong, setPhoneWrong] = useState(owner.phone_wrong);
  const [doNotContact, setDoNotContact] = useState(owner.do_not_contact);
  const [extraPhones, setExtraPhones] = useState<ExtraPhone[]>(owner.extra_phones ?? []);
  const [outcome, setOutcome] = useState<CallOutcome | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [activity, setActivity] = useState<OwnerActivity[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        // Close the date picker first if it's open, rather than jumping
        // straight past it and closing the whole owner panel.
        if (showDatePicker) setShowDatePicker(false);
        else onClose();
        return;
      }
      // Don't hijack arrow keys while the user is editing a field (cursor
      // movement inside inputs/textareas/selects should win), or while the
      // date picker is open (its own day grid is keyboard-focusable too).
      if (showDatePicker) return;
      const tag = (document.activeElement?.tagName ?? '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate?.('prev');
      if (e.key === 'ArrowRight' && hasNext) onNavigate?.('next');
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hasPrev, hasNext, onNavigate, onClose, showDatePicker]);

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

  const dialPhones = usablePhones({ phone, phone_wrong: phoneWrong, extra_phones: extraPhones });
  const dialPhone = dialPhones[0] ?? '';

  async function handleFlag(patch: { phone_wrong?: boolean; do_not_contact?: boolean }) {
    setError(null);
    try {
      const updated = await updateOwner(owner.id, patch);
      onChanged(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update that flag.');
      setPhoneWrong(owner.phone_wrong);
      setDoNotContact(owner.do_not_contact);
    }
  }

  async function handleOfferField(patch: { offer_terms_id?: string | null; bonus_paid_at?: string | null }) {
    setError(null);
    try {
      onChanged(await updateOwner(owner.id, patch));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that.');
    }
  }

  async function handleLogOutcome() {
    if (!outcome) return;
    setAddingNote(true);
    setError(null);
    try {
      const plan = planOutcome(outcome, status, nextContactDate || null, todayDateString());
      const note = newNote.trim() ? `${outcome.label} — ${newNote.trim()}` : outcome.label;
      const entry = await addActivity(owner.id, note, outcome.label);
      const patch: Parameters<typeof updateOwner>[1] = {
        status: plan.status,
        next_contact_date: plan.nextContactDate,
        last_contacted_at: new Date().toISOString(),
      };
      let nextExtras = extraPhones;
      if (plan.phoneWrong) {
        // Flag whichever number was being dialed: the main one if it's still
        // good, otherwise the first good extra.
        if (phone.trim() && !phoneWrong) patch.phone_wrong = true;
        else {
          const idx = extraPhones.findIndex((p) => p.number.trim() && !p.wrong);
          if (idx !== -1) {
            nextExtras = extraPhones.map((p, i) => (i === idx ? { ...p, wrong: true } : p));
            patch.extra_phones = nextExtras;
          }
        }
      }
      const updated = await updateOwner(owner.id, patch);
      setActivity((prev) => [entry, ...prev]);
      setStatus(updated.status);
      setNextContactDate(updated.next_contact_date ?? '');
      setPhoneWrong(updated.phone_wrong);
      setExtraPhones(updated.extra_phones ?? []);
      setNewNote('');
      setOutcome(null);
      onActivityAdded?.(owner.id, entry);
      onChanged(updated);
      onOutcomeLogged?.(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not log that call.');
    } finally {
      setAddingNote(false);
    }
  }

  async function handleStatusChange(next: OwnerStatus) {
    setStatus(next);
    setError(null);
    try {
      const wasUncontacted = STATUS_ORDER.indexOf(owner.status) === 0;
      const movesToContactStatus = CONTACT_STATUSES.includes(next);
      const patch: Parameters<typeof updateOwner>[1] = { status: next };
      if (wasUncontacted && movesToContactStatus) {
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
        extra_phones: extraPhones.filter((p) => p.number.trim()).map((p) => ({ ...p, number: p.number.trim() })),
        next_contact_date: nextContactDate || null,
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
    if (outcome) return handleLogOutcome();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onNavigate?.('prev')}
              disabled={!hasPrev}
              className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-stone-800"
              aria-label="Previous owner"
              title="Previous owner"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              onClick={() => onNavigate?.('next')}
              disabled={!hasNext}
              className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-stone-800"
              aria-label="Next owner"
              title="Next owner"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
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

        <div className="mb-4">
          {queueLabel && (
            <div className="mb-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              Call queue · {queueLabel}
            </div>
          )}
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">{owner.name}</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">{formatInterest(owner.interest_decimal)} interest</p>
        </div>

        <div className="mb-5 flex gap-2">
          <ContactActionButton href={dialPhone ? telHref(dialPhone) : null} icon={PhoneIcon} label="Call" />
          <ContactActionButton href={dialPhone ? smsHref(dialPhone) : null} icon={TextIcon} label="Text" />
          <ContactActionButton href={email.trim() ? mailtoHref(email) : null} icon={MailIcon} label="Email" />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Status</label>
                <StatusSelect value={status} onChange={handleStatusChange} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
                  Next Contact
                </label>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(true)}
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-left text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                >
                  {nextContactDate ? (
                    formatDateOnly(nextContactDate)
                  ) : (
                    <span className="text-stone-400">Set a date…</span>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
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
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm font-medium text-stone-700 dark:text-stone-300">Phone</label>
                  {phone.trim() && (
                    <label className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
                      <input
                        type="checkbox"
                        checked={phoneWrong}
                        onChange={(e) => {
                          setPhoneWrong(e.target.checked);
                          handleFlag({ phone_wrong: e.target.checked });
                        }}
                      />
                      Wrong number
                    </label>
                  )}
                </div>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 555-5555"
                  className={`w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 ${
                    phoneWrong ? 'line-through opacity-60' : ''
                  }`}
                />
                {extraPhones.map((p, i) => (
                  <div key={i} className="mt-1.5 flex items-center gap-1.5">
                    <input
                      value={p.label}
                      onChange={(e) =>
                        setExtraPhones((prev) => prev.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                      }
                      placeholder="Label"
                      className="w-20 rounded-md border border-stone-300 bg-white px-2 py-1.5 text-xs text-stone-900 focus:border-amber-500 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                    />
                    <input
                      value={p.number}
                      onChange={(e) =>
                        setExtraPhones((prev) => prev.map((x, j) => (j === i ? { ...x, number: e.target.value } : x)))
                      }
                      placeholder="Number"
                      className={`min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 focus:border-amber-500 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 ${
                        p.wrong ? 'line-through opacity-60' : ''
                      }`}
                    />
                    <label className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400" title="Mark this number as wrong">
                      <input
                        type="checkbox"
                        checked={p.wrong}
                        onChange={(e) =>
                          setExtraPhones((prev) => prev.map((x, j) => (j === i ? { ...x, wrong: e.target.checked } : x)))
                        }
                      />
                      Bad
                    </label>
                    <button
                      type="button"
                      onClick={() => setExtraPhones((prev) => prev.filter((_, j) => j !== i))}
                      className="px-1 text-stone-400 hover:text-rose-500"
                      aria-label="Remove number"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setExtraPhones((prev) => [...prev, { label: '', number: '', wrong: false }])}
                  className="mt-1.5 text-xs font-medium text-amber-700 hover:underline dark:text-amber-400"
                >
                  + Add another number
                </button>
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
              <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
                <input
                  type="checkbox"
                  checked={doNotContact}
                  onChange={(e) => {
                    setDoNotContact(e.target.checked);
                    handleFlag({ do_not_contact: e.target.checked });
                  }}
                />
                Do not contact
                <span className="text-xs text-stone-400">(kept out of the call queue)</span>
              </label>
              <button
                onClick={handleSaveDetails}
                disabled={saving}
                className="self-start rounded-md bg-stone-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
              >
                {saving ? 'Saving…' : 'Save details'}
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                {error}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Call log
            </div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {CALL_OUTCOMES.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setOutcome((prev) => (prev?.key === o.key ? null : o))}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                    outcome?.key === o.key
                      ? 'border-amber-600 bg-amber-600 text-white'
                      : 'border-stone-300 text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {outcome && (() => {
              const plan = planOutcome(outcome, status, nextContactDate || null, todayDateString());
              const bits = [
                plan.status !== status ? `status → ${STATUS_LABELS[plan.status]}` : null,
                plan.nextContactDate !== (nextContactDate || null)
                  ? plan.nextContactDate
                    ? `follow up ${formatDateOnly(plan.nextContactDate)}`
                    : 'clear follow-up'
                  : null,
                plan.phoneWrong ? 'flag number as wrong' : null,
              ].filter(Boolean);
              return (
                <p className="mb-2 text-xs text-stone-500 dark:text-stone-400">
                  {bits.length ? `Will set: ${bits.join(' · ')}` : 'No status or date change.'}
                </p>
              );
            })()}
            <div className="mb-3 flex gap-2">
              <input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddNote();
                }}
                placeholder={outcome ? 'Add a note (optional)…' : 'Log a call or note…'}
                className="flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
              />
              <button
                onClick={handleAddNote}
                disabled={addingNote || (!outcome && !newNote.trim())}
                className="rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
              >
                Log
              </button>
            </div>

            <div className="max-h-44 space-y-3 overflow-y-auto pr-1">
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
            {offerTerms.length > 0 && (
              <div className="mt-4 rounded-md border border-stone-200 p-3 dark:border-stone-800">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Offer</span>
                  {onOfferLetter && (
                    <button
                      type="button"
                      onClick={onOfferLetter}
                      className="text-xs font-medium text-amber-700 hover:underline dark:text-amber-400"
                    >
                      Offer letter (.docx)
                    </button>
                  )}
                </div>
                <select
                  value={owner.offer_terms_id ?? ''}
                  onChange={(e) => handleOfferField({ offer_terms_id: e.target.value || null })}
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                >
                  <option value="">Default terms ({offerTerms[0]?.label || 'first set'})</option>
                  {offerTerms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label || 'Untitled'} — {t.rate_per_acre != null ? `$${t.rate_per_acre}/ac` : ''} {t.royalty_label ?? ''}
                    </option>
                  ))}
                </select>
                {owner.status === 'leased' && (() => {
                  const due = bonusDue(owner, offerTerms);
                  return (
                    <div className="mt-2 text-sm text-stone-700 dark:text-stone-300">
                      <div>
                        Bonus due: <strong>{formatMoney(due)}</strong>
                        <span className="text-xs text-stone-400"> ({owner.nma} NMA)</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <label className="text-xs text-stone-500">Paid on</label>
                        <input
                          type="date"
                          value={owner.bonus_paid_at ?? ''}
                          onChange={(e) => handleOfferField({ bonus_paid_at: e.target.value || null })}
                          className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                        />
                        {!owner.bonus_paid_at && (
                          <button
                            type="button"
                            onClick={() => handleOfferField({ bonus_paid_at: todayDateString() })}
                            className="text-xs font-medium text-amber-700 hover:underline dark:text-amber-400"
                          >
                            Mark paid today
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
            <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              <p className="mt-1 text-xs text-stone-400">Saved with “Save details”.</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleDelete}
          className="mt-6 self-start text-sm font-medium text-rose-600 hover:underline dark:text-rose-400"
        >
          Delete owner
        </button>
      </div>

      {showDatePicker && (
        <DatePickerModal
          value={nextContactDate || null}
          onSelect={(date) => {
            setNextContactDate(date);
            setShowDatePicker(false);
          }}
          onClear={() => {
            setNextContactDate('');
            setShowDatePicker(false);
          }}
          onClose={() => setShowDatePicker(false)}
        />
      )}
    </div>
  );
}
