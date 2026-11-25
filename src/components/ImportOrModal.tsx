import { useState } from 'react';
import type { MineralOwner, OrReport } from '../lib/types';
import type { ParsedOr } from '../lib/orParse';
import { readOrFile, saveOrReport } from '../lib/orApi';
import { formatAcres } from '../lib/format';

// Import a title company's Ownership Report workbook. Tabs are recognized by
// what's on them, so layouts that differ by county still read; the preview
// shows what was found and any lines it could not place.
export default function ImportOrModal({
  projectId,
  owners,
  existing,
  onClose,
  onImported,
}: {
  projectId: string;
  owners: MineralOwner[];
  existing: OrReport | null;
  onClose: () => void;
  onImported: () => void;
}) {
  const [parsed, setParsed] = useState<ParsedOr | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    try {
      const p = await readOrFile(file);
      if (p.interests.length === 0) {
        setError('No ownership table was found in that file. It needs a tab with a MINERAL OWNER column.');
        return;
      }
      setParsed(p);
      setFileName(file.name);
    } catch {
      setError('Could not read that file. Make sure it is an .xlsx workbook.');
    }
  }

  async function handleImport() {
    if (!parsed) return;
    setBusy(true);
    setError(null);
    try {
      const r = await saveOrReport(projectId, parsed, fileName, owners);
      setResult(`Imported. ${r.linked} owner line${r.linked === 1 ? '' : 's'} linked to people already in the project; ${r.unlinked} with acres are not in the project yet.`);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong importing this report.');
    } finally {
      setBusy(false);
    }
  }

  const withAcres = parsed ? parsed.interests.filter((i) => (i.netAcres ?? 0) > 0).length : 0;
  const rep = parsed?.report;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-stone-900" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-lg font-semibold text-stone-900 dark:text-stone-100">Import ownership report</h2>
        <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
          The title company’s workbook (plat, owner summary, tract tabs and runsheet). Tabs are matched by what they contain, not by name.
        </p>

        {existing && !result && (
          <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            This replaces the report on file{existing.or_date ? ` (dated ${existing.or_date})` : ''}. LPRs already made keep what was printed on them.
          </p>
        )}

        {!parsed && (
          <div className="rounded-lg border-2 border-dashed border-stone-300 p-8 text-center dark:border-stone-700">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              className="mx-auto block text-sm text-stone-600 dark:text-stone-300"
            />
          </div>
        )}

        {parsed && rep && !result && (
          <div className="space-y-4 text-sm">
            <div className="rounded-md border border-stone-200 p-3 dark:border-stone-800">
              <div className="mb-1 font-medium text-stone-800 dark:text-stone-200">{fileName}</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-stone-600 dark:text-stone-300">
                <span>Prospect: <b>{rep.prospectNumber || '—'}</b></span>
                <span>Location: <b>{[rep.description, rep.section && `Sec ${rep.section}`, rep.township, rep.range].filter(Boolean).join(' · ') || '—'}</b></span>
                <span>County: <b>{rep.county || '—'}{rep.state ? `, ${rep.state}` : ''}</b></span>
                <span>Report date: <b>{rep.orDate || '—'}</b> (last entry <b>{rep.lastEntry || '—'}</b>)</span>
                <span>Examiner: <b>{rep.examiner || '—'}</b></span>
                <span>Runsheet from: <b>{rep.beginDate || '—'}</b></span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                ['Tracts', parsed.tracts.length],
                ['Owner lines', parsed.interests.length],
                ['With acres', withAcres],
                ['Notes', parsed.notes.length],
              ].map(([k, v]) => (
                <div key={k as string} className="rounded-md border border-stone-200 p-2 dark:border-stone-800">
                  <div className="text-base font-semibold text-stone-900 dark:text-stone-100">{v}</div>
                  <div className="text-xs text-stone-400">{k}</div>
                </div>
              ))}
            </div>
            <ul className="space-y-0.5 text-stone-600 dark:text-stone-300">
              {parsed.tracts.map((t) => (
                <li key={t.label}>Tract {t.label}: {t.description || '—'} · {t.grossAcres != null ? `${formatAcres(t.grossAcres)} acres` : 'acres not found'}</li>
              ))}
              <li>Runsheet: {parsed.runsheet.length} instrument{parsed.runsheet.length === 1 ? '' : 's'}</li>
            </ul>
            <div className="text-xs text-stone-400">
              Tabs read: {parsed.sheets.map((s) => `${s.name} (${s.role})`).join(', ')}
            </div>
            {parsed.warnings.length > 0 && (
              <div className="rounded-md bg-amber-50 p-3 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                <div className="mb-1 font-medium">Check these</div>
                <ul className="list-disc space-y-0.5 pl-5">
                  {parsed.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {result && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">{result}</p>}
        {error && <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
            {result ? 'Close' : 'Cancel'}
          </button>
          {parsed && !result && (
            <button onClick={handleImport} disabled={busy} className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60">
              {busy ? 'Importing…' : 'Import report'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
