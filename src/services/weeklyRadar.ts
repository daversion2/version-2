import { CompletionLog } from '../types';
import { getWeekDates, toLocalDateString } from '../utils/date';

// =============================================================================
// WEEKLY RADAR — the current week as one shape, by day.
//
// Feeds the radar on Progress. Two metrics, one geometry:
//
//   HABITS  how many habits you completed that day
//   XP      what those completions were worth — difficulty × streak multiplier,
//           already baked into CompletionLog.points by willpower.ts
//
// HABITS ONLY. Challenge and program logs are excluded deliberately: this chart
// is about the daily habit loop, so a challenge completed on Thursday must not
// inflate Thursday's habit count. That makes the totals here DIFFER from the
// Completions/XP hero stats at the top of the same screen, which count
// everything — a difference worth knowing about if the two are ever compared.
//
// Pure functions, no Firestore. The screen already holds every log in memory for
// the selected window, and the smallest window (7d) always covers the elapsed
// part of the current week, so switching metric is instant and costs no read.
// =============================================================================

export type WeekMetric = 'habits' | 'xp';

export interface RadarDay {
  /** 'Mon' … 'Sun'. */
  label: string;
  date: string;
  /** Habits completed, or XP earned. Zero is a real answer — see below. */
  value: number;
  isToday: boolean;
  /** Later this week. Not plotted, and kept out of the max and the average. */
  isFuture: boolean;
}

export interface WeekRadar {
  metric: WeekMetric;
  /** Seven days, Monday first. */
  days: RadarDay[];
  /**
   * The week's best day, which is what the outer ring represents. Zero when
   * nothing has been logged — callers must treat that as the empty state rather
   * than dividing by it.
   */
  max: number;
  /** Mean across ELAPSED days only. The dashed reference ring. */
  average: number;
  total: number;
  /** The day that set `max`, or null on an empty week. */
  best: RadarDay | null;
  /** Elapsed days strictly above `average`. */
  aboveAverage: number;
  /** Days of the week that have actually happened, today included. */
  elapsed: number;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * A habit rep. Challenges, programs and craving logs are not habits — see the
 * header — and 'nudge' is what a habit completion has always been called in
 * this collection.
 */
const isHabitRep = (log: CompletionLog): boolean => log.type === 'nudge';

const valueOf = (logs: CompletionLog[], metric: WeekMetric): number =>
  metric === 'habits'
    ? logs.length
    : logs.reduce((sum, l) => sum + (typeof l.points === 'number' ? l.points : 0), 0);

/**
 * Build the week's shape for one metric.
 *
 * A DAY WITH NOTHING ON IT SCORES ZERO AND IS PLOTTED AT THE CENTRE. This is the
 * opposite of what the reflection version of this chart did, and deliberately:
 * an unanswered reflection was an ABSENCE of data, so plotting it at the centre
 * would have invented the worst possible answer. "You completed no habits on
 * Tuesday" is not an absence — it is the answer. Hiding it would flatter the
 * week by drawing a shape through only the good days.
 *
 * Future days are the genuine absence here, and those are excluded from
 * everything: not plotted, not in the max, not in the average. Judging Monday
 * against a week that has not happened yet would push every average down to
 * nothing by Tuesday.
 *
 * @param today Injectable so the geometry is testable without freezing the clock.
 */
export const buildWeekRadar = (
  logs: CompletionLog[],
  metric: WeekMetric,
  today: string = toLocalDateString(new Date())
): WeekRadar => {
  const dates = getWeekDates(new Date(`${today}T00:00:00`));

  const byDate = new Map<string, CompletionLog[]>();
  logs.filter(isHabitRep).forEach((log) => {
    const list = byDate.get(log.date);
    if (list) list.push(log);
    else byDate.set(log.date, [log]);
  });

  const days: RadarDay[] = dates.map((date, i) => ({
    label: DAY_LABELS[i],
    date,
    value: valueOf(byDate.get(date) ?? [], metric),
    isToday: date === today,
    isFuture: date > today,
  }));

  const elapsedDays = days.filter((d) => !d.isFuture);
  const values = elapsedDays.map((d) => d.value);
  const max = values.length ? Math.max(...values) : 0;
  const total = values.reduce((s, v) => s + v, 0);
  const average = elapsedDays.length ? total / elapsedDays.length : 0;

  // The EARLIEST day holding the max, so a tie reads left-to-right rather than
  // jumping to the end of the week for no reason the user can see.
  const best = max > 0 ? elapsedDays.find((d) => d.value === max) ?? null : null;

  return {
    metric,
    days,
    max,
    average,
    total,
    best,
    aboveAverage: elapsedDays.filter((d) => d.value > average).length,
    elapsed: elapsedDays.length,
  };
};

/**
 * How far out to plot a value, as a fraction of the outer ring.
 *
 * Relative to the week's own best day, so the shape always fills the chart. The
 * cost, worth stating: the same shape means different things in different weeks
 * — a full-looking week of ones and a full-looking week of tens draw the same
 * outline. The footer stats carry the absolute numbers for exactly that reason.
 */
export const radiusFactor = (value: number, max: number): number => {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(1, value / max));
};

/** "6 habits" / "1 habit" / "120 XP" — the absolute number, spelled out. */
export const formatRadarValue = (value: number, metric: WeekMetric): string => {
  if (metric === 'xp') return `${Math.round(value).toLocaleString()} XP`;
  const n = Math.round(value);
  return `${n} ${n === 1 ? 'habit' : 'habits'}`;
};
