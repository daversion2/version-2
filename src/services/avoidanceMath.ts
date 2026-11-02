import type { AvoidanceTask, Level } from '../types/avoidance';
import type { AvoidanceTask as OldAvoidanceTask } from '../types';
import { MAX_TASK_LENGTH } from '../data/avoidance';
import { weekStreak } from './homeDashboard';
import { addDays, daysBetween } from './habitSchedule';
import { getWeekStart, toLocalDateString } from '../utils/date';

// =============================================================================
// AVOIDANCE TRAINING — every rule the app follows, pure so it can be tested.
// Spec: docs/micro-apps/avoidance.md.
// =============================================================================

/** Days from when it was added to when it was cleared — or to today, while open. */
export const daysAvoided = (task: AvoidanceTask, today: string): number =>
  Math.max(0, daysBetween(task.created_date, task.status === 'done' && task.done_date ? task.done_date : today));

/** "Added today", "Avoided for 1 day", "Avoided for 23 days". */
export const describeAvoided = (days: number): string =>
  days === 0 ? 'Added today' : `Avoided for ${days} ${days === 1 ? 'day' : 'days'}`;

/** Still avoiding: oldest first; on the same day, the one you dread more first. */
export const openTasks = (tasks: AvoidanceTask[]): AvoidanceTask[] =>
  tasks
    .filter((t) => t.status === 'open')
    .sort(
      (a, b) =>
        a.created_date.localeCompare(b.created_date) ||
        (b.forecast ?? 0) - (a.forecast ?? 0) ||
        a.created_at.localeCompare(b.created_at)
    );

/** Today's rep: the one avoided longest that you haven't passed over just now. */
export const todaysRep = (open: AvoidanceTask[], passed: string[]): AvoidanceTask | null =>
  open.find((t) => !passed.includes(t.id)) ?? null;

/** The cleared log: newest first. */
export const clearedTasks = (tasks: AvoidanceTask[]): AvoidanceTask[] =>
  tasks
    .filter((t) => t.status === 'done')
    .sort((a, b) => (b.done_date ?? '').localeCompare(a.done_date ?? '') || (b.done_at ?? '').localeCompare(a.done_at ?? ''));

const mondayOf = (date: string): string => toLocalDateString(getWeekStart(new Date(date + 'T00:00:00')));

export interface WeekSummary {
  cleared: number;
  goal: number;
  met: boolean;
}

/** Cleared this Monday-start week, against the goal. */
export const weekSummary = (tasks: AvoidanceTask[], today: string, goal: number): WeekSummary => {
  const start = mondayOf(today);
  const end = addDays(start, 6);
  const cleared = tasks.filter((t) => t.status === 'done' && t.done_date && t.done_date >= start && t.done_date <= end).length;
  return { cleared, goal, met: cleared >= goal };
};

/** Weeks in a row that met the goal; this week never breaks it. */
export const streakWeeks = (tasks: AvoidanceTask[], today: string, goal: number): number =>
  weekStreak(
    tasks.filter((t) => t.status === 'done' && t.done_date).map((t) => t.done_date!),
    goal,
    today
  );

// --- Dread vs reality --------------------------------------------------------

export type Outcome = 'easier' | 'as_expected' | 'harder';

/** How starting compared with what you expected. Null without both ratings. */
export const outcome = (forecast?: Level, actual?: Level): Outcome | null => {
  if (!forecast || !actual) return null;
  return actual < forecast ? 'easier' : actual > forecast ? 'harder' : 'as_expected';
};

export const OUTCOME_LABEL: Record<Outcome, string> = {
  easier: 'Easier than you feared',
  as_expected: 'About what you expected',
  harder: 'Harder than you expected',
};

export interface DreadVsReality {
  easier: number;
  as_expected: number;
  harder: number;
  /** Cleared tasks with both a forecast and a rating. */
  rated: number;
}

/** Over cleared tasks with both ratings, optionally only those cleared on or after `from`. */
export const dreadVsReality = (tasks: AvoidanceTask[], from?: string): DreadVsReality => {
  const out: DreadVsReality = { easier: 0, as_expected: 0, harder: 0, rated: 0 };
  for (const t of tasks) {
    if (t.status !== 'done' || (from && (t.done_date ?? '') < from)) continue;
    const o = outcome(t.forecast, t.resistance);
    if (!o) continue;
    out[o]++;
    out.rated++;
  }
  return out;
};

/** How many cleared, and how long they'd been avoided on average (whole days). */
export const clearedStats = (tasks: AvoidanceTask[]): { count: number; avgDaysAvoided: number | null } => {
  const done = tasks.filter((t) => t.status === 'done' && t.done_date);
  if (done.length === 0) return { count: 0, avgDaysAvoided: null };
  const total = done.reduce((n, t) => n + daysBetween(t.created_date, t.done_date!), 0);
  return { count: done.length, avgDaysAvoided: Math.round(total / done.length) };
};

// --- Input -------------------------------------------------------------------

/** One clean line, or null when there's nothing to add. */
export const cleanTaskText = (text: string): string | null => {
  const one = text.replace(/\s+/g, ' ').trim();
  return one ? one.slice(0, MAX_TASK_LENGTH) : null;
};

// --- The old Avoidance Training (archived Training tab) ----------------------

/**
 * Every old id already brought over: the ones remembered in prefs, plus any a
 * task still carries (brought over before prefs remembered them).
 */
export const importedIds = (tasks: AvoidanceTask[], remembered: string[] = []): string[] => [
  ...new Set([...remembered, ...tasks.flatMap((t) => (t.imported_from ? [t.imported_from] : []))]),
];

/**
 * The old list's open tasks not brought over yet. Once brought over, a task
 * never comes back — not even after it's deleted here.
 */
export const notYetImported = (
  old: OldAvoidanceTask[],
  tasks: AvoidanceTask[],
  remembered: string[] = []
): OldAvoidanceTask[] => {
  const done = new Set(importedIds(tasks, remembered));
  return old.filter((o) => o.status === 'active' && !done.has(o.id) && cleanTaskText(o.text));
};

/**
 * The old list's open tasks that haven't been brought over yet, as new tasks
 * that keep their original added date — how long you've avoided them is the
 * point. Its cleared ones have no ratings, so they stay behind.
 */
export const importable = (
  old: OldAvoidanceTask[],
  tasks: AvoidanceTask[],
  newId: () => string,
  now: Date = new Date(),
  /** prefs.imported_ids. */
  remembered: string[] = []
): AvoidanceTask[] =>
  notYetImported(old, tasks, remembered).map((o) => {
    // A missing or unreadable date counts from now, rather than as "NaN days".
    const added = new Date(o.createdAt);
    const when = Number.isNaN(added.getTime()) ? now : added;
    return {
      id: newId(),
      text: cleanTaskText(o.text)!,
      created_at: when.toISOString(),
      created_date: toLocalDateString(when),
      status: 'open' as const,
      imported_from: o.id,
    };
  });

/** "Today", "Yesterday", or "Mon 27 Oct": when something was cleared. */
export const dayLabel = (date: string, today: string): string => {
  if (date === today) return 'Today';
  if (date === addDays(today, -1)) return 'Yesterday';
  return new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
};
