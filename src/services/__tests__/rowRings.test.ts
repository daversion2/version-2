import { clampRowGoal, rowGoalsOf, rowRing, urgesThisWeek, weekCount, weekDone } from '../rowRings';

// 2026-10-14 is a Wednesday; the week started Monday 10-12.
const TODAY = '2026-10-14';

describe('row goals', () => {
  it('defaults to 5 nights and 3 of each other, and clamps to 1–7', () => {
    expect(rowGoalsOf(null)).toEqual({ nightly: 5, craving: 3, hotcold: 3, avoidance: 3 });
    expect(rowGoalsOf({ row_goals: { nightly: 9, craving: 0 } })).toMatchObject({ nightly: 7, craving: 1 });
    expect(clampRowGoal(undefined, 'craving')).toBe(3);
  });
});

describe('counting the week', () => {
  it('counts each night once, Monday to today', () => {
    expect(weekDone(['2026-10-11', '2026-10-12', TODAY, TODAY, '2026-10-15'], TODAY)).toBe(2);
  });

  it('counts every session this week, repeats included, skipping blanks', () => {
    expect(weekCount([TODAY, TODAY, '2026-10-11', undefined], TODAY)).toBe(2);
  });

  it('counts every urge faced this week', () => {
    expect(urgesThisWeek([{ date: '2026-10-12' }, { date: TODAY }, { date: TODAY }, { date: '2026-10-11' }], TODAY)).toBe(3);
  });
});

describe('rowRing', () => {
  it('fills to the goal and stops at full', () => {
    expect(rowRing('nightly', 2, 5)).toEqual({ id: 'nightly', done: 2, goal: 5, pct: 0.4 });
    expect(rowRing('craving', 5, 3).pct).toBe(1);
  });
});
