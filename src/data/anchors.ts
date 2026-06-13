/**
 * Habit-stacking anchors.
 *
 * An anchor is an existing, reliable daily routine that a new habit is attached to
 * ("After I [anchor], I will [habit]"). Anchoring to an automatic behavior borrows its
 * established cue, which is more reliable than time-of-day alone (Fogg, Tiny Habits;
 * Clear, Atomic Habits).
 *
 * Each anchor ships with a `defaultTime` so picking it can pre-fill a daily reminder
 * without asking the user for a clock time — they only adjust if they want to.
 *
 * `phrase` is what gets stored in `HabitActionPlan.anchor` and rendered after "After I…".
 * `label` is the short chip text shown in the picker.
 */
export interface Anchor {
  key: string;
  label: string;        // short chip text, e.g. "Morning coffee"
  phrase: string;       // completes "After I ___", e.g. "have my morning coffee"
  defaultTime: string;  // 'HH:mm', seeds the reminder when this anchor is picked
  emoji: string;
}

export const ANCHORS: Anchor[] = [
  { key: 'wake',      label: 'Wake up',      phrase: 'wake up',              defaultTime: '06:45', emoji: '☀️' },
  { key: 'am_coffee', label: 'Morning coffee', phrase: 'have my morning coffee', defaultTime: '07:30', emoji: '☕' },
  { key: 'am_teeth',  label: 'Brush teeth',  phrase: 'brush my teeth',       defaultTime: '07:15', emoji: '🪥' },
  { key: 'breakfast', label: 'Breakfast',    phrase: 'finish breakfast',     defaultTime: '08:00', emoji: '🍳' },
  { key: 'lunch',     label: 'Lunch',        phrase: 'have lunch',           defaultTime: '12:30', emoji: '🥗' },
  { key: 'home',      label: 'Get home',     phrase: 'get home from work',   defaultTime: '17:30', emoji: '🏠' },
  { key: 'dinner',    label: 'Dinner',       phrase: 'have dinner',          defaultTime: '18:30', emoji: '🍽️' },
  { key: 'bed',       label: 'Get into bed', phrase: 'get into bed',         defaultTime: '22:00', emoji: '🛏️' },
];

/** Find the curated anchor whose phrase matches a stored value (case-insensitive). */
export const findAnchorByPhrase = (phrase?: string): Anchor | undefined => {
  if (!phrase) return undefined;
  const normalized = phrase.trim().toLowerCase();
  return ANCHORS.find((a) => a.phrase.toLowerCase() === normalized);
};

/**
 * Default reminder time for a stored anchor phrase. Returns the matching curated
 * anchor's `defaultTime`, or undefined for custom/free-text anchors (e.g. event-based
 * ones like "reach a staircase") that have no natural clock time.
 */
export const defaultTimeForAnchor = (phrase?: string): string | undefined =>
  findAnchorByPhrase(phrase)?.defaultTime;
