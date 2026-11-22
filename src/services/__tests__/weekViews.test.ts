import { dayMarks, weekApp, weekDayIndex, weekDays, weekTotal, weekViewOf } from '../weekViews';

// 2026-11-22 is a Sunday; its week started Monday 11-16.
const SUNDAY = '2026-11-22';
const WEDNESDAY = '2026-11-18';

describe('weekViewOf', () => {
  it('reads a stored view, and falls back to rings', () => {
    expect(weekViewOf('grid')).toBe('grid');
    expect(weekViewOf('nonsense')).toBe('rings');
    expect(weekViewOf(null)).toBe('rings');
  });
});

describe('weekDays', () => {
  it('runs Monday to Sunday, Sunday included in its own week', () => {
    expect(weekDays(SUNDAY)).toEqual([
      '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22',
    ]);
    expect(weekDays(WEDNESDAY)[0]).toBe('2026-11-16');
  });
});

describe('dayMarks', () => {
  it('marks used days, today, days still ahead and past days missed', () => {
    expect(dayMarks(['2026-11-16', '2026-11-18'], WEDNESDAY)).toEqual([
      'done', 'open', 'done', 'future', 'future', 'future', 'future',
    ]);
    expect(dayMarks([], WEDNESDAY)[2]).toBe('today');
  });
});

describe('weekApp / weekTotal', () => {
  it('caps the ring at full and counts each app up to its goal', () => {
    const a = weekApp({ id: 'meals', title: 'Meals', color: '#000000', done: 6, goal: 5, dates: [] }, SUNDAY);
    expect(a.pct).toBe(1);
    expect(weekTotal([a, { done: 1, goal: 3 }])).toEqual({ done: 6, goal: 8 });
  });
});

describe('weekDayIndex', () => {
  it('counts from Monday', () => {
    expect(weekDayIndex('2026-11-16')).toBe(0);
    expect(weekDayIndex(SUNDAY)).toBe(6);
  });
});
