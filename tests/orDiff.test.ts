import assert from 'node:assert/strict';
import { diffOr, lprImpact, matchLines } from '../src/lib/orDiff.ts';

assert.deepEqual(matchLines([{ name: 'A B' }, { name: 'Heirs of X' }, { name: 'Heirs of X' }], [{ name: 'Heirs of X' }, { name: 'a  b' }, { name: 'Heirs of X' }, { name: 'New' }]), [1, 0, 2, null]);
assert.deepEqual(matchLines([{ name: 'Dee of the Trust' }], [{ name: 'Dee ofthe Trust' }]), [0]);

const oldLine = (id: string, name: string, net: number, tr: Record<string, number>, refs = '') => ({ id, name, net_acres: net, interest: net / 160, address: '1 Main', note_refs: refs, tract_acres: tr, owner_id: null, report_id: 'r', project_id: 'p', row_order: 0 });
const prev: any = {
  report: { or_date: '8/31/2026', last_entry: '2034/68', examiner: 'A', prospect_number: '99-001', end_date: '8/31/2026' },
  tracts: [{ label: '1', description: 'SE4 SE4', gross_acres: 40 }],
  interests: [oldLine('o1', 'Ann Sample', 10, { 1: 10 }), oldLine('o2', 'Bob Test', 5, { 1: 5 }, '1'), oldLine('o3', 'Gone Person', 2, { 1: 2 }), oldLine('o4', 'Zero Row', 0, {})],
  notes: [{ kind: 'subject', ref: '1', body: 'Old text' }, { kind: 'subject', ref: '9', body: 'Dropped' }],
  runsheet: [{ book_page: '1/1', instrument: 'Deed', grantor: 'Ann Sample' }],
};
const line = (name: string, net: number, tr: Record<string, number>, refs = '') => ({ name, address: '1 Main', interest: net / 160, netAcres: net, noteRefs: refs, tractAcres: tr, rowOrder: 0 });
const next: any = {
  report: { orDate: '11/20/2026', lastEntry: '2040/12', examiner: 'A', prospectNumber: '99-001', endDate: '11/20/2026' },
  tracts: [{ label: '1', description: 'SE4 SE4', grossAcres: 40, sheetName: 'Tract 1' }],
  interests: [line('Ann Sample', 10, { 1: 10 }), line('Bob Test', 6, { 1: 6 }, '1, 2'), line('Newcomer', 4, { 1: 4 }), line('Another Zero', 0, {})],
  notes: [{ kind: 'subject', ref: '1', body: 'New text' }, { kind: 'subject', ref: '2', body: 'Fresh' }],
  runsheet: [{ bookPage: '1/1', instrument: 'Deed', grantor: 'Ann Sample' }, { bookPage: '2/2', instrument: 'AODH', grantor: 'Bob Test' }],
};
const d = diffOr(prev, next);
assert.deepEqual(d.facts.map((f) => f.label), ['Report date', 'Last entry (book/page)', 'Runsheet through']);
assert.deepEqual(d.added.map((a) => a.name), ['Newcomer']); assert.deepEqual(d.removed.map((r) => r.name), ['Gone Person']);
assert.equal(d.changed.length, 1); assert.deepEqual(d.changed[0].what, ['net acres 5 → 6', 'Tract 1 5 → 6', 'note 1 → 1, 2']);
assert.equal(d.zeroAdded, 1); assert.equal(d.zeroRemoved, 1);
assert.deepEqual(d.notesAdded.map((n) => n.ref), ['2']); assert.deepEqual(d.notesChanged.map((n) => n.ref), ['1']); assert.deepEqual(d.notesRemoved.map((n) => n.ref), ['9']);
assert.deepEqual(d.runsheetAdded.map((r) => r.bookPage), ['2/2']);
assert.equal(d.matches.get('o1'), 0); assert.equal(d.matches.get('o3'), null); assert.equal(d.isEmpty, false);
const impact = lprImpact([{ id: 'l1', lessor: 'Bob', interestIds: ['o2'] }, { id: 'l2', lessor: 'Ann', interestIds: ['o1'] }, { id: 'l3', lessor: 'Gone', interestIds: ['o3'] }], d);
assert.deepEqual(impact.map((i) => i.id), ['l1', 'l3']);
assert.ok(impact[1].reasons[0].includes('no longer in the report'));
// identical report => nothing to say
const same = diffOr(prev, { ...next, report: { orDate: '8/31/2026', lastEntry: '2034/68', examiner: 'A', prospectNumber: '99-001', endDate: '8/31/2026' }, interests: [line('Ann Sample', 10, { 1: 10 }), line('Bob Test', 5, { 1: 5 }, '1'), line('Gone Person', 2, { 1: 2 }), line('Zero Row', 0, {})], notes: [{ kind: 'subject', ref: '1', body: 'Old text' }, { kind: 'subject', ref: '9', body: 'Dropped' }], runsheet: [{ bookPage: '1/1', instrument: 'Deed', grantor: 'Ann Sample' }] });
assert.equal(same.isEmpty, true);
console.log('OR DIFF OK');
