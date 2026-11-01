import {
  clampDuration,
  clampTemp,
  dayLabel,
  defaultUnit,
  displayTemp,
  formatClock,
  formatDuration,
  formatTemp,
  fromC,
  groupByDay,
  newRecords,
  prefillFor,
  records,
  storedTemp,
  streakWeeks,
  tempBounds,
  toC,
  totalMinutes,
  weekSummary,
} from '../hotcoldMath';
import { FIRST_SESSION } from '../../data/hotcold';
import type { HotColdSession } from '../../types/hotcold';

let n = 0;
const s = (over: Partial<HotColdSession>): HotColdSession => ({
  id: `s${++n}`,
  kind: 'cold',
  date: '2026-10-29',
  logged_at: `2026-10-29T08:00:${String(n % 60).padStart(2, '0')}.000Z`,
  duration_sec: 120,
  temp_c: 10,
  ...over,
});

// 2026-11-01 is a Sunday; its Monday-start week began 2026-10-26.
const TODAY = '2026-11-01';

describe('temperature', () => {
  it('converts both ways', () => {
    expect(toC(50)).toBe(10);
    expect(fromC(100)).toBe(212);
    expect(fromC(-40)).toBe(-40);
  });

  it('reads back the same whole number in °F after storing as °C', () => {
    for (let f = 28; f <= 248; f++) {
      expect(displayTemp(storedTemp(f, 'F'), 'F')).toBe(f);
    }
  });

  it('stores °C as typed', () => {
    expect(storedTemp(4, 'C')).toBe(4);
    expect(storedTemp(39, 'F')).toBe(3.9);
  });

  it('formats in the user’s unit', () => {
    expect(formatTemp(10, 'C')).toBe('10 °C');
    expect(formatTemp(10, 'F')).toBe('50 °F');
  });

  it('picks °F for a US phone only', () => {
    expect(defaultUnit('en-US')).toBe('F');
    expect(defaultUnit('en_US')).toBe('F');
    expect(defaultUnit('en-GB')).toBe('C');
    expect(defaultUnit('de')).toBe('C');
    expect(defaultUnit(undefined)).toBe('C');
  });

  it('bounds the stepper per kind and unit', () => {
    expect(tempBounds('cold', 'C')).toEqual({ min: -2, max: 25, step: 1 });
    expect(tempBounds('cold', 'F')).toEqual({ min: 28, max: 77, step: 1 });
    expect(tempBounds('heat', 'F')).toEqual({ min: 104, max: 248, step: 5 });
  });

  it('clamps to a sane range', () => {
    expect(clampTemp('cold', -10)).toBe(-2);
    expect(clampTemp('heat', 200)).toBe(120);
    expect(clampTemp('heat', 85)).toBe(85);
  });
});

describe('duration', () => {
  it('formats short, mixed and whole-minute times', () => {
    expect(formatDuration(45)).toBe('45 s');
    expect(formatDuration(150)).toBe('2:30');
    expect(formatDuration(900)).toBe('15 min');
  });

  it('formats a running clock', () => {
    expect(formatClock(7)).toBe('0:07');
    expect(formatClock(765)).toBe('12:45');
    expect(formatClock(3723)).toBe('1:02:03');
  });

  it('clamps', () => {
    expect(clampDuration(0)).toBe(5);
    expect(clampDuration(99999)).toBe(7200);
    expect(clampDuration(90.4)).toBe(90);
  });

  it('shows any time at all as at least a minute', () => {
    expect(totalMinutes(0)).toBe(0);
    expect(totalMinutes(20)).toBe(1);
    expect(totalMinutes(150)).toBe(3);
  });
});

describe('prefillFor', () => {
  it('uses the defaults with no history', () => {
    expect(prefillFor('cold', [])).toEqual(FIRST_SESSION.cold);
    expect(prefillFor('heat', [s({ kind: 'cold' })])).toEqual(FIRST_SESSION.heat);
  });

  it('uses the last session of that kind', () => {
    const sessions = [
      s({ kind: 'cold', date: '2026-10-28', duration_sec: 90, temp_c: 8 }),
      s({ kind: 'cold', date: '2026-10-30', duration_sec: 180, temp_c: 6 }),
      s({ kind: 'heat', date: '2026-10-31', duration_sec: 1200, temp_c: 90 }),
    ];
    expect(prefillFor('cold', sessions)).toEqual({ duration_sec: 180, temp_c: 6 });
    expect(prefillFor('heat', sessions)).toEqual({ duration_sec: 1200, temp_c: 90 });
  });

  it('breaks a same-day tie by when it was logged', () => {
    const sessions = [
      s({ logged_at: '2026-10-29T09:00:00.000Z', duration_sec: 60 }),
      s({ logged_at: '2026-10-29T07:00:00.000Z', duration_sec: 30 }),
    ];
    expect(prefillFor('cold', sessions).duration_sec).toBe(60);
  });
});

describe('weekSummary', () => {
  it('is empty with nothing logged', () => {
    expect(weekSummary([], TODAY, 3)).toEqual({
      start: '2026-10-26',
      sessions: 0,
      goal: 3,
      met: false,
      coldSec: 0,
      heatSec: 0,
    });
  });

  it('counts Monday to Sunday only, splitting time by kind', () => {
    const sessions = [
      s({ date: '2026-10-25', duration_sec: 999 }), // last Sunday — not this week
      s({ date: '2026-10-26', kind: 'cold', duration_sec: 120 }),
      s({ date: '2026-10-28', kind: 'heat', duration_sec: 900 }),
      s({ date: '2026-11-01', kind: 'cold', duration_sec: 60 }),
    ];
    expect(weekSummary(sessions, TODAY, 3)).toMatchObject({ sessions: 3, met: true, coldSec: 180, heatSec: 900 });
  });
});

describe('streakWeeks', () => {
  it('counts weeks in a row meeting the goal; an unmet current week doesn’t break it', () => {
    const sessions = [
      s({ date: '2026-10-13' }),
      s({ date: '2026-10-14' }),
      s({ date: '2026-10-20' }),
      s({ date: '2026-10-21' }),
      s({ date: '2026-10-27' }), // this week: 1 of 2 so far
    ];
    expect(streakWeeks(sessions, TODAY, 2)).toBe(2);
    expect(streakWeeks([...sessions, s({ date: '2026-10-31' })], TODAY, 2)).toBe(3);
    expect(streakWeeks([], TODAY, 2)).toBe(0);
  });
});

describe('records', () => {
  it('is empty with no history', () => {
    expect(records([])).toEqual({ longestCold: null, coldest: null, longestHeat: null });
  });

  it('finds the longest and coldest cold and the longest heat', () => {
    const a = s({ kind: 'cold', duration_sec: 180, temp_c: 8 });
    const b = s({ kind: 'cold', duration_sec: 120, temp_c: 3 });
    const c = s({ kind: 'heat', duration_sec: 1200, temp_c: 95 });
    const d = s({ kind: 'heat', duration_sec: 900, temp_c: 110 });
    expect(records([a, b, c, d])).toEqual({ longestCold: a, coldest: b, longestHeat: c });
  });

  it('gives a tie to the earlier session', () => {
    const first = s({ date: '2026-10-20', duration_sec: 180 });
    const later = s({ date: '2026-10-27', duration_sec: 180 });
    expect(records([later, first]).longestCold).toBe(first);
  });
});

describe('newRecords', () => {
  it('breaks nothing on the first session of a kind', () => {
    expect(newRecords(s({ kind: 'heat' }), [s({ kind: 'cold' })])).toEqual([]);
  });

  it('calls out a longer and a colder cold session', () => {
    const before = [s({ duration_sec: 120, temp_c: 10 })];
    expect(newRecords(s({ duration_sec: 150, temp_c: 8 }), before)).toEqual(['longestCold', 'coldest']);
    expect(newRecords(s({ duration_sec: 120, temp_c: 10 }), before)).toEqual([]);
  });

  it('never compares a session with itself (an edit)', () => {
    const edited = s({ duration_sec: 300 });
    expect(newRecords(edited, [edited])).toEqual([]);
  });

  it('has no hottest record for heat', () => {
    const before = [s({ kind: 'heat', duration_sec: 900, temp_c: 80 })];
    expect(newRecords(s({ kind: 'heat', duration_sec: 600, temp_c: 110 }), before)).toEqual([]);
    expect(newRecords(s({ kind: 'heat', duration_sec: 960 }), before)).toEqual(['longestHeat']);
  });
});

describe('groupByDay', () => {
  it('puts the newest day first, each day in logged order', () => {
    const a = s({ date: '2026-10-30', logged_at: '2026-10-30T10:00:00.000Z' });
    const b = s({ date: '2026-10-31', logged_at: '2026-10-31T08:00:00.000Z' });
    const c = s({ date: '2026-10-30', logged_at: '2026-10-30T07:00:00.000Z' });
    expect(groupByDay([a, b, c])).toEqual([
      { date: '2026-10-31', sessions: [b] },
      { date: '2026-10-30', sessions: [c, a] },
    ]);
    expect(groupByDay([])).toEqual([]);
  });
});

describe('dayLabel', () => {
  it('names today and yesterday, across a month boundary', () => {
    expect(dayLabel('2026-11-01', TODAY)).toBe('Today');
    expect(dayLabel('2026-10-31', TODAY)).toBe('Yesterday');
    expect(dayLabel('2026-10-29', TODAY)).not.toMatch(/Today|Yesterday/);
  });
});
