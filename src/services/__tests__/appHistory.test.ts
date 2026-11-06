import { appHistory, AppHistoryInput, historyBuckets, historyDays } from '../appHistory';
import type { CompletedMeditateSession } from '../../types/meditate';
import type { CompletedWorkoutSession } from '../../types/workouts';
import type { MealsDay, MealsRules } from '../../types/meals';
import { DEFAULT_MEALS_SCORING } from '../../data/mealGroups';

const TODAY = '2026-10-31';

const RULES: MealsRules = {
  slots: [{ id: 'lunch', name: 'Lunch' }],
  strict: false,
  group_goals: [],
  scoring: DEFAULT_MEALS_SCORING,
};

const sit = (date: string, minutes: number) =>
  ({ id: `${date}-${minutes}`, date, duration_sec: minutes * 60, started_at: `${date}T08:00:00` }) as CompletedMeditateSession;

// Local noon, so the local date is the same in every timezone the tests run in.
const lift = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return { id: date, started_at: new Date(y, m - 1, d, 12).toISOString() } as CompletedWorkoutSession;
};

const closedDay = (date: string, result: 'on' | 'off'): MealsDay =>
  ({ date, plates: [], result }) as MealsDay;

const input = (over: Partial<AppHistoryInput> = {}): AppHistoryInput => ({
  today: TODAY,
  meditateSessions: [],
  workoutSessions: [],
  mealsDays: {},
  mealsRules: RULES,
  ...over,
});

describe('historyBuckets', () => {
  it('splits the week into 7 single days ending today', () => {
    const b = historyBuckets(TODAY, 'week');
    expect(b).toHaveLength(7);
    expect(b[0]).toEqual({ start: '2026-10-25', end: '2026-10-25' });
    expect(b[6]).toEqual({ start: TODAY, end: TODAY });
  });

  it('splits the month into 4 rolling weeks with no gaps', () => {
    expect(historyBuckets(TODAY, 'month')).toEqual([
      { start: '2026-10-04', end: '2026-10-10' },
      { start: '2026-10-11', end: '2026-10-17' },
      { start: '2026-10-18', end: '2026-10-24' },
      { start: '2026-10-25', end: '2026-10-31' },
    ]);
  });

  it('reaches back 180 days for six months', () => {
    const b = historyBuckets(TODAY, 'sixMonths');
    expect(b).toHaveLength(6);
    expect(b[5].end).toBe(TODAY);
    expect(historyDays('sixMonths')).toBe(180);
  });
});

describe('appHistory', () => {
  it('sums Meditate minutes per bar and ignores sessions outside the range', () => {
    const h = appHistory(
      'meditate',
      input({ meditateSessions: [sit('2026-10-31', 10), sit('2026-10-30', 5), sit('2026-10-01', 30)] }),
      'month'
    );
    expect(h.buckets.map((b) => b.value)).toEqual([0, 0, 0, 15]);
    expect(h.line).toBe('15 min · 4 weeks');
  });

  it('counts Workouts sessions, singular for one', () => {
    const h = appHistory('workouts', input({ workoutSessions: [lift('2026-10-29')] }), 'week');
    expect(h.buckets.map((b) => b.value)).toEqual([0, 0, 0, 0, 1, 0, 0]);
    expect(h.line).toBe('1 session · last 7 days');
  });

  it('counts Meals days on target, not days logged', () => {
    const h = appHistory(
      'meals',
      input({
        mealsDays: {
          '2026-10-31': closedDay('2026-10-31', 'on'),
          '2026-10-30': closedDay('2026-10-30', 'off'),
          '2026-10-20': closedDay('2026-10-20', 'on'),
        },
      }),
      'month'
    );
    expect(h.buckets.map((b) => b.value)).toEqual([0, 0, 1, 1]);
    expect(h.line).toBe('2 of 28 days on target');
  });

  it('reads all zeros, not a crash, for an account with nothing yet', () => {
    const h = appHistory('meals', input(), 'sixMonths');
    expect(h.total).toBe(0);
    expect(h.line).toBe('0 of 180 days on target');
  });
});
