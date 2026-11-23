import { useEffect, useMemo, useState } from 'react';
import type { LandmanProfile, MineralOwner, Project, ProjectOfferTerms } from '../lib/types';
import { addDays, isWorkingStatus } from '../lib/callOutcomes';
import { bulkAddActivity, bulkPatchOwners } from '../lib/owners';
import { fetchProfile, saveProfile } from '../lib/profile';
import { buildLetter, buildLettersDocx, letterToText, tiersForOwner } from '../lib/offerLetter';
import { todayDateString } from '../lib/format';

const INPUT =
  'w-full rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100';

// Stages that come before "Offer Made" -- the only ones an offer letter moves forward.
const BEFORE_OFFER = ['not_contacted', 'attempted', 'contacted'];

export default function OfferLetterModal({
  project,
  owners,
  terms,
  onClose,
  onMarked,
}: {
  project: Project;
  owners: MineralOwner[];
  terms: ProjectOfferTerms[];
  onClose: () => void;
  // Owners whose status/date changed because the letters were marked as sent.
  onMarked: (updated: MineralOwner[]) => void;
}) {
  const [profile, setProfile] = useState<Pick<LandmanProfile, 'full_name' | 'title' | 'phone' | 'email'>>({
    full_name: '',
    title: 'Landman',
    phone: '',
    email: '',
  });
  const [profileId, setProfileId] = useState<string | null>(null);
  const [chosenIds, setChosenIds] = useState<Set<string>>(new Set(terms.map((t) => t.id)));
  const [date, setDate] = useState(todayDateString());
  const [greetByName, setGreetByName] = useState(true);
  const [includeAddress, setIncludeAddress] = useState(true);
  const [markOffered, setMarkOffered] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile()
      .then((p) => {
        if (!p) return;
        setProfileId(p.id);
        setProfile({ full_name: p.full_name, title: p.title, phone: p.phone, email: p.email });
      })
      .catch(() => {});
  }, []);

  const chosen = useMemo(() => terms.filter((t) => chosenIds.has(t.id)), [terms, chosenIds]);
  const opts = { date, greetByName, includeAddress };

  // Owners with an assigned tier get just that one; the rest get the checked tiers.
  const letters = useMemo(
    () =>
      owners.map((o) => ({
        owner: o,
        tiers: tiersForOwner(o, chosen, terms),
      })),
    [owners, chosen, terms]
  );
  const missingTerms = letters.filter((l) => l.tiers.length === 0).length;
  const withoutAddress = includeAddress ? owners.filter((o) => !o.address?.trim()).length : 0;
  const preview = letters[0] && letters[0].tiers.length > 0
    ? letterToText(buildLetter(project, letters[0].tiers, letters[0].owner, profile, opts))
    : '';

  async function handleDownload() {
    if (missingTerms > 0 || owners.length === 0) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const models = letters.map((l) => buildLetter(project, l.tiers, l.owner, profile, opts));
      const blob = await buildLettersDocx(models);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const base = (project.name.replace(/[^\w\- ]+/g, '').trim() || 'Project') + ' offer letter';
      a.href = url;
      a.download = owners.length === 1 ? `${base} - ${owners[0].name.replace(/[^\w\- ]+/g, '').trim()}.docx` : `${base}s (${owners.length}).docx`;
      a.click();
      URL.revokeObjectURL(url);

      // Remember the sender details for next time.
      saveProfile(profileId, profile).catch(() => {});

      let msg = `Downloaded ${owners.length} letter${owners.length === 1 ? '' : 's'}.`;
      if (markOffered) {
        const movable = owners.filter((o) => BEFORE_OFFER.includes(o.status) && !o.do_not_contact);
        const logged = owners.filter((o) => isWorkingStatus(o.status) || o.status === 'offer_made');
        if (logged.length) {
          await bulkAddActivity(
            logged.map((o) => {
              const names = tiersForOwner(o, chosen, terms).map((t) => t.label || 'terms').join(', ');
              return { owner_id: o.id, note: `Offer letter prepared (${names})`, outcome: 'Offer letter' };
            })
          );
        }
        if (movable.length) {
          const updated = await bulkPatchOwners(
            movable.map((o) => o.id),
            { status: 'offer_made', next_contact_date: addDays(todayDateString(), 7) }
          );
          onMarked(updated);
          msg += ` ${updated.length} marked Offer Made with a follow-up in 7 days.`;
        }
      }
      setDone(msg);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the letters.');
    } finally {
      setBusy(false);
    }
  }

  const setP = (k: 'full_name' | 'title' | 'phone' | 'email', v: string) => setProfile((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-semibold text-stone-900 dark:text-stone-100">
          Offer letter{owners.length === 1 ? '' : 's'}
        </h2>
        <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
          {owners.length === 1 ? owners[0].name : `${owners.length} owners`} · downloads as a Word document, one page
          per letter.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <div className="mb-1 text-sm font-medium text-stone-700 dark:text-stone-300">Terms to offer</div>
              {terms.length === 0 && <p className="text-sm text-rose-600">Add offer terms to this project first.</p>}
              {terms.map((t) => (
                <label key={t.id} className="mb-1 flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
                  <input
                    type="checkbox"
                    checked={chosenIds.has(t.id)}
                    onChange={() =>
                      setChosenIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(t.id)) next.delete(t.id);
                        else next.add(t.id);
                        return next;
                      })
                    }
                  />
                  {t.label || 'Untitled'}
                  <span className="text-xs text-stone-400">
                    {t.rate_per_acre != null ? `$${t.rate_per_acre}/ac` : ''} {t.royalty_label ?? ''}
                  </span>
                </label>
              ))}
              <p className="mt-1 text-xs text-stone-400">
                Owners with their own assigned tier get just that one. Several checked tiers become “Option 1, Option 2…”.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500">Letter date</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={INPUT} />
              </div>
              <div />
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500">Your name</label>
                <input value={profile.full_name ?? ''} onChange={(e) => setP('full_name', e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500">Title</label>
                <input value={profile.title ?? ''} onChange={(e) => setP('title', e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500">Cell</label>
                <input value={profile.phone ?? ''} onChange={(e) => setP('phone', e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-500">E-mail</label>
                <input value={profile.email ?? ''} onChange={(e) => setP('email', e.target.value)} className={INPUT} />
              </div>
            </div>

            <div className="space-y-1.5 text-sm text-stone-700 dark:text-stone-300">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={greetByName} onChange={(e) => setGreetByName(e.target.checked)} />
                Address each letter to the owner by name <span className="text-xs text-stone-400">(otherwise “Dear Mineral Owner”)</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={includeAddress} onChange={(e) => setIncludeAddress(e.target.checked)} />
                Include the owner’s mailing address
                {withoutAddress > 0 && <span className="text-xs text-amber-600">({withoutAddress} have none on file)</span>}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={markOffered} onChange={(e) => setMarkOffered(e.target.checked)} />
                Log it and mark owners “Offer Made” with a 7-day follow-up
              </label>
            </div>
          </div>

          <div>
            <div className="mb-1 text-sm font-medium text-stone-700 dark:text-stone-300">
              Preview{owners.length > 1 ? ` (first of ${owners.length})` : ''}
            </div>
            <pre className="max-h-[26rem] overflow-y-auto whitespace-pre-wrap rounded-md border border-stone-200 bg-stone-50 p-3 font-sans text-xs leading-relaxed text-stone-700 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-300">
              {preview || 'Pick at least one set of terms to see the letter.'}
            </pre>
          </div>
        </div>

        {missingTerms > 0 && (
          <p className="mt-3 text-sm text-rose-600">
            {missingTerms} owner{missingTerms === 1 ? ' has' : 's have'} no terms to offer — check a tier above.
          </p>
        )}
        {error && (
          <div className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">{error}</div>
        )}
        {done && (
          <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">{done}</div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            {done ? 'Close' : 'Cancel'}
          </button>
          <button
            onClick={handleDownload}
            disabled={busy || missingTerms > 0 || owners.length === 0}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {busy ? 'Creating…' : `Download ${owners.length} letter${owners.length === 1 ? '' : 's'} (.docx)`}
          </button>
        </div>
      </div>
    </div>
  );
}
