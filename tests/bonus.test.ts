import assert from 'node:assert/strict';
import { bonusDue, bonusSummary } from '../src/lib/bonus.ts';
const terms: any[] = [{ id: 'a', rate_per_acre: 125 }, { id: 'b', rate_per_acre: 150 }];
assert.equal(bonusDue({ nma: 10.5, offer_terms_id: null }, terms), 1312.5);
assert.equal(bonusDue({ nma: 10, offer_terms_id: 'b' }, terms), 1500);
assert.equal(bonusDue({ nma: 10, offer_terms_id: null }, [{ id: 'x', rate_per_acre: null } as any]), null);
const s = bonusSummary([
  { nma: 10, status: 'leased', offer_terms_id: null, bonus_paid_at: '2026-11-01' },
  { nma: 4, status: 'leased', offer_terms_id: 'b', bonus_paid_at: null },
  { nma: 99, status: 'negotiating', offer_terms_id: null, bonus_paid_at: null },
], terms);
assert.deepEqual(s, { owed: 1850, paid: 1250, outstanding: 600, unpaidCount: 1 });
console.log('BONUS OK');
