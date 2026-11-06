import {
  addDays,
  appFriction,
  buildHomeDashboard,
  countServings,
  dayStreak,
  describeFriction,
  describeInsight,
  describeVsPrior,
  mealsDashboard,
  mealsDayState,
  meditateDashboard,
  profileActivityPatch,
  progressOf,
  ratingDates,
  recentDayLabel,
  sessionsByDay,
  standoutLift,
  weekGrid,
  weekStreak,
  windowDates,
  workoutsDashboard,
} from '../homeDashboard';
import type { CompletionLog } from '../../types';
import type { CompletedMeditateSession } from '../../types/meditate';
import type { CompletedWorkoutSession, Exercise, LoggedSet, TrainingPhase } from '../../types/workouts';
import type { FoodGroupId, MealPlate, MealsDay, MealsRules } from '../../types/meals';
import { DEFAULT_MEALS_SCORING } from '../../data/mealGroups';

// A Saturday. The window is Sun 18th – Sat 24th; the one before, 11th – 17th.
const TODAY = '2026-10-24';

const sit = (date: string, min: number, at = '08:00'): CompletedMeditateSession =>
  ({
    id: `${date}-${at}`,
    mode: 'sit',
    style: 'timer',
    planned_sec: min * 60,
    duration_sec: min * 60,
    ended_early: false,
    started_at: `${date}T${at}:00`,
    finished_at: `${date}T${at}:30`,
    date,
  }) as CompletedMeditateSession;

const localIso = (date: string, hour = 18): string => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, hour).toISOString();
};

const set = (exerciseId: string, weightKg: number, reps: number): LoggedSet =>
  ({ exerciseId, weightKg, reps, round: 0, at: '' }) as LoggedSet;

const workout = (date: string, volume: number, sets: LoggedSet[] = [], name = 'Push Day'): CompletedWorkoutSession =>
  ({
    id: `${date}-${name}`,
    workout_name: name,
    started_at: localIso(date),
    finished_at: localIso(date, 19),
    duration_sec: 3600,
    total_sets: sets.length,
    total_volume_kg: volume,
    blocks: [{ sets } as unknown as CompletedWorkoutSession['blocks'][number]],
    prs: [],
  }) as CompletedWorkoutSession;

const EXERCISES: Record<string, Exercise> = {
  bench: { id: 'bench', name: 'Bench Press', kind: 'weight', muscle: 'chest' },
  squat: { id: 'squat', name: 'Squat', kind: 'weight', muscle: 'legs' },
};

const RULES: MealsRules = {
  strict: false,
  group_goals: [],
  scoring: DEFAULT_MEALS_SCORING,
};

let plateId = 0;
const plate = (...groups: FoodGroupId[]): MealPlate => ({ id: `p${++plateId}`, groups, logged_at: '' });

const mealsDay = (date: string, over: Partial<MealsDay> = {}): MealsDay => ({
  date,
  plates: [plate('veggies', 'chicken'), plate('veggies', 'grains')],
  ...over,
});

const log = (reference_id: string, date: string, resistance?: number, resistance_scale = 3): CompletionLog =>
  ({
    id: `${reference_id}-${date}-${resistance}`,
    user_id: 'u',
    type: 'nudge',
    reference_id,
    points: 1,
    // 0 reads as unrated, the way mirror logs and unrated check-ins are stored.
    difficulty: resistance === undefined ? 0 : 1,
    resistance,
    resistance_scale,
    date,
  }) as CompletionLog;

describe('windows', () => {
  it('runs seven days ending today, oldest first', () => {
    expect(windowDates(TODAY)).toEqual([
      '2026-10-18',
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
    ]);
    expect(windowDates(TODAY, 1)[0]).toBe('2026-10-11');
    expect(windowDates(TODAY, 1)[6]).toBe('2026-10-17');
  });

  it('crosses month ends', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
  });
});

describe('recentDayLabel', () => {
  it('never shows last week as a weekday', () => {
    expect(recentDayLabel('2026-10-24', TODAY)).toBe('Today');
    expect(recentDayLabel('2026-10-23', TODAY)).toBe('Yesterday');
    expect(recentDayLabel('2026-10-19', TODAY)).toBe('Mon');
    expect(recentDayLabel('2026-10-17', TODAY)).toBe('Oct 17'); // a Saturday, a week back
  });
});

describe('describeVsPrior', () => {
  it('says which way and by how much', () => {
    expect(describeVsPrior(132, 114, 'min')).toBe('+18 min vs the 7 days before');
    expect(describeVsPrior(2, 3, 'sessions')).toBe('−1 session vs the 7 days before');
    expect(describeVsPrior(4, 5, 'days')).toBe('−1 day vs the 7 days before');
    expect(describeVsPrior(3, 1, 'days')).toBe('+2 days vs the 7 days before');
    expect(describeVsPrior(46, 47, 'min')).toBe('−1 min vs the 7 days before');
    expect(describeVsPrior(5, 5, 'days')).toBe('Same as the 7 days before');
    expect(describeVsPrior(0, 0, 'min')).toBeNull();
  });
});

describe('sessionsByDay', () => {
  const day = (docs: string[], ratings: string[], d: string) => sessionsByDay(docs, ratings).get(d) ?? 0;

  it('counts a rated session once', () => {
    expect(day(['2026-10-24'], ['2026-10-24'], '2026-10-24')).toBe(1);
  });

  it('counts a session whose rating was cancelled', () => {
    expect(day(['2026-10-24'], [], '2026-10-24')).toBe(1);
  });

  it('counts a past session that only has a rating', () => {
    expect(day([], ['2026-10-24'], '2026-10-24')).toBe(1);
  });

  it('takes the larger of sessions and ratings on a day', () => {
    expect(day(['2026-10-24', '2026-10-24'], ['2026-10-24'], '2026-10-24')).toBe(2);
    expect(day(['2026-10-24'], ['2026-10-24', '2026-10-24'], '2026-10-24')).toBe(2);
  });

  it('counts a session rated after midnight once, on the day it started', () => {
    const docs = [{ id: 'sess-1', date: '2026-10-23' }];
    const byDay = sessionsByDay(docs, [{ date: '2026-10-24', sessionId: 'sess-1' }]);
    expect(byDay.get('2026-10-23')).toBe(1);
    expect(byDay.has('2026-10-24')).toBe(false);
  });

  it('keeps a rating whose session is not loaded, and old ratings with no session id', () => {
    const byDay = sessionsByDay(
      [{ id: 'sess-1', date: '2026-10-23' }],
      [{ date: '2026-10-24', sessionId: 'sess-other' }, { date: '2026-10-22' }, '2026-10-23']
    );
    expect(byDay.get('2026-10-22')).toBe(1);
    expect(byDay.get('2026-10-23')).toBe(1);
    expect(byDay.get('2026-10-24')).toBe(1);
  });

  it('reads ratings for one app and skips mirror logs', () => {
    const logs = [
      log('app:workouts', '2026-10-23', 2),
      log('app:meditate', '2026-10-23', 1),
      { ...log('habit-workout', '2026-10-23', undefined), mirror_of: 'x' } as CompletionLog,
    ];
    expect(ratingDates(logs, 'workouts')).toEqual(['2026-10-23']);
  });
});

describe('dayStreak', () => {
  it('counts back from today', () => {
    expect(dayStreak(new Set(['2026-10-22', '2026-10-23', '2026-10-24']), TODAY)).toBe(3);
  });

  it('a today with nothing yet does not break it', () => {
    expect(dayStreak(new Set(['2026-10-22', '2026-10-23']), TODAY)).toBe(2);
  });

  it('a missed yesterday ends it', () => {
    expect(dayStreak(new Set(['2026-10-21', '2026-10-22']), TODAY)).toBe(0);
  });
});

describe('weekStreak', () => {
  // Weeks start Monday: 19th, 12th, 5th.
  const dates = ['2026-10-06', '2026-10-08', '2026-10-13', '2026-10-15', '2026-10-20'];

  it('counts past weeks that met the goal; an unfinished week does not break the run', () => {
    expect(weekStreak(dates, 2, TODAY)).toBe(2);
  });

  it('includes this week once it is met', () => {
    expect(weekStreak([...dates, '2026-10-22'], 2, TODAY)).toBe(3);
  });

  it('a short week ends it', () => {
    expect(weekStreak(['2026-10-06', '2026-10-08', '2026-10-13'], 2, TODAY)).toBe(0);
  });
});

describe('meditateDashboard', () => {
  const sessions = [
    sit('2026-10-24', 15),
    sit('2026-10-24', 10, '20:00'),
    sit('2026-10-22', 20),
    sit('2026-10-16', 30),
    sit('2026-10-02', 5),
  ];

  it('totals the window and the window before', () => {
    const d = meditateDashboard(sessions, 5, TODAY);
    expect(d.minutes).toBe(45);
    expect(d.priorMinutes).toBe(30);
  });

  it('counts sessions, not days', () => {
    expect(meditateDashboard(sessions, 5, TODAY).sessions).toBe(3);
  });

  it('reports the newest session as the last one', () => {
    expect(meditateDashboard(sessions, 5, TODAY).lastSessionMinutes).toBe(10);
  });

  it('streaks by day', () => {
    const d = meditateDashboard([sit('2026-10-23', 10), sit('2026-10-24', 10)], 5, TODAY);
    expect(d.streakDays).toBe(2);
  });

  it('is empty-safe', () => {
    const d = meditateDashboard([], 5, TODAY);
    expect(d.lastSessionMinutes).toBeNull();
    expect(d.series).toEqual([]);
    expect(d.streakDays).toBe(0);
  });
});

describe('workoutsDashboard', () => {
  it('compares volume with the week before', () => {
    const sessions = [workout('2026-10-20', 5400), workout('2026-10-14', 5000)];
    const d = workoutsDashboard(sessions, 3, EXERCISES, 'lb', undefined, TODAY);
    expect(d.sessions).toBe(1);
    expect(d.priorSessions).toBe(1);
    expect(d.volumeChangePct).toBe(8);
  });

  it('has no change to show without an earlier week', () => {
    const d = workoutsDashboard([workout('2026-10-20', 5400)], 3, EXERCISES, 'lb', undefined, TODAY);
    expect(d.volumeChangePct).toBeNull();
  });

  it('names the phase week', () => {
    const phase = { status: 'training', start_date: '2026-10-05', weeks: 6 } as TrainingPhase;
    expect(workoutsDashboard([], 3, EXERCISES, 'lb', phase, TODAY).phaseLine).toBe('Week 3 of 6');
  });

  it('has no week before the baseline test is done', () => {
    const phase = { status: 'baseline', start_date: '2026-10-05', weeks: 6 } as TrainingPhase;
    expect(workoutsDashboard([], 3, EXERCISES, 'lb', phase, TODAY).phaseLine).toBe('Baseline test to do');
  });
});

describe('sessions without a saved session', () => {
  it('counts a Workouts past session toward the goal, the grid and the streak', () => {
    const d = workoutsDashboard([workout('2026-10-20', 5400)], 3, EXERCISES, 'lb', undefined, TODAY, [
      '2026-10-20',
      '2026-10-22',
    ]);
    expect(d.sessions).toBe(2);
    expect(d.activeDates.sort()).toEqual(['2026-10-20', '2026-10-22']);
    expect(d.volumeKg).toBe(5400); // no sets to add for the past session
  });

  it('keeps a Meditate streak alive with an unrated session', () => {
    const d = meditateDashboard([sit('2026-10-23', 10), sit('2026-10-24', 10)], 5, TODAY, ['2026-10-24']);
    expect(d.sessions).toBe(2);
    expect(d.streakDays).toBe(2);
  });
});

describe('standoutLift', () => {
  it('picks the exercise whose best set moved furthest', () => {
    const sessions = [
      workout('2026-10-01', 0, [set('bench', 60, 5), set('squat', 100, 5)]),
      workout('2026-10-10', 0, [set('bench', 65, 5), set('squat', 101, 5)]),
      workout('2026-10-20', 0, [set('bench', 70, 5), set('squat', 102, 5)]),
    ];
    const lift = standoutLift(sessions, EXERCISES, 'kg', TODAY);
    expect(lift?.name).toBe('Bench Press');
    expect(lift?.line).toBe('Up 10 kg over 3 sessions');
  });

  it('skips exercises not trained in the last four weeks', () => {
    const sessions = [workout('2026-08-01', 0, [set('bench', 60, 5)]), workout('2026-08-08', 0, [set('bench', 80, 5)])];
    expect(standoutLift(sessions, EXERCISES, 'kg', TODAY)).toBeNull();
  });
});

describe('meals', () => {
  it('a closed day keeps its result', () => {
    expect(mealsDayState('2026-10-20', mealsDay('2026-10-20', { result: 'off' }), RULES, TODAY)).toBe('off');
  });

  it('scores a past day nobody closed — it closed on its own at midnight', () => {
    expect(mealsDayState('2026-10-20', mealsDay('2026-10-20'), RULES, TODAY)).toBe('on');
    const low = mealsDay('2026-10-20', { plates: [plate('processed')] });
    expect(mealsDayState('2026-10-20', low, RULES, TODAY)).toBe('off');
  });

  it('today stays pending until it is closed out', () => {
    expect(mealsDayState(TODAY, mealsDay(TODAY), RULES, TODAY)).toBe('pending');
    expect(mealsDayState(TODAY, mealsDay(TODAY, { closed_at: 'x', result: 'on' }), RULES, TODAY)).toBe('on');
  });

  it('a past day with nothing logged is empty, today is pending', () => {
    expect(mealsDayState('2026-10-20', undefined, RULES, TODAY)).toBe('empty');
    expect(mealsDayState(TODAY, undefined, RULES, TODAY)).toBe('pending');
  });

  it('reads a day saved by meal slot, before plates', () => {
    const legacy = {
      date: '2026-10-20',
      meals: {
        lunch: { groups: ['veggies', 'chicken'], logged_at: '' },
        dinner: { skipped: true, logged_at: '' },
      },
      extras: [{ id: 'x', groups: ['veggies', 'fruit'], logged_at: '' }],
    } as unknown as MealsDay;
    expect(mealsDayState('2026-10-20', legacy, RULES, TODAY)).toBe('on');
    expect(countServings([legacy])).toEqual({ veggies: 2, chicken: 1, fruit: 1 });
  });

  it('counts one serving per plate', () => {
    const day = mealsDay('2026-10-20', { plates: [plate('veggies', 'veggies', 'chicken'), plate('veggies', 'fruit')] });
    expect(countServings([day])).toEqual({ veggies: 2, chicken: 1, fruit: 1 });
  });

  it('lists whole-food servings, most first, and counts days on target', () => {
    const days: Record<string, MealsDay> = {
      '2026-10-23': mealsDay('2026-10-23'),
      '2026-10-24': mealsDay('2026-10-24'),
      '2026-10-15': mealsDay('2026-10-15'),
    };
    const d = mealsDashboard(days, RULES, TODAY, Object.keys(days));
    // Today is still open, so only yesterday is on target yet.
    expect(d.onTarget).toBe(1);
    expect(d.priorOnTarget).toBe(1);
    expect(d.servings[0]).toEqual({ group: 'veggies', count: 4 });
    expect(d.servings.find((s) => s.group === 'pork')).toEqual({ group: 'pork', count: 0 });
    expect(d.streakDays).toBe(2);
    expect(d.days.map((x) => x.state).slice(4)).toEqual(['empty', 'on', 'pending']);
  });
});

describe('meals: showing up', () => {
  // Founder Q2: any meal logged counts as showing up. Since 2026-11-01 the ring
  // counts those logged days too, against the Meals goal (default 5).
  const low = (date: string) =>
    mealsDay(date, { plates: [plate('veggies', 'chicken'), plate('veggies', 'processed')] });

  it('counts a logged day that missed the target', () => {
    const days = { '2026-10-23': low('2026-10-23'), '2026-10-24': mealsDay('2026-10-24', { closed_at: 'x', result: 'on' }) };
    const d = mealsDashboard(days, RULES, TODAY, Object.keys(days));
    expect(d.onTarget).toBe(1);
    expect(d.loggedDates).toEqual(['2026-10-23', '2026-10-24']);
    expect(d.streakDays).toBe(2);
  });

  it('fills the week grid and the combined streak from logged days', () => {
    const d = buildHomeDashboard({
      today: TODAY,
      meditateSessions: [],
      meditateGoal: 5,
      workoutSessions: [],
      workoutsGoal: 3,
      exercisesById: EXERCISES,
      unit: 'lb',
      phase: undefined,
      mealsDays: { '2026-10-23': low('2026-10-23'), '2026-10-24': low('2026-10-24') },
      mealsRules: RULES,
      logs: [],
    });
    expect(d.grid.rows.meals.slice(5)).toEqual([true, true]);
    expect(d.combinedStreak).toBe(2);
    expect(d.rings.find((r) => r.appId === 'meals')).toMatchObject({ done: 2, goal: 5 });
  });

  it('measures the ring against the saved Meals goal', () => {
    const days = { '2026-10-23': low('2026-10-23') };
    expect(mealsDashboard(days, RULES, TODAY, Object.keys(days), 2).goal).toBe(2);
    expect(mealsDashboard(days, RULES, TODAY, Object.keys(days)).goal).toBe(5);
  });
});

describe('meals scores', () => {
  // Default weights: veggies + chicken = 70 + 2 nutrients × 5 = 80; veggies + grains = 75.
  it('gives each day its average plate score, null with nothing scored', () => {
    const days = { '2026-10-24': mealsDay('2026-10-24') };
    const d = mealsDashboard(days, RULES, TODAY, Object.keys(days));
    expect(d.days[6].score).toBe(78);
    expect(d.days[5].score).toBeNull();
    expect(d.threshold).toBe(70);
  });

  it('averages every plate in the window, and the window before', () => {
    const days = {
      '2026-10-23': mealsDay('2026-10-23'),
      '2026-10-24': mealsDay('2026-10-24', { plates: [plate('veggies', 'chicken')] }),
      '2026-10-15': mealsDay('2026-10-15', { plates: [plate('veggies', 'grains')] }),
    };
    const d = mealsDashboard(days, RULES, TODAY, Object.keys(days));
    expect(d.averageScore).toBe(78); // 80, 75, 80
    expect(d.priorAverageScore).toBe(75);
  });

  it('a day averaging under the threshold is off target, with its score', () => {
    const low = mealsDay('2026-10-23', { plates: [plate('veggies', 'chicken'), plate('veggies', 'processed')] });
    const d = mealsDashboard({ '2026-10-23': low }, RULES, TODAY, ['2026-10-23']);
    expect(d.days[5]).toEqual({ date: '2026-10-23', state: 'off', score: 45 }); // (80 + 10) / 2
    expect(d.onTarget).toBe(0);
  });

  it('has no average with nothing logged', () => {
    expect(mealsDashboard({}, RULES, TODAY, []).averageScore).toBeNull();
  });
});

describe('friction', () => {
  it('averages this app’s ratings in each window, on the current scale', () => {
    const logs = [
      log('app:meditate', '2026-10-24', 1),
      log('app:meditate', '2026-10-22', 2),
      log('app:meditate', '2026-10-15', 3),
      log('app:workouts', '2026-10-23', 3),
      log('app:meditate', '2026-10-20', 9, 10),
    ];
    const f = appFriction(logs, 'meditate', TODAY);
    expect(f.count).toBe(3);
    expect(f.avg).toBeCloseTo(2);
    expect(f.priorAvg).toBe(3);
  });

  it('ignores unrated logs', () => {
    expect(appFriction([log('app:meals', '2026-10-24', undefined)], 'meals', TODAY).avg).toBeNull();
  });

  it('describes the level and the direction', () => {
    expect(describeFriction({ avg: 1.6, priorAvg: 2.1, count: 4 })).toBe('Mostly manageable (1.6 of 3) · down from 2.1');
    expect(describeFriction({ avg: 1.2, priorAvg: null, count: 2 })).toBe('Mostly easy (1.2 of 3)');
    expect(describeFriction({ avg: 2.6, priorAvg: 2.6, count: 2 })).toBe('Mostly hard (2.6 of 3) · same as the week before');
    expect(describeFriction({ avg: null, priorAvg: 2, count: 0 })).toBeNull();
  });
});

describe('across the apps', () => {
  const rings = [progressOf('meditate', 5, 5), progressOf('workouts', 2, 3), progressOf('meals', 5, 7)];

  it('caps progress at the goal', () => {
    expect(progressOf('workouts', 4, 3).pct).toBe(1);
  });

  it('names the most consistent app and the easiest one', () => {
    expect(
      describeInsight(rings, {
        meditate: { avg: 1.8, priorAvg: null, count: 5 },
        workouts: { avg: 1.4, priorAvg: null, count: 2 },
      })
    ).toBe('Most consistent: Meditate (100%) · Workouts has felt easiest lately');
  });

  it('leaves out the friction note with nothing rated', () => {
    expect(describeInsight(rings, {})).toBe('Most consistent: Meditate (100%)');
  });

  it('says nothing when nothing has happened', () => {
    expect(describeInsight([progressOf('meditate', 0, 5)], {})).toBeNull();
  });

  it('marks the days each app showed up, today last', () => {
    const grid = weekGrid(TODAY, { meditate: ['2026-10-24'], workouts: ['2026-10-18'], meals: [] });
    expect(grid.dates[6]).toBe(TODAY);
    expect(grid.rows.meditate[6]).toBe(true);
    expect(grid.rows.workouts[0]).toBe(true);
    expect(grid.rows.meals.every((x) => !x)).toBe(true);
  });

  it('streaks any day something happened', () => {
    const d = buildHomeDashboard({
      today: TODAY,
      meditateSessions: [sit('2026-10-24', 10)],
      meditateGoal: 5,
      workoutSessions: [workout('2026-10-23', 1000)],
      workoutsGoal: 3,
      exercisesById: EXERCISES,
      unit: 'lb',
      phase: undefined,
      mealsDays: { '2026-10-22': mealsDay('2026-10-22') },
      mealsRules: RULES,
      logs: [],
    });
    expect(d.combinedStreak).toBe(3);
    expect(d.rings.map((r) => r.done)).toEqual([1, 1, 1]);
  });

  it('leaves a switched-off app out of the rings, but not the streak', () => {
    const d = buildHomeDashboard({
      today: TODAY,
      meditateSessions: [sit('2026-10-24', 10)],
      meditateGoal: 5,
      workoutSessions: [workout('2026-10-23', 1000)],
      workoutsGoal: 3,
      exercisesById: EXERCISES,
      unit: 'lb',
      phase: undefined,
      mealsDays: {},
      mealsRules: RULES,
      hiddenApps: ['workouts'],
      logs: [],
    });
    expect(d.rings.map((r) => r.appId)).toEqual(['meditate', 'meals']);
    expect(d.combinedStreak).toBe(2);
  });
});

describe('the user doc', () => {
  const build = (over: Partial<Parameters<typeof buildHomeDashboard>[0]> = {}) =>
    buildHomeDashboard({
      today: TODAY,
      meditateSessions: [],
      meditateGoal: 5,
      workoutSessions: [],
      workoutsGoal: 3,
      exercisesById: EXERCISES,
      unit: 'lb',
      phase: undefined,
      mealsDays: {},
      mealsRules: RULES,
      logs: [],
      ...over,
    });

  it('counts a rating once when a reload and the screen both hold it', () => {
    const rating = log('app:meditate', '2026-10-24', 1);
    const d = build({ meditateSessions: [sit('2026-10-24', 1)], logs: [rating, { ...rating }] });
    expect(d.meditate.sessions).toBe(1);
    expect(d.friction.meditate.count).toBe(1);
  });

  it('counts a sit that crossed midnight once across the dashboard', () => {
    const late = { ...sit('2026-10-23', 20, '23:50'), id: 'late-sit' };
    const rating = { ...log('app:meditate', '2026-10-24', 1), session_id: 'late-sit' } as CompletionLog;
    const d = build({ meditateSessions: [late], logs: [rating] });
    expect(d.meditate.sessions).toBe(1);
    expect(d.activity.sessionsCompleted).toBe(1);
    expect(d.activity.activeDays).toEqual(['2026-10-23']);
    // The rating still counts as friction for the window.
    expect(d.friction.meditate.count).toBe(1);
  });

  it('sums sessions and apps across what was loaded', () => {
    const { activity } = build({
      meditateSessions: [sit('2026-10-24', 10), sit('2026-10-24', 10, '20:00'), sit('2026-09-01', 5)],
      workoutSessions: [workout('2026-10-20', 1000)],
      logs: [log('app:workouts', '2026-10-22', 2)], // a past session
    });
    expect(activity.sessionsCompleted).toBe(5);
    expect(activity.appsTried).toBe(2);
    expect(activity.appsActive).toBe(2);
    expect(activity.activeDays).toEqual(['2026-09-01', '2026-10-20', '2026-10-22', '2026-10-24']);
  });

  it('counts an app as tried but not active after 28 quiet days', () => {
    const { activity } = build({ meditateSessions: [sit('2026-09-01', 5)] });
    expect(activity.appsTried).toBe(1);
    expect(activity.appsActive).toBe(0);
  });

  const activity = (activeDays: string[]) => ({ activeDays, sessionsCompleted: 0, appsTried: 0, appsActive: 0 });

  it('corrects the stored streak from past days', () => {
    expect(
      profileActivityPatch(activity(['2026-10-21', '2026-10-22', '2026-10-23']), TODAY, {
        currentStreak: 9,
        lastActivityDate: '2026-10-23',
        apps_active: 0,
      })
    ).toEqual({ currentStreak: 3 });
  });

  it('breaks a streak whose last day was before yesterday', () => {
    expect(
      profileActivityPatch(activity(['2026-10-20']), TODAY, {
        currentStreak: 4,
        lastActivityDate: '2026-10-23',
        apps_active: 0,
      })
    ).toEqual({ currentStreak: 0, lastActivityDate: '2026-10-20' });
  });

  it("leaves today to the rating, so its streak celebration still fires", () => {
    // An unrated session today: the doc keeps yesterday's run until tomorrow.
    expect(
      profileActivityPatch(activity(['2026-10-23', '2026-10-24']), TODAY, {
        currentStreak: 1,
        lastActivityDate: '2026-10-23',
        apps_active: 0,
      })
    ).toBeNull();
    // Already rated today: hands off entirely.
    expect(
      profileActivityPatch(activity(['2026-10-20']), TODAY, {
        currentStreak: 1,
        lastActivityDate: TODAY,
        apps_active: 0,
      })
    ).toBeNull();
  });

  it('only ever raises the lifetime counters', () => {
    const a = { activeDays: [], sessionsCompleted: 10, appsTried: 2, appsActive: 1 };
    expect(profileActivityPatch(a, TODAY, { lastActivityDate: TODAY, sessions_completed: 40, apps_tried: 3, apps_active: 1 })).toBeNull();
    expect(profileActivityPatch(a, TODAY, { lastActivityDate: TODAY, sessions_completed: 4, apps_tried: 1, apps_active: 1 })).toEqual({
      sessions_completed: 10,
      apps_tried: 2,
    });
  });
});
