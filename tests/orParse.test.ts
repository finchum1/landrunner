import assert from 'node:assert/strict';
import { parseOrWorkbook } from '../src/lib/orParse.ts';

// A small synthetic Ownership Report in the shape title companies send:
// PLAT, Summary (with footnotes), one tab per tract, and a runsheet.
// All people and numbers are made up.
const D = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const sheets = [
  { name: 'PLAT', rows: [
    ['', '', '', 'Prospect Name: ', '', '', '', '', '', '', '', '', '99-001'],
    ['', '', 'Section ', '', '', '', '', 14, '', '', '', 'Township', '', '', '', '', '', '21N', '', '', '', '', '', '', 'Range', '', '', '', '04W'],
    ['', '', '', 'County', '', '', '', 'Grady', '', '', '', '', '', '', '', '', '', '', '', '', 'State ', '', '', 'Oklahoma'],
    ['', '', '', '', '', '', '', '', 'OWNERSHIP REPORT DATED: ', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'LAST ENTRY:'],
    ['', '', '', '', '', '', '', '', 'TITLE OPINION UPDATE DATED:', '', '', '', '', '', '', '', '', '', '8/31/2026', '', '', '', '', '', 'LAST ENTRY:', '', '', '', '2034/68'],
    ['EXAMINER:', '', '', '', '', 'A. Examiner, JD'],
  ] },
  { name: 'SE4 Summary', rows: [
    [], [], ['OWNERSHIP REPORT'], ['SECTION 14, TOWNSHIP 21 NORTH, RANGE 4'], ['GRADY COUNTY, OKLAHOMA'], ['TRACTS 1 & 2'], [],
    ['DESCRIPTION:', 'SE4'], [], ['CONTAINING: ', '160'], [],
    ['MINERAL OWNER', 'INTEREST', 'NET ACRES', 'Address', 'NOTE # \n(see below)'],
    ['Ann Sample', 0.5, 80, '1 Main St\nTown, OK 73000'],
    ['The Known and Unknown Heirs of Bob Test, Deceased', 0.25, 40, 'c/o Cy Test\n2 Elm St\nCity, TX 75000', '1'],
    ['', '', '', 'c/o second line'],
    ['The Known and Unknown Heirs of Bob Test, Deceased', 0.125, 20, 'c/o Cy Test\n2 Elm St', '1'],
    ['Dee Trustee, Successor Trustee of the Dee Trust', 0.0625, 10, 'PO Box 9\nCity, OK', '2'],
    ['Eve Unlisted', 0.0625, 10, '3 Oak Ln\nTown, KS 66000'],
    ['Zero Chain Entry', 0, 0, 'c/o X', '2'],
    ['TOTAL:', 1, 160],
    [], [],
    ['GENERAL NOTES:'],
    ['(1) All parties should be named as respondents.'],
    [],
    ['SUBJECT NOTES:'],
    ['(1) Bob Test died in 1990; heirship is not of record. See 2013 DOTO Req. 5.\n'],
    ['(2) Dee Trust: a trust certificate is required.\n\n(2-A) Also see the probate file.'],
    [],
    ['STRANGERS-IN-TITLE:'],
    ['(1) See Note 2 above.'],
    ['SUBJECT TO EASEMENTS AND ROWS OF RECORD'],
  ] },
  { name: 'Tract 1', rows: [
    [], [], ['OWNERSHIP REPORT'], [], [], ['TRACT 1'], [],
    ['DESCRIPTION:', 'SE4 SE4'], [], ['CONTAINING: ', '40', '  ACRES, MORE OR LESS'], [], ['SURFACE OWNERSHIP:', 'not examined'], [],
    ['MINERAL OWNER', 'INTEREST', 'NET ACRES', 'LEASE #', 'LEASEHOLD', 'SUBJECT NOTE #'],
    ['Ann Sample', 0.5, 20, '', 'Open'],
    ['The Known and Unknown Heirs of Bob Test, Deceased', 0.25, 10, '', 'Open'],
    ['The Known and Unknown Heirs of Bob Test, Deceased', 0.125, 5, '', 'Open'],
    ['Dee Trustee, Successor Trustee ofthe Dee Trust', 0.0625, 2.5, '', 'Open'],
    ['', 0.0625, 2.5, '', 'Open'],
    ['TOTAL:', 1, 40],
  ] },
  { name: 'Tract 2', rows: [
    [], [], ['OWNERSHIP REPORT'], [], [], ['TRACT 1'], [], // note: the title says TRACT 1 by mistake; the tab name wins
    ['DESCRIPTION:', 'SW4 SE4 and N2 SE4'], [], ['CONTAINING: ', '120'], [], [], [],
    ['MINERAL OWNER', 'INTEREST', 'NET ACRES', 'LEASE #', 'LEASEHOLD', 'SUBJECT NOTE #'],
    ['Ann Sample', 0.5, 60],
    ['The Known and Unknown Heirs of Bob Test, Deceased', 0.25, 30],
    ['The Known and Unknown Heirs of Bob Test, Deceased', 0.125, 15],
    ['Dee Trustee, Successor Trustee of the Dee Trust', 0.0625, 7.5],
    ['Eve Unlisted', 0.0625, 7.5],
    ['TOTAL:', 1, 120],
  ] },
  { name: 'RUNSHEET', rows: [
    [], ['RUNSHEET'], [], ['Section 14, Township 21 North, Range 4 West', '', '', '', '', '', '', 'BEGINNING DATE: 12/3/2013'], ['Grady County, Oklahoma', '', '', '', '', '', '', 'END DATE:  8/31/2026  '], [],
    ['BOOK/PAGE', 'INSTRUMENT\nTYPE', 'EFFECTIVE\nDATE', 'FILE\nDATE', 'GRANTOR/ASSIGNOR/LESSOR', 'GRANTEE/ASSIGNEE/LESSEE', 'LEGAL DESCRIPTION', 'CONVEYANCE', 'NOTES/RESERVATIONS'],
    ['1634/504', 'Final Decree', D(1983, 9, 15), D(2014, 2, 7), 'Estate of Bob Test, Deceased', 'Cy Test (100%)', 'SE4 of Section 14', 'ARTI', 'SATISFIES DOTO REQUIREMENT 5'],
    ['1635/721', 'QCMD', D(2014, 2, 18), D(2014, 2, 24), 'Dee Trustee', 'Fay Buyer', 'SE4', 'ARTI', ''],
    [],
  ] },
];

const p = parseOrWorkbook(sheets as any);
assert.deepEqual(p.sheets.map((s) => s.role), ['plat', 'summary', 'tract', 'tract', 'runsheet']);
assert.equal(p.report.prospectNumber, '99-001'); assert.equal(p.report.section, '14'); assert.equal(p.report.township, '21N'); assert.equal(p.report.range, '4W');
assert.equal(p.report.county, 'Grady'); assert.equal(p.report.state, 'Oklahoma'); assert.equal(p.report.description, 'SE4'); assert.equal(p.report.grossAcres, 160);
assert.equal(p.report.orDate, '8/31/2026'); assert.equal(p.report.lastEntry, '2034/68'); assert.equal(p.report.examiner, 'A. Examiner, JD');
assert.equal(p.report.beginDate, '12/3/2013'); assert.equal(p.report.endDate, '8/31/2026');
assert.deepEqual(p.tracts.map((t) => [t.label, t.description, t.grossAcres]), [['1', 'SE4 SE4', 40], ['2', 'SW4 SE4 and N2 SE4', 120]]);

assert.equal(p.interests.length, 6);
const bob = p.interests.filter((i) => i.name.includes('Bob Test'));
assert.equal(bob.length, 2);
assert.ok(bob[0].address.includes('c/o second line'), 'continuation address line joined');
// duplicates (same name twice) take their own tract rows, in order
assert.deepEqual(bob[0].tractAcres, { 1: 10, 2: 30 }); assert.deepEqual(bob[1].tractAcres, { 1: 5, 2: 15 });
// name drift ("ofthe") still matches; the unnamed tract row is placed by position
const dee = p.interests.find((i) => i.name.startsWith('Dee Trustee'))!;
assert.deepEqual(dee.tractAcres, { 1: 2.5, 2: 7.5 });
const eve = p.interests.find((i) => i.name === 'Eve Unlisted')!;
assert.deepEqual(eve.tractAcres, { 1: 2.5, 2: 7.5 }); // its Tract 1 row has no name: placed by position
assert.equal(p.interests.find((i) => i.name === 'Zero Chain Entry')!.netAcres, 0);

assert.deepEqual(p.notes.map((n) => `${n.kind}:${n.ref}`), ['general:1', 'subject:1', 'subject:2', 'subject:2-A', 'stranger:1']);
assert.ok(p.notes.find((n) => n.ref === '1' && n.kind === 'subject')!.body.includes('heirship is not of record'));
assert.equal(p.runsheet.length, 2); assert.equal(p.runsheet[0].bookPage, '1634/504'); assert.equal(p.runsheet[0].effectiveDate, '9/15/1983'); assert.equal(p.runsheet[1].grantee, 'Fay Buyer');
console.log('OR PARSE OK', p.warnings.length ? 'warnings: ' + p.warnings.join(' / ') : '');

import { coreName, notesForRefs, runsheetFor, splitRefs } from '../src/lib/orMatch.ts';
import { linkByName } from '../src/lib/orLink.ts';
assert.equal(coreName('The Known and Unknown Heirs, Devisees, Executors, Administrators, Trustees, Successors, and Assigns, immediate and remote, of W. R. Welch, a/k/a Walter R. Welch, Deceased'), 'W. R. Welch');
assert.equal(coreName('Kathleen Bignell, Successor Trustee of the Eleanor P. Welch Trust'), 'Kathleen Bignell');
assert.equal(coreName('Tony Colyn'), 'Tony Colyn');
const runs: any[] = [
  { id: '1', grantor: 'Kathleen W. Bignell, a widow', grantee: 'Fay Buyer', notes: '' },
  { id: '2', grantor: 'Someone Else', grantee: 'Fay Buyer', notes: '' },
  { id: '3', grantor: 'Estate of Walter R. Welch', grantee: '', notes: '' },
];
assert.deepEqual(runsheetFor(runs, ['Kathleen Bignell, Successor Trustee of the X Trust']).map((r: any) => r.id), ['1']);
assert.deepEqual(splitRefs('2, 2-A'), ['2', '2-A']); assert.deepEqual(splitRefs(null), []);
assert.deepEqual(notesForRefs([{ kind: 'subject', ref: '2' }, { kind: 'subject', ref: '3' }, { kind: 'general', ref: '2' }] as any, ['2']).length, 1);
assert.deepEqual(linkByName([{ name: 'Ann Sample', net: 5 }, { name: 'ann  sample', net: 5 }, { name: 'Zero', net: 0 }, { name: 'Dee ofthe Trust', net: 1 }], [{ id: 'o1', name: 'Ann Sample' }, { id: 'o2', name: 'Dee of the Trust' }]), ['o1', null, null, 'o2']);
console.log('OR MATCH OK');
