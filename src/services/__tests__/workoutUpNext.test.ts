import {
  nextInRotation,
  phaseEntry,
  prsThisMonth,
  rotationOrder,
  upNextWorkout,
  workoutHomeFocus,
  workoutStartAction,
} from '../workoutUpNext';
import { newPhase } from '../trainingPhases';
import { startSession } from '../workoutSession';
import { STARTER_WORKOUTS } from '../../data/workoutExercises';
import { CompletedWorkoutSession, TrainingPhase, Workout } from '../../types/workouts';

const STAMP = '2026-10-01T10:00:00.000Z';
const starters: Workout[] = STARTER_WORKOUTS.map((s) => ({ ...s, created_at: STAMP, updated_at: STAMP }));
const [push, pull, legs] = starters;
const done = (w: Workout, at: string): Workout => ({ ...w, last_done_at: at });

const phase = (over: Partial<TrainingPhase> = {}): TrainingPhase => ({
  ...newPhase({
    id: 'p1',
    programName: 'PPL',
    workoutIds: [push.id, pull.id, legs.id],
    daysPerWeek: 3,
    weeks: 6,
    lighterLastWeek: false,
    tests: [{ exerciseId: 'push-up' }],
    today: '2026-10-19',
    now: new Date('2026-10-19T12:00:00.000Z'),
  }),
  status: 'training',
  start_date: '2026-10-19',
  retest_date: '2026-11-30',
  number: 2,
  ...over,
});

describe('rotationOrder', () => {
  it('keeps Push, Pull, Legs in their own order though they were created together', () => {
    expect(rotationOrder([legs, push, pull]).map((w) => w.id)).toEqual([push.id, pull.id, legs.id]);
  });

  it('puts a newer workout at the end and leaves empty ones out', () => {
    const mine: Workout = { ...push, id: 'mine', starter_id: undefined, name: 'Arms', created_at: '2026-10-05T00:00:00.000Z' };
    const empty: Workout = { ...mine, id: 'empty', blocks: [] };
    expect(rotationOrder([mine, empty, legs, push, pull]).map((w) => w.id)).toEqual([push.id, pull.id, legs.id, 'mine']);
  });
});

describe('nextInRotation', () => {
  it('starts at the first workout when none has been done', () => {
    expect(nextInRotation(starters)).toEqual({ workout: push });
  });

  it('picks the one after the workout done last', () => {
    const list = [done(push, '2026-10-10T10:00:00Z'), done(pull, '2026-10-12T10:00:00Z'), legs];
    const pick = nextInRotation(list);
    expect(pick?.workout.id).toBe(legs.id);
    expect(pick?.after?.id).toBe(pull.id);
  });

  it('wraps round after the last one', () => {
    const list = [done(push, '2026-10-10T10:00:00Z'), done(pull, '2026-10-11T10:00:00Z'), done(legs, '2026-10-12T10:00:00Z')];
    expect(nextInRotation(list)?.workout.id).toBe(push.id);
  });

  it('suggests the only workout again, with no "after" line', () => {
    expect(nextInRotation([done(push, '2026-10-10T10:00:00Z')])).toEqual({ workout: done(push, '2026-10-10T10:00:00Z') });
  });

  it('has nothing to suggest with no startable workouts', () => {
    expect(nextInRotation([{ ...push, blocks: [] }])).toBeUndefined();
  });
});

describe('upNextWorkout', () => {
  it('follows the phase while training', () => {
    const next = upNextWorkout({ phase: phase(), workouts: starters, sessions: [], today: '2026-11-02' });
    expect(next).toEqual({ workout: push, why: 'Phase 2, week 3 of 6', inPhase: true });
  });

  it('uses the rotation with no phase', () => {
    const list = [done(push, '2026-10-10T10:00:00Z'), pull, legs];
    expect(upNextWorkout({ workouts: list, sessions: [], today: '2026-11-02' })).toEqual({
      workout: pull,
      why: 'After Push Day',
      inPhase: false,
    });
  });

  it('falls back to the rotation when the phase’s workouts were deleted', () => {
    const next = upNextWorkout({ phase: phase({ workout_ids: ['gone'] }), workouts: starters, sessions: [], today: '2026-11-02' });
    expect(next?.inPhase).toBe(false);
    expect(next?.workout.id).toBe(push.id);
  });
});

describe('workoutStartAction', () => {
  const base = { workouts: starters, sessions: [], today: '2026-11-02' };

  it('resumes a workout left open, with no way to start another', () => {
    const draft = startSession({ id: 's1', workout: pull, now: new Date('2026-11-02T10:00:00Z') });
    expect(workoutStartAction({ ...base, draft })).toEqual({
      label: 'Resume Pull Day',
      meta: '0 sets logged',
      launch: { kind: 'resume' },
      canChoose: false,
    });
  });

  it('starts the baseline test of a phase waiting on one', () => {
    const a = workoutStartAction({ ...base, phase: phase({ status: 'baseline' }) });
    expect(a.label).toBe('Start the test');
    expect(a.launch).toEqual({ kind: 'phaseTest', mode: 'baseline' });
  });

  it('asks for the retest once it’s due', () => {
    const a = workoutStartAction({ ...base, phase: phase(), today: '2026-11-30' });
    expect(a.launch).toEqual({ kind: 'phaseTest', mode: 'retest' });
  });

  it('names the up-next workout', () => {
    expect(workoutStartAction(base)).toEqual({
      label: 'Start Push Day',
      meta: 'Up next',
      launch: { kind: 'workout', workoutId: push.id },
      canChoose: true,
    });
  });

  it('just opens Workouts when there is nothing to suggest', () => {
    expect(workoutStartAction({ ...base, workouts: [] }).launch).toEqual({ kind: 'home' });
  });
});

describe('workoutHomeFocus', () => {
  const base = { workouts: starters, sessions: [], today: '2026-11-02' };

  it('puts a workout left open first, even with a test due', () => {
    const draft = startSession({ id: 's1', workout: pull, now: new Date('2026-11-02T10:00:00Z') });
    expect(workoutHomeFocus({ ...base, draft, phase: phase({ status: 'baseline' }) })).toEqual({ kind: 'resume' });
  });

  it('puts a due test ahead of the next workout', () => {
    expect(workoutHomeFocus({ ...base, phase: phase(), today: '2026-11-30' })).toEqual({
      kind: 'test',
      mode: 'retest',
      label: 'Retest now',
      meta: 'Phase 2 is done',
    });
  });

  it('names the phase’s next workout', () => {
    expect(workoutHomeFocus({ ...base, phase: phase() })).toEqual({
      kind: 'workout',
      workout: push,
      why: 'Phase 2, week 3 of 6',
      inPhase: true,
    });
  });

  it('asks for a first workout when there is nothing to start', () => {
    expect(workoutHomeFocus({ ...base, workouts: [] })).toEqual({ kind: 'create' });
  });
});

describe('phaseEntry', () => {
  it('leads to the current phase', () => {
    expect(phaseEntry(phase(), phase(), '2026-11-02')).toEqual({
      title: 'Your phase',
      subtitle: 'Phase 2 · week 3 of 6',
      target: { screen: 'Phase', phaseId: 'p1' },
    });
  });

  it('leads to the last phase’s results once it is complete', () => {
    const entry = phaseEntry(undefined, phase({ status: 'complete' }), '2026-12-10');
    expect(entry.target).toEqual({ screen: 'PhaseResults', phaseId: 'p1' });
  });

  it('leads to setup with no phase', () => {
    expect(phaseEntry(undefined, undefined, '2026-11-02').target).toEqual({ screen: 'PhaseSetup' });
  });
});

describe('prsThisMonth', () => {
  const session = (finished_at: string, prs: number) =>
    ({ finished_at, prs: Array.from({ length: prs }) }) as unknown as CompletedWorkoutSession;

  it('counts only this calendar month', () => {
    const now = new Date(2026, 10, 22, 12);
    const list = [
      session(new Date(2026, 10, 3, 12).toISOString(), 2),
      session(new Date(2026, 10, 20, 12).toISOString(), 1),
      session(new Date(2026, 9, 30, 12).toISOString(), 5),
      session(new Date(2025, 10, 20, 12).toISOString(), 4),
    ];
    expect(prsThisMonth(list, now)).toBe(3);
  });
});
