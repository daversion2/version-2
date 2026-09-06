import {
  WEEKDAY_LABELS,
  allowedRestDays,
  describeSchedule,
  dueDatesBetween,
  isDayScheduled,
  isDueOn,
  scheduledDays,
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
