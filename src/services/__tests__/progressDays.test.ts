import {
  appSessionsByDay,
  describeDaySessions,
  daySessionsFor,
  logKindLabel,
  markProgressStale,
  getProgressVersion,
  progressNeedsReload,
  PROGRESS_REFRESH_MS,
  rememberDaySessions,
  showedUpDays,
} from '../progress';
import { buildHomeDashboard } from '../homeDashboard';
import type { HomeAppData } from '../homeDashboardLoad';
import type { CompletionLog } from '../../types';
import type { CompletedMeditateSession } from '../../types/meditate';
import type { CompletedWorkoutSession } from '../../types/workouts';
import type { MealsDay, MealsRules } from '../../types/meals';
import { DEFAULT_MEALS_SCORING } from '../../data/mealGroups';

jest.mock('../willpower', () => ({
  subtractWillpowerPoints: jest.fn(),
  recalculateUserStats: jest.fn(),
}));

const TODAY = '2026-10-24';

const sit = (date: string, at = '08:00'): CompletedMeditateSession =>
  ({ id: `${date}-${at}`, mode: 'sit', started_at: `${date}T${at}:00`, finished_at: `${date}T${at}:30`, date }) as CompletedMeditateSession;

const localIso = (date: string, hour = 18): string => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, hour).toISOString();
};

const workout = (date: string): CompletedWorkoutSession =>
  ({
    id: `${date}-w`,
    workout_name: 'Push Day',
    started_at: localIso(date),
    finished_at: localIso(date, 19),
    duration_sec: 3600,
    total_sets: 0,
    total_volume_kg: 0,
    blocks: [],
    prs: [],
  }) as unknown as CompletedWorkoutSession;

const RULES: MealsRules = {
  strict: false,
  group_goals: [],
  scoring: DEFAULT_MEALS_SCORING,
};

const mealsDay = (date: string, over: Partial<MealsDay> = {}): MealsDay => ({
  date,
  plates: [{ id: 'lunch', groups: ['veggies'], logged_at: '' }],
  ...over,
});

const rating = (appId: string, date: string, id = `${appId}-${date}`): CompletionLog =>
  ({ id, user_id: 'u', type: 'nudge', reference_id: `app:${appId}`, date, points: 1, difficulty: 1 }) as CompletionLog;

const apps = (over: Partial<HomeAppData> = {}): HomeAppData => ({
  today: TODAY,
  meditateSessions: [],
  meditateGoal: 5,
  workoutSessions: [],
  workoutsGoal: 3,
  exercisesById: {},
  unit: 'lb',
  phase: undefined,
  mealsDays: {},
  mealsRules: RULES,
  mealsGoal: 5,
  ...over,
});

describe('appSessionsByDay', () => {
  it('counts a finished session that was never rated', () => {
    const byDay = appSessionsByDay(apps({ meditateSessions: [sit('2026-10-20')] }), []);
    expect(byDay.get('2026-10-20')).toEqual({ meditate: 1 });
  });

  it('counts a day with meals logged, and not an empty one', () => {
    const byDay = appSessionsByDay(
      apps({ mealsDays: { '2026-10-21': mealsDay('2026-10-21'), '2026-10-22': mealsDay('2026-10-22', { plates: [] }) } }),
      []
    );
    expect(byDay.get('2026-10-21')).toEqual({ meals: 1 });
    expect(byDay.has('2026-10-22')).toBe(false);
  });

  it('pairs a rating with its session rather than counting both', () => {
    const byDay = appSessionsByDay(
      apps({ meditateSessions: [sit('2026-10-20'), sit('2026-10-20', '20:00')], workoutSessions: [workout('2026-10-20')] }),
      [rating('meditate', '2026-10-20'), rating('workouts', '2026-10-19')]
    );
    expect(byDay.get('2026-10-20')).toEqual({ meditate: 2, workouts: 1 });
    // A Workouts past session: a rating with no saved session still counts.
    expect(byDay.get('2026-10-19')).toEqual({ workouts: 1 });
  });

  it("has exactly Today's streak days", () => {
    const data = apps({
      meditateSessions: [sit('2026-10-24'), sit('2026-10-10')],
      workoutSessions: [workout('2026-10-23')],
      mealsDays: { '2026-10-22': mealsDay('2026-10-22'), '2026-10-18': mealsDay('2026-10-18', { plates: [] }) },
    });
    const logs = [rating('workouts', '2026-10-15'), rating('meals', '2026-10-12')];
    const dashboard = buildHomeDashboard({ ...data, logs });
    expect([...appSessionsByDay(data, logs).keys()].sort()).toEqual(dashboard.activity.activeDays);
  });
});

describe('showedUpDays', () => {
  it('adds every check-in day to the session days', () => {
    expect([...showedUpDays(['2026-10-20'], [{ date: '2026-10-01' }, { date: '2026-10-20' }])].sort()).toEqual([
      '2026-10-01',
      '2026-10-20',
    ]);
  });
});

describe("the day's page", () => {
  it('describes sessions in app order', () => {
    expect(describeDaySessions({ meals: 1, meditate: 2, workouts: 1 })).toEqual([
      'Meditate · 2 sessions',
      'Workouts · 1 session',
      'Meals · logged',
    ]);
    expect(describeDaySessions(undefined)).toEqual([]);
  });

  it('only hands sessions to the account that read them', () => {
    rememberDaySessions('u1', new Map([['2026-10-20', { meditate: 1 }]]));
    expect(daySessionsFor('u1', '2026-10-20')).toEqual({ meditate: 1 });
    expect(daySessionsFor('u2', '2026-10-20')).toBeUndefined();
    expect(daySessionsFor('u1', '2026-10-21')).toBeUndefined();
  });

  it('labels app sessions as sessions, not habits', () => {
    expect(logKindLabel({ type: 'nudge', reference_id: 'app:meals' })).toBe('Session');
    expect(logKindLabel({ type: 'nudge', reference_id: 'habit-1' })).toBe('Habit');
    expect(logKindLabel({ type: 'challenge', reference_id: 'c1' })).toBe('Challenge');
    expect(logKindLabel({ type: 'craving', reference_id: 'x' })).toBe('Craving');
  });
});

describe('progressNeedsReload', () => {
  const stamp = { userId: 'u1', at: 1_000_000, version: 3 };

  it('serves a quick tab switch from what is on screen', () => {
    expect(progressNeedsReload(stamp, 'u1', stamp.at + PROGRESS_REFRESH_MS - 1, 3)).toBe(false);
  });

  it('reads again when stale, for another account, after a change, or never loaded', () => {
    expect(progressNeedsReload(stamp, 'u1', stamp.at + PROGRESS_REFRESH_MS, 3)).toBe(true);
    expect(progressNeedsReload(stamp, 'u2', stamp.at, 3)).toBe(true);
    expect(progressNeedsReload(stamp, 'u1', stamp.at, 4)).toBe(true);
    expect(progressNeedsReload(null, 'u1', stamp.at)).toBe(true);
  });

  it('a change made here moves the version', () => {
    const before = getProgressVersion();
    markProgressStale();
    expect(getProgressVersion()).toBe(before + 1);
  });
});
