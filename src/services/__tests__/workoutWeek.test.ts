import type { CompletionLog } from '../../types';
import type { CompletedWorkoutSession, Exercise, LoggedSet } from '../../types/workouts';
import {
  buildWorkoutDay,
  buildWorkoutWeek,
  describeRating,
  describeWorkouts,
  exercisesInSession,
  LOGGED_WORKOUT_NAME,
  sessionKind,
  weekWindow,
  windowSpan,
  windowTitle,
} from '../workoutWeek';

// Friday 20 November 2026, mid-afternoon, local time.
const NOW = new Date(2026, 10, 20, 15, 0);

const EX: Record<string, Exercise> = {
  bench: { id: 'bench', name: 'Bench Press', kind: 'weight', muscle: 'chest' },
  row: { id: 'row', name: 'Row', kind: 'weight', muscle: 'back' },
  squat: { id: 'squat', name: 'Squat', kind: 'weight', muscle: 'legs' },
  plank: { id: 'plank', name: 'Plank', kind: 'time', muscle: 'core' },
  run: { id: 'run', name: 'Run', kind: 'cardio', muscle: 'cardio' },
};

const set = (exerciseId: string, v: Partial<LoggedSet> = {}): LoggedSet =>
  ({ exerciseId, round: 0, at: '', reps: 8, weightKg: 50, ...v }) as LoggedSet;

const at = (d: number, h = 18) => new Date(2026, 10, d, h).toISOString();

const session = (
  id: string,
  day: number,
  sets: LoggedSet[],
  over: Partial<CompletedWorkoutSession> = {}
): CompletedWorkoutSession =>
  ({
    id,
    workout_name: id,
    started_at: at(day),
    finished_at: at(day, 19),
    duration_sec: 3600,
    total_sets: sets.length,
    total_volume_kg: sets.reduce((n, s) => n + (s.weightKg ?? 0) * (s.reps ?? 0), 0),
    blocks: [{ sets } as unknown as CompletedWorkoutSession['blocks'][number]],
    prs: [],
    ...over,
  }) as CompletedWorkoutSession;

const rating = (date: string, over: Partial<CompletionLog> = {}): CompletionLog =>
  ({
    id: `r-${date}-${over.session_id ?? 'none'}`,
    user_id: 'u',
    type: 'nudge',
    reference_id: 'app:workouts',
    points: 1,
    difficulty: 1,
    date,
    ...over,
  }) as CompletionLog;

const build = (sessions: CompletedWorkoutSession[], logs: CompletionLog[] = [], view: 'rolling' | 'calendar' = 'rolling', offset = 0) =>
  buildWorkoutWeek({ sessions, exercisesById: EX, logs, window: weekWindow(view, NOW, offset), now: NOW });

describe('weekWindow', () => {
  it('runs the last 7 days, today last', () => {
    const w = weekWindow('rolling', NOW);
    expect(w.dates).toEqual(['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20']);
    expect(w.end).toEqual(new Date(2026, 10, 21));
  });

  it('runs Monday to Sunday, the rest of the week still to come', () => {
    const w = weekWindow('calendar', NOW);
    expect(w.dates[0]).toBe('2026-11-16');
    expect(w.dates[6]).toBe('2026-11-22');
  });

  it('steps back a whole window at a time', () => {
    expect(weekWindow('rolling', NOW, 1).dates[0]).toBe('2026-11-07');
    expect(weekWindow('calendar', NOW, 1).dates).toEqual([
      '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15',
    ]);
  });

  it('names each window', () => {
    expect(windowTitle(weekWindow('rolling', NOW))).toBe('Last 7 days');
    expect(windowTitle(weekWindow('calendar', NOW))).toBe('This week');
    expect(windowTitle(weekWindow('calendar', NOW, 1))).toBe('Last week');
    expect(windowTitle(weekWindow('rolling', NOW, 1))).toBe('The 7 days before');
    expect(windowTitle(weekWindow('calendar', NOW, 2))).toBe('Nov 2 – 8');
    expect(windowSpan(weekWindow('calendar', NOW, 3))).toBe('Oct 26 – Nov 1');
  });
});

describe('sessionKind', () => {
  it('tells strength, cardio and both apart', () => {
    expect(sessionKind(session('a', 20, [set('bench')]), EX)).toBe('strength');
    expect(sessionKind(session('b', 20, [set('run', { seconds: 1800 })]), EX)).toBe('cardio');
    expect(sessionKind(session('c', 20, [set('squat'), set('run', { seconds: 600 })]), EX)).toBe('mixed');
    expect(sessionKind(session('d', 20, []), EX)).toBe('unknown');
  });
});

describe('buildWorkoutWeek', () => {
  it('puts each session on the day it started, with rest days and days ahead', () => {
    const week = build([session('Push', 16, [set('bench')]), session('Run', 18, [set('run', { seconds: 1800 })])], [], 'calendar');
    expect(week.days.map((d) => d.kind)).toEqual(['strength', 'rest', 'cardio', 'rest', 'rest', 'ahead', 'ahead']);
    expect(week.days[0].caption).toBe('Push');
    expect(week.days[4].isToday).toBe(true);
  });

  it('leaves sessions outside the window out', () => {
    const week = build([session('Old', 12, [set('bench')]), session('New', 19, [set('bench')])]);
    expect(week.workouts).toBe(1);
    expect(week.sessions.map((s) => s.id)).toEqual(['New']);
  });

  it('shows a workout logged with no details, as Today’s ring counts it', () => {
    const week = build([], [rating('2026-11-17')]);
    const day = week.days.find((d) => d.date === '2026-11-17')!;
    expect(day.kind).toBe('logged');
    expect(day.sessions).toHaveLength(1);
    expect(day.sessions[0]).toMatchObject({ session: null, name: LOGGED_WORKOUT_NAME });
    expect(week.workouts).toBe(1);
  });

  it('counts a rated session once', () => {
    const s = session('Push', 19, [set('bench')]);
    const week = build([s], [rating('2026-11-19', { session_id: 'Push', resistance: 2, resistance_scale: 3, keep_going: 3 })]);
    expect(week.workouts).toBe(1);
    expect(week.days[5].sessions[0].ratings).toEqual({ start: 2, stay: 3 });
  });

  it('captions a day with two workouts', () => {
    const week = build([session('Push', 19, [set('bench')]), { ...session('Run', 19, [set('run', { seconds: 600 })]), started_at: at(19, 20) }]);
    expect(week.days[5].caption).toBe('Push +1');
    expect(week.days[5].kind).toBe('mixed');
  });

  it('adds up the week and sets it against the window before', () => {
    const week = build([
      session('A', 16, [set('bench'), set('bench')], { prs: [{} as never] }),
      session('B', 19, [set('squat')], { duration_sec: 1800 }),
      session('Before', 10, [set('bench', { weightKg: 100 })]),
    ]);
    expect(week.sets).toBe(3);
    expect(week.volumeKg).toBe(1200);
    expect(week.priorVolumeKg).toBe(800);
    expect(week.volumeChangePct).toBe(50);
    expect(week.durationSec).toBe(5400);
    expect(week.prs).toBe(1);
    expect(week.activeDays).toBe(2);
  });

  it('leaves the clock out for sets added on This week', () => {
    const week = build([session('log_2026-11-19', 19, [set('bench')], { logged_sets: true, duration_sec: 999 })]);
    expect(week.durationSec).toBe(0);
  });

  it('counts sets per muscle, every main muscle listed, cardio left out', () => {
    const week = build([session('A', 19, [set('bench'), set('bench'), set('row'), set('run', { seconds: 600 })])]);
    expect(week.muscles.map((m) => m.muscle)).toEqual(['chest', 'back', 'shoulders', 'legs', 'arms', 'core']);
    expect(week.muscles[0]).toEqual({ muscle: 'chest', sets: 2, exercises: [{ exerciseId: 'bench', sets: 2 }] });
    expect(week.muscles.find((m) => m.muscle === 'core')?.sets).toBe(0);
  });

  it('counts cardio minutes in the window', () => {
    const week = build([session('Run', 19, [set('run', { seconds: 1800, zone: 1 })])]);
    expect(Math.round(week.cardio.totalMin)).toBe(30);
  });

  it('averages the week’s two ratings', () => {
    const week = build(
      [],
      [
        rating('2026-11-16', { resistance: 3, resistance_scale: 3, keep_going: 2 }),
        rating('2026-11-18', { resistance: 1, resistance_scale: 3, keep_going: 1 }),
        rating('2026-11-01', { resistance: 3, resistance_scale: 3, keep_going: 3 }),
      ]
    );
    expect(week.ratings).toEqual({ start: 2, stay: 1.5 });
  });
});

describe('words', () => {
  it('measures this calendar week against the goal, anything else as a count', () => {
    const calendar = build([session('A', 16, [set('bench')])], [], 'calendar');
    expect(describeWorkouts(calendar, 3)).toBe('1 of 3 workouts');
    expect(describeWorkouts(build([session('A', 16, [set('bench')])]), 3)).toBe('1 workout');
  });

  it('describes a rating', () => {
    expect(describeRating(1.6)).toBe('1.6 of 3');
    expect(describeRating(null)).toBeNull();
  });

  it('lists a session’s exercises once each, in order', () => {
    const s = session('A', 19, [set('bench'), set('row'), set('bench')]);
    expect(exercisesInSession(s).map((e) => [e.exerciseId, e.sets.length])).toEqual([
      ['bench', 2],
      ['row', 1],
    ]);
  });
});

describe('buildWorkoutDay', () => {
  it('builds one day on its own: its sessions, then any logged without details', () => {
    const day = buildWorkoutDay({
      sessions: [session('Push', 19, [set('bench')]), session('Other', 18, [set('row')])],
      exercisesById: EX,
      // Like the ring: a rating with no session pairs with a saved one that day
      // first, so two of them beside one session make one more workout.
      logs: [rating('2026-11-19', { id: 'x1' }), rating('2026-11-19', { id: 'x2' })],
      date: '2026-11-19',
      now: NOW,
    });
    expect(day.sessions.map((s) => s.name)).toEqual(['Push', LOGGED_WORKOUT_NAME]);
    expect(day.kind).toBe('strength');
  });

  it('is a rest day with nothing on it, and ahead after today', () => {
    expect(buildWorkoutDay({ sessions: [], exercisesById: EX, logs: [], date: '2026-11-19', now: NOW }).kind).toBe('rest');
    expect(buildWorkoutDay({ sessions: [], exercisesById: EX, logs: [], date: '2026-11-21', now: NOW }).ahead).toBe(true);
  });
});
