import {
  appCheckinHabit,
  appCheckinId,
  appIdFromCheckinId,
  clampWeeklyGoal,
  habitMatchesApp,
  habitTickedBy,
  lastAppCheckin,
  TODAY_APPS,
} from '../appCheckins';
import { buildTodayList } from '../habitPace';
import { buildFrictionOverview } from '../frictionCapacity';
import { findShortfalls } from '../skipLogic';
import { pastSession } from '../meditateMath';
import { CompletionLog, PracticeInstance } from '../../types';

const habit = (id: string, practice_id?: string, extra: Partial<PracticeInstance> = {}): PracticeInstance =>
  ({ id, user_id: 'u', name: id, is_active: true, created_by_user: false, target_count_per_week: 3, practice_id, ...extra }) as PracticeInstance;

const log = (reference_id: string, date: string, extra: Partial<CompletionLog> = {}): CompletionLog =>
  ({ id: `${reference_id}-${date}`, user_id: 'u', type: 'nudge', reference_id, points: 2, difficulty: 2, resistance: 2, resistance_scale: 3, date, ...extra }) as CompletionLog;

describe('app check-in ids', () => {
  it('round-trips and rejects anything else', () => {
    expect(appCheckinId('workouts')).toBe('app:workouts');
    expect(appIdFromCheckinId('app:meals')).toBe('meals');
    expect(appIdFromCheckinId('app:compose')).toBeUndefined();
    expect(appIdFromCheckinId('habit-123')).toBeUndefined();
    expect(appIdFromCheckinId(undefined)).toBeUndefined();
  });

  it('puts one app in each section, in section order', () => {
    expect(TODAY_APPS.map((a) => [a.id, a.section])).toEqual([
      ['meditate', 'mind'],
      ['workouts', 'movement'],
      ['meals', 'meals'],
    ]);
  });
});

describe('weekly goals', () => {
  it('defaults per app and keeps to 1–7', () => {
    expect(clampWeeklyGoal(undefined, 'workouts')).toBe(3);
    expect(clampWeeklyGoal(undefined, 'meditate')).toBe(5);
    expect(clampWeeklyGoal(undefined, 'meals')).toBe(7);
    expect(clampWeeklyGoal(0, 'workouts')).toBe(1);
    expect(clampWeeklyGoal(12, 'workouts')).toBe(7);
    expect(appCheckinHabit('workouts', 4)).toMatchObject({ id: 'app:workouts', name: 'Workouts', target_count_per_week: 4, is_active: true });
  });

  it("feeds the app's own pace, so the card can say 1 of 3", () => {
    // 2026-10-14 is a Wednesday.
    const [pace] = buildTodayList([appCheckinHabit('workouts', 3)], [log('app:workouts', '2026-10-13')], '2026-10-14');
    expect(pace).toMatchObject({ habitId: 'app:workouts', completed: 1, target: 3 });
  });

  it("is reviewed when a week falls short, like a habit's", () => {
    const short = findShortfalls([appCheckinHabit('meditate', 5)], [log('app:meditate', '2026-10-06')], '2026-10-06', '2026-10-12');
    expect(short).toEqual([expect.objectContaining({ habitId: 'app:meditate', habitName: 'Meditate', target: 5, completed: 1, missed: 4 })]);
  });
});

describe('the habit a session ticks', () => {
  const habits = [
    habit('w', 'workout'),
    habit('m', 'meditation'),
    habit('b', 'breathwork'),
    habit('n', 'nsdr'),
    habit('legday', undefined, { created_by_user: true }),
  ];

  it('is the direct library match, by mode for Meditate', () => {
    expect(habitTickedBy('workouts', habits)).toBe('w');
    expect(habitTickedBy('meditate', habits, 'sit')).toBe('m');
    expect(habitTickedBy('meditate', habits, 'breathe')).toBe('b');
    expect(habitTickedBy('meditate', habits, 'nsdr')).toBe('n');
    expect(habitTickedBy('meals', habits)).toBeUndefined();
  });

  it('is never a custom, archived or inactive habit', () => {
    expect(habitTickedBy('workouts', [habit('legday', undefined)])).toBeUndefined();
    expect(habitTickedBy('workouts', [habit('w', 'workout', { archived_at: '2026-10-01' })])).toBeUndefined();
    expect(habitTickedBy('workouts', [habit('w', 'workout', { is_active: false })])).toBeUndefined();
    expect(habitMatchesApp('meditate', { practice_id: 'nsdr' })).toBe(true);
    expect(habitMatchesApp('workouts', { practice_id: 'nsdr' })).toBe(false);
  });

  it("counts the effort once: the mirror log ticks the habit but adds no friction", () => {
    const logs = [
      log('app:workouts', '2026-10-14', { resistance: 3 }),
      // The habit's mirror: no rating, difficulty 0.
      log('w', '2026-10-14', { resistance: undefined, resistance_scale: undefined, difficulty: 0, points: 0, mirror_of: 'x' }),
    ];
    expect(buildFrictionOverview(logs, '2026-10-14').felt).toBe(3);
    const [, pace] = buildTodayList([appCheckinHabit('workouts'), habit('w', 'workout')], logs, '2026-10-14');
    expect(pace).toMatchObject({ habitId: 'w', doneToday: true });
  });
});

describe('lastAppCheckin', () => {
  it("is the app's newest check-in", () => {
    const logs = [log('app:meditate', '2026-10-10'), log('app:meditate', '2026-10-12'), log('app:workouts', '2026-10-13')];
    expect(lastAppCheckin('meditate', logs)?.date).toBe('2026-10-12');
    expect(lastAppCheckin('meals', logs)).toBeUndefined();
  });
});

describe('pastSession', () => {
  it('files a Meditate session on the day chosen, at the minutes given', () => {
    const s = pastSession({ id: 's1', mode: 'nsdr', date: '2026-10-16', minutes: 20, now: new Date('2026-10-18T10:00:00') });
    expect(s).toMatchObject({ id: 's1', mode: 'nsdr', style: 'timer', date: '2026-10-16', duration_sec: 1200, planned_sec: 1200, ended_early: false });
    expect(new Date(s.started_at).getDate()).toBe(16);
  });
});
