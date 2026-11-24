import { supabase } from './supabase';
import type { MineralOwner, OwnerGroup } from './types';

export async function fetchGroups(projectId: string): Promise<OwnerGroup[]> {
  const { data, error } = await supabase.from('owner_groups').select('*').eq('project_id', projectId).order('created_at');
  if (error) throw error;
  return data ?? [];
}

// New group containing these owners. Returns the group and the updated owners.
export async function createGroup(
  projectId: string,
  name: string,
  ownerIds: string[]
): Promise<{ group: OwnerGroup; owners: MineralOwner[] }> {
  const { data: group, error } = await supabase.from('owner_groups').insert({ project_id: projectId, name }).select().single();
  if (error) throw error;
  const { data: owners, error: e2 } = await supabase.from('mineral_owners').update({ group_id: group.id }).in('id', ownerIds).select();
  if (e2) {
    await supabase.from('owner_groups').delete().eq('id', group.id);
    throw e2;
  }
  return { group, owners: owners ?? [] };
}

export async function addOwnersToGroup(groupId: string, ownerIds: string[]): Promise<MineralOwner[]> {
  const { data, error } = await supabase.from('mineral_owners').update({ group_id: groupId }).in('id', ownerIds).select();
  if (error) throw error;
  return data ?? [];
}

export async function renameGroup(id: string, name: string): Promise<OwnerGroup> {
  const { data, error } = await supabase.from('owner_groups').update({ name }).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// Take one owner out. A group of one isn't a group, so if only one member would
// remain the whole group is dissolved. Returns every owner whose group changed
// and, if dissolved, the id of the removed group.
export async function removeOwnerFromGroup(
  ownerId: string,
  groupId: string,
  memberCount: number
): Promise<{ owners: MineralOwner[]; dissolvedGroupId: string | null }> {
  const dissolve = memberCount <= 2;
  const q = dissolve
    ? supabase.from('mineral_owners').update({ group_id: null }).eq('group_id', groupId)
    : supabase.from('mineral_owners').update({ group_id: null }).eq('id', ownerId);
  const { data, error } = await q.select();
  if (error) throw error;
  if (dissolve) {
    const { error: e2 } = await supabase.from('owner_groups').delete().eq('id', groupId);
    if (e2) throw e2;
  }
  return { owners: data ?? [], dissolvedGroupId: dissolve ? groupId : null };
}
