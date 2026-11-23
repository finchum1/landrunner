import assert from 'node:assert/strict';
import { CALL_OUTCOMES, planOutcome, addDays } from '../src/lib/callOutcomes.ts';
import { buildCallQueue } from '../src/lib/callQueue.ts';
import { planReimport } from '../src/lib/reimport.ts';

const o = (k: string) => CALL_OUTCOMES.find((x) => x.key === k)!;
const T = '2026-11-23';
assert.equal(addDays('2026-11-29', 3), '2026-12-02');
assert.equal(addDays('2026-12-30', 3), '2027-01-02');
// forward-only
let p = planOutcome(o('no_answer'), 'not_contacted', null, T);
assert.deepEqual([p.status, p.nextContactDate], ['attempted', '2026-11-25']);
p = planOutcome(o('spoke'), 'offer_made', null, T);
assert.equal(p.status, 'offer_made'); assert.equal(p.nextContactDate, '2026-11-30');
p = planOutcome(o('no_answer'), 'contacted', null, T);
assert.equal(p.status, 'contacted');
p = planOutcome(o('interested'), 'contacted', null, T); assert.equal(p.status, 'negotiating');
// never touch leased/client
for (const s of ['leased', 'client', 'declined', 'unresponsive'] as const) {
  p = planOutcome(o('spoke'), s, '2026-12-01', T);
  assert.equal(p.status, s); assert.equal(p.nextContactDate, '2026-12-01');
}
p = planOutcome(o('not_interested'), 'negotiating', '2026-12-01', T);
assert.equal(p.status, 'declined'); assert.equal(p.nextContactDate, null);
p = planOutcome(o('wrong_number'), 'attempted', '2026-12-01', T);
assert.equal(p.phoneWrong, true); assert.equal(p.status, 'attempted'); assert.equal(p.nextContactDate, '2026-12-01');

const base: any = { project_id: 'p', interest_decimal: null, email: null, address: null, notes: null, last_contacted_at: null, extra_phones: [], phone_wrong: false, do_not_contact: false };
const mk = (id: string, over: any) => ({ ...base, id, name: id, nma: 1, phone: '405-555-0001', status: 'not_contacted', next_contact_date: null, ...over });
const q = buildCallQueue([
  mk('future', { next_contact_date: '2026-12-01', nma: 99 }),
  mk('unsched-big', { nma: 50 }),
  mk('unsched-small', { nma: 5 }),
  mk('overdue-old', { next_contact_date: '2026-11-01', nma: 1 }),
  mk('due-today-big', { next_contact_date: T, nma: 80 }),
  mk('overdue-old-bigger', { next_contact_date: '2026-11-01', nma: 9 }),
  mk('nophone', { phone: null }),
  mk('wrongphone', { phone_wrong: true }),
  mk('wrongphone-extra-ok', { phone_wrong: true, extra_phones: [{ label: 'x', number: '405-1', wrong: false }], nma: 2 }),
  mk('dnc', { do_not_contact: true }),
  mk('leased', { status: 'leased' }),
  mk('zero', { nma: 0 }),
], { today: T, hideZeroNma: true }).map((x) => x.id);
assert.deepEqual(q, ['overdue-old-bigger', 'overdue-old', 'due-today-big', 'unsched-big', 'unsched-small', 'wrongphone-extra-ok']);
assert.ok(buildCallQueue([mk('zero', { nma: 0 })], { today: T, hideZeroNma: false }).length === 1);

const ex = [mk('John Smith', { id: 'a', name: 'John Smith', phone: '(405) 555-0001', email: 'old@x.com' }),
  mk('d1', { name: 'Dup One' }), mk('d2', { name: 'dup  one!' }), mk('Blank', { name: 'Blank Person', phone: null, nma: 0 })];
const inc = (name: string, o2: any = {}) => ({ name, nma: 0, interest_decimal: null, phone: null, email: null, address: null, notes: null, ...o2 });
let r = planReimport(ex, [inc('JOHN  SMITH', { phone: '1-405-555-0001', email: 'new@x.com' }), inc('Brand New'), inc('Dup One', { phone: '1' })], 'fill');
assert.equal(r.toInsert.length, 1); assert.equal(r.ambiguous, 1);
assert.equal(r.toUpdate.length, 0); assert.equal(r.skipped, 1); // same phone (normalized), email already set
r = planReimport(ex, [inc('John Smith', { phone: '918-555-9999', email: 'new@x.com' })], 'fill');
assert.deepEqual(r.toUpdate[0].patch.extra_phones, [{ label: 'Imported', number: '918-555-9999', wrong: false }]);
assert.equal(r.toUpdate[0].patch.email, undefined); assert.equal(r.toUpdate[0].patch.phone, undefined);
r = planReimport(ex, [inc('John Smith', { phone: '918-555-9999', email: 'new@x.com' })], 'overwrite');
assert.equal(r.toUpdate[0].patch.phone, '918-555-9999'); assert.equal(r.toUpdate[0].patch.email, 'new@x.com');
r = planReimport(ex, [inc('Blank Person', { phone: '555', nma: 12.5 })], 'fill');
assert.equal(r.toUpdate[0].patch.phone, '555'); assert.equal(r.toUpdate[0].patch.nma, 12.5);
r = planReimport(ex, [inc('Blank Person', { phone: '555' })], 'skip'); assert.equal(r.skipped, 1); assert.equal(r.toUpdate.length, 0);
// same name twice in one file: second is ambiguous, not double-updated
r = planReimport(ex, [inc('Blank Person', { phone: '555' }), inc('blank person', { phone: '777' })], 'fill');
assert.equal(r.toUpdate.length, 1); assert.equal(r.ambiguous, 1);
console.log('ALL PASS');
