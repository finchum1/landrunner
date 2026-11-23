import type { MineralOwner } from './types';

export type QueueOwner = Pick<
  MineralOwner,
  'name' | 'nma' | 'status' | 'phone' | 'phone_wrong' | 'extra_phones' | 'do_not_contact' | 'next_contact_date'
>;
import { isWorkingStatus } from './callOutcomes';

// Phones we'd actually dial: the main number (unless flagged wrong) plus any
// extra numbers not flagged wrong.
export function usablePhones(o: Pick<MineralOwner, 'phone' | 'phone_wrong' | 'extra_phones'>): string[] {
  const out: string[] = [];
  if (o.phone && o.phone.trim() && !o.phone_wrong) out.push(o.phone.trim());
  for (const p of o.extra_phones ?? []) {
    if (p.number.trim() && !p.wrong) out.push(p.number.trim());
  }
  return out;
}

export function hasAnyPhone(o: Pick<MineralOwner, 'phone' | 'extra_phones'>): boolean {
  return !!(o.phone && o.phone.trim()) || (o.extra_phones ?? []).some((p) => p.number.trim());
}

export interface QueueOptions {
  today: string;
  hideZeroNma: boolean;
}

// Who to call, in order. Due/overdue follow-ups first (oldest date first, then
// biggest NMA), then owners with no date set by biggest NMA. Future-dated
// follow-ups wait their turn, so they're excluded.
export function buildCallQueue<T extends QueueOwner>(owners: T[], { today, hideZeroNma }: QueueOptions): T[] {
  const eligible = owners.filter(
    (o) =>
      isWorkingStatus(o.status) &&
      !o.do_not_contact &&
      usablePhones(o).length > 0 &&
      !(hideZeroNma && !(o.nma > 0)) &&
      !(o.next_contact_date && o.next_contact_date > today)
  );
  return eligible.sort((a, b) => {
    const aDue = !!a.next_contact_date;
    const bDue = !!b.next_contact_date;
    if (aDue !== bDue) return aDue ? -1 : 1;
    if (aDue && bDue && a.next_contact_date !== b.next_contact_date) {
      return (a.next_contact_date as string) < (b.next_contact_date as string) ? -1 : 1;
    }
    return b.nma - a.nma || a.name.localeCompare(b.name);
  });
}
