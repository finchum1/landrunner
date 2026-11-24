import type { MineralOwner, OwnerGroup } from './types';

export function membersOf<T extends Pick<MineralOwner, 'id' | 'group_id'>>(owners: T[], groupId: string | null | undefined): T[] {
  return groupId ? owners.filter((o) => o.group_id === groupId) : [];
}

// Members who should share a logged call: still being worked and reachable.
// Leased/declined/client owners and do-not-contact owners are left alone.
export function callSharers<T extends Pick<MineralOwner, 'id' | 'status' | 'do_not_contact'>>(
  members: T[],
  selfId: string,
  isWorking: (status: MineralOwner['status']) => boolean
): T[] {
  return members.filter((m) => m.id !== selfId && !m.do_not_contact && isWorking(m.status));
}

export function groupName(groups: OwnerGroup[], id: string | null | undefined): string | null {
  return id ? groups.find((g) => g.id === id)?.name ?? null : null;
}
