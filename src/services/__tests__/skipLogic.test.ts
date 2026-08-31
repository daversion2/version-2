import {
  findShortfalls,
  buildPendingReview,
  buildSkipPatterns,
  lastClosedWeek,
  mondayOf,
  REVIEW_CAP,
  MIN_MISSES_FOR_SPLIT,
} from '../skipLogic';
import { CompletionLog, PracticeInstance, SkipLog } from '../../types';

// 2026-08-30 is a Sunday, so the current week is Aug 24–30 and the last CLOSED
// week is Aug 17–23.
const TODAY = '2026-08-30';
const LAST_WEEK_START = '2026-08-17';
const LAST_WEEK_END = '2026-08-23';

const habit = (over: Partial<PracticeInstance> & { id: string }): PracticeInstance =>
  ({
    user_id: 'u1',
    name: over.id,
    is_active: true,
    created_by_user: false,
    target_count_per_week: 3,
    ...over,
  }) as PracticeInstance;

let n = 0;
const log = (habitId: string, date: string): CompletionLog =>
  ({
    id: `l${++n}`,
    user_id: 'u1',
    type: 'nudge',
    reference_id: habitId,
    points: 1,
    difficulty: 1,
    date,
  }) as CompletionLog;

const skip = (over: Partial<SkipLog>): SkipLog =>
  ({
    id: `s${++n}`,
    user_id: 'u1',
    habit_id: 'h1',
    week_start: LAST_WEEK_START,
    missed_count: 1,
    reason_id: 'dreaded',
    reason_kind: 'internal',
    created_at: '2026-08-24T10:00:00Z',
    ...over,
  }) as SkipLog;

describe('week boundaries', () => {
  it('anchors weeks to Monday', () => {
    expect(mondayOf('2026-08-30')).toBe('2026-08-24'); // Sunday -> that Monday
    expect(mondayOf('2026-08-24')).toBe('2026-08-24'); // Monday -> itself
  });

  it('reviews the last CLOSED week, never the current one', () => {
    // The current week isn't over, so "fell short" is not yet a fact.
    expect(lastClosedWeek(TODAY)).toEqual({ start: LAST_WEEK_START, end: LAST_WEEK_END });
  });
});

describe('findShortfalls', () => {
  it('reports a habit that fell short of its weekly target', () => {
    const result = findShortfalls(
      [habit({ id: 'h1', name: 'Cold', target_count_per_week: 4 })],
      [log('h1', '2026-08-18'), log('h1', '2026-08-20')],
      LAST_WEEK_START,
      LAST_WEEK_END
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ habitId: 'h1', target: 4, completed: 2, missed: 2 });
    expect(result[0].doneDates).toEqual(['2026-08-18', '2026-08-20']);
  });

  it('reports nothing when the target was met', () => {
    const result = findShortfalls(
      [habit({ id: 'h1', target_count_per_week: 2 })],
      [log('h1', '2026-08-18'), log('h1', '2026-08-20')],
      LAST_WEEK_START,
      LAST_WEEK_END
    );
    expect(result).toEqual([]);
  });

  it('reports nothing when the target was exceeded', () => {
    const result = findShortfalls(
      [habit({ id: 'h1', target_count_per_week: 2 })],
      [log('h1', '2026-08-18'), log('h1', '2026-08-19'), log('h1', '2026-08-20')],
      LAST_WEEK_START,
      LAST_WEEK_END
    );
    expect(result).toEqual([]);
  });

  it('counts distinct DAYS, not logs — two reps in one day is one day', () => {
    // Counting both would hide a real shortfall.
    const result = findShortfalls(
      [habit({ id: 'h1', target_count_per_week: 2 })],
      [log('h1', '2026-08-18'), log('h1', '2026-08-18')],
      LAST_WEEK_START,
      LAST_WEEK_END
    );
    expect(result[0].completed).toBe(1);
    expect(result[0].missed).toBe(1);
  });

  it('ignores logs outside the week on both sides', () => {
    const result = findShortfalls(
      [habit({ id: 'h1', target_count_per_week: 2 })],
      [
        log('h1', '2026-08-16'), // day before the week
        log('h1', '2026-08-24'), // day after the week
      ],
      LAST_WEEK_START,
      LAST_WEEK_END
    );
    expect(result[0].completed).toBe(0);
    expect(result[0].missed).toBe(2);
  });

  it('counts a backdated log in the week it was FOR', () => {
    // Filters on `date`, not `completed_at` — a rep logged late still belongs to
    // the day it happened.
    const backdated = { ...log('h1', '2026-08-18'), completed_at: '2026-08-29T09:00:00Z' };
    const result = findShortfalls(
      [habit({ id: 'h1', target_count_per_week: 1 })],
      [backdated],
      LAST_WEEK_START,
      LAST_WEEK_END
    );
    expect(result).toEqual([]);
  });

  it('ignores other habits’ logs', () => {
    const result = findShortfalls(
      [habit({ id: 'h1', target_count_per_week: 1 })],
      [log('h2', '2026-08-18')],
      LAST_WEEK_START,
      LAST_WEEK_END
    );
    expect(result[0].missed).toBe(1);
  });

  it('excludes inactive habits', () => {
    const result = findShortfalls(
      [habit({ id: 'h1', is_active: false })],
      [],
      LAST_WEEK_START,
      LAST_WEEK_END
    );
    expect(result).toEqual([]);
  });

  it('excludes habits with no weekly target rather than treating it as zero', () => {
    const result = findShortfalls(
      [habit({ id: 'h1', target_count_per_week: 0 })],
      [],
      LAST_WEEK_START,
      LAST_WEEK_END
    );
    expect(result).toEqual([]);
  });
});

describe('buildPendingReview', () => {
  const many = Array.from({ length: 5 }, (_, i) =>
    habit({ id: `h${i}`, name: `Habit ${i}`, target_count_per_week: i + 1 })
  );

  it('returns null when nothing fell short', () => {
    expect(
      buildPendingReview([habit({ id: 'h1', target_count_per_week: 1 })], [log('h1', '2026-08-18')], TODAY)
    ).toBeNull();
  });

  it('orders by biggest shortfall first', () => {
    const review = buildPendingReview(many, [], TODAY)!;
    expect(review.items[0].missed).toBeGreaterThan(review.items[1].missed);
  });

  it('caps the number of questions and reports what it hid', () => {
    // A review that feels like an interrogation gets dismissed, and a dismissed
    // review captures nothing — but the hidden count must never be silent.
    const review = buildPendingReview(many, [], TODAY)!;
    expect(review.items).toHaveLength(REVIEW_CAP);
    expect(review.hiddenCount).toBe(many.length - REVIEW_CAP);
  });

  it('skips habits already answered, and resumes with the rest', () => {
    const first = buildPendingReview(many, [], TODAY)!;
    const answered = first.items.map((i) => i.habitId);
    const second = buildPendingReview(many, [], TODAY, answered)!;
    for (const item of second.items) {
      expect(answered).not.toContain(item.habitId);
    }
  });

  it('returns null once every shortfall has been answered', () => {
    const all = buildPendingReview(many, [], TODAY)!;
    const everyId = many.map((h) => h.id);
    expect(buildPendingReview(many, [], TODAY, everyId)).toBeNull();
    expect(all.items.length).toBeGreaterThan(0);
  });

  it('reviews last week, not the current one', () => {
    const review = buildPendingReview(many, [], TODAY)!;
    expect(review.weekStart).toBe(LAST_WEEK_START);
    expect(review.weekEnd).toBe(LAST_WEEK_END);
  });
});

describe('buildSkipPatterns', () => {
  it('weights by missed count, not by number of answers', () => {
    // A week that fell 3 short says more than a week that fell 1 short.
    const patterns = buildSkipPatterns([
      skip({ reason_id: 'dreaded', missed_count: 3 }),
      skip({ reason_id: 'forgot', missed_count: 1, week_start: '2026-08-10' }),
    ]);
    expect(patterns.totalMissed).toBe(4);
    expect(patterns.reasons[0].reasonId).toBe('dreaded');
    expect(patterns.reasons[0].count).toBe(3);
    expect(patterns.reasons[0].pct).toBe(75);
  });

  it('computes the internal/external split', () => {
    const patterns = buildSkipPatterns([
      skip({ reason_id: 'dreaded', missed_count: 3 }),
      skip({ reason_id: 'no_time', missed_count: 1, week_start: '2026-08-10' }),
    ]);
    expect(patterns.internalPct).toBe(75);
    expect(patterns.externalPct).toBe(25);
  });

  it('withholds the split below the minimum sample', () => {
    const patterns = buildSkipPatterns([skip({ missed_count: 1 })]);
    expect(patterns.totalMissed).toBeLessThan(MIN_MISSES_FOR_SPLIT);
    expect(patterns.internalPct).toBeNull();
    expect(patterns.externalPct).toBeNull();
  });

  it('excludes an unknown reason rather than bucketing it arbitrarily', () => {
    const patterns = buildSkipPatterns([
      skip({ reason_id: 'retired_reason', missed_count: 5 }),
      skip({ reason_id: 'dreaded', missed_count: 3, week_start: '2026-08-10' }),
    ]);
    expect(patterns.totalMissed).toBe(3);
    expect(patterns.reasons).toHaveLength(1);
  });

  it('counts distinct weeks answered', () => {
    const patterns = buildSkipPatterns([
      skip({ week_start: '2026-08-17' }),
      skip({ week_start: '2026-08-17', reason_id: 'forgot' }),
      skip({ week_start: '2026-08-10' }),
    ]);
    expect(patterns.weeksAnswered).toBe(2);
  });

  it('handles no data without dividing by zero', () => {
    const patterns = buildSkipPatterns([]);
    expect(patterns.totalMissed).toBe(0);
    expect(patterns.reasons).toEqual([]);
    expect(patterns.internalPct).toBeNull();
  });
});
