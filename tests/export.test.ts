import assert from 'node:assert/strict';
import { ownersToRows } from '../src/lib/exportOwners.ts';
const o: any = { id: 'a', name: 'X', nma: 2.5, interest_decimal: 0.125, status: 'leased', phone: '1', phone_wrong: true, extra_phones: [{ label: 'Cell', number: '2', wrong: true }, { label: '', number: ' ', wrong: false }], email: null, address: null, last_contacted_at: '2026-11-01T10:00:00Z', next_contact_date: null, do_not_contact: false, notes: 'n' };
const [r] = ownersToRows([o], { a: { owner_id: 'a', note: 'hi', created_at: '' } });
assert.equal(r['Interest %'], 12.5); assert.equal(r.Status, 'Leased'); assert.equal(r['Other phones'], 'Cell: 2 (wrong)');
assert.equal(r['Phone flagged wrong'], 'Yes'); assert.equal(r['Last contacted'], '2026-11-01'); assert.equal(r['Latest log'], 'hi');
console.log('EXPORT OK');
