import type { AvoidancePrefs } from '../types/avoidance';

// Avoidance Training's defaults and fixed copy. docs/micro-apps/avoidance.md.

export const DEFAULT_AVOIDANCE_PREFS: AvoidancePrefs = { weekly_goal: 3 };

export const MAX_TASK_LENGTH = 120;

/** Rotated through the add box's placeholder: what kind of thing belongs here. */
export const ADD_EXAMPLES = [
  'Book the dentist',
  'Reply to that email',
  'Return the parcel',
  'Sort last year’s receipts',
  'Call the bank about the fee',
];
