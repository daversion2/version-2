import { cravingWeek } from '../cravings';

// 2026-10-14 is a Wednesday; the week started Monday 10-12.
const TODAY = '2026-10-14';

describe('cravingWeek', () => {
  it('counts this week only, and adds up XP as the session awards it', () => {
    const logs = [
      { date: '2026-10-12', outcome: 'passed' as const },
      { date: TODAY, outcome: 'passed' as const },
      { date: TODAY, outcome: 'gave_in' as const },
      { date: '2026-10-11', outcome: 'passed' as const }, // last Sunday
    ];
    expect(cravingWeek(logs, TODAY)).toEqual({ passed: 2, gaveIn: 1, xp: 5 });
  });

  it('is all zeros with nothing logged', () => {
    expect(cravingWeek([], TODAY)).toEqual({ passed: 0, gaveIn: 0, xp: 0 });
  });
});
