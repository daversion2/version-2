import {
  classifyPace,
  buildTodayList,
  buildWeekGlance,
  dayIndexInWeek,
  mondayOf,
} from '../habitPace';
import { CompletionLog, PracticeInstance } from '../../types';

// Week of Mon 2026-08-24 .. Sun 2026-08-30.
const MON = '2026-08-24';
const WED = '2026-08-26';
const THU = '2026-08-27';
const SAT = '2026-08-29';
const SUN = '2026-08-30';

const habit = (over: Partial<PracticeInstance> & { id: string }): PracticeInstance =>
  ({
    user_id: 'u1',
    name: over.id,
    is_active: true,
    created_by_user: false,
    target_count_per_week: 4,
    ...over,
  }) as PracticeInstance;

let n = 0;
const log = (habitId: string, date: string, extra: Partial<CompletionLog> = {}): CompletionLog =>
  ({
    id: `l${++n}`,
    user_id: 'u1',
    type: 'nudge',
    reference_id: habitId,
    points: 1,
    difficulty: 1,
    date,
    ...extra,
  }) as CompletionLog;

describe('week helpers', () => {
  it('anchors the week to Monday', () => {
    expect(mondayOf(SUN)).toBe(MON);
    expect(mondayOf(MON)).toBe(MON);
  });

  it('indexes Monday as 1 and Sunday as 7', () => {
    expect(dayIndexInWeek(MON)).toBe(1);
    expect(dayIndexInWeek(SUN)).toBe(7);
  });
});

describe('classifyPace', () => {
  it('reports done once the target is met', () => {
    expect(classifyPace(4, 4, WED).status).toBe('done');
    expect(classifyPace(4, 5, WED).status).toBe('done');
    expect(classifyPace(4, 4, WED).remaining).toBe(0);
  });

  it('does not declare a habit behind on Monday for a fraction of a rep', () => {
    // The tolerance that stops the whole screen reading as failure every Monday:
    // expected on Mon for a 4x habit is 0.57 reps, which nobody can be short of.
    expect(classifyPace(4, 0, MON).status).toBe('on_pace');
  });

  it('reports behind once a full rep short of expected pace', () => {
    // Thursday (day 4), 4x habit: expected 2.3, done 1 — behind, but still
    // reachable in the 4 days left, so it is not yet at risk.
    expect(classifyPace(4, 1, THU).status).toBe('behind');
  });

  it('reports on pace when keeping up', () => {
    // Wednesday (day 3), 4x habit: expected 1.7, done 2.
    expect(classifyPace(4, 2, WED).status).toBe('on_pace');
  });

  it('never claims a target is unreachable, however late in the week', () => {
    // Sunday, 1 day left, 3 still to go. A habit can be done more than once a
    // day, so this is behind — not impossible.
    const result = classifyPace(4, 1, SUN);
    expect(result.status).toBe('behind');
    expect(result.daysLeft).toBe(1);
    expect(result.remaining).toBe(3);
  });

  it('rates a habit needing more per remaining day as more urgent', () => {
    // Urgency orders the list; it never gates whether the week is winnable.
    const tight = classifyPace(7, 0, SAT);
    const loose = classifyPace(7, 0, MON);
    expect(tight.status).toBe('behind');
    expect(tight.urgency).toBeGreaterThan(loose.urgency);
  });

  it('counts days left inclusive of today', () => {
    expect(classifyPace(4, 0, MON).daysLeft).toBe(7);
    expect(classifyPace(4, 0, SUN).daysLeft).toBe(1);
  });
});

describe('buildTodayList', () => {
  it('counts only this week, and only this habit', () => {
    const list = buildTodayList(
      [habit({ id: 'h1', target_count_per_week: 4 })],
      [
        log('h1', MON),
        log('h1', '2026-08-23'), // previous week
        log('h2', WED), // another habit
      ],
      WED
    );
    expect(list[0].completed).toBe(1);
  });

  it('counts distinct days, not logs', () => {
    const list = buildTodayList(
      [habit({ id: 'h1' })],
      [log('h1', MON), log('h1', MON)],
      WED
    );
    expect(list[0].completed).toBe(1);
  });

  it('sorts behind first, then on pace, then done', () => {
    const list = buildTodayList(
      [
        habit({ id: 'done', target_count_per_week: 1 }),
        habit({ id: 'veryBehind', target_count_per_week: 7 }),
        habit({ id: 'behind', target_count_per_week: 4 }),
        habit({ id: 'onPace', target_count_per_week: 2 }),
      ],
      [log('done', MON), log('onPace', MON)],
      SAT
    );
    // The most pressing behind habit leads, but nothing is written off.
    expect(list.map((p) => p.habitId)).toEqual(['veryBehind', 'behind', 'onPace', 'done']);
    expect(list.map((p) => p.status)).toEqual(['behind', 'behind', 'on_pace', 'done']);
  });

  it('surfaces the most recent resistance rating, across all history', () => {
    const list = buildTodayList(
      [habit({ id: 'h1' })],
      [
        log('h1', '2026-08-10', { resistance: 3, resistance_scale: 3 }),
        log('h1', '2026-08-17', { resistance: 2, resistance_scale: 3 }),
      ],
      WED
    );
    // Older than this week, but still the answer to "what did this feel like?".
    expect(list[0].lastResistance).toBe(2);
  });

  it('normalizes an old 1-10 rating onto the three levels', () => {
    // No recorded scale means it predates the rewrite, so 9 is the hardest third.
    const list = buildTodayList([habit({ id: 'h1' })], [log('h1', MON, { resistance: 9 })], WED);
    expect(list[0].lastResistance).toBe(3);
  });

  it('falls back to the legacy binary when no rating exists', () => {
    const list = buildTodayList([habit({ id: 'h1' })], [log('h1', MON, { difficulty: 2 })], WED);
    expect(list[0].lastResistance).toBe(2);
  });

  it('leaves resistance undefined when there is nothing to show', () => {
    const list = buildTodayList([habit({ id: 'h1' })], [], WED);
    expect(list[0].lastResistance).toBeUndefined();
  });

  it('flags whether the habit was logged today', () => {
    const list = buildTodayList([habit({ id: 'h1' })], [log('h1', WED)], WED);
    expect(list[0].doneToday).toBe(true);
  });

  it('excludes inactive habits', () => {
    const list = buildTodayList([habit({ id: 'h1', is_active: false })], [], WED);
    expect(list).toEqual([]);
  });
});

describe('buildWeekGlance', () => {
  it('counts on-pace and done together as on pace', () => {
    const list = buildTodayList(
      [
        habit({ id: 'done', target_count_per_week: 1 }),
        habit({ id: 'onPace', target_count_per_week: 2 }),
        habit({ id: 'behind', target_count_per_week: 4 }),
      ],
      [log('done', MON), log('onPace', MON)],
      SAT
    );
    const glance = buildWeekGlance(list);
    expect(glance.total).toBe(3);
    expect(glance.onPace).toBe(2);
    expect(glance.behind).toBe(1);
  });

  it('reports zero of zero without dividing by anything', () => {
    expect(buildWeekGlance([])).toEqual({ onPace: 0, total: 0, behind: 0, untracked: 0 });
  });
});

describe('habits with no weekly goal', () => {
  // The bug this guards: curated practices are seeded with
  // target_count_per_week: 0 ("no goal set yet"). Treating zero remaining as
  // finished rendered every one of them dimmed and labelled "Target hit" before
  // the user had done anything.
  it('is its own state, never "done"', () => {
    expect(classifyPace(0, 0, WED).status).toBe('no_target');
    expect(classifyPace(0, 3, WED).status).toBe('no_target');
  });

  it('reports nothing outstanding, since there is nothing to reach', () => {
    const result = classifyPace(0, 0, WED);
    expect(result.remaining).toBe(0);
    expect(result.urgency).toBe(0);
  });

  it('still counts completions so the row can show them', () => {
    const list = buildTodayList(
      [habit({ id: 'h1', target_count_per_week: 0 })],
      [log('h1', MON), log('h1', WED)],
      WED
    );
    expect(list[0].status).toBe('no_target');
    expect(list[0].completed).toBe(2);
  });

  it('sorts above done, below anything with a live goal', () => {
    const list = buildTodayList(
      [
        habit({ id: 'done', target_count_per_week: 1 }),
        habit({ id: 'noGoal', target_count_per_week: 0 }),
        habit({ id: 'behind', target_count_per_week: 4 }),
      ],
      [log('done', MON)],
      SAT
    );
    expect(list.map((p) => p.habitId)).toEqual(['behind', 'noGoal', 'done']);
  });

  it('is excluded from the on-pace denominator rather than counted as failing', () => {
    // "2 of 8 on pace" would be a lie when 6 of them have no target at all.
    const list = buildTodayList(
      [
        habit({ id: 'onPace', target_count_per_week: 2 }),
        habit({ id: 'noGoal1', target_count_per_week: 0 }),
        habit({ id: 'noGoal2', target_count_per_week: 0 }),
      ],
      [log('onPace', MON)],
      WED
    );
    const glance = buildWeekGlance(list);
    expect(glance.total).toBe(1);
    expect(glance.onPace).toBe(1);
    expect(glance.untracked).toBe(2);
  });

  it('reports every habit as untracked when none has a goal', () => {
    const list = buildTodayList(
      [habit({ id: 'a', target_count_per_week: 0 }), habit({ id: 'b', target_count_per_week: 0 })],
      [],
      WED
    );
    const glance = buildWeekGlance(list);
    expect(glance.total).toBe(0);
    expect(glance.untracked).toBe(2);
  });
});
