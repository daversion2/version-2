import {
  HABIT_REMINDER_SLOT_BUDGET,
  HabitSchedule,
  IOS_PENDING_NOTIFICATION_LIMIT,
  NON_REMINDER_SLOT_RESERVE,
  WEEKDAY_LABELS,
  allowedRestDays,
  defaultScheduleForTarget,
  describeSchedule,
  dueDatesBetween,
  fitRemindersToBudget,
  isDayScheduled,
  isDueOn,
  reminderSlotsFor,
  scheduleFields,
  scheduledDays,
  switchScheduleKind,
  toExpoWeekday,
  weeklyTarget,
} from '../habitSchedule';

// Week of Mon 2026-08-24 .. Sun 2026-08-30.
const MON = '2026-08-24';
const TUE = '2026-08-25';
const SUN = '2026-08-30';

describe('scheduledDays', () => {
  it('reads the chosen days, sorted and deduped', () => {
    expect(scheduledDays({ scheduled_days: [5, 1, 3, 1] })).toEqual([1, 3, 5]);
  });

  it('treats an empty list as no days chosen, not as "due never"', () => {
    // A habit due on no days would be permanently un-due: invisible to pace,
    // impossible to miss, and unfixable from the UI.
    expect(scheduledDays({ scheduled_days: [] })).toBeUndefined();
    expect(isDayScheduled({ scheduled_days: [] })).toBe(false);
  });

  it('discards junk that could only come from a bad write', () => {
    expect(scheduledDays({ scheduled_days: [1, 9, -2, 3.5, 4] })).toEqual([1, 4]);
  });

  it('is absent for a count habit', () => {
    expect(scheduledDays({ target_count_per_week: 4 })).toBeUndefined();
  });
});

describe('isDueOn', () => {
  it('is true only on the named days', () => {
    const mwf = { scheduled_days: [1, 3, 5] };
    expect(isDueOn(mwf, MON)).toBe(true);
    expect(isDueOn(mwf, TUE)).toBe(false);
  });

  it('is true every day for a count habit — any day is a legitimate day', () => {
    expect(isDueOn({ target_count_per_week: 2 }, MON)).toBe(true);
    expect(isDueOn({ target_count_per_week: 2 }, SUN)).toBe(true);
  });
});

describe('weeklyTarget', () => {
  it('comes from the day count for a day-scheduled habit', () => {
    // Deliberately disagreeing fields: the days win, so a stale target can
    // never make the pips and the schedule contradict each other.
    expect(weeklyTarget({ scheduled_days: [1, 3, 5], target_count_per_week: 9 })).toBe(3);
  });

  it('is the target itself for a count habit', () => {
    expect(weeklyTarget({ target_count_per_week: 4 })).toBe(4);
    expect(weeklyTarget({})).toBe(0);
  });
});

describe('allowedRestDays', () => {
  it('gives a habit exactly the rest its goal implies', () => {
    expect(allowedRestDays({ target_count_per_week: 7 })).toBe(0);
    expect(allowedRestDays({ target_count_per_week: 3 })).toBe(4);
    expect(allowedRestDays({ target_count_per_week: 1 })).toBe(6);
  });

  it('allows none for a day-scheduled habit — a named day is owed', () => {
    expect(allowedRestDays({ scheduled_days: [1, 3, 5] })).toBe(0);
  });

  it('allows none without a goal, having nothing to be lenient against', () => {
    expect(allowedRestDays({ target_count_per_week: 0 })).toBe(0);
  });
});

describe('dueDatesBetween', () => {
  it('lists only the days the habit was owed', () => {
    expect(dueDatesBetween({ scheduled_days: [1, 3] }, MON, SUN)).toEqual([MON, '2026-08-26']);
  });

  it('lists every day for a count habit', () => {
    expect(dueDatesBetween({ target_count_per_week: 3 }, MON, '2026-08-26')).toHaveLength(3);
  });

  it('is empty when the range runs backwards', () => {
    expect(dueDatesBetween({ target_count_per_week: 3 }, SUN, MON)).toEqual([]);
  });
});

describe('toExpoWeekday', () => {
  // Off by one here shifts every reminder by exactly one day, and only a fired
  // notification would ever show it. The contract, from expo-notifications'
  // WeeklyTriggerInput: "a number from 1 through 7, with 1 indicating Sunday".
  it('maps Sunday to 1 and Saturday to 7', () => {
    expect(toExpoWeekday(0)).toBe(1); // Sunday
    expect(toExpoWeekday(6)).toBe(7); // Saturday
  });

  it('maps every stored weekday into 1–7 without collision', () => {
    const mapped = ([0, 1, 2, 3, 4, 5, 6] as const).map(toExpoWeekday);
    expect(mapped).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('keeps the labels aligned across the conversion', () => {
    // A Monday habit must schedule on Expo's Monday, not Sunday or Tuesday.
    const monday = WEEKDAY_LABELS.indexOf('Mon') as 1;
    expect(monday).toBe(1);
    expect(toExpoWeekday(monday)).toBe(2);
  });
});

describe('describeSchedule', () => {
  it('names the days, Monday first', () => {
    expect(describeSchedule({ scheduled_days: [5, 1, 3] })).toBe('Mon, Wed & Fri');
  });

  it('has a word for the common shapes', () => {
    expect(describeSchedule({ scheduled_days: [1, 2, 3, 4, 5] })).toBe('Weekdays');
    expect(describeSchedule({ scheduled_days: [0, 6] })).toBe('Weekends');
    expect(describeSchedule({ scheduled_days: [0, 1, 2, 3, 4, 5, 6] })).toBe('Every day');
  });

  it('describes a count habit by its count', () => {
    expect(describeSchedule({ target_count_per_week: 4 })).toBe('4× a week');
    expect(describeSchedule({ target_count_per_week: 7 })).toBe('Every day');
    expect(describeSchedule({ target_count_per_week: 0 })).toBe('No weekly goal set');
  });
});

// ---------------------------------------------------------------------------
// EDITING A SCHEDULE — the rules the picker renders. Four screens now choose a
// schedule (onboarding, the library, the custom-habit form, the edit sheet);
// these are what keep them from disagreeing.
// ---------------------------------------------------------------------------

describe('defaultScheduleForTarget', () => {
  it('opens on named days, spread from the suggested target', () => {
    expect(defaultScheduleForTarget(5)).toEqual({ kind: 'days', days: [1, 2, 3, 4, 5] });
  });

  it('falls back to a three-day week when nothing is suggested', () => {
    const schedule = defaultScheduleForTarget();
    expect(schedule.kind).toBe('days');
    expect(schedule.kind === 'days' && schedule.days).toHaveLength(3);
  });
});

describe('switchScheduleKind', () => {
  it('carries the size of the commitment from a count into days', () => {
    const next = switchScheduleKind({ kind: 'count', target: 4 }, 'days');
    expect(next.kind).toBe('days');
    expect(next.kind === 'days' && next.days).toHaveLength(4);
  });

  it('carries the day COUNT back into a weekly target', () => {
    expect(switchScheduleKind({ kind: 'days', days: [1, 3, 5] }, 'count')).toEqual({
      kind: 'count',
      target: 3,
    });
  });

  it('is a no-op when the kind already matches', () => {
    const schedule: HabitSchedule = { kind: 'days', days: [1, 3] };
    expect(switchScheduleKind(schedule, 'days')).toBe(schedule);
  });
});

describe('scheduleFields', () => {
  // The whole point: the count and the days are written together, so no
  // creation screen can produce a habit due three days a week with a target of
  // five. setHabitSchedule guarantees this for edits; this guarantees it for
  // creation, where there is no document to update yet.
  it('derives the weekly target from the days, sorted and deduped', () => {
    expect(scheduleFields({ kind: 'days', days: [5, 1, 3, 1] })).toEqual({
      target_count_per_week: 3,
      scheduled_days: [1, 3, 5],
    });
  });

  it('leaves scheduled_days undefined for a count, so the field is never written', () => {
    expect(scheduleFields({ kind: 'count', target: 4 })).toEqual({
      target_count_per_week: 4,
      scheduled_days: undefined,
    });
  });

  it('round-trips through every schedule reader', () => {
    const fields = scheduleFields({ kind: 'days', days: [1, 3, 5] });
    expect(isDayScheduled(fields)).toBe(true);
    expect(weeklyTarget(fields)).toBe(3);
    expect(describeSchedule(fields)).toBe('Mon, Wed & Fri');
  });
});

// =============================================================================
// NOTIFICATION SLOT BUDGET
//
// iOS discards pending notifications past 64 with no error of any kind, so
// nothing but arithmetic can tell us this is right. The point of these tests is
// that the arithmetic is the part that has to be provable.
// =============================================================================

describe('reminderSlotsFor', () => {
  it('charges a day-scheduled habit one slot per day it asks for', () => {
    expect(reminderSlotsFor({ scheduled_days: [1, 3, 5] })).toBe(3);
    expect(reminderSlotsFor({ scheduled_days: [0, 1, 2, 3, 4, 5, 6] })).toBe(7);
  });

  it('charges a count habit one slot for its daily trigger', () => {
    expect(reminderSlotsFor({ target_count_per_week: 4 })).toBe(1);
    expect(reminderSlotsFor({})).toBe(1);
  });

  it('agrees with scheduledDays on junk, so cost matches what gets scheduled', () => {
    // An empty or invalid array is "no days chosen" → one daily trigger.
    expect(reminderSlotsFor({ scheduled_days: [] })).toBe(1);
    expect(reminderSlotsFor({ scheduled_days: [9, -1] })).toBe(1);
    // Duplicates are collapsed before scheduling, so they must not be charged.
    expect(reminderSlotsFor({ scheduled_days: [1, 1, 3] })).toBe(2);
  });
});

describe('the budget constants', () => {
  it('reserves headroom below the iOS ceiling', () => {
    expect(IOS_PENDING_NOTIFICATION_LIMIT).toBe(64);
    expect(HABIT_REMINDER_SLOT_BUDGET).toBe(
      IOS_PENDING_NOTIFICATION_LIMIT - NON_REMINDER_SLOT_RESERVE
    );
    // The reserve must leave room for both craving-ride pings.
    expect(NON_REMINDER_SLOT_RESERVE).toBeGreaterThanOrEqual(2);
  });
});

describe('fitRemindersToBudget', () => {
  const daily = { target_count_per_week: 4 };
  const mwf = { scheduled_days: [1, 3, 5] };
  const everyDay = { scheduled_days: [0, 1, 2, 3, 4, 5, 6] };

  it('schedules everything when there is room', () => {
    const { scheduled, skipped } = fitRemindersToBudget([mwf, daily], 60);
    expect(scheduled).toEqual([mwf, daily]);
    expect(skipped).toEqual([]);
  });

  it('is all-or-nothing per habit — never a partial week', () => {
    // 2 slots left, a Mon/Wed/Fri habit needs 3. Scheduling two of its three
    // days would produce a reminder that lies about the commitment.
    const { scheduled, skipped } = fitRemindersToBudget([mwf], 2);
    expect(scheduled).toEqual([]);
    expect(skipped).toEqual([mwf]);
  });

  it('first-fits, so a small habit after a rejected large one still gets set', () => {
    const { scheduled, skipped } = fitRemindersToBudget([everyDay, daily], 3);
    expect(scheduled).toEqual([daily]);
    expect(skipped).toEqual([everyDay]);
  });

  it('fills exactly to the line', () => {
    const { scheduled, skipped } = fitRemindersToBudget([mwf, mwf], 6);
    expect(scheduled).toHaveLength(2);
    expect(skipped).toEqual([]);
    expect(fitRemindersToBudget([mwf, mwf], 5).skipped).toHaveLength(1);
  });

  it('skips everything when no slots remain, rather than throwing', () => {
    expect(fitRemindersToBudget([mwf, daily], 0)).toEqual({
      scheduled: [],
      skipped: [mwf, daily],
    });
    expect(fitRemindersToBudget([], 0)).toEqual({ scheduled: [], skipped: [] });
  });

  it('holds the real ceiling: ten Mon/Wed/Fri habits do not all fit alongside 40 slots used', () => {
    // The scenario CLAUDE.md flagged — 10 habits × 3 days = 30 slots.
    const ten = Array.from({ length: 10 }, () => ({ scheduled_days: [1, 3, 5] }));
    const { scheduled, skipped } = fitRemindersToBudget(ten, HABIT_REMINDER_SLOT_BUDGET - 40);
    expect(scheduled).toHaveLength(6); // 18 of the 20 remaining slots
    expect(skipped).toHaveLength(4);
    const used = scheduled.reduce((n, h) => n + reminderSlotsFor(h), 0);
    expect(used).toBeLessThanOrEqual(HABIT_REMINDER_SLOT_BUDGET - 40);
  });
});
