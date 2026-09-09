import { supabase } from './supabase';
import type { MineralOwner, OwnerActivity, OwnerStatus } from './types';

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

export async function updateOwner(id: string, input: Partial<OwnerInput & { status: OwnerStatus; notes: string | null; last_contacted_at: string | null }>): Promise<MineralOwner> {
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

export async function addActivity(ownerId: string, note: string): Promise<OwnerActivity> {
  const { data, error } = await supabase
    .from('owner_activity')
    .insert({ owner_id: ownerId, note })
    .select()
    .single();
  if (error) throw error;
  return data;
}
