import {
  Schedulable,
  addDays,
  daysBetween,
  dueDatesBetween,
  isDayScheduled,
  weeklyTarget,
} from './habitSchedule';

// =============================================================================
// ADHERENCE — "of the days this habit asked for, how many did I keep?"
//
// The one number a habit tracker owes you and this app never showed. Totals,
// records and trends all answer "how much" — none of them answer "how reliably",
// and reliability is the thing a weekly target is a promise about.
//
// What counts as DUE depends on the schedule:
//
//   DAY-SCHEDULED   the due weekdays themselves. A rep on an off day is a bonus
//                   — welcome, but not evidence you kept Monday.
//   COUNT           target × weeks elapsed, prorated over partial weeks.
//
// Today is excluded until it is done, for the same reason streaks exclude it:
// an unfinished day is not a missed one, and a metric that dips every morning
// and recovers every evening is noise.
//
// Deliberately capped at 100%: over-delivery is real and worth seeing, but not
// here. "130% adherent" is not a sentence about reliability.
// =============================================================================

export interface Adherence {
  /** Due days kept. */
  kept: number;
  /** Days the habit asked for over the counted span. */
  due: number;
  /** 0–100, or null when the habit hasn't been due yet — nothing to divide by. */
  rate: number | null;
  /** First day counted. */
  from: string;
  /** Last day counted — today once it's done, otherwise yesterday. */
  to: string;
  /** Days the counted span actually covers. Shorter than the window for a new habit. */
  days: number;
}

const EMPTY = (from: string, to: string): Adherence => ({
  kept: 0,
  due: 0,
  rate: null,
  from,
  to,
  days: 0,
});

export interface AdherenceOptions {
  /** How far back to look. Omit for all time (bounded by `startedOn`). */
  windowDays?: number;
  /**
   * When the habit started — its creation date, or its first rep for instances
   * created before creation dates were recorded. Without it a habit adopted
   * yesterday would be judged against a month of days it was never asked about.
   */
  startedOn?: string;
}

/**
 * @param dates every date this habit was completed (YYYY-MM-DD, dupes fine)
 * @param today the local date to evaluate against
 */
export const buildAdherence = (
  habit: Schedulable,
  dates: string[],
  today: string,
  { windowDays, startedOn }: AdherenceOptions = {}
): Adherence => {
  const done = [...new Set(dates)].filter((d) => daysBetween(d, today) >= 0).sort();
  const doneSet = new Set(done);

  // An outstanding today isn't a miss yet, so the counted span stops yesterday
  // until the habit is done.
  const to = doneSet.has(today) ? today : addDays(today, -1);

  // The habit can't be judged before it existed. Fall back to its first rep,
  // then to the window itself.
  const earliest = startedOn ?? done[0];
  const windowStart = windowDays ? addDays(today, -(windowDays - 1)) : earliest;
  if (!windowStart) return EMPTY(today, to);
  const from = earliest && daysBetween(earliest, windowStart) < 0 ? earliest : windowStart;

  const days = daysBetween(from, to) + 1;
  if (days <= 0) return EMPTY(from, to);

  if (isDayScheduled(habit)) {
    const due = dueDatesBetween(habit, from, to);
    const kept = due.filter((d) => doneSet.has(d)).length;
    return {
      kept,
      due: due.length,
      rate: due.length ? Math.min(100, Math.round((kept / due.length) * 100)) : null,
      from,
      to,
      days,
    };
  }

  const target = weeklyTarget(habit);
  if (target <= 0) return EMPTY(from, to);

  // Prorated so a habit two days old isn't measured against a full week.
  const due = Math.max(1, Math.round((target * days) / 7));
  const kept = done.filter((d) => d >= from && d <= to).length;

  return {
    kept,
    due,
    rate: Math.min(100, Math.round((kept / due) * 100)),
    from,
    to,
    days,
  };
};

/** Plain-language read on a rate, for the line under the number. */
export const describeAdherence = (rate: number | null): string => {
  if (rate === null) return 'Not enough history yet';
  if (rate >= 90) return 'Rock solid';
  if (rate >= 75) return 'Holding well';
  if (rate >= 50) return 'Slipping — most weeks, not most days';
  return 'Not really happening yet';
};
