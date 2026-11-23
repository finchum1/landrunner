import type { MineralOwner, ProjectOfferTerms } from './types';

// The tier an owner is on: their assigned one, else the project's first.
export function termsFor(
  owner: Pick<MineralOwner, 'offer_terms_id'>,
  terms: ProjectOfferTerms[]
): ProjectOfferTerms | undefined {
  return terms.find((t) => t.id === owner.offer_terms_id) ?? terms[0];
}

// Lease bonus = net mineral acres x $/acre of the owner's tier (null if no rate).
export function bonusDue(owner: Pick<MineralOwner, 'nma' | 'offer_terms_id'>, terms: ProjectOfferTerms[]): number | null {
  const rate = termsFor(owner, terms)?.rate_per_acre;
  return rate == null ? null : Math.round(owner.nma * rate * 100) / 100;
}

export function bonusSummary(
  owners: Pick<MineralOwner, 'nma' | 'status' | 'offer_terms_id' | 'bonus_paid_at'>[],
  terms: ProjectOfferTerms[]
): { owed: number; paid: number; outstanding: number; unpaidCount: number } {
  let owed = 0;
  let paid = 0;
  let unpaidCount = 0;
  for (const o of owners) {
    if (o.status !== 'leased') continue;
    const due = bonusDue(o, terms) ?? 0;
    owed += due;
    if (o.bonus_paid_at) paid += due;
    else unpaidCount += 1;
  }
  return { owed, paid, outstanding: owed - paid, unpaidCount };
}
