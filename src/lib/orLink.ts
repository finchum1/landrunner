import { normName } from './orParse';
import type { MineralOwner } from './types';

// Link each ownership line that carries acres to the project's owner of the
// same name (each owner claimed once). Zero-acre lines are title history and
// stay unlinked.
export const compactKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function linkByName(
  interests: { name: string; net: number | null }[],
  owners: Pick<MineralOwner, 'id' | 'name'>[]
): (string | null)[] {
  const taken = new Set<string>();
  const byExact = new Map<string, Pick<MineralOwner, 'id' | 'name'>[]>();
  const byCompact = new Map<string, Pick<MineralOwner, 'id' | 'name'>[]>();
  const compact = compactKey;
  for (const o of owners) {
    byExact.set(normName(o.name), [...(byExact.get(normName(o.name)) ?? []), o]);
    byCompact.set(compact(o.name), [...(byCompact.get(compact(o.name)) ?? []), o]);
  }
  return interests.map((i) => {
    if (!(i.net && i.net > 0)) return null;
    for (const pool of [byExact.get(normName(i.name)), byCompact.get(compact(i.name))]) {
      const hit = pool?.find((o) => !taken.has(o.id));
      if (hit) {
        taken.add(hit.id);
        return hit.id;
      }
    }
    return null;
  });
}

