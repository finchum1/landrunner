import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { buildLetter, buildLettersDocx, daysPhrase, formatLetterDate, leaseTermPhrase, letterToText, royaltyPhrase, tiersForOwner } from '../src/lib/offerLetter.ts';

assert.equal(formatLetterDate('2026-11-20'), 'November 20th, 2026');
assert.equal(formatLetterDate('2026-11-01'), 'November 1st, 2026');
assert.equal(formatLetterDate('2026-12-12'), 'December 12th, 2026');
assert.equal(formatLetterDate('2026-03-23'), 'March 23rd, 2026');
assert.equal(leaseTermPhrase(12), 'one-year'); assert.equal(leaseTermPhrase(36), 'three-year'); assert.equal(leaseTermPhrase(6), 'six-month');
assert.equal(royaltyPhrase('3/16'), '3/16th'); assert.equal(royaltyPhrase('1/8'), '1/8th'); assert.equal(royaltyPhrase('20%'), '20%');
assert.equal(daysPhrase(14), 'fourteen (14)');

const project: any = { operator_name: 'Koda Operating, LLC', offer_valid_days: 14, section: '32', township: '25N', range: '1W', county: 'Kay' };
const mkT = (o: any) => ({ id: 't', label: 'Standard', rate_per_acre: 125, royalty_label: '3/16', lease_term_months: 12, option_to_extend: true, ...o });
const profile = { full_name: 'Terrence Finchum', title: 'Landman', phone: '405-761-9988', email: 'terrencefinchum@gmail.com' };
const owner: any = { id: 'o', name: 'Jane Smith', address: '1 Main St\nTulsa, OK 74101' };
const opts = { date: '2026-11-20', greetByName: true, includeAddress: true };

const single = letterToText(buildLetter(project, [mkT({})], owner, profile, opts));
assert.match(single, /November 20th, 2026/);
assert.match(single, /Re: Oil & Gas Lease\nSection 32-25N-1W\nKay County, Oklahoma/);
assert.match(single, /Dear Jane Smith:/);
assert.match(single, /authorized by Koda Operating, LLC to offer a one-year paid-up oil and gas lease in the above-described section and hereby propose you choose the below-described offer/);
assert.match(single, /Lease your interest in the captioned land for a bonus consideration of \$125 per net mineral acre and 3\/16th royalty, with an option to extend\./);
assert.match(single, /subject to Koda Operating, LLC’s approval/);
assert.match(single, /terminate fourteen \(14\) days after receipt/);
assert.match(single, /Jane Smith\n1 Main St\nTulsa, OK 74101/);

const multi = letterToText(buildLetter(project, [mkT({}), mkT({ label: 'Premium', rate_per_acre: 150.5, option_to_extend: false })], null, profile, { ...opts, includeAddress: false }));
assert.match(multi, /Dear Mineral Owner:/); assert.match(multi, /choose one of the below-described offers/);
assert.match(multi, /Option 2 — Premium: Lease your interest .* \$150\.50 per net mineral acre and 3\/16th royalty\./);
assert.doesNotMatch(multi, /Jane/);

// assigned tier wins over chosen tiers
const a = mkT({ id: 'a' }), b = mkT({ id: 'b' });
assert.deepEqual(tiersForOwner({ offer_terms_id: 'b' }, [a], [a, b]).map((t: any) => t.id), ['b']);
assert.deepEqual(tiersForOwner({ offer_terms_id: null }, [a], [a, b]).map((t: any) => t.id), ['a']);

const blob = await buildLettersDocx([buildLetter(project, [mkT({})], owner, profile, opts), buildLetter(project, [mkT({})], { id: 'x', name: 'Bob Jones', address: null }, profile, opts)]);
writeFileSync('/tmp/lr_letters.docx', Buffer.from(await blob.arrayBuffer()));
console.log('LETTER OK');
