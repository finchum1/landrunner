import assert from 'node:assert/strict';
// @ts-expect-error plain JS module
import { buildDigest, buildIcs, firstPhone, todayIn } from '../api/_lib/reminders.js';

const ev = (over: any = {}) => ({ owner_id: 'o1', owner_name: 'Harlan Family Trust', nma: 38.4, project_id: 'p1', project_name: 'Sample, Prospect', status: 'attempted', phone: '(405) 555-0101', extra_phones: [], phone_wrong: false, next_contact_date: '2026-11-25', ...over });
const today = '2026-11-24';
const ics: string = buildIcs([ev(), ev({ owner_id: 'o2', owner_name: 'Late; Owner', next_contact_date: '2026-11-20' }), ev({ owner_id: 'o3', phone: null, extra_phones: [{ number: '918-1', wrong: false }] })], today, new Date('2026-11-24T15:00:00Z'));
assert.match(ics, /^BEGIN:VCALENDAR\r\n/); assert.match(ics, /END:VCALENDAR\r\n$/);
assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 3);
assert.match(ics, /DTSTART;VALUE=DATE:20261125\r\nDTEND;VALUE=DATE:20261126/);
// overdue is moved to today and flagged; commas/semicolons escaped
assert.match(ics, /UID:owner-o2-20261124@jillspoon/); assert.match(ics, /SUMMARY:OVERDUE: Call Late\; Owner \(38\.4 NMA\)/);
assert.match(ics, /DTSTART;VALUE=DATE:20261124/);
assert.match(ics, /Sample\\, Prospect/);
for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75, 'line too long: ' + line);
assert.equal(firstPhone(ev({ phone_wrong: true, extra_phones: [{ number: '918-1', wrong: true }, { number: '918-2', wrong: false }] })), '918-2');
assert.equal(firstPhone(ev({ phone: null })), null);

assert.equal(buildDigest([ev()], today), null); // only future follow-ups: nothing to send
const d = buildDigest([ev({ next_contact_date: today }), ev({ owner_id: 'o2', owner_name: 'Late <Owner>', next_contact_date: '2026-11-20' }), ev({ owner_id: 'o9', next_contact_date: '2026-12-01' })], today)!;
assert.equal(d.count, 2); assert.match(d.subject, /2 calls due today \(1 overdue\)/);
assert.ok(d.html.includes('Late &lt;Owner&gt;')); assert.ok(!d.html.includes('2026-12-01'));
assert.ok(d.html.indexOf('Overdue') < d.html.indexOf('Due today'));
// Central time: 03:30 UTC on the 24th is still the 23rd in Oklahoma
assert.equal(todayIn('America/Chicago', new Date('2026-11-24T03:30:00Z')), '2026-11-23');
console.log('REMINDERS OK');
