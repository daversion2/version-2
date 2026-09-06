import {
  classifyPace,
  buildTodayList,
  buildTodaySections,
  buildWeekGlance,
  dailyAsk,
  dayIndexInWeek,
  mondayOf,
  pickNextAction,
  sectionFor,
  weekDatesFor,
} from '../habitPace';
import { CompletionLog, PracticeInstance } from '../../types';

// Week of Mon 2026-08-24 .. Sun 2026-08-30.
const MON = '2026-08-24';
const TUE = '2026-08-25';
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

describe('day-scheduled habits', () => {
  // Mon/Wed/Fri. Weekdays are JS-style: 0 = Sunday.
  const mwf = (id: string) =>
    habit({ id, scheduled_days: [1, 3, 5], target_count_per_week: 3 });

  it('takes its target from the days it named', () => {
    const list = buildTodayList([mwf('h1')], [], WED);
    expect(list[0].target).toBe(3);
    expect(list[0].dayScheduled).toBe(true);
    expect(list[0].scheduleLabel).toBe('Mon, Wed & Fri');
  });

  it('is due only on the days it named', () => {
    expect(buildTodayList([mwf('h1')], [], WED)[0].dueToday).toBe(true);
    expect(buildTodayList([mwf('h1')], [], THU)[0].dueToday).toBe(false);
  });

  it('stops being due once it is done', () => {
    const list = buildTodayList([mwf('h1')], [log('h1', WED)], WED);
    expect(list[0].dueToday).toBe(false);
    expect(list[0].doneToday).toBe(true);
  });

  it('counts a day gone without a rep as a miss, not a projection', () => {
    // Monday came and went. On Wednesday that is a fact.
    const list = buildTodayList([mwf('h1')], [], WED);
    expect(list[0].missed).toBe(1);
    expect(list[0].status).toBe('behind');
  });

  it('never counts today as missed while the day is still going', () => {
    // Monday kept, Wednesday due right now: nothing has been missed.
    const list = buildTodayList([mwf('h1')], [log('h1', MON)], WED);
    expect(list[0].missed).toBe(0);
    expect(list[0].status).toBe('on_pace');
  });

  it('is done once every day it asked for is kept', () => {
    const list = buildTodayList(
      [mwf('h1')],
      [log('h1', MON), log('h1', WED), log('h1', '2026-08-28')],
      SAT
    );
    expect(list[0].status).toBe('done');
    expect(list[0].remaining).toBe(0);
  });

  it('is not done just because nothing is left today', () => {
    // Thursday: Monday and Wednesday kept, but Friday is still owed.
    const list = buildTodayList([mwf('h1')], [log('h1', MON), log('h1', WED)], THU);
    expect(list[0].status).toBe('on_pace');
    expect(list[0].remaining).toBe(1);
  });

  it('credits a bonus rep on an off day without over-filling the week', () => {
    // Tuesday is not a day it asked for, so it can't push the count past three.
    const logs = [log('h1', MON), log('h1', TUE), log('h1', WED), log('h1', '2026-08-28')];
    const list = buildTodayList([mwf('h1')], logs, SAT);
    expect(list[0].completed).toBe(3);
  });

  it('sorts a habit owed today above one that merely could be done today', () => {
    const list = buildTodayList(
      [habit({ id: 'anyDay', target_count_per_week: 3 }), mwf('dueToday')],
      [],
      WED
    );
    expect(list[0].habitId).toBe('dueToday');
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

describe('weekDatesFor', () => {
  it('returns the seven dates of the week, Monday first', () => {
    const dates = weekDatesFor(THU);
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe(MON);
    expect(dates[6]).toBe(SUN);
  });

  it('gives the same week from any day inside it', () => {
    expect(weekDatesFor(SUN)).toEqual(weekDatesFor(MON));
  });
});

describe('dailyAsk', () => {
  it('spreads the shortfall over the days that are left, rounding up', () => {
    // Whole reps only — 3 across 2 days is 2 today, not 1.5.
    expect(dailyAsk(3, 2)).toBe(2);
    expect(dailyAsk(4, 4)).toBe(1);
  });

  it('never asks for more than is actually outstanding', () => {
    // Last day of the week: the ask is the remainder, not an inflated share.
    expect(dailyAsk(2, 1)).toBe(2);
    expect(dailyAsk(1, 1)).toBe(1);
  });

  it('asks for nothing once the week is met', () => {
    expect(dailyAsk(0, 3)).toBe(0);
    expect(dailyAsk(-1, 3)).toBe(0);
  });
});

describe('todayTarget', () => {
  const paceFor = (habits: PracticeInstance[], logs: CompletionLog[], today: string) =>
    buildTodayList(habits, logs, today);

  it('derives a daily ask from the weekly shortfall', () => {
    // 4x/week, nothing done, asking on Saturday: 2 days left, 4 outstanding.
    const [pace] = paceFor([habit({ id: 'a', target_count_per_week: 4 })], [], SAT);
    expect(pace.todayTarget).toBe(2);
  });

  it('asks for nothing once the weekly target is met', () => {
    const [pace] = paceFor(
      [habit({ id: 'a', target_count_per_week: 2 })],
      [log('a', MON), log('a', TUE)],
      WED
    );
    expect(pace.status).toBe('done');
    expect(pace.todayTarget).toBe(0);
  });

  it('asks for nothing when no goal is set', () => {
    const [pace] = paceFor([habit({ id: 'a', target_count_per_week: 0 })], [], WED);
    expect(pace.todayTarget).toBe(0);
  });

  it('asks a day-scheduled habit for exactly one rep, and only on a day it owes', () => {
    // Mon/Wed/Fri. Wednesday owes one; Thursday owes none, even though the
    // week still has an outstanding Friday.
    const mwf = habit({ id: 'a', scheduled_days: [1, 3, 5] });
    const [onDue] = paceFor([mwf], [], WED);
    expect(onDue.todayTarget).toBe(1);

    const [offDay] = paceFor([mwf], [log('a', WED)], THU);
    expect(offDay.todayTarget).toBe(0);
  });

  it('exposes the days a scheduled habit owes, and none for a count habit', () => {
    const [scheduled] = paceFor([habit({ id: 'a', scheduled_days: [1, 3, 5] })], [], WED);
    expect(scheduled.dueDates).toEqual([MON, WED, '2026-08-28']);

    const [counted] = paceFor([habit({ id: 'b', target_count_per_week: 3 })], [], WED);
    expect(counted.dueDates).toEqual([]);
  });
});

describe('pickNextAction', () => {
  it('names the most behind habit and what it would take today', () => {
    const list = buildTodayList(
      [
        habit({ id: 'behind', target_count_per_week: 4 }),
        habit({ id: 'fine', target_count_per_week: 2 }),
      ],
      [log('fine', MON), log('fine', TUE)],
      SAT
    );
    const action = pickNextAction(list);
    expect(action).toEqual({ habitId: 'behind', reps: 2, recovers: true });
  });

  it('prefers a habit that owes today over one that is merely behind on pace', () => {
    // A named day is a deadline; a weekly count is not.
    const list = buildTodayList(
      [
        habit({ id: 'count', target_count_per_week: 4 }),
        habit({ id: 'dueToday', scheduled_days: [3] }),
      ],
      [],
      WED
    );
    expect(pickNextAction(list)?.habitId).toBe('dueToday');
  });

  it('skips a habit already logged today', () => {
    // Having just done a thing is the worst moment to be told to do it again.
    const list = buildTodayList(
      [habit({ id: 'a', target_count_per_week: 4 })],
      [log('a', WED)],
      WED
    );
    expect(pickNextAction(list)).toBeNull();
  });

  it('returns nothing when every habit is done for the week', () => {
    const list = buildTodayList(
      [habit({ id: 'a', target_count_per_week: 1 })],
      [log('a', MON)],
      WED
    );
    expect(pickNextAction(list)).toBeNull();
  });

  it('still names an on-pace habit when nothing is behind', () => {
    // Nothing is wrong, but there is still a useful next thing to do.
    const list = buildTodayList(
      [habit({ id: 'a', target_count_per_week: 4 })],
      [log('a', MON), log('a', TUE)],
      WED
    );
    const action = pickNextAction(list);
    expect(action?.habitId).toBe('a');
    expect(action?.recovers).toBe(false);
  });
});

describe('buildTodaySections', () => {
  const mwf = (id: string) => habit({ id, scheduled_days: [1, 3, 5], target_count_per_week: 3 });

  it('groups by what the habit is asking, in priority order', () => {
    const list = buildTodayList(
      [
        habit({ id: 'behind', target_count_per_week: 7 }),
        mwf('dueToday'),
        habit({ id: 'open', target_count_per_week: 1 }),
        habit({ id: 'doneToday', target_count_per_week: 4 }),
      ],
      [log('doneToday', WED)],
      WED
    );
    const sections = buildTodaySections(list);

    expect(sections.map((s) => s.id)).toEqual(['due_today', 'behind', 'open', 'done']);
    expect(sections.map((s) => s.title)).toEqual([
      'Due today',
      'Behind this week',
      'This week',
      'Done',
    ]);
  });

  it('puts a habit in exactly one section', () => {
    const list = buildTodayList([mwf('h1')], [], WED);
    const sections = buildTodaySections(list);
    const appearances = sections.flatMap((s) => s.paces).filter((p) => p.habitId === 'h1');
    expect(appearances).toHaveLength(1);
  });

  // A habit logged an hour ago must not still sit under "Behind this week" —
  // the heading would be telling the truth about the week while the card offers
  // nothing to do about it.
  it('counts a habit logged today as done, however the week is going', () => {
    const list = buildTodayList([habit({ id: 'h1', target_count_per_week: 7 })], [log('h1', WED)], WED);
    expect(sectionFor(list[0])).toBe('done');
    expect(list[0].status).toBe('behind');
  });

  it('counts a finished week as done even when today was not the day', () => {
    const list = buildTodayList(
      [habit({ id: 'h1', target_count_per_week: 1 })],
      [log('h1', MON)],
      WED
    );
    expect(sectionFor(list[0])).toBe('done');
  });

  it('ranks a named day above a weekly shortfall — only one has a deadline', () => {
    const list = buildTodayList(
      [habit({ id: 'behind', target_count_per_week: 7 }), mwf('due')],
      [],
      WED
    );
    expect(buildTodaySections(list)[0].paces[0].habitId).toBe('due');
  });

  it('drops empty sections rather than heading a group of nothing', () => {
    const list = buildTodayList([habit({ id: 'h1', target_count_per_week: 1 })], [log('h1', WED)], WED);
    expect(buildTodaySections(list).map((s) => s.id)).toEqual(['done']);
  });

  it('keeps the pace ordering inside a section', () => {
    const list = buildTodayList(
      [
        habit({ id: 'slightly', target_count_per_week: 4 }),
        habit({ id: 'badly', target_count_per_week: 7 }),
      ],
      [],
      SAT
    );
    const behind = buildTodaySections(list).find((s) => s.id === 'behind')!;
    expect(behind.paces.map((p) => p.habitId)).toEqual(['badly', 'slightly']);
  });

  it('files a habit with no goal under the open section, not done', () => {
    const list = buildTodayList([habit({ id: 'h1', target_count_per_week: 0 })], [], WED);
    expect(sectionFor(list[0])).toBe('open');
  });

  it('returns nothing for an empty list', () => {
    expect(buildTodaySections([])).toEqual([]);
  });
});
