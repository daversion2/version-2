import { computeStreak, nextDueDate } from '../habitStreaks';
import { Schedulable } from '../habitSchedule';

// Week of Mon 2026-08-24 .. Sun 2026-08-30.
const MON = '2026-08-24';
const TUE = '2026-08-25';
const WED = '2026-08-26';
const THU = '2026-08-27';
const FRI = '2026-08-28';
const SAT = '2026-08-29';
const SUN = '2026-08-30';

const count = (target: number): Schedulable => ({ target_count_per_week: target });
/** Mon/Wed/Fri. Weekdays are JS-style: 0 = Sunday. */
const mwf: Schedulable = { scheduled_days: [1, 3, 5], target_count_per_week: 3 };

describe('count-scheduled streaks', () => {
  // THE BUG THIS FIXES: a 3×/week habit lost its streak on every off day, so
  // Today said "on pace" and "streak: 0" about the same kept week.
  it('survives the rest days its own target allows', () => {
    // Mon, Wed, Fri — a textbook 3×/week week, two rest days in the middle.
    const result = computeStreak(count(3), [MON, WED, FRI], FRI);
    expect(result.currentStreak).toBe(3);
  });

  it('still breaks once the gap exceeds what the goal allows', () => {
    // 5×/week allows 2 rest days. Mon → Fri is 3 skipped days.
    expect(computeStreak(count(5), [MON, FRI], FRI).currentStreak).toBe(1);
  });

  it('keeps the every-single-day rule for a daily habit', () => {
    expect(computeStreak(count(7), [MON, TUE, WED], WED).currentStreak).toBe(3);
    expect(computeStreak(count(7), [MON, WED], WED).currentStreak).toBe(1);
  });

  it('treats a habit with no goal strictly, having nothing to be lenient against', () => {
    expect(computeStreak(count(0), [MON, WED], WED).currentStreak).toBe(1);
  });

  it('does not break for a day that is not over yet', () => {
    // Done yesterday, nothing logged today: the streak stands, on every target.
    expect(computeStreak(count(7), [MON, TUE], WED).currentStreak).toBe(2);
  });

  it('goes cold once the allowance is spent', () => {
    // 1×/week allows six rest days; the seventh is a broken promise.
    expect(computeStreak(count(1), [MON], SUN).currentStreak).toBe(1);
    expect(computeStreak(count(1), [MON], '2026-09-01').currentStreak).toBe(0);
  });

  it('remembers the longest run even after the current one breaks', () => {
    const dates = [MON, TUE, WED, FRI]; // 3 in a row, then a 1-day gap
    const result = computeStreak(count(7), dates, FRI);
    expect(result.longestStreak).toBe(3);
    expect(result.currentStreak).toBe(1);
  });

  it('counts a day once however many reps it holds', () => {
    expect(computeStreak(count(7), [MON, MON, TUE], TUE).currentStreak).toBe(2);
  });

  it('ignores logs dated in the future, so a backdate typo cannot inflate it', () => {
    expect(computeStreak(count(7), [MON, TUE, '2026-12-25'], TUE).currentStreak).toBe(2);
  });

  it('reports nothing for a habit that has never been done', () => {
    expect(computeStreak(count(3), [], WED)).toEqual({ currentStreak: 0, longestStreak: 0 });
  });
});

describe('day-scheduled streaks', () => {
  it('skips the days it never asked for', () => {
    // Mon/Wed/Fri kept exactly. The four off days neither extend nor break it.
    expect(computeStreak(mwf, [MON, WED, FRI], FRI).currentStreak).toBe(3);
  });

  it('breaks on a missed day it did ask for', () => {
    expect(computeStreak(mwf, [MON, FRI], FRI).currentStreak).toBe(1);
  });

  it('does not count today as missed while the day is still going', () => {
    // Friday is due and not yet done — Monday and Wednesday still stand.
    expect(computeStreak(mwf, [MON, WED], FRI).currentStreak).toBe(2);
  });

  it('is unmoved by a rep on an off day', () => {
    // Tuesday is a bonus, not evidence that Wednesday was kept.
    expect(computeStreak(mwf, [MON, TUE], WED).currentStreak).toBe(1);
  });

  it('counts across weeks, not within them', () => {
    const lastWeek = ['2026-08-17', '2026-08-19', '2026-08-21']; // Mon/Wed/Fri
    expect(computeStreak(mwf, [...lastWeek, MON, WED], WED).currentStreak).toBe(5);
  });

  it('keeps the longest run after a break', () => {
    const dates = ['2026-08-17', '2026-08-19', '2026-08-21', WED, FRI]; // missed Mon 24
    const result = computeStreak(mwf, dates, FRI);
    expect(result.longestStreak).toBe(3);
    expect(result.currentStreak).toBe(2);
  });

  it('goes cold when the last due day was missed', () => {
    // Friday came and went unkept; Saturday is not due, so nothing rescues it.
    expect(computeStreak(mwf, [MON, WED], SAT).currentStreak).toBe(0);
  });
});

describe('nextDueDate', () => {
  it('names the next day a scheduled habit is owed', () => {
    expect(nextDueDate(mwf, MON)).toBe(WED);
    expect(nextDueDate(mwf, FRI)).toBe('2026-08-31'); // the following Monday
  });

  it('has nothing to name for a count habit — every day is a chance', () => {
    expect(nextDueDate(count(3), MON)).toBeUndefined();
  });
});
