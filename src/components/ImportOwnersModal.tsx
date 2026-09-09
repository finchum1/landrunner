import { useState } from 'react';
import {
  ADDRESS_PATTERNS,
  EMAIL_PATTERNS,
  INTEREST_PATTERNS,
  NAME_PATTERNS,
  NMA_PATTERNS,
  NOTES_PATTERNS,
  PHONE_PATTERNS,
  cellToString,
  guessColumnIndex,
  guessHeaderRowIndex,
  isTotalRow,
  parseInterest,
  parseNma,
  parseSpreadsheetRaw,
  type RawRow,
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
  const [rawRows, setRawRows] = useState<RawRow[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [pickingHeaderRow, setPickingHeaderRow] = useState(false);

  const [nameCol, setNameCol] = useState<number>(-1);
  const [nmaCol, setNmaCol] = useState<number>(-1);
  const [interestCol, setInterestCol] = useState<number>(-1);
  const [phoneCol, setPhoneCol] = useState<number>(-1);
  const [emailCol, setEmailCol] = useState<number>(-1);
  const [addressCol, setAddressCol] = useState<number>(-1);
  const [notesCol, setNotesCol] = useState<number>(-1);

  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  const headers = rawRows ? rawRows[headerRowIndex].map((h) => String(h).trim()) : [];
  const dataRows = rawRows ? rawRows.slice(headerRowIndex + 1) : [];

  function guessColumns(rows: RawRow[], headerIdx: number) {
    const h = rows[headerIdx].map((c) => String(c).trim());
    setNameCol(guessColumnIndex(h, NAME_PATTERNS));
    setNmaCol(guessColumnIndex(h, NMA_PATTERNS));
    setInterestCol(guessColumnIndex(h, INTEREST_PATTERNS));
    setPhoneCol(guessColumnIndex(h, PHONE_PATTERNS));
    setEmailCol(guessColumnIndex(h, EMAIL_PATTERNS));
    setAddressCol(guessColumnIndex(h, ADDRESS_PATTERNS));
    setNotesCol(guessColumnIndex(h, NOTES_PATTERNS));
  }

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    try {
      const rows = await parseSpreadsheetRaw(file);
      if (rows.length === 0) {
        setError('That file looks empty — no rows were found.');
        return;
      }
      const guessedHeaderIdx = guessHeaderRowIndex(rows);
      setRawRows(rows);
      setFileName(file.name);
      setHeaderRowIndex(guessedHeaderIdx);
      guessColumns(rows, guessedHeaderIdx);
    } catch {
      setError('Could not read that file. Make sure it is a .csv, .xlsx, or .xls file.');
    }
  }

  function chooseHeaderRow(idx: number) {
    if (!rawRows) return;
    setHeaderRowIndex(idx);
    guessColumns(rawRows, idx);
    setPickingHeaderRow(false);
  }

  async function handleImport() {
    if (!rawRows || nameCol === -1) {
      setError('Choose which column holds the owner name.');
      return;
    }
    setImporting(true);
    setError(null);
    try {
      const rows: OwnerInput[] = [];
      let skipped = 0;
      for (const row of dataRows) {
        const name = cellToString(row[nameCol]);
        if (!name || isTotalRow(name)) {
          skipped += 1;
          continue;
        }
        rows.push({
          name,
          nma: nmaCol !== -1 ? parseNma(row[nmaCol]) : 0,
          interest_decimal: interestCol !== -1 ? parseInterest(row[interestCol]) : null,
          phone: phoneCol !== -1 ? cellToString(row[phoneCol]) || null : null,
          email: emailCol !== -1 ? cellToString(row[emailCol]) || null : null,
          address: addressCol !== -1 ? cellToString(row[addressCol]) || null : null,
          notes: notesCol !== -1 ? cellToString(row[notesCol]) || null : null,
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

  const colSelect = (value: number, onChange: (v: number) => void, label: string) => (
    <div>
      <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
      >
        <option value={-1}>Not in file</option>
        {headers.map((h, idx) => (
          <option key={idx} value={idx}>
            {h || `Column ${idx + 1}`}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-stone-900">
        <h2 className="mb-1 text-lg font-semibold text-stone-900 dark:text-stone-100">Upload owner spreadsheet</h2>
        <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
          Upload a .csv or .xlsx file. We'll try to find the header row and match columns automatically —
          check them below before importing.
        </p>

        {!rawRows && (
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

        {rawRows && !result && (
          <>
            <div className="mb-3 flex items-center justify-between text-sm text-stone-500 dark:text-stone-400">
              <span>
                <span className="font-medium text-stone-700 dark:text-stone-300">{fileName}</span> —{' '}
                {dataRows.length} row{dataRows.length === 1 ? '' : 's'} below the header
              </span>
              <button
                type="button"
                onClick={() => setPickingHeaderRow((v) => !v)}
                className="font-medium text-amber-700 hover:underline dark:text-amber-400"
              >
                {pickingHeaderRow ? 'Cancel' : "Header row isn't right?"}
              </button>
            </div>

            {pickingHeaderRow && (
              <div className="mb-4 max-h-48 overflow-y-auto rounded-md border border-stone-200 dark:border-stone-800">
                {rawRows.slice(0, 20).map((row, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => chooseHeaderRow(idx)}
                    className={`block w-full truncate border-b border-stone-100 px-3 py-1.5 text-left text-xs last:border-b-0 dark:border-stone-800 ${
                      idx === headerRowIndex
                        ? 'bg-amber-50 font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'text-stone-500 hover:bg-stone-50 dark:text-stone-400 dark:hover:bg-stone-800'
                    }`}
                  >
                    Row {idx + 1}: {row.map((c) => cellToString(c)).filter(Boolean).join(' | ') || '(blank)'}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {colSelect(nameCol, setNameCol, 'Owner name column *')}
              {colSelect(nmaCol, setNmaCol, 'NMA column')}
              {colSelect(interestCol, setInterestCol, 'Interest column')}
              {colSelect(notesCol, setNotesCol, 'Notes column')}
              {colSelect(phoneCol, setPhoneCol, 'Phone column')}
              {colSelect(emailCol, setEmailCol, 'Email column')}
              {colSelect(addressCol, setAddressCol, 'Address column')}
            </div>

            {dataRows.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-md border border-stone-200 dark:border-stone-800">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 text-xs uppercase text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">NMA</th>
                      <th className="px-3 py-2">Interest</th>
                      <th className="px-3 py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {dataRows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="text-stone-700 dark:text-stone-300">
                        <td className="px-3 py-2">{nameCol !== -1 ? cellToString(row[nameCol]) : '—'}</td>
                        <td className="px-3 py-2">{nmaCol !== -1 ? parseNma(row[nmaCol]) : '—'}</td>
                        <td className="px-3 py-2">
                          {interestCol !== -1 ? cellToString(row[interestCol]) : '—'}
                        </td>
                        <td className="px-3 py-2">{notesCol !== -1 ? cellToString(row[notesCol]) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {dataRows.length > 5 && (
                  <div className="px-3 py-2 text-xs text-stone-400">…and {dataRows.length - 5} more rows</div>
                )}
              </div>
            )}
          </>
        )}

        {result && (
          <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
            Imported {result.imported} owner{result.imported === 1 ? '' : 's'}.
            {result.skipped > 0 &&
              ` Skipped ${result.skipped} row${result.skipped === 1 ? '' : 's'} with no name (including any TOTAL row).`}
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
          {rawRows && !result && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {importing ? 'Importing…' : `Import ${dataRows.length} row${dataRows.length === 1 ? '' : 's'}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
