export type OwnerStatus =
  | 'not_contacted'
  | 'attempted'
  | 'contacted'
  | 'offer_made'
  | 'negotiating'
  | 'leased'
  | 'declined'
  | 'unresponsive';

export const STATUS_ORDER: OwnerStatus[] = [
  'not_contacted',
  'attempted',
  'contacted',
  'offer_made',
  'negotiating',
  'leased',
  'declined',
  'unresponsive',
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
};

export interface Project {
  id: string;
  name: string;
  prospect_number: string | null;
  target_area: string | null;
  offer_rate_per_acre: number | null;
  offer_royalty_label: string | null;
  offer_royalty_fraction: number | null;
  offer_lease_term_months: number | null;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface MineralOwner {
  id: string;
  project_id: string;
  name: string;
  nma: number;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: OwnerStatus;
  notes: string | null;
  last_contacted_at: string | null;
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
