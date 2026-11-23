import assert from 'node:assert/strict';
import { buildReport } from '../src/lib/report.ts';
const terms: any[] = [{ id: 'a', label: 'Standard', rate_per_acre: 150, sort_order: 0 }];
const o = (id: string, nma: number, status: string, extra: any = {}): any => ({ id, name: id, nma, status, offer_terms_id: null, bonus_paid_at: null, next_contact_date: null, ...extra });
const owners = [o('A', 50, 'leased', { bonus_paid_at: '2026-11-10' }), o('B', 30, 'leased'), o('C', 20, 'negotiating'), o('D', 0, 'not_contacted'), o('E', 100, 'offer_made')];
const act = [
  { owner_id: 'C', note: 'x', outcome: 'Spoke with them', created_at: '2026-11-22T10:00:00Z' },
  { owner_id: 'C', note: 'y', outcome: null, created_at: '2026-11-20T10:00:00Z' },
  { owner_id: 'E', note: 'Offer letter prepared', outcome: 'Offer letter', created_at: '2026-11-21T10:00:00Z' },
  { owner_id: 'A', note: 'old', outcome: null, created_at: '2026-10-01T10:00:00Z' },
];
const r = buildReport({ name: 'P', prospect_number: '1', operator_name: 'Op' }, owners, terms, act, '2026-11-23', 7);
assert.equal(r.totals.totalNma, 200); assert.equal(r.totals.leasedNma, 80); assert.equal(r.totals.pctLeasedNma, 40);
assert.equal(r.totals.contactedOwners, 4);
assert.equal(r.totals.bonusOwed, 12000); assert.equal(r.totals.bonusPaid, 7500); assert.equal(r.totals.bonusOutstanding, 4500);
assert.deepEqual(r.leased.map((l) => l.name), ['A', 'B']); assert.deepEqual(r.inPlay.map((l) => l.name), ['E', 'C']);
assert.deepEqual(r.activity, { calls: 2, ownersTouched: 1, offersPrepared: 1 });
assert.equal(r.byStatus.find((s) => s.status === 'leased')!.pctNma, 40);
assert.ok(!JSON.stringify(r).includes('phone'));
console.log('REPORT OK');
