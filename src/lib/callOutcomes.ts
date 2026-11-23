import type { OwnerStatus } from './types';

// What happened on a call. Picking one logs the call AND moves the owner along:
// status, next follow-up date, and (for a bad number) the wrong-number flag.
export type CallOutcomeKey =
  | 'no_answer'
  | 'voicemail'
  | 'spoke'
  | 'interested'
  | 'callback'
  | 'wrong_number'
  | 'not_interested';

export interface CallOutcome {
  key: CallOutcomeKey;
  label: string;
  // Days until the follow-up call; null = don't set/clear a date.
  followUpDays: number | null;
  // Status to move to if the owner is still at an earlier stage.
  status: OwnerStatus | null;
  flagPhoneWrong?: boolean;
}

export const CALL_OUTCOMES: CallOutcome[] = [
  { key: 'no_answer', label: 'No answer', followUpDays: 2, status: 'attempted' },
  { key: 'voicemail', label: 'Left voicemail', followUpDays: 3, status: 'attempted' },
  { key: 'spoke', label: 'Spoke with them', followUpDays: 7, status: 'contacted' },
  { key: 'interested', label: 'Interested', followUpDays: 3, status: 'negotiating' },
  { key: 'callback', label: 'Call back later', followUpDays: 7, status: 'contacted' },
  { key: 'wrong_number', label: 'Wrong number', followUpDays: null, status: null, flagPhoneWrong: true },
  { key: 'not_interested', label: 'Not interested', followUpDays: null, status: 'declined' },
];

export function outcomeByLabel(label: string | null): CallOutcome | undefined {
  return CALL_OUTCOMES.find((o) => o.label === label);
}

// Only statuses where the landman is still working the owner are moved by a
// call outcome. leased / client / declined (etc.) are never silently changed.
const WORKING_ORDER: OwnerStatus[] = ['not_contacted', 'attempted', 'contacted', 'offer_made', 'negotiating'];
export const WORKING_STATUSES = WORKING_ORDER;

export function isWorkingStatus(s: OwnerStatus): boolean {
  return WORKING_ORDER.includes(s);
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export interface OutcomePlan {
  status: OwnerStatus;
  nextContactDate: string | null;
  phoneWrong: boolean | null; // null = leave unchanged
}

// Declining is an explicit "not interested" from the owner, so it applies even
// from a working status; everything else only ever moves a status FORWARD
// (spoke/interested never drag someone back from "offer made").
export function planOutcome(
  outcome: CallOutcome,
  currentStatus: OwnerStatus,
  currentNextDate: string | null,
  today: string
): OutcomePlan {
  let status = currentStatus;
  if (isWorkingStatus(currentStatus) && outcome.status) {
    const target = outcome.status;
    if (target === 'declined') status = 'declined';
    else if (WORKING_ORDER.indexOf(target) > WORKING_ORDER.indexOf(currentStatus)) status = target;
  }
  let nextContactDate = currentNextDate;
  if (outcome.key === 'not_interested') nextContactDate = null;
  else if (outcome.followUpDays !== null && isWorkingStatus(status)) {
    nextContactDate = addDays(today, outcome.followUpDays);
  }
  return { status, nextContactDate, phoneWrong: outcome.flagPhoneWrong ? true : null };
}
