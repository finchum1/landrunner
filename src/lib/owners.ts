import { supabase } from './supabase';
import type { ExtraPhone, MineralOwner, OwnerActivity, OwnerStatus } from './types';

export async function fetchOwners(projectId: string): Promise<MineralOwner[]> {
  const { data, error } = await supabase
    .from('mineral_owners')
    .select('*')
    .eq('project_id', projectId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAllOwnersLite(): Promise<
  Pick<MineralOwner, 'project_id' | 'nma' | 'status'>[]
> {
  const { data, error } = await supabase.from('mineral_owners').select('project_id, nma, status');
  if (error) throw error;
  return data ?? [];
}

export interface OwnerInput {
  name: string;
  nma: number;
  interest_decimal: number | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes?: string | null;
}

export async function createOwner(projectId: string, input: OwnerInput): Promise<MineralOwner> {
  const { data, error } = await supabase
    .from('mineral_owners')
    .insert({ project_id: projectId, ...input })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function bulkCreateOwners(
  projectId: string,
  rows: OwnerInput[]
): Promise<number> {
  if (rows.length === 0) return 0;
  const payload = rows.map((r) => ({ project_id: projectId, ...r }));
  const { error, count } = await supabase.from('mineral_owners').insert(payload, { count: 'exact' });
  if (error) throw error;
  return count ?? payload.length;
}

export async function updateOwner(
  id: string,
  input: Partial<
    OwnerInput & {
      status: OwnerStatus;
      notes: string | null;
      last_contacted_at: string | null;
      next_contact_date: string | null;
      extra_phones: ExtraPhone[];
      phone_wrong: boolean;
      do_not_contact: boolean;
      offer_terms_id: string | null;
      bonus_paid_at: string | null;
    }
  >
): Promise<MineralOwner> {
  const { data, error } = await supabase.from('mineral_owners').update(input).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteOwner(id: string): Promise<void> {
  const { error } = await supabase.from('mineral_owners').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchActivity(ownerId: string): Promise<OwnerActivity[]> {
  const { data, error } = await supabase
    .from('owner_activity')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addActivity(
  ownerId: string,
  note: string,
  outcome: string | null = null
): Promise<OwnerActivity> {
  const { data, error } = await supabase
    .from('owner_activity')
    .insert({ owner_id: ownerId, note, outcome })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export interface LatestActivity {
  owner_id: string;
  note: string;
  created_at: string;
}

// One row per owner: their most recent call-log entry, for a whole project
// in a single query (backed by the latest_owner_activity view) rather than
// fetching every owner's activity individually.
export async function fetchLatestActivityByProject(projectId: string): Promise<LatestActivity[]> {
  const { data, error } = await supabase
    .from('latest_owner_activity')
    .select('owner_id, note, created_at')
    .eq('project_id', projectId);
  if (error) throw error;
  return data ?? [];
}

// Apply a batch of updates (re-import) a few at a time so a big sheet doesn't
// fire hundreds of simultaneous requests.
export async function bulkUpdateOwners(
  updates: { id: string; patch: Parameters<typeof updateOwner>[1] }[]
): Promise<number> {
  let done = 0;
  for (let i = 0; i < updates.length; i += 8) {
    const chunk = updates.slice(i, i + 8);
    await Promise.all(chunk.map((u) => updateOwner(u.id, u.patch)));
    done += chunk.length;
  }
  return done;
}

export type DashboardOwner = Pick<
  MineralOwner,
  | 'id'
  | 'project_id'
  | 'name'
  | 'nma'
  | 'status'
  | 'phone'
  | 'phone_wrong'
  | 'extra_phones'
  | 'do_not_contact'
  | 'next_contact_date'
>;

// Every owner across all projects, with just the columns the home dashboard needs.
export async function fetchDashboardOwners(): Promise<DashboardOwner[]> {
  const { data, error } = await supabase
    .from('mineral_owners')
    .select('id, project_id, name, nma, status, phone, phone_wrong, extra_phones, do_not_contact, next_contact_date');
  if (error) throw error;
  return data ?? [];
}

// Bulk edit / delete a set of owners in one request each.
export async function bulkPatchOwners(
  ids: string[],
  patch: Parameters<typeof updateOwner>[1]
): Promise<MineralOwner[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('mineral_owners').update(patch).in('id', ids).select();
  if (error) throw error;
  return data ?? [];
}

export async function bulkDeleteOwners(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('mineral_owners').delete().in('id', ids);
  if (error) throw error;
}

// Log the same kind of entry against many owners at once (e.g. "offer letter prepared").
export async function bulkAddActivity(rows: { owner_id: string; note: string; outcome?: string | null }[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.from('owner_activity').insert(rows.map((r) => ({ outcome: null, ...r })));
  if (error) throw error;
}

// Call-log / activity entries for a set of owners since a timestamp (status reports).
export async function fetchActivitySince(
  ownerIds: string[],
  sinceIso: string
): Promise<{ owner_id: string; note: string; outcome: string | null; created_at: string }[]> {
  if (ownerIds.length === 0) return [];
  const { data, error } = await supabase
    .from('owner_activity')
    .select('owner_id, note, outcome, created_at')
    .in('owner_id', ownerIds)
    .gte('created_at', sinceIso);
  if (error) throw error;
  return data ?? [];
}
