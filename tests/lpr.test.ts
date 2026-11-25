import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ExcelJS from 'exceljs';
import { buildLprDraft, formatTractLegal, lprFileName, lprTotals, mailingAddress } from '../src/lib/lpr.ts';
import { fillLpr } from '../src/lib/lprFill.ts';

assert.equal(formatTractLegal('SW4 SE4 and N2 SE4'), 'SW/4 SE/4 and N/2 SE/4');
assert.equal(mailingAddress('c/o Cy Test\n2 Elm St,\nCity, TX 75000'), '2 Elm St, City, TX 75000');

// all synthetic
const report: any = { prospect_number: '99-001', section: '14', township: '21N', range: '4W', county: 'Grady', state: 'Oklahoma', description: 'SE4', gross_acres: 160, or_date: '8/31/2026', last_entry: '2034/68', examiner: 'A. Examiner, JD', report_type: 'OR', begin_date: '12/3/2013' };
const tracts: any[] = [
  { id: 't1', label: '1', description: 'SE4 SE4', gross_acres: 40, sort_order: 0 },
  { id: 't2', label: '2', description: 'SW4 SE4 and N2 SE4', gross_acres: 120, sort_order: 1 },
];
const notes: any[] = [{ id: 'n', kind: 'subject', ref: '1', body: 'Bob Test died in 1990; heirship is not of record.' }];
const lines: any[] = [{ id: 'i1', name: 'The Known and Unknown Heirs of Bob Test, Deceased', address: 'c/o Cy Test\n2 Elm St\nCity, TX 75000', interest: 0.25, net_acres: 0.5, note_refs: '1', tract_acres: { 1: 0.125, 2: 0.375 } }];
const draft = buildLprDraft({
  project: { operator_name: 'Example Operating, LLC', project_manager: 'PM', prospect_number: '99-001', section: '14', township: '21N', range: '4W', county: 'Grady' },
  report, tracts, notes, lines,
  owner: { name: 'Cy Test', address: lines[0].address, phone: '405-555-0100' },
  buyer: 'Alex Rivera', terms: { rate_per_acre: 150, royalty_label: '1/8', lease_term_months: 12, option_to_extend: false }, today: '2026-11-09', groupName: null,
});
assert.equal(draft.legalDescription, 'SE/4 of Section 14, Township 21 North, Range 4 West, Grady County, Oklahoma, being Tract 1 (SE/4 SE/4, containing 40.00 acres, more or less) and Tract 2 (SW/4 SE/4 and N/2 SE/4, containing 120.00 acres, more or less), containing 160.00 acres, more or less.');
assert.equal(draft.county, 'Grady County, OK'); assert.equal(draft.tractNumbers, '1 and 2');
assert.deepEqual(draft.tracts.map((t) => [t.legal, t.tr, t.gross, t.net]), [['SE/4 SE/4', '1', 40, 0.125], ['SW/4 SE/4 and N/2 SE/4', '2', 120, 0.375]]);
assert.deepEqual(lprTotals(draft), { gross: 160, net: 0.5, bonus: 75 });
assert.equal(draft.titleVerif, 'Y'); assert.equal(draft.orTitleNote, 'Y'); assert.equal(draft.orTitleNoteNums, '1'); assert.equal(draft.curativeRequired, 'Y');
assert.ok(draft.curativeNotes.startsWith('Surface ownership not examined per Ownership Report dated 8/31/2026 (examiner A. Examiner, JD; last entry 2034/68). Report updates the 12/3/2013 DOTO and is limited to mineral ownership of the SE/4.'));
assert.ok(draft.curativeNotes.includes('0.125 NMA in Tract 1 and 0.375 NMA in Tract 2 (0.500 NMA)'));
assert.ok(draft.curativeNotes.includes('OR Title Note 1: Bob Test died in 1990'));
assert.equal(draft.leaseNotes, 'Standard client lease form. Offer: $150/NMA, 1/8 royalty, 1-year term.');
assert.equal(draft.address, '2 Elm St, City, TX 75000'); assert.equal(draft.leaseTerm, '1'); assert.equal(draft.optionTerm, '0');
assert.equal(lprFileName(draft), 'Grady County 99-001 LPR - Cy Test.xlsx');
assert.equal(buildLprDraft({ ...{ project: { operator_name: 'X', project_manager: null, prospect_number: '1', section: '1', township: '1N', range: '1W', county: 'A' }, report, tracts, notes, lines: [], owner: null, buyer: 'B', terms: undefined, today: '2026-01-01' } }).tracts.length, 0);

// fill the office's template and read it back
const tpl = readFileSync('src/assets/lpr-template.xlsx');
const bytes = await fillLpr(tpl.buffer.slice(tpl.byteOffset, tpl.byteOffset + tpl.byteLength) as ArrayBuffer, draft);
const wb = new ExcelJS.Workbook();
await wb.xlsx.load(bytes);
const ws = wb.worksheets[0];
assert.equal(ws.name, 'Cy Test');
assert.equal(ws.getCell('D2').value, '99-001'); assert.equal(ws.getCell('C16').value, 'Cy Test'); assert.equal(ws.getCell('C15').value, 'Example Operating, LLC');
assert.equal(ws.getCell('E23').value, 150); assert.equal(ws.getCell('B28').value, 'SW/4 SE/4 and N/2 SE/4'); assert.equal(ws.getCell('F28').value, 0.375);
assert.deepEqual(ws.getCell('E24').value, { formula: 'E23*E22', result: 75 });
assert.deepEqual(ws.getCell('F30').value, { formula: 'SUM(F27:F29)', result: 0.5 });
assert.equal((ws.getCell('D3').value as Date).toISOString().slice(0, 10), '2026-11-09');
assert.equal((ws.getCell('G2').value as Date).toISOString().slice(0, 10), '2026-08-31');
assert.equal(ws.getCell('B29').value, null); // the unused third tract line stays blank
assert.equal(ws.getCell('B2').value, 'PROSPECT #:'); // labels untouched
console.log('LPR OK');
