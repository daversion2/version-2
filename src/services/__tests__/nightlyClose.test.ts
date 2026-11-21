import {
  appPlan,
  appsLoggedToday,
  formatPlan,
  getPlanForToday,
  isBadDay,
  isPlanDone,
  lastNights,
  loadNightlyClose,
  pickWin,
  planFromReflection,
  rowsActiveToday,
  sessionsToday,
  suggestPlanApp,
  weekCounts,
} from '../nightlyClose';
import { CompletionLog, DailyReflection } from '../../types';
import { addMockDocument, resetMockDB } from '../__mocks__/firestore';

// 2026-10-14 is a Wednesday; tomorrow (10-15) a Thursday.
const TODAY = '2026-10-14';
const TOMORROW = '2026-10-15';

const log = (refId: string, over: Partial<CompletionLog> = {}): CompletionLog =>
  ({
    id: `${refId}-${over.date ?? TODAY}-${over.completed_at ?? ''}`,
    user_id: 'u1',
    type: 'nudge',
    reference_id: refId,
    points: 1,
    difficulty: 1,
    resistance: 2,
    resistance_scale: 3,
    date: TODAY,
    ...over,
  }) as CompletionLog;

describe('sessionsToday / appsLoggedToday', () => {
  it("reads app sessions and their two ratings, leaving out Meals' day and habits", () => {
    const logs = [
      log('app:workouts', { resistance: 3, keep_going: 2, completed_at: 'b' }),
      log('app:meals', { day_rating: 2 } as Partial<CompletionLog>),
      log('old-habit'),
    ];
    expect(sessionsToday(logs)).toEqual([{ appId: 'workouts', start: 3, keepGoing: 2, completedAt: 'b' }]);
    expect(appsLoggedToday(logs)).toEqual(['workouts', 'meals']);
  });
});

describe('pickWin', () => {
  it('names a start that took everything first, the latest one', () => {
    const win = pickWin(
      [
        { appId: 'meditate', start: 3, completedAt: '08:00' },
        { appId: 'workouts', start: 3, completedAt: '18:00' },
        { appId: 'meditate', start: 1, keepGoing: 3, completedAt: '21:00' },
      ],
      ['meditate', 'workouts']
    );
    expect(win).toEqual({ kind: 'hardStart', appId: 'workouts' });
  });

  it('then staying with it when that took everything', () => {
    expect(pickWin([{ appId: 'meditate', start: 1, keepGoing: 3 }], ['meditate'])).toEqual({
      kind: 'hardStay',
      appId: 'meditate',
    });
  });

  it('otherwise counts what got done, and is null with nothing', () => {
    expect(pickWin([{ appId: 'meditate', start: 1 }], ['meditate', 'meals'])).toEqual({
      kind: 'logged',
      count: 2,
      appIds: ['meditate', 'meals'],
      rowIds: [],
    });
    expect(pickWin([], [])).toBeNull();
  });

  it('counts Craving Crusher, Hot & Cold and Avoidance too: a day with only those is not "nothing"', () => {
    expect(pickWin([], [], ['hotcold', 'craving'])).toEqual({
      kind: 'logged',
      count: 2,
      appIds: [],
      rowIds: ['hotcold', 'craving'],
    });
  });
});

describe('rowsActiveToday', () => {
  it('finds an urge, a session or a cleared task dated today', () => {
    expect(
      rowsActiveToday({ urgeDates: [TODAY], plungeDates: ['2026-10-13'], clearedDates: [TODAY] }, TODAY)
    ).toEqual(['craving', 'avoidance']);
    expect(rowsActiveToday({ urgeDates: [], plungeDates: [], clearedDates: [] }, TODAY)).toEqual([]);
  });
});

describe('isBadDay', () => {
  it("follows the grade once there is one", () => {
    expect(isBadDay({ grade: 'D', loggedToday: 3 })).toBe(true);
    expect(isBadDay({ grade: 'B', loggedToday: 0 })).toBe(false);
  });

  it('before grading, a day with nothing logged', () => {
    expect(isBadDay({ grade: null, loggedToday: 0 })).toBe(true);
    expect(isBadDay({ grade: null, loggedToday: 1 })).toBe(false);
  });
});

describe('suggestPlanApp', () => {
  it('picks the app furthest behind its weekly goal, first on a tie', () => {
    const apps = ['meditate', 'workouts', 'meals'] as const;
    expect(suggestPlanApp([...apps], { meditate: 2, workouts: 1, meals: 4 }, { meditate: 3, workouts: 3, meals: 5 })).toBe(
      'workouts'
    );
    expect(suggestPlanApp([...apps], {}, { meditate: 3, workouts: 3, meals: 5 })).toBe('meditate');
    expect(suggestPlanApp([], {}, {})).toBeNull();
  });
});

describe('appPlan / formatPlan', () => {
  it('reads as one sentence, and goes small on a bad day', () => {
    expect(formatPlan(appPlan('workouts', 'After coffee', false))).toBe('After coffee, I’ll do Workouts.');
    expect(formatPlan(appPlan('meditate', 'Before bed', true))).toBe('Before bed, I’ll do a 5-minute sit.');
    expect(formatPlan(appPlan('meals', 'At lunch', false))).toBe('At lunch, I’ll log my meals in Meals.');
  });
});

describe('lastNights', () => {
  it('lists the last 7 nights ending today, with gaps as null', () => {
    const nights = lastNights([{ date: TODAY, grade: 'B' }, { date: '2026-10-10', grade: 'C' }], TODAY);
    expect(nights.map((n) => n.date)).toEqual([
      '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', TODAY,
    ]);
    expect(nights.map((n) => n.grade)).toEqual([null, null, 'C', null, null, null, 'B']);
  });
});

describe('weekCounts', () => {
  it('counts app logs since Monday only', () => {
    const logs = [
      log('app:workouts', { date: '2026-10-12' }), // Monday
      log('app:workouts', { date: TODAY }),
      log('app:meditate', { date: '2026-10-11' }), // last Sunday
      log('old-habit', { date: TODAY }),
    ];
    expect(weekCounts(logs, TODAY)).toEqual({ workouts: 2 });
  });
});

describe('planFromReflection / isPlanDone', () => {
  const reflection = (over: Partial<DailyReflection>): DailyReflection =>
    ({ id: TODAY, user_id: 'u1', date: TODAY, grade: 'B', daily_summary: {}, created_at: '', ...over }) as DailyReflection;

  it('reads the saved plan back', () => {
    expect(
      planFromReflection(
        reflection({ prompt_ifthen_cue: 'I get home', prompt_ifthen_response: 'Workout', plan_habit_id: 'w' })
      )
    ).toEqual({ habitId: 'w', cue: 'I get home', response: 'Workout' });
    expect(
      planFromReflection(
        reflection({ prompt_ifthen_cue: 'After coffee', prompt_ifthen_response: 'do Workouts', plan_app_id: 'workouts' })
      )
    ).toEqual({ appId: 'workouts', cue: 'After coffee', response: 'do Workouts' });
  });

  it('has no plan when both halves are blank', () => {
    expect(planFromReflection(reflection({ prompt_ifthen_cue: '  ' }))).toBeNull();
    expect(planFromReflection(null)).toBeNull();
  });

  it('is done once the planned habit is logged that day, not on another day', () => {
    const plan = { habitId: 'w', cue: '', response: '' };
    expect(isPlanDone(plan, [log('w', { date: TOMORROW })], TOMORROW)).toBe(true);
    expect(isPlanDone(plan, [log('w', { date: TODAY })], TOMORROW)).toBe(false);
  });

  it('is done once the planned app has a session that day', () => {
    const plan = appPlan('workouts', 'After coffee', false);
    expect(isPlanDone(plan, [log('app:workouts', { date: TOMORROW })], TOMORROW)).toBe(true);
    expect(isPlanDone(plan, [log('app:meditate', { date: TOMORROW })], TOMORROW)).toBe(false);
  });

  it('never auto-completes a typed plan with no habit behind it', () => {
    expect(isPlanDone({ cue: 'x', response: 'y' }, [log('w', { date: TOMORROW })], TOMORROW)).toBe(false);
  });
});

describe('formatPlan', () => {
  it('reads as one sentence, and copes with either half missing', () => {
    expect(formatPlan({ cue: 'I get home', response: 'Workout' })).toBe('When I get home, then Workout.');
    expect(formatPlan({ cue: 'I get home', response: ' ' })).toBe('When I get home.');
    expect(formatPlan({ response: 'Workout' })).toBe('Workout');
  });
});

describe('loadNightlyClose', () => {
  beforeEach(() => resetMockDB());

  it('reads today’s Hot & Cold sessions and cleared Avoidance tasks', async () => {
    addMockDocument('users/u1/lab_hotcold_sessions', 'h1', { id: 'h1', kind: 'cold', date: TODAY, seconds: 120 });
    addMockDocument('users/u1/lab_avoidance_tasks', 't1', { id: 't1', status: 'done', done_date: TODAY, created_date: TODAY });
    addMockDocument('users/u1/lab_avoidance_tasks', 't2', { id: 't2', status: 'open', done_date: TODAY, created_date: TODAY });
    const data = await loadNightlyClose('u1', TODAY);
    expect(data.rowsToday).toEqual(['hotcold', 'avoidance']);
    expect(data.win).toMatchObject({ kind: 'logged', rowIds: ['hotcold', 'avoidance'] });
  });

  it("assembles today's sessions, the win, the week and the last nights", async () => {
    addMockDocument('users/u1/completionLogs', 'l1', log('app:workouts', { resistance: 3, keep_going: 2 }));
    addMockDocument('users/u1/completionLogs', 'l2', log('app:meditate', { date: '2026-10-13', resistance: 1 }));
    addMockDocument('users/u1/reflections', '2026-10-13', { date: '2026-10-13', grade: 'B' });

    const data = await loadNightlyClose('u1', TODAY);
    expect(data.win).toEqual({ kind: 'hardStart', appId: 'workouts' });
    expect(data.loggedApps).toEqual(['workouts']);
    expect(data.rowsToday).toEqual([]);
    expect(data.weekCounts).toEqual({ workouts: 1, meditate: 1 });
    expect(data.nights[5]).toEqual({ date: '2026-10-13', grade: 'B' });
    expect(data.tonight).toBeNull();
  });
});

describe('getPlanForToday', () => {
  beforeEach(() => resetMockDB());

  it("reads yesterday evening's plan", async () => {
    addMockDocument('users/u1/reflections', '2026-10-13', {
      date: '2026-10-13',
      grade: 'B',
      prompt_ifthen_cue: 'I get home',
      prompt_ifthen_response: 'Workout',
      plan_habit_id: 'workout',
    });
    expect(await getPlanForToday('u1', TODAY)).toEqual({
      habitId: 'workout',
      cue: 'I get home',
      response: 'Workout',
    });
  });

  it('is null when there was no reflection', async () => {
    expect(await getPlanForToday('u1', TODAY)).toBeNull();
  });
});
