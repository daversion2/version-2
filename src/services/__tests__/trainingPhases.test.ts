import {
  addDaysTo,
  answerStepUp,
  applyChangeToWorkouts,
  applyStepUp,
  compareTest,
  currentPhase,
  daysUntilRetest,
  describeComparison,
  endPhase,
  formatTestValue,
  isLighterWeek,
  isRetestDue,
  lightenSession,
  lighterRounds,
  newPhase,
  nextPhaseFrom,
  nextProgramWorkout,
  phaseChain,
  phaseHighlight,
  phaseSessions,
  phaseWeek,
  plannedSessions,
  programExerciseIds,
  recordBaseline,
  recordRetest,
  retestDateFor,
  stepUpKey,
  suggestNextChange,
  suggestStepUp,
  testLabel,
  testSeries,
  testTypeFor,
} from '../trainingPhases';
import { BUILT_IN_EXERCISES, STARTER_WORKOUTS } from '../../data/workoutExercises';
import { PHASE_TEMPLATES } from '../../data/phaseTemplates';
import { startSession } from '../workoutSession';
import { KG_PER_LB } from '../workoutMath';
import { CompletedWorkoutSession, Exercise, LoggedSet, TrainingPhase, Workout } from '../../types/workouts';

const NOW = new Date('2026-10-19T15:00:00.000Z');
const byId = Object.fromEntries(BUILT_IN_EXERCISES.map((e) => [e.id, e])) as Record<string, Exercise>;
const lb = (n: number) => n * KG_PER_LB;

const phase = (over: Partial<TrainingPhase> = {}): TrainingPhase => ({
  ...newPhase({
    id: 'p1',
    programName: 'Full body, 3 days',
    templateId: 'full-body',
    workoutIds: ['tpl_fullbody_a', 'tpl_fullbody_b'],
    daysPerWeek: 3,
    weeks: 6,
    lighterLastWeek: false,
    tests: [{ exerciseId: 'pull-up' }, { exerciseId: 'push-up' }, { exerciseId: 'goblet-squat', weightKg: lb(50) }, { exerciseId: 'plank' }, { exerciseId: 'run-mile' }],
    today: '2026-10-19',
    now: NOW,
  }),
  ...over,
});

const done = (id: string, workout_id: string, finished_at: string, phase_id = 'p1'): CompletedWorkoutSession => ({
  id,
  workout_id,
  workout_name: workout_id,
  started_at: finished_at,
  finished_at,
  duration_sec: 1800,
  total_sets: 9,
  total_volume_kg: 0,
  blocks: [],
  prs: [],
  phase_id,
});

const program: Workout[] = PHASE_TEMPLATES[0].workouts.map((w) => ({
  ...w,
  created_at: NOW.toISOString(),
  updated_at: NOW.toISOString(),
}));

const set = (values: Partial<LoggedSet>): LoggedSet => ({ exerciseId: 'x', round: 0, at: NOW.toISOString(), ...values });

describe('tests', () => {
  it('takes its type from the exercise kind', () => {
    expect(testTypeFor('weight')).toBe('reps_at_weight');
    expect(testTypeFor('reps')).toBe('max_reps');
    expect(testTypeFor('time')).toBe('longest');
    expect(testTypeFor('distance')).toBe('fastest');
  });

  it('labels each test the way a person says it', () => {
    expect(testLabel(byId['pull-up'], undefined, 'lb')).toBe('Max reps');
    expect(testLabel(byId['goblet-squat'], { exerciseId: 'goblet-squat', weightKg: lb(50) }, 'lb')).toBe('Reps at 50 lb');
    expect(testLabel(byId['goblet-squat'], { exerciseId: 'goblet-squat' }, 'lb')).toBe('Reps at a fixed weight');
    expect(testLabel(byId['plank'], undefined, 'lb')).toBe('Longest hold');
    expect(testLabel(byId['jump-rope'], undefined, 'lb')).toBe('Longest time');
    expect(testLabel(byId['run-mile'], undefined, 'lb')).toBe('Time for 1 mi');
    expect(testLabel(byId['run-5k'], undefined, 'lb')).toBe('Time for 5 km');
  });

  it('formats reps as numbers and times as clocks', () => {
    expect(formatTestValue('max_reps', 9)).toBe('9');
    expect(formatTestValue('longest', 90)).toBe('1:30');
    expect(formatTestValue('fastest', 545)).toBe('9:05');
  });
});

describe('compareTest', () => {
  it('calls a rep change of one "about the same"', () => {
    expect(compareTest('max_reps', 9, 10).state).toBe('same');
    expect(compareTest('max_reps', 9, 8).state).toBe('same');
    expect(compareTest('max_reps', 6, 9)).toEqual({ before: 6, after: 9, delta: 3, pct: 50, state: 'up' });
    expect(compareTest('reps_at_weight', 10, 7).state).toBe('down');
  });

  it('allows 5 seconds either way on a hold', () => {
    expect(compareTest('longest', 65, 70).state).toBe('same');
    expect(compareTest('longest', 65, 90).state).toBe('up');
  });

  it('treats a lower time as better, within 2% as the same', () => {
    expect(compareTest('fastest', 552, 545).state).toBe('same'); // 1.3%
    const faster = compareTest('fastest', 552, 520);
    expect(faster.state).toBe('up');
    expect(faster.pct).toBe(6);
    expect(compareTest('fastest', 552, 600).state).toBe('down');
  });

  it('describes the change in plain words', () => {
    expect(describeComparison('max_reps', compareTest('max_reps', 6, 9))).toBe('+3 reps · +50%');
    expect(describeComparison('max_reps', compareTest('max_reps', 9, 6))).toBe('3 reps fewer');
    expect(describeComparison('longest', compareTest('longest', 60, 90))).toBe('+30s · +50%');
    expect(describeComparison('fastest', compareTest('fastest', 552, 520))).toBe('32s faster');
    expect(describeComparison('fastest', compareTest('fastest', 552, 548))).toBe('About the same');
  });
});

describe('dates and progress', () => {
  it('puts the retest the phase length after the start', () => {
    expect(retestDateFor('2026-10-19', 6)).toBe('2026-11-30');
    expect(addDaysTo('2026-12-30', 3)).toBe('2027-01-02');
  });

  it('counts training weeks from 1 and holds at the last', () => {
    const p = phase({ status: 'training' });
    expect(phaseWeek(p, '2026-10-19')).toBe(1);
    expect(phaseWeek(p, '2026-11-02')).toBe(3);
    expect(phaseWeek(p, '2026-12-20')).toBe(6);
    expect(daysUntilRetest(p, '2026-11-28')).toBe(2);
  });

  it('is due for a retest on or after its date, only while training', () => {
    expect(isRetestDue(phase({ status: 'training' }), '2026-11-29')).toBe(false);
    expect(isRetestDue(phase({ status: 'training' }), '2026-11-30')).toBe(true);
    expect(isRetestDue(phase({ status: 'baseline' }), '2026-12-01')).toBe(false);
  });

  it('runs light only in the last week, and only when asked', () => {
    const p = phase({ status: 'training', lighter_last_week: true });
    expect(isLighterWeek(p, '2026-11-20')).toBe(false);
    expect(isLighterWeek(p, '2026-11-23')).toBe(true);
    expect(isLighterWeek({ ...p, lighter_last_week: false }, '2026-11-23')).toBe(false);
  });

  it('plans days × weeks sessions and counts only this phase’s', () => {
    expect(plannedSessions(phase())).toBe(18);
    const sessions = [done('s1', 'tpl_fullbody_a', '2026-10-20T10:00:00Z'), done('s2', 'x', '2026-10-21T10:00:00Z', 'other')];
    expect(phaseSessions(phase(), sessions).map((s) => s.id)).toEqual(['s1']);
  });

  it('finds the one phase under way', () => {
    expect(currentPhase([phase({ id: 'a', status: 'complete' }), phase({ id: 'b', status: 'training' })])?.id).toBe('b');
    expect(currentPhase([phase({ status: 'ended' })])).toBeUndefined();
  });
});

describe('nextProgramWorkout', () => {
  it('starts with a workout not done yet, in program order', () => {
    expect(nextProgramWorkout(phase(), program, [])?.id).toBe('tpl_fullbody_a');
    expect(nextProgramWorkout(phase(), program, [done('s1', 'tpl_fullbody_a', '2026-10-20T10:00:00Z')])?.id).toBe(
      'tpl_fullbody_b'
    );
  });

  it('then takes turns by whichever was done longest ago', () => {
    const sessions = [
      done('s1', 'tpl_fullbody_a', '2026-10-20T10:00:00Z'),
      done('s2', 'tpl_fullbody_b', '2026-10-22T10:00:00Z'),
      done('s3', 'tpl_fullbody_a', '2026-10-24T10:00:00Z'),
    ];
    expect(nextProgramWorkout(phase(), program, sessions)?.id).toBe('tpl_fullbody_b');
  });

  it('skips deleted workouts', () => {
    expect(nextProgramWorkout(phase(), [program[1]], [])?.id).toBe('tpl_fullbody_b');
    expect(nextProgramWorkout(phase(), [], [])).toBeUndefined();
  });
});

describe('the phase lifecycle', () => {
  it('starts waiting on its baseline', () => {
    const p = phase();
    expect(p).toMatchObject({ number: 1, status: 'baseline', start_date: '2026-10-19', retest_date: '2026-11-30', baseline: {} });
  });

  it('starts the clock when the baseline is saved', () => {
    const later = new Date('2026-10-21T15:00:00.000Z');
    const p = recordBaseline(phase(), { 'pull-up': 6 }, [{ exerciseId: 'pull-up' }], '2026-10-21', later);
    expect(p).toMatchObject({ status: 'training', start_date: '2026-10-21', retest_date: '2026-12-02', baseline: { 'pull-up': 6 } });
    expect(p.baseline_at).toBe(later.toISOString());
  });

  it('completes with a retest, or ends early without one', () => {
    expect(recordRetest(phase({ status: 'training' }), { 'pull-up': 9 }, NOW)).toMatchObject({
      status: 'complete',
      retest: { 'pull-up': 9 },
    });
    expect(endPhase(phase({ status: 'training' }), NOW).status).toBe('ended');
  });

  it('carries the program and tests into the next phase, with the retest as its baseline', () => {
    const prev = recordRetest(phase({ status: 'training', baseline: { 'pull-up': 6 } }), { 'pull-up': 9 }, NOW);
    const next = nextPhaseFrom(prev, {
      id: 'p2',
      change: { key: 'sets', label: 'Add one set to each exercise' },
      today: '2026-11-30',
      now: NOW,
    });
    expect(next).toMatchObject({
      id: 'p2',
      number: 2,
      status: 'training',
      baseline: { 'pull-up': 9 },
      previous_phase_id: 'p1',
      start_date: '2026-11-30',
      retest_date: '2027-01-11',
      days_per_week: 3,
      tests: prev.tests,
    });
  });

  it('adds a training day when that is the change, up to seven', () => {
    const prev = phase({ status: 'complete', retest: {} });
    expect(nextPhaseFrom(prev, { id: 'p2', change: { key: 'days', label: '' }, today: '2026-11-30', now: NOW }).days_per_week).toBe(4);
    expect(
      nextPhaseFrom({ ...prev, days_per_week: 7 }, { id: 'p2', change: { key: 'days', label: '' }, today: '2026-11-30', now: NOW })
        .days_per_week
    ).toBe(7);
  });
});

describe('suggestNextChange', () => {
  const trainedIds = programExerciseIds(program);
  const finished = (retest: Record<string, number>) =>
    phase({
      status: 'complete',
      baseline: { 'pull-up': 6, 'push-up': 22, 'goblet-squat': 10, plank: 65, 'run-mile': 552 },
      retest,
    });

  it('asks for more sessions before anything else when under 70% were done', () => {
    const s = suggestNextChange({
      phase: finished({ 'pull-up': 9, 'push-up': 27, 'goblet-squat': 14, plank: 90, 'run-mile': 545 }),
      sessionsDone: 12,
      trainedIds,
      exercisesById: byId,
    });
    expect(s.change.key).toBe('consistency');
    expect(s.why).toContain('12 of 18');
  });

  it('adds a set of everything when every trained test went up — the untrained run is ignored', () => {
    const s = suggestNextChange({
      phase: finished({ 'pull-up': 9, 'push-up': 27, 'goblet-squat': 14, plank: 90, 'run-mile': 600 }),
      sessionsDone: 16,
      trainedIds,
      exercisesById: byId,
    });
    expect(s.change).toEqual({ key: 'sets', label: 'Add one set to each exercise' });
    expect(s.why).toContain('All 4 tests');
  });

  it('goes heavier on a weighted lift that stalled', () => {
    const s = suggestNextChange({
      phase: finished({ 'pull-up': 9, 'push-up': 27, 'goblet-squat': 11, plank: 90 }),
      sessionsDone: 16,
      trainedIds,
      exercisesById: byId,
    });
    expect(s.change).toEqual({ key: 'reps', label: 'Goblet Squat: heavier sets of 5–8 reps', exerciseId: 'goblet-squat' });
  });

  it('adds a set of a bodyweight move that stalled', () => {
    const s = suggestNextChange({
      phase: finished({ 'pull-up': 7, 'push-up': 27, 'goblet-squat': 14, plank: 90 }),
      sessionsDone: 16,
      trainedIds,
      exercisesById: byId,
    });
    expect(s.change).toEqual({ key: 'sets', label: 'Pull-up: one more set', exerciseId: 'pull-up' });
  });

  it('suggests nothing when no test is in the program', () => {
    const s = suggestNextChange({
      phase: finished({ 'run-mile': 545 }),
      sessionsDone: 16,
      trainedIds: new Set(),
      exercisesById: byId,
    });
    expect(s.change.key).toBe('none');
  });
});

describe('applyChangeToWorkouts', () => {
  it('adds a set to every block, or only to one exercise’s', () => {
    const all = applyChangeToWorkouts(program, { key: 'sets', label: '' }, NOW);
    expect(all).toHaveLength(2);
    expect(all[0].blocks.map((b) => b.rounds)).toEqual([4, 4, 4, 4]);
    const one = applyChangeToWorkouts(program, { key: 'sets', label: '', exerciseId: 'pull-up' }, NOW);
    expect(one.map((w) => w.id)).toEqual(['tpl_fullbody_b']);
    expect(one[0].blocks.map((b) => b.rounds)).toEqual([3, 4, 3, 3]);
  });

  it('shortens rests by 30 seconds, never below 30', () => {
    const changed = applyChangeToWorkouts(program, { key: 'rest', label: '' }, NOW);
    expect(changed[0].blocks.map((b) => b.restSec)).toEqual([60, 60, 60, 30]);
  });

  it('leaves the changes a person makes by hand alone', () => {
    expect(applyChangeToWorkouts(program, { key: 'swap', label: '' }, NOW)).toEqual([]);
    expect(applyChangeToWorkouts(program, { key: 'none', label: '' }, NOW)).toEqual([]);
  });
});

describe('history across phases', () => {
  const p1 = phase({ id: 'p1', number: 1, status: 'complete', baseline: { 'pull-up': 6 }, retest: { 'pull-up': 9 } });
  const p2 = {
    ...phase({ id: 'p2', number: 2, status: 'complete', baseline: { 'pull-up': 9 }, retest: { 'pull-up': 10 } }),
    previous_phase_id: 'p1',
    change: { key: 'sets' as const, label: 'Add one set to each exercise' },
    start_date: '2026-11-30',
  };
  const p3 = { ...phase({ id: 'p3', number: 3, status: 'training', baseline: { 'pull-up': 10 } }), previous_phase_id: 'p2' };
  const other = phase({ id: 'x1', number: 1, status: 'ended' });

  it('follows previous_phase_id back to the first, oldest first', () => {
    expect(phaseChain([p3, other, p2, p1], 'p3').map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
    expect(phaseChain([p1], 'missing')).toEqual([]);
  });

  it('plots the first baseline, then each retest with what changed', () => {
    expect(testSeries(phaseChain([p3, p2, p1], 'p3'), 'pull-up')).toEqual([
      { label: 'Start', value: 6 },
      { label: 'Phase 1', value: 9, change: 'First phase' },
      { label: 'Phase 2', value: 10, change: 'Add one set to each exercise' },
    ]);
  });

  it('highlights the biggest gain since the first baseline', () => {
    const a = phase({
      id: 'a',
      status: 'complete',
      start_date: '2026-05-04',
      baseline: { 'pull-up': 6, 'push-up': 22, plank: 65 },
      retest: { 'pull-up': 9, 'push-up': 27, plank: 66 },
    });
    const h = phaseHighlight([a], byId);
    expect(h).toMatchObject({ exerciseId: 'pull-up', before: 6, after: 9, pct: 50, phases: 1, since: '2026-05-04' });
    expect(h?.others).toEqual(['Push-up 22 → 27']);
  });

  it('shows nothing until a retest improved something', () => {
    expect(phaseHighlight([phase({ status: 'training' })], byId)).toBeNull();
    expect(
      phaseHighlight([phase({ status: 'complete', baseline: { 'pull-up': 6 }, retest: { 'pull-up': 6 } })], byId)
    ).toBeNull();
  });
});

describe('step-ups', () => {
  it('suggests the next weight once every set reached the planned reps', () => {
    const s = suggestStepUp('weight', { reps: 10 }, [set({ weightKg: lb(50), reps: 12 }), set({ weightKg: lb(50), reps: 10 })], 'lb');
    expect(s?.title).toBe('Try 55 lb today');
    expect(s?.stepUp.weightKg).toBeCloseTo(lb(55));
  });

  it('holds off when a set fell short or the weights differed', () => {
    expect(suggestStepUp('weight', { reps: 10 }, [set({ weightKg: lb(50), reps: 12 }), set({ weightKg: lb(50), reps: 9 })], 'lb')).toBeNull();
    expect(suggestStepUp('weight', { reps: 10 }, [set({ weightKg: lb(50), reps: 12 }), set({ weightKg: lb(55), reps: 10 })], 'lb')).toBeNull();
    expect(suggestStepUp('weight', { reps: 10 }, [], 'lb')).toBeNull();
  });

  it('adds a rep, or five seconds, and never nudges a run', () => {
    expect(suggestStepUp('reps', { reps: 8 }, [set({ reps: 8 }), set({ reps: 9 })], 'lb')?.stepUp).toEqual({ addReps: 1 });
    expect(suggestStepUp('time', { seconds: 30 }, [set({ seconds: 31 })], 'lb')?.stepUp).toEqual({ addSeconds: 5 });
    expect(suggestStepUp('distance', {}, [set({ seconds: 500 })], 'lb')).toBeNull();
  });

  it('applies an accepted step-up to the prefilled numbers, and ignores a declined one', () => {
    expect(applyStepUp({ weightKg: 20, reps: 12 }, { weightKg: 25 })).toEqual({ weightKg: 25, reps: 12 });
    expect(applyStepUp({ reps: 8 }, { addReps: 1 })).toEqual({ reps: 9 });
    expect(applyStepUp({ seconds: 30 }, { addSeconds: 5 })).toEqual({ seconds: 35 });
    expect(applyStepUp({ reps: 8 }, { declined: true, addReps: 1 })).toEqual({ reps: 8 });
    expect(applyStepUp({ reps: 8 })).toEqual({ reps: 8 });
  });

  it('records the answer on the session, per slot', () => {
    const s = startSession({ id: 's', workout: { ...STARTER_WORKOUTS[0], created_at: '', updated_at: '' }, now: NOW });
    const key = stepUpKey('push_1', 0);
    expect(key).toBe('push_1:0');
    expect(answerStepUp(s, key, { declined: true }).stepUps).toEqual({ 'push_1:0': { declined: true } });
  });
});

describe('the lighter week', () => {
  it('cuts about 40% of the sets, never below one', () => {
    expect([1, 2, 3, 4, 5].map(lighterRounds)).toEqual([1, 1, 2, 2, 3]);
  });

  it('keeps the planned rounds, so a light session never shrinks the saved workout', () => {
    const s = lightenSession(startSession({ id: 's', workout: { ...STARTER_WORKOUTS[1], created_at: '', updated_at: '' }, now: NOW }));
    expect(s.lighter).toBe(true);
    expect(s.blocks.map((b) => b.rounds)).toEqual([2, 2, 2, 2, 2]);
    expect(s.blocks.map((b) => b.plannedRounds)).toEqual([3, 3, 3, 3, 3]);
  });
});

describe('templates', () => {
  it('only name exercises that exist, and only test what they can', () => {
    for (const t of PHASE_TEMPLATES) {
      for (const w of t.workouts) for (const b of w.blocks) for (const i of b.items) expect(byId[i.exerciseId]).toBeDefined();
      for (const id of t.tests) expect(byId[id]).toBeDefined();
    }
  });

  it('train every test they suggest', () => {
    for (const t of PHASE_TEMPLATES) {
      const trained = programExerciseIds(t.workouts as Workout[]);
      for (const id of t.tests) expect(trained.has(id)).toBe(true);
    }
  });
});
