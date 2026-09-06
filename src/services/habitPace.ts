import { CompletionLog, PracticeInstance } from '../types';
import {
  Schedulable,
  describeSchedule,
  dueDatesBetween,
  isDayScheduled,
  isDueOn,
} from './habitSchedule';

// =============================================================================
// HABIT PACE — "where does this habit stand this week?"
//
// Two schedules, two questions, one answer shape:
//
//   COUNT ("4× a week")     is this ON PACE? How much of the week has gone,
//                           and how much of the target is done.
//   DAYS ("Mon, Wed, Fri")  is this DUE, and did I miss one? A day-scheduled
//                           habit knows exactly which days it owed, so pace
//                           stops being an estimate and becomes a fact.
//
// Both produce a HabitPace with the same status vocabulary, so every consumer —
// the Today row, the hero glance, the sort — works on either without branching.
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
  /** Pinned to specific weekdays rather than a weekly count. */
  dayScheduled: boolean;
  /**
   * Owed today and not yet done. Always false for a count habit — any day is a
   * legitimate day for one, so nothing is ever specifically owed today.
   */
  dueToday: boolean;
  /** Due days already gone this week without a rep. Day-scheduled habits only. */
  missed: number;
  /** One line describing the schedule, e.g. "Mon, Wed & Fri" or "4× a week". */
  scheduleLabel: string;
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

/**
 * Classify one day-scheduled habit's week.
 *
 * No pace estimate and no tolerance, because none is needed: the habit named its
 * days, so a day that has ended without a rep is a MISS, not a projection. Today
 * is never a miss — the day isn't over — it's just due.
 */
export const classifyScheduledPace = (
  habit: Schedulable,
  doneDates: string[],
  todayStr: string
): {
  status: PaceStatus;
  target: number;
  remaining: number;
  daysLeft: number;
  urgency: number;
  missed: number;
  dueToday: boolean;
} => {
  const weekStart = mondayOf(todayStr);
  const weekEnd = addDays(weekStart, 6);
  const done = new Set(doneDates);

  const dueThisWeek = dueDatesBetween(habit, weekStart, weekEnd);
  // Settled days: due days already behind us. Today is still live.
  const settled = dueThisWeek.filter((d) => d < todayStr);
  const missed = settled.filter((d) => !done.has(d)).length;
  // Everything still winnable — today included, and today counts as outstanding
  // only while it is unlogged.
  const outstanding = dueThisWeek.filter((d) => d >= todayStr && !done.has(d));

  const daysLeft = 7 - dayIndexInWeek(todayStr) + 1;
  const dueToday = isDueOn(habit, todayStr) && !done.has(todayStr);

  const status: PaceStatus =
    missed > 0 ? 'behind' : outstanding.length === 0 ? 'done' : 'on_pace';

  return {
    status,
    target: dueThisWeek.length,
    remaining: outstanding.length,
    daysLeft,
    // Missed days are the pressure; a day owed today outranks one owed Friday.
    urgency: missed + (dueToday ? 1 : 0) + outstanding.length / Math.max(1, daysLeft),
    missed,
    dueToday,
  };
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
    .map((habit): HabitPace => {
      const inWeek = logs.filter(
        (l) => l.reference_id === habit.id && l.date >= weekStart && l.date <= weekEnd
      );
      // Distinct DAYS — two reps in one day is one day of the weekly target.
      const doneDates = [...new Set(inWeek.map((l) => l.date))].sort();
      const completed = doneDates.length;
      const dayScheduled = isDayScheduled(habit);
      const scheduleLabel = describeSchedule(habit);

      if (dayScheduled) {
        const scheduled = classifyScheduledPace(habit, doneDates, todayStr);
        return {
          habitId: habit.id,
          target: scheduled.target,
          // A rep on an off day is a bonus, and it belongs in the week's count —
          // but it can't fill a pip for a day that was never kept, so the count
          // shown never exceeds what was asked for.
          completed: Math.min(completed, scheduled.target),
          doneDates,
          isDone: scheduled.status === 'done',
          remaining: scheduled.remaining,
          daysLeft: scheduled.daysLeft,
          status: scheduled.status,
          urgency: scheduled.urgency,
          doneToday: doneDates.includes(todayStr),
          dayScheduled,
          dueToday: scheduled.dueToday,
          missed: scheduled.missed,
          scheduleLabel,
        };
      }

      const target = habit.target_count_per_week ?? 0;
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
        dayScheduled,
        // Nothing is owed TODAY specifically when the days are yours to pick.
        dueToday: false,
        missed: 0,
        scheduleLabel,
      };
    })
    .sort((a, b) => {
      const byStatus = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (byStatus !== 0) return byStatus;
      // A habit that named today and hasn't been done outranks one that merely
      // could be done today — it is the only kind with a deadline.
      const byDue = Number(b.dueToday) - Number(a.dueToday);
      if (byDue !== 0) return byDue;
      // Then the most pressing first — reps needed per day left, then raw reps
      // outstanding as a tiebreak.
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
