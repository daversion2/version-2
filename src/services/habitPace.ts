import { CompletionLog, PracticeInstance } from '../types';

// =============================================================================
// HABIT PACE — "am I on track for this week's target?"
//
// Habits carry a WEEKLY target, not assigned days, so Today can't ask "is this
// due?". It asks "is this on pace?" instead: how much of the week has gone, and
// how much of the target is done.
//
// Pure functions, no Firestore — the pace rule is the sort order of the main
// screen, so it needs to be provable rather than eyeballed.
// =============================================================================

/**
 * 'no_target' is its own state, NOT a kind of done. Curated practices are seeded
 * with target_count_per_week: 0 meaning "no weekly goal set yet", and treating
 * zero remaining as finished rendered every one of them dimmed and labelled
 * "Target hit" before the user had done anything.
 */
export type PaceStatus = 'done' | 'on_pace' | 'behind' | 'no_target';

export interface HabitPace {
  habitId: string;
  target: number;
  completed: number;
  /** Distinct days this habit was logged this week, ascending. */
  doneDates: string[];
  /** True when the weekly target is already met or beaten. */
  isDone: boolean;
  /** Reps still needed to hit target. 0 once done. */
  remaining: number;
  /** Days left in the week INCLUDING today. */
  daysLeft: number;
  status: PaceStatus;
  /**
   * How pressing this is, for ordering within 'behind': reps still needed per
   * day remaining. Higher sorts first. Purely a sort key — it never claims the
   * target is unreachable, because a habit can be done more than once a day.
   */
  urgency: number;
  /** Logged today already? Drives the row's done state. */
  doneToday: boolean;
}

const toDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toDateStr(d);
};

export const mondayOf = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  return toDateStr(d);
};

/** 1 on Monday … 7 on Sunday. */
export const dayIndexInWeek = (dateStr: string): number => {
  const dow = new Date(dateStr + 'T00:00:00').getDay();
  return dow === 0 ? 7 : dow;
};

/**
 * Classify one habit's week.
 *
 * THE PACE RULE: expected progress is target × (days elapsed ÷ 7), and a habit
 * is only "behind" once it is a FULL REP short of that — not a fraction of one.
 * Without that tolerance a 4x/week habit would be declared behind on Monday
 * evening for the crime of not having done 0.57 of a rep, and the whole screen
 * would read as failure every Monday morning.
 *
 * There is deliberately NO "can't reach the target" state. It would have to
 * assume a habit can be done at most once a day, which is not true — someone
 * three short on Saturday can do three on Sunday. Being further behind changes
 * how urgently the row sorts, never whether the week is still winnable.
 */
export const classifyPace = (
  target: number,
  completed: number,
  todayStr: string
): { status: PaceStatus; remaining: number; daysLeft: number; urgency: number } => {
  const remaining = Math.max(0, target - completed);
  const dayIndex = dayIndexInWeek(todayStr);
  const daysLeft = 7 - dayIndex + 1; // includes today
  const urgency = remaining / Math.max(1, daysLeft);

  // No goal set — nothing to be on pace against, and emphatically not "done".
  if (target <= 0) return { status: 'no_target', remaining: 0, daysLeft, urgency: 0 };
  if (remaining === 0) return { status: 'done', remaining, daysLeft, urgency: 0 };

  const expected = (target * dayIndex) / 7;
  // A full rep behind, not a fraction of one.
  const status: PaceStatus = completed + 1 <= expected ? 'behind' : 'on_pace';
  return { status, remaining, daysLeft, urgency };
};

/** Sort weight — the order Today uses. Lower sorts first. */
const STATUS_ORDER: Record<PaceStatus, number> = {
  behind: 0,
  on_pace: 1,
  // Above 'done': a habit with no goal is still outstanding work, just untracked.
  no_target: 2,
  done: 3,
};

/**
 * Build the Today list: one entry per active habit, sorted so what needs
 * attention rises and finished habits sink.
 *
 * `logs` should be nudge completion logs covering at least the current week.
 */
export const buildTodayList = (
  habits: PracticeInstance[],
  logs: CompletionLog[],
  todayStr: string
): HabitPace[] => {
  const weekStart = mondayOf(todayStr);
  const weekEnd = addDays(weekStart, 6);

  return habits
    .filter((h) => h.is_active)
    .map((habit) => {
      const inWeek = logs.filter(
        (l) => l.reference_id === habit.id && l.date >= weekStart && l.date <= weekEnd
      );
      // Distinct DAYS — two reps in one day is one day of the weekly target.
      const doneDates = [...new Set(inWeek.map((l) => l.date))].sort();
      const target = habit.target_count_per_week ?? 0;
      const completed = doneDates.length;
      const { status, remaining, daysLeft, urgency } = classifyPace(target, completed, todayStr);

      return {
        habitId: habit.id,
        target,
        completed,
        doneDates,
        isDone: status === 'done',
        remaining,
        daysLeft,
        status,
        urgency,
        doneToday: doneDates.includes(todayStr),
      };
    })
    .sort((a, b) => {
      const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (byStatus !== 0) return byStatus;
      // Within a status, the most pressing first — reps needed per day left,
      // then raw reps outstanding as a tiebreak.
      return b.urgency - a.urgency || b.remaining - a.remaining;
    });
};

export interface WeekGlance {
  /** Habits meeting or ahead of pace, including finished ones. */
  onPace: number;
  /** Habits WITH a weekly goal. Habits without one can't be on or off pace. */
  total: number;
  /** Habits currently behind pace. */
  behind: number;
  /** Habits with no weekly goal set — tracked, but not measured against anything. */
  untracked: number;
}

/** The hero line: how many habits are on pace this week. */
export const buildWeekGlance = (paces: HabitPace[]): WeekGlance => {
  // Habits with no goal are excluded from the denominator rather than counted as
  // failures — "2 of 8 on pace" would be a lie when 6 of them have no target.
  const tracked = paces.filter((p) => p.status !== 'no_target');
  return {
    onPace: tracked.filter((p) => p.status === 'on_pace' || p.status === 'done').length,
    total: tracked.length,
    behind: tracked.filter((p) => p.status === 'behind').length,
    untracked: paces.length - tracked.length,
  };
};
