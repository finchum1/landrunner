import { useState, type FormEvent } from 'react';
import { ROYALTY_PRESETS, type Project } from '../lib/types';
import type { ProjectInput } from '../lib/projects';
import type { OfferTermsInput } from '../lib/offerTerms';

export default function ProjectFormModal({
  project,
  onClose,
  onSubmit,
}: {
  project?: Project;
  onClose: () => void;
  onSubmit: (input: ProjectInput, initialTerms?: OfferTermsInput) => Promise<void>;
}) {
  const isNew = !project;

  const [name, setName] = useState(project?.name ?? '');
  const [prospectNumber, setProspectNumber] = useState(project?.prospect_number ?? '');
  const [targetArea, setTargetArea] = useState(project?.target_area ?? '');
  const [section, setSection] = useState(project?.section ?? '');
  const [township, setTownship] = useState(project?.township ?? '');
  const [range, setRange] = useState(project?.range ?? '');
  const [county, setCounty] = useState(project?.county ?? '');
  // Only meaningful when creating a new project -- becomes its first
  // ("Standard") offer terms row. Editing a project no longer touches
  // terms; those are managed as their own list on the project detail page.
  const [rate, setRate] = useState('');
  const [royaltyChoice, setRoyaltyChoice] = useState('1/8');
  const [customRoyalty, setCustomRoyalty] = useState('');
  const [termYears, setTermYears] = useState('1');
  const [notes, setNotes] = useState(project?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }

    let initialTerms: OfferTermsInput | undefined;
    if (isNew && rate.trim() !== '') {
      const royaltyLabel = royaltyChoice === 'custom' ? customRoyalty.trim() : royaltyChoice;
      const preset = ROYALTY_PRESETS.find((r) => r.label === royaltyLabel);
      const termMonths = termYears ? Math.round(parseFloat(termYears) * 12) : null;
      initialTerms = {
        label: 'Standard',
        rate_per_acre: parseFloat(rate),
        royalty_label: royaltyLabel || null,
        royalty_fraction: preset ? preset.fraction : null,
        lease_term_months: termMonths,
      };
    }

    setSubmitting(true);
    try {
      await onSubmit(
        {
          name: name.trim(),
          prospect_number: prospectNumber.trim() || null,
          target_area: targetArea.trim() || null,
          section: section.trim() || null,
          township: township.trim() || null,
          range: range.trim() || null,
          county: county.trim() || null,
          notes: notes.trim() || null,
        },
        initialTerms
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong saving this project.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-stone-900">
        <h2 className="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-100">
          {project ? 'Edit Project' : 'New Leasing Project'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
              Project name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "SE/4 Leasing"'
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
                Prospect number
              </label>
              <input
                value={prospectNumber}
                onChange={(e) => setProspectNumber(e.target.value)}
                placeholder="26-013"
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
                Aliquot (optional)
              </label>
              <input
                value={targetArea}
                onChange={(e) => setTargetArea(e.target.value)}
                placeholder="SE/4"
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
              />
            </div>
          </div>

          <div className="rounded-lg border border-stone-200 p-3 dark:border-stone-800">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Legal description
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
                  Section
                </label>
                <input
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="32"
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
                  Township
                </label>
                <input
                  value={township}
                  onChange={(e) => setTownship(e.target.value)}
                  placeholder="25N"
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Range</label>
                <input
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  placeholder="1W"
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">County</label>
              <input
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                placeholder="Kay"
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
              />
            </div>
          </div>

          {isNew && (
            <div className="rounded-lg border border-stone-200 p-3 dark:border-stone-800">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Offer terms (optional — you can add more terms later)
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
                    $ / acre
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    placeholder="150"
                    className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
                    Royalty
                  </label>
                  <select
                    value={royaltyChoice}
                    onChange={(e) => setRoyaltyChoice(e.target.value)}
                    className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                  >
                    {ROYALTY_PRESETS.map((r) => (
                      <option key={r.label} value={r.label}>
                        {r.label}
                      </option>
                    ))}
                    <option value="custom">Custom…</option>
                  </select>
                  {royaltyChoice === 'custom' && (
                    <input
                      value={customRoyalty}
                      onChange={(e) => setCustomRoyalty(e.target.value)}
                      placeholder='e.g. "1/6"'
                      className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                    />
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
                    Term (years)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={termYears}
                    onChange={(e) => setTermYears(e.target.value)}
                    placeholder="1"
                    className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
            />
          </div>

          {error && (
            <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {submitting ? 'Saving…' : project ? 'Save changes' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
