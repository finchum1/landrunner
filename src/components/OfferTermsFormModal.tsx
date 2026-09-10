import { useState, type FormEvent } from 'react';
import { ROYALTY_PRESETS, type ProjectOfferTerms } from '../lib/types';
import type { OfferTermsInput } from '../lib/offerTerms';

export default function OfferTermsFormModal({
  terms,
  onClose,
  onSubmit,
}: {
  terms?: ProjectOfferTerms;
  onClose: () => void;
  onSubmit: (input: OfferTermsInput) => Promise<void>;
}) {
  const [label, setLabel] = useState(terms?.label ?? '');
  const [rate, setRate] = useState(terms?.rate_per_acre?.toString() ?? '');
  const [royaltyChoice, setRoyaltyChoice] = useState(
    terms?.royalty_label && ROYALTY_PRESETS.some((r) => r.label === terms.royalty_label)
      ? terms.royalty_label
      : terms?.royalty_label
        ? 'custom'
        : '1/8'
  );
  const [customRoyalty, setCustomRoyalty] = useState(
    royaltyChoice === 'custom' ? terms?.royalty_label ?? '' : ''
  );
  const [termYears, setTermYears] = useState(
    terms?.lease_term_months ? String(terms.lease_term_months / 12) : '1'
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const royaltyLabel = royaltyChoice === 'custom' ? customRoyalty.trim() : royaltyChoice;
    const preset = ROYALTY_PRESETS.find((r) => r.label === royaltyLabel);
    const termMonths = termYears ? Math.round(parseFloat(termYears) * 12) : null;

    setSubmitting(true);
    try {
      await onSubmit({
        label: label.trim() || null,
        rate_per_acre: rate ? parseFloat(rate) : null,
        royalty_label: royaltyLabel || null,
        royalty_fraction: preset ? preset.fraction : null,
        lease_term_months: termMonths,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong saving these terms.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-100">
          {terms ? 'Edit Terms' : 'Add Another Set of Terms'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
              Label (optional)
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder='e.g. "Standard" or "Premium"'
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
            />
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
              {submitting ? 'Saving…' : terms ? 'Save changes' : 'Add terms'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
