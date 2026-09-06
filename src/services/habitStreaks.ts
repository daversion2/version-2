import { HabitStreakInfo } from '../types';
import {
  Schedulable,
  addDays,
  allowedRestDays,
  daysBetween,
  dueDatesBetween,
  isDayScheduled,
} from './habitSchedule';

// =============================================================================
// STREAKS — consecutive kept obligations, not consecutive calendar days.
//
// The old rule counted calendar days: any day without a rep reset the streak to
// zero. Against this app's own scheduling model that was simply wrong. A habit
// with a 3×/week target would be reported "on pace" and "streak: 0" in the same
// breath, for a week the user had actually kept — the screen contradicted
// itself, and the number people care most about was the one that was lying.
//
// A streak now counts DAYS DONE, unbroken by a gap that matters:
//
//   DAY-SCHEDULED   every due weekday must be kept. Off days are skipped —
//                   they neither extend the streak nor break it.
//   COUNT           a gap breaks it only once it exceeds the rest the goal
//                   allows (see allowedRestDays). A 7×/week habit is still
//                   strictly every-day; a 1×/week habit can rest six days.
//
// Today is never counted as a miss: the day is not over. This mirrors the old
// "today or yesterday" grace, generalised to whatever the schedule allows.
// =============================================================================

/**
 * @param dates every date this habit was completed (YYYY-MM-DD, dupes fine)
 * @param today the local date to evaluate against
 */
export const computeStreak = (
  habit: Schedulable,
  dates: string[],
  today: string
): { currentStreak: number; longestStreak: number } => {
  // Logs dated in the future would let a backdate typo inflate a streak.
  const done = [...new Set(dates)].filter((d) => daysBetween(d, today) >= 0).sort();
  if (done.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const doneSet = new Set(done);
  const firstDone = done[0];

  if (isDayScheduled(habit)) {
    // Only days the habit was actually due count, from its first rep to today.
    // Today is dropped while it is still outstanding so a habit due today reads
    // as its streak-so-far rather than as already broken.
    const due = dueDatesBetween(habit, firstDone, today).filter(
      (d) => d !== today || doneSet.has(today)
    );

    let longestStreak = 0;
    let run = 0;
    for (const d of due) {
      run = doneSet.has(d) ? run + 1 : 0;
      longestStreak = Math.max(longestStreak, run);
    }
    // The trailing run IS the current streak: the walk ended at the most recent
    // settled due day.
    return { currentStreak: run, longestStreak };
  }

  const allowed = allowedRestDays(habit);

  let run = 1;
  let longestStreak = 1;
  for (let i = 1; i < done.length; i++) {
    // Days fully skipped between the two reps — the gap, not the span.
    const rest = daysBetween(done[i - 1], done[i]) - 1;
    run = rest <= allowed ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
  }

  // Rest taken since the last rep, EXCLUDING today — an unfinished day is not
  // yet a missed one.
  const restSinceLast = daysBetween(done[done.length - 1], today) - 1;
  const currentStreak = restSinceLast <= allowed ? run : 0;

  return { currentStreak, longestStreak };
};

/** computeStreak in the shape the rest of the app already passes around. */
export const streakInfo = (
  habitId: string,
  habit: Schedulable,
  dates: string[],
  today: string
): HabitStreakInfo => ({ habitId, ...computeStreak(habit, dates, today) });

/**
 * The next day this habit is due after `from`, or undefined for a count habit
 * (whose next chance is always tomorrow). Powers "back on Wednesday" copy.
 */
export const nextDueDate = (habit: Schedulable, from: string): string | undefined => {
  if (!isDayScheduled(habit)) return undefined;
  for (let i = 1; i <= 7; i++) {
    const candidate = addDays(from, i);
    if (dueDatesBetween(habit, candidate, candidate).length) return candidate;
  }
  return undefined;
};
