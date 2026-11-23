import type { ExtraPhone, MineralOwner } from './types';
import type { OwnerInput } from './owners';

export type ReimportMode = 'fill' | 'overwrite' | 'skip';

export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function normalizePhone(p: string): string {
  return p.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
}

export interface ReimportPlan {
  toInsert: OwnerInput[];
  toUpdate: { id: string; patch: Partial<OwnerInput> & { extra_phones?: ExtraPhone[]; phone_wrong?: boolean } }[];
  skipped: number; // existing matches left alone (skip mode / nothing new)
  ambiguous: number; // incoming rows matching 2+ existing owners, left alone
}

const isBlankStr = (v: string | null | undefined) => v === null || v === undefined || v.trim() === '';

// Match incoming rows to existing owners by normalized name. Existing owners
// whose names collide with each other are ambiguous and never touched.
export function planReimport(existing: MineralOwner[], incoming: OwnerInput[], mode: ReimportMode): ReimportPlan {
  const byName = new Map<string, MineralOwner[]>();
  for (const o of existing) {
    const k = normalizeName(o.name);
    byName.set(k, [...(byName.get(k) ?? []), o]);
  }
  const plan: ReimportPlan = { toInsert: [], toUpdate: [], skipped: 0, ambiguous: 0 };
  const seenIncoming = new Set<string>();

  for (const row of incoming) {
    const key = normalizeName(row.name);
    const matches = byName.get(key) ?? [];
    if (matches.length === 0) {
      // Two identical new names in one file are both genuinely new owners.
      plan.toInsert.push(row);
      continue;
    }
    if (matches.length > 1 || seenIncoming.has(key)) {
      plan.ambiguous += 1;
      continue;
    }
    seenIncoming.add(key);
    if (mode === 'skip') {
      plan.skipped += 1;
      continue;
    }
    const cur = matches[0];
    const patch: ReturnType<typeof makePatch> = makePatch(cur, row, mode);
    if (Object.keys(patch).length === 0) plan.skipped += 1;
    else plan.toUpdate.push({ id: cur.id, patch });
  }
  return plan;
}

function makePatch(cur: MineralOwner, row: OwnerInput, mode: ReimportMode) {
  const patch: Partial<OwnerInput> & { extra_phones?: ExtraPhone[]; phone_wrong?: boolean } = {};
  const overwrite = mode === 'overwrite';

  const textFields = ['email', 'address', 'notes'] as const;
  for (const f of textFields) {
    const incomingVal = row[f] ?? null;
    if (isBlankStr(incomingVal)) continue;
    const curVal = cur[f];
    if (isBlankStr(curVal) || (overwrite && incomingVal !== curVal)) patch[f] = incomingVal;
  }

  if (!isBlankStr(row.phone)) {
    if (isBlankStr(cur.phone)) patch.phone = row.phone;
    else if (normalizePhone(row.phone as string) !== normalizePhone(cur.phone as string)) {
      if (overwrite || cur.phone_wrong) {
        // A number already flagged wrong is replaced, not hoarded as a backup.
        patch.phone = row.phone;
        patch.phone_wrong = false;
      } else {
        // Keep the number we have; remember the new one as an extra so it isn't lost.
        const known = (cur.extra_phones ?? []).some(
          (p) => normalizePhone(p.number) === normalizePhone(row.phone as string)
        );
        if (!known) {
          patch.extra_phones = [
            ...(cur.extra_phones ?? []),
            { label: 'Imported', number: (row.phone as string).trim(), wrong: false },
          ];
        }
      }
    }
  }

  // NMA / interest: a real value from the file fills a zero/empty one; overwrite replaces.
  if (row.nma > 0 && (!(cur.nma > 0) || (overwrite && row.nma !== cur.nma))) patch.nma = row.nma;
  if (
    row.interest_decimal !== null &&
    (cur.interest_decimal === null || (overwrite && row.interest_decimal !== cur.interest_decimal))
  ) {
    patch.interest_decimal = row.interest_decimal;
  }
  return patch;
}
