export type OwnerStatus =
  | 'not_contacted'
  | 'attempted'
  | 'contacted'
  | 'offer_made'
  | 'negotiating'
  | 'leased'
  | 'declined'
  | 'unresponsive'
  | 'client';

export const STATUS_ORDER: OwnerStatus[] = [
  'not_contacted',
  'attempted',
  'contacted',
  'offer_made',
  'negotiating',
  'leased',
  'declined',
  'unresponsive',
  'client',
];

export const STATUS_LABELS: Record<OwnerStatus, string> = {
  not_contacted: 'Not Contacted',
  attempted: 'Attempted Contact',
  contacted: 'Contacted',
  offer_made: 'Offer Made',
  negotiating: 'Negotiating',
  leased: 'Leased',
  declined: 'Declined',
  unresponsive: 'Unresponsive',
  client: 'Client',
};

// Tailwind classes for a small status pill, light+dark aware.
export const STATUS_COLORS: Record<OwnerStatus, string> = {
  not_contacted: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
  attempted: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  contacted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  offer_made: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  negotiating: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  leased: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  declined: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  unresponsive: 'bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-400',
  client: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
};

// Statuses that represent the landman actually reaching the owner directly
// (used to decide whether changing status should auto-stamp last_contacted_at).
// "client" means the client's own team is handling that owner, not a contact
// event by the landman, so it's deliberately excluded.
export const CONTACT_STATUSES: OwnerStatus[] = [
  'attempted',
  'contacted',
  'offer_made',
  'negotiating',
  'leased',
  'declined',
  'unresponsive',
];

export interface Project {
  id: string;
  name: string;
  prospect_number: string | null;
  target_area: string | null;
  section: string | null;
  township: string | null;
  range: string | null;
  county: string | null;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

// A project can have more than one offer on the table at once (e.g. a
// "Standard" tier and a richer "Premium" tier authorized by the client) --
// these are no longer columns on Project itself.
export interface ProjectOfferTerms {
  id: string;
  project_id: string;
  label: string | null;
  rate_per_acre: number | null;
  royalty_label: string | null;
  royalty_fraction: number | null;
  lease_term_months: number | null;
  sort_order: number;
  created_at: string;
}

export interface MineralOwner {
  id: string;
  project_id: string;
  name: string;
  nma: number;
  interest_decimal: number | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: OwnerStatus;
  notes: string | null;
  last_contacted_at: string | null;
  next_contact_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface OwnerActivity {
  id: string;
  owner_id: string;
  note: string;
  created_at: string;
}

export const ROYALTY_PRESETS: { label: string; fraction: number }[] = [
  { label: '1/8', fraction: 0.125 },
  { label: '3/16', fraction: 0.1875 },
  { label: '1/5', fraction: 0.2 },
  { label: '3/8', fraction: 0.375 },
  { label: '1/4', fraction: 0.25 },
];
