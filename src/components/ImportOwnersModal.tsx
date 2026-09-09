import { useState } from 'react';
import {
  ADDRESS_PATTERNS,
  EMAIL_PATTERNS,
  NAME_PATTERNS,
  NMA_PATTERNS,
  PHONE_PATTERNS,
  cellToString,
  guessColumnIndex,
  parseNma,
  parseSpreadsheetFile,
  type ParsedSheet,
} from '../lib/importSheet';
import { bulkCreateOwners, type OwnerInput } from '../lib/owners';

export default function ImportOwnersModal({
  projectId,
  onClose,
  onImported,
}: {
  projectId: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [fileName, setFileName] = useState('');
  const [nameCol, setNameCol] = useState<number>(-1);
  const [nmaCol, setNmaCol] = useState<number>(-1);
  const [phoneCol, setPhoneCol] = useState<number>(-1);
  const [emailCol, setEmailCol] = useState<number>(-1);
  const [addressCol, setAddressCol] = useState<number>(-1);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    try {
      const parsed = await parseSpreadsheetFile(file);
      if (parsed.headers.length === 0) {
        setError('That file looks empty — no rows were found.');
        return;
      }
      setSheet(parsed);
      setFileName(file.name);
      setNameCol(guessColumnIndex(parsed.headers, NAME_PATTERNS));
      setNmaCol(guessColumnIndex(parsed.headers, NMA_PATTERNS));
      setPhoneCol(guessColumnIndex(parsed.headers, PHONE_PATTERNS));
      setEmailCol(guessColumnIndex(parsed.headers, EMAIL_PATTERNS));
      setAddressCol(guessColumnIndex(parsed.headers, ADDRESS_PATTERNS));
    } catch {
      setError('Could not read that file. Make sure it is a .csv, .xlsx, or .xls file.');
    }
  }

  async function handleImport() {
    if (!sheet || nameCol === -1) {
      setError('Choose which column holds the owner name.');
      return;
    }
    setImporting(true);
    setError(null);
    try {
      const rows: OwnerInput[] = [];
      let skipped = 0;
      for (const row of sheet.rows) {
        const name = cellToString(row[nameCol]);
        if (!name) {
          skipped += 1;
          continue;
        }
        rows.push({
          name,
          nma: nmaCol !== -1 ? parseNma(row[nmaCol]) : 0,
          phone: phoneCol !== -1 ? cellToString(row[phoneCol]) || null : null,
          email: emailCol !== -1 ? cellToString(row[emailCol]) || null : null,
          address: addressCol !== -1 ? cellToString(row[addressCol]) || null : null,
        });
      }
      const imported = await bulkCreateOwners(projectId, rows);
      setResult({ imported, skipped });
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong importing this file.');
    } finally {
      setImporting(false);
    }
  }

  const colSelect = (
    value: number,
    onChange: (v: number) => void,
    label: string
  ) => (
    <div>
      <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
      >
        <option value={-1}>Not in file</option>
        {sheet!.headers.map((h, idx) => (
          <option key={idx} value={idx}>
            {h || `Column ${idx + 1}`}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl dark:bg-stone-900">
        <h2 className="mb-1 text-lg font-semibold text-stone-900 dark:text-stone-100">Upload owner spreadsheet</h2>
        <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
          Upload a .csv or .xlsx file with owner name and NMA. We'll try to match columns automatically.
        </p>

        {!sheet && (
          <div className="rounded-lg border-2 border-dashed border-stone-300 p-8 text-center dark:border-stone-700">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              className="mx-auto block text-sm text-stone-600 dark:text-stone-300"
            />
          </div>
        )}

        {sheet && !result && (
          <>
            <div className="mb-3 text-sm text-stone-500 dark:text-stone-400">
              <span className="font-medium text-stone-700 dark:text-stone-300">{fileName}</span> — {sheet.rows.length}{' '}
              row{sheet.rows.length === 1 ? '' : 's'} found
            </div>
            <div className="grid grid-cols-2 gap-4">
              {colSelect(nameCol, setNameCol, 'Owner name column *')}
              {colSelect(nmaCol, setNmaCol, 'NMA column')}
              {colSelect(phoneCol, setPhoneCol, 'Phone column')}
              {colSelect(emailCol, setEmailCol, 'Email column')}
              {colSelect(addressCol, setAddressCol, 'Address column')}
            </div>

            {sheet.rows.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-md border border-stone-200 dark:border-stone-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 text-xs uppercase text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">NMA</th>
                      <th className="px-3 py-2">Phone</th>
                      <th className="px-3 py-2">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {sheet.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="text-stone-700 dark:text-stone-300">
                        <td className="px-3 py-2">{nameCol !== -1 ? cellToString(row[nameCol]) : '—'}</td>
                        <td className="px-3 py-2">{nmaCol !== -1 ? parseNma(row[nmaCol]) : '—'}</td>
                        <td className="px-3 py-2">{phoneCol !== -1 ? cellToString(row[phoneCol]) : '—'}</td>
                        <td className="px-3 py-2">{emailCol !== -1 ? cellToString(row[emailCol]) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sheet.rows.length > 5 && (
                  <div className="px-3 py-2 text-xs text-stone-400">…and {sheet.rows.length - 5} more rows</div>
                )}
              </div>
            )}
          </>
        )}

        {result && (
          <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
            Imported {result.imported} owner{result.imported === 1 ? '' : 's'}.
            {result.skipped > 0 && ` Skipped ${result.skipped} row${result.skipped === 1 ? '' : 's'} with no name.`}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            {result ? 'Close' : 'Cancel'}
          </button>
          {sheet && !result && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {importing ? 'Importing…' : `Import ${sheet.rows.length} row${sheet.rows.length === 1 ? '' : 's'}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
