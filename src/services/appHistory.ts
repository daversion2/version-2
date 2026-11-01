import type { CompletedMeditateSession } from '../types/meditate';
import type { CompletedWorkoutSession } from '../types/workouts';
import type { MealsDay, MealsRules } from '../types/meals';
import type { TodayAppId } from './appCheckins';
import { addDays, mealsDayState } from './homeDashboard';
import { toLocalDateString } from '../utils/date';

// =============================================================================
// APP HISTORY — Progress's "longer per-app history" (founder decision D2,
// 2026-10-31), drawn by the redesign's Progress screen as one row per app with
// a small bar chart.
//
// Rolling windows ending today, like the rest of the dashboard, so nothing
// collapses on a Monday or the 1st:
//   week       7 bars of 1 day
//   month      4 bars of 7 days
//   sixMonths  6 bars of 30 days
//
// What a bar counts, per app:
//   Meditate  minutes sat (summed seconds, rounded per bar)
//   Workouts  sessions finished
//   Meals     days on target
// =============================================================================

export type HistoryRange = 'week' | 'month' | 'sixMonths';

const SHAPE: Record<HistoryRange, { size: number; count: number; span: string }> = {
  week: { size: 1, count: 7, span: 'last 7 days' },
  month: { size: 7, count: 4, span: '4 weeks' },
  sixMonths: { size: 30, count: 6, span: '6 months' },
};

/** Days of history a range reaches back over, today included. */
export const historyDays = (range: HistoryRange): number => SHAPE[range].size * SHAPE[range].count;

export interface HistoryBucket {
  /** First and last day, inclusive. */
  start: string;
  end: string;
  value: number;
}

export interface AppHistory {
  /** Oldest first; the last one ends today. */
  buckets: HistoryBucket[];
  total: number;
  /** The row's one line, e.g. "168 min · 4 weeks". */
  line: string;
}

export const historyBuckets = (today: string, range: HistoryRange): { start: string; end: string }[] => {
  const { size, count } = SHAPE[range];
  return Array.from({ length: count }, (_, i) => {
    const end = addDays(today, -size * (count - 1 - i));
    return { start: addDays(end, -(size - 1)), end };
  });
};

export interface AppHistoryInput {
  today: string;
  meditateSessions: CompletedMeditateSession[];
  workoutSessions: CompletedWorkoutSession[];
  mealsDays: Record<string, MealsDay>;
  mealsRules: MealsRules;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const appHistory = (appId: TodayAppId, input: AppHistoryInput, range: HistoryRange): AppHistory => {
  const { today } = input;
  const bounds = historyBuckets(today, range);
  const within = (date: string, b: { start: string; end: string }) => date >= b.start && date <= b.end;

  let values: number[];
  if (appId === 'meditate') {
    values = bounds.map((b) =>
      Math.round(input.meditateSessions.filter((s) => within(s.date, b)).reduce((t, s) => t + s.duration_sec, 0) / 60)
    );
  } else if (appId === 'workouts') {
    const dates = input.workoutSessions.map((s) => toLocalDateString(new Date(s.started_at)));
    values = bounds.map((b) => dates.filter((d) => within(d, b)).length);
  } else {
    values = bounds.map((b) => {
      let on = 0;
      for (let d = b.start; d <= b.end; d = addDays(d, 1)) {
        if (mealsDayState(d, input.mealsDays[d], input.mealsRules, today) === 'on') on++;
      }
      return on;
    });
  }

  const total = values.reduce((t, v) => t + v, 0);
  const span = SHAPE[range].span;
  const line =
    appId === 'meditate'
      ? `${total} min · ${span}`
      : appId === 'workouts'
      ? `${plural(total, 'session', 'sessions')} · ${span}`
      : `${total} of ${historyDays(range)} days on target`;

  return { buckets: bounds.map((b, i) => ({ ...b, value: values[i] })), total, line };
};
