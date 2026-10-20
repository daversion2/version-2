import {
  CompletedWorkoutSession,
  Exercise,
  ExerciseKind,
  LoggedSet,
  PhaseChange,
  PhaseTest,
  SetValues,
  StepUp,
  TestType,
  TrainingPhase,
  WeightUnit,
  Workout,
  WorkoutSession,
} from '../types/workouts';
import { toLocalDateString } from '../utils/date';
import { DEFAULT_TARGET, formatDistance, formatSeconds, formatWeight, stepWeight } from './workoutMath';

// =============================================================================
// TRAINING PHASES — test, train for a few weeks, retest, change one thing.
// Pure functions; storage is services/labWorkouts.ts.
//
// A phase is "here's what you changed, here's what happened" — never a claim
// that the change caused it. Early gains are broad, and a retest swings a few
// percent day to day, which is why small moves read "about the same".
// =============================================================================

// --- Tests --------------------------------------------------------------------

/** The exercise's kind decides how it's tested, so nobody has to choose. */
export const testTypeFor = (kind: ExerciseKind): TestType => {
  switch (kind) {
    case 'weight':
      return 'reps_at_weight';
    case 'reps':
      return 'max_reps';
    case 'time':
      return 'longest';
    case 'distance':
      return 'fastest';
  }
};

const HOLD_IDS = new Set(['plank', 'side-plank', 'wall-sit']);

/** "Max reps", "Reps at 50 lb", "Longest hold", "Time for 1 mi". */
export const testLabel = (exercise: Exercise, test: PhaseTest | undefined, unit: WeightUnit): string => {
  switch (testTypeFor(exercise.kind)) {
    case 'max_reps':
      return 'Max reps';
    case 'reps_at_weight':
      return test?.weightKg ? `Reps at ${formatWeight(test.weightKg, unit)}` : 'Reps at a fixed weight';
    case 'longest':
      return HOLD_IDS.has(exercise.id) ? 'Longest hold' : 'Longest time';
    case 'fastest':
      return exercise.distanceM ? `Time for ${formatDistance(exercise.distanceM)}` : 'Time for the distance';
  }
};

/** The one standard that makes a retest comparable with the baseline. */
export const TEST_STANDARDS: Record<TestType, string> = {
  max_reps: 'Full range, good form. Stop at the first rep that breaks form.',
  reps_at_weight: 'The same weight every test. Stop at the first rep that breaks form.',
  longest: 'Good form from start to finish. Time stops when form breaks.',
  fastest: 'Same route or machine every time. Enter your time.',
};

export const formatTestValue = (type: TestType, value: number): string =>
  type === 'longest' || type === 'fastest' ? formatSeconds(value) : String(value);

export interface TestComparison {
  before: number;
  after: number;
  /** after − before, in the test's own units (reps or seconds). */
  delta: number;
  /** % better (negative = worse). For fastest, a lower time is better. */
  pct: number;
  state: 'up' | 'same' | 'down';
}

/**
 * Small moves are "about the same": within 1 rep, 5 seconds on a hold, or 2%
 * on a timed distance (about 11 s on a 9-minute mile).
 */
export const compareTest = (type: TestType, before: number, after: number): TestComparison => {
  const delta = after - before;
  const better = type === 'fastest' ? -delta : delta;
  const pct = before > 0 ? Math.round((better / before) * 100) : 0;
  const same =
    type === 'longest'
      ? Math.abs(delta) <= 5
      : type === 'fastest'
        ? before > 0 && Math.abs(delta) / before <= 0.02
        : Math.abs(delta) <= 1;
  return { before, after, delta, pct, state: same ? 'same' : better > 0 ? 'up' : 'down' };
};

/** "+3 reps · +50%", "18s faster", "About the same", "2 reps fewer". */
export const describeComparison = (type: TestType, c: TestComparison): string => {
  if (c.state === 'same') return 'About the same';
  const n = Math.abs(c.delta);
  if (type === 'fastest') return `${formatSeconds(n)} ${c.delta < 0 ? 'faster' : 'slower'}`;
  if (type === 'longest') return c.delta > 0 ? `+${formatSeconds(n)} · +${c.pct}%` : `${formatSeconds(n)} shorter`;
  return c.delta > 0 ? `+${n} ${n === 1 ? 'rep' : 'reps'} · +${c.pct}%` : `${n} ${n === 1 ? 'rep' : 'reps'} fewer`;
};

/** Exercises the program's workouts actually train. */
export const programExerciseIds = (workouts: Workout[]): Set<string> =>
  new Set(workouts.flatMap((w) => w.blocks.flatMap((b) => b.items.map((i) => i.exerciseId))));

// --- Dates and progress ----------------------------------------------------------

/** YYYY-MM-DD → local midnight. */
const parseDay = (day: string): Date => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDaysTo = (day: string, n: number): string => {
  const d = parseDay(day);
  return toLocalDateString(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
};

const daysBetween = (from: string, to: string): number =>
  Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86400000);

export const PHASE_LENGTHS = [4, 6, 8] as const;
export const DEFAULT_PHASE_WEEKS = 6;

export const retestDateFor = (start: string, weeks: number): string => addDaysTo(start, weeks * 7);

/** 1-based training week, held between 1 and the phase's length. */
export const phaseWeek = (phase: Pick<TrainingPhase, 'start_date' | 'weeks'>, today: string): number =>
  Math.min(phase.weeks, Math.max(1, Math.floor(daysBetween(phase.start_date, today) / 7) + 1));

export const daysUntilRetest = (phase: Pick<TrainingPhase, 'retest_date'>, today: string): number =>
  daysBetween(today, phase.retest_date);

export const isRetestDue = (phase: TrainingPhase, today: string): boolean =>
  phase.status === 'training' && today >= phase.retest_date;

export const isLighterWeek = (phase: TrainingPhase, today: string): boolean =>
  phase.status === 'training' && phase.lighter_last_week && phaseWeek(phase, today) === phase.weeks;

export const plannedSessions = (phase: Pick<TrainingPhase, 'days_per_week' | 'weeks'>): number =>
  phase.days_per_week * phase.weeks;

export const phaseSessions = (phase: TrainingPhase, sessions: CompletedWorkoutSession[]): CompletedWorkoutSession[] =>
  sessions.filter((s) => s.phase_id === phase.id);

/** The phase in progress — waiting on its baseline, or training. At most one. */
export const currentPhase = (phases: TrainingPhase[]): TrainingPhase | undefined =>
  phases.find((p) => p.status === 'baseline' || p.status === 'training');

/**
 * The program workout to do next: one not done yet this phase, in program
 * order, else the one done longest ago. Workouts since deleted are passed over.
 */
export const nextProgramWorkout = (
  phase: TrainingPhase,
  workouts: Workout[],
  sessions: CompletedWorkoutSession[]
): Workout | undefined => {
  const program = phase.workout_ids
    .map((id) => workouts.find((w) => w.id === id))
    .filter((w): w is Workout => !!w);
  if (!program.length) return undefined;
  const done = phaseSessions(phase, sessions);
  const lastDone = (id: string) =>
    done.filter((s) => s.workout_id === id).reduce((max, s) => (s.finished_at > max ? s.finished_at : max), '');
  const never = program.find((w) => !lastDone(w.id));
  if (never) return never;
  return [...program].sort((a, b) => lastDone(a.id).localeCompare(lastDone(b.id)))[0];
};

// --- Building phases ---------------------------------------------------------------

export const newPhase = (opts: {
  id: string;
  programName: string;
  templateId?: string;
  workoutIds: string[];
  daysPerWeek: number;
  weeks: number;
  lighterLastWeek: boolean;
  tests: PhaseTest[];
  today: string;
  now: Date;
}): TrainingPhase => ({
  id: opts.id,
  number: 1,
  program_name: opts.programName,
  ...(opts.templateId ? { template_id: opts.templateId } : {}),
  workout_ids: opts.workoutIds,
  days_per_week: opts.daysPerWeek,
  weeks: opts.weeks,
  lighter_last_week: opts.lighterLastWeek,
  tests: opts.tests,
  start_date: opts.today,
  retest_date: retestDateFor(opts.today, opts.weeks),
  baseline: {},
  status: 'baseline',
  created_at: opts.now.toISOString(),
  updated_at: opts.now.toISOString(),
});

/**
 * Baseline saved: training starts today, so the clock to the retest starts
 * now — not on the day the phase was set up.
 */
export const recordBaseline = (
  phase: TrainingPhase,
  results: Record<string, number>,
  tests: PhaseTest[],
  today: string,
  now: Date
): TrainingPhase => ({
  ...phase,
  tests,
  baseline: results,
  baseline_at: now.toISOString(),
  start_date: today,
  retest_date: retestDateFor(today, phase.weeks),
  status: 'training',
  updated_at: now.toISOString(),
});

export const recordRetest = (phase: TrainingPhase, results: Record<string, number>, now: Date): TrainingPhase => ({
  ...phase,
  retest: results,
  retest_at: now.toISOString(),
  status: 'complete',
  updated_at: now.toISOString(),
});

export const endPhase = (phase: TrainingPhase, now: Date): TrainingPhase => ({
  ...phase,
  status: 'ended',
  updated_at: now.toISOString(),
});

/** The next phase: same program and tests, one change, and today's retest as its baseline. */
export const nextPhaseFrom = (
  prev: TrainingPhase,
  opts: { id: string; change: PhaseChange; today: string; now: Date }
): TrainingPhase => {
  const days = opts.change.key === 'days' ? Math.min(7, prev.days_per_week + 1) : prev.days_per_week;
  return {
    id: opts.id,
    number: prev.number + 1,
    program_name: prev.program_name,
    ...(prev.template_id ? { template_id: prev.template_id } : {}),
    workout_ids: prev.workout_ids,
    days_per_week: days,
    weeks: prev.weeks,
    lighter_last_week: prev.lighter_last_week,
    tests: prev.tests,
    start_date: opts.today,
    retest_date: retestDateFor(opts.today, prev.weeks),
    baseline: { ...(prev.retest ?? prev.baseline) },
    ...(prev.retest_at ? { baseline_at: prev.retest_at } : {}),
    change: opts.change,
    previous_phase_id: prev.id,
    status: 'training',
    created_at: opts.now.toISOString(),
    updated_at: opts.now.toISOString(),
  };
};

// --- The one change ----------------------------------------------------------------

export interface ChangeSuggestion {
  change: PhaseChange;
  /** Why, in a sentence. */
  why: string;
}

/**
 * Starting rules, deliberately simple:
 *   under 70% of planned sessions done → change nothing, aim for more sessions;
 *   every trained test went up → one more set of everything;
 *   a trained test stayed flat or dropped → change that exercise.
 * Tests the program doesn't train never drive the suggestion.
 */
export const suggestNextChange = (opts: {
  phase: TrainingPhase;
  sessionsDone: number;
  trainedIds: Set<string>;
  exercisesById: Record<string, Exercise>;
}): ChangeSuggestion => {
  const { phase, sessionsDone, trainedIds, exercisesById } = opts;
  const planned = plannedSessions(phase);
  if (planned > 0 && sessionsDone / planned < 0.7) {
    return {
      change: { key: 'consistency', label: 'Keep everything the same and aim for more sessions' },
      why: `You did ${sessionsDone} of ${planned} sessions. Same program again, aiming for more of them. Showing up comes first.`,
    };
  }
  const trained = phase.tests.filter(
    (t) => trainedIds.has(t.exerciseId) && exercisesById[t.exerciseId] && phase.retest?.[t.exerciseId] !== undefined
  );
  if (!trained.length) {
    return {
      change: { key: 'none', label: 'Keep everything the same' },
      why: 'None of your tests are in the program, so there’s nothing here to point a change at.',
    };
  }
  const flat = trained.filter((t) => {
    const ex = exercisesById[t.exerciseId];
    return (
      compareTest(testTypeFor(ex.kind), phase.baseline[t.exerciseId] ?? 0, phase.retest![t.exerciseId]).state !== 'up'
    );
  });
  if (!flat.length) {
    return {
      change: { key: 'sets', label: 'Add one set to each exercise' },
      why: `All ${trained.length} tests you trained went up, so you can take on a bit more work.`,
    };
  }
  const ex = exercisesById[flat[0].exerciseId];
  const stalled = `${ex.name} stayed about the same while you trained it.`;
  if (ex.kind === 'weight') {
    return {
      change: { key: 'reps', label: `${ex.name}: heavier sets of 5–8 reps`, exerciseId: ex.id },
      why: `${stalled} Heavier sets are a different push.`,
    };
  }
  return {
    change: { key: 'sets', label: `${ex.name}: one more set`, exerciseId: ex.id },
    why: `${stalled} More practice at it is the simplest change.`,
  };
};

/**
 * The changes the app can make for you: one more set (of everything, or one
 * exercise) and shorter rests. Returns only the workouts it changed; the rest
 * — reps, weight, swapping an exercise — are edits the user makes.
 */
export const applyChangeToWorkouts = (workouts: Workout[], change: PhaseChange, now: Date): Workout[] => {
  if (change.key !== 'sets' && change.key !== 'rest') return [];
  const out: Workout[] = [];
  for (const w of workouts) {
    let touched = false;
    const blocks = w.blocks.map((b) => {
      if (change.key === 'sets') {
        if (change.exerciseId && !b.items.some((i) => i.exerciseId === change.exerciseId)) return b;
        touched = true;
        return { ...b, rounds: b.rounds + 1 };
      }
      if (b.restSec <= 30) return b;
      touched = true;
      return { ...b, restSec: Math.max(30, b.restSec - 30) };
    });
    if (touched) out.push({ ...w, blocks, updated_at: now.toISOString() });
  }
  return out;
};

/** True when the app can apply this change to the workouts by itself. */
export const changeIsAutomatic = (change: PhaseChange): boolean =>
  change.key === 'sets' || change.key === 'rest' || change.key === 'days';

// --- History across phases ------------------------------------------------------------

/** The run of phases ending at `phaseId`, oldest first, following previous_phase_id. */
export const phaseChain = (phases: TrainingPhase[], phaseId: string): TrainingPhase[] => {
  const byId = new Map(phases.map((p) => [p.id, p]));
  const chain: TrainingPhase[] = [];
  let p = byId.get(phaseId);
  const seen = new Set<string>();
  while (p && !seen.has(p.id)) {
    seen.add(p.id);
    chain.unshift(p);
    p = p.previous_phase_id ? byId.get(p.previous_phase_id) : undefined;
  }
  return chain;
};

export interface TestPoint {
  label: string;
  value: number;
  /** What the phase that produced this point changed. */
  change?: string;
}

/** The first baseline, then each completed phase's retest. */
export const testSeries = (chain: TrainingPhase[], exerciseId: string): TestPoint[] => {
  const points: TestPoint[] = [];
  const first = chain[0];
  if (first?.baseline[exerciseId] !== undefined) points.push({ label: 'Start', value: first.baseline[exerciseId] });
  for (const p of chain) {
    const v = p.retest?.[exerciseId];
    if (v === undefined) continue;
    points.push({ label: `Phase ${p.number}`, value: v, change: p.change?.label ?? 'First phase' });
  }
  return points;
};

export interface PhaseHighlight {
  exerciseId: string;
  name: string;
  type: TestType;
  before: number;
  after: number;
  pct: number;
  /** Phases with a retest in this run. */
  phases: number;
  /** When the run's first baseline was taken, YYYY-MM-DD. */
  since: string;
  /** Up to two more tests that improved, e.g. "Push-ups 22 → 27". */
  others: string[];
}

/**
 * For Progress: the biggest gain from the first baseline of the latest run to
 * its latest retest. Null until a retest has improved something — the card
 * celebrates growth, so it doesn't appear to report "about the same".
 */
export const phaseHighlight = (
  phases: TrainingPhase[],
  exercisesById: Record<string, Exercise>
): PhaseHighlight | null => {
  const latest = phases.find((p) => p.status === 'complete' && p.retest);
  if (!latest) return null;
  const chain = phaseChain(phases, latest.id);
  const first = chain[0];
  const gains = latest.tests
    .map((t) => {
      const ex = exercisesById[t.exerciseId];
      const before = first.baseline[t.exerciseId];
      const after = latest.retest![t.exerciseId];
      if (!ex || before === undefined || after === undefined) return null;
      const type = testTypeFor(ex.kind);
      return { ex, type, before, after, cmp: compareTest(type, before, after) };
    })
    .filter((g): g is NonNullable<typeof g> => !!g && g.cmp.state === 'up')
    .sort((a, b) => b.cmp.pct - a.cmp.pct);
  if (!gains.length) return null;
  const [top, ...rest] = gains;
  return {
    exerciseId: top.ex.id,
    name: top.ex.name,
    type: top.type,
    before: top.before,
    after: top.after,
    pct: top.cmp.pct,
    phases: chain.filter((p) => p.retest).length,
    since: first.start_date,
    others: rest
      .slice(0, 2)
      .map((g) => `${g.ex.name} ${formatTestValue(g.type, g.before)} → ${formatTestValue(g.type, g.after)}`),
  };
};

// --- Step-ups inside a phase -------------------------------------------------------------

export const stepUpKey = (blockId: string, itemIndex: number): string => `${blockId}:${itemIndex}`;

export interface StepUpSuggestion {
  stepUp: StepUp;
  /** "Try 55 lb today" */
  title: string;
  /** Why, from last time's numbers. */
  why: string;
}

/**
 * Double progression: once every set last time reached the planned reps (or
 * seconds), suggest a little more — the next weight step, one more rep, or
 * five more seconds. Distance efforts get no nudge: faster is just effort.
 */
export const suggestStepUp = (
  kind: ExerciseKind,
  target: SetValues,
  lastSets: LoggedSet[],
  unit: WeightUnit
): StepUpSuggestion | null => {
  if (!lastSets.length) return null;
  if (kind === 'weight') {
    const goal = target.reps ?? DEFAULT_TARGET.weight.reps!;
    const weights = new Set(lastSets.map((s) => Math.round((s.weightKg ?? 0) * 1000)));
    const kg = lastSets[0].weightKg ?? 0;
    if (kg <= 0 || weights.size !== 1 || !lastSets.every((s) => (s.reps ?? 0) >= goal)) return null;
    const next = stepWeight(kg, unit, 1);
    return {
      stepUp: { weightKg: next },
      title: `Try ${formatWeight(next, unit)} today`,
      why: `Last time you hit ${goal}+ reps on every set at ${formatWeight(kg, unit)}.`,
    };
  }
  if (kind === 'reps') {
    const goal = target.reps ?? DEFAULT_TARGET.reps.reps!;
    if (!lastSets.every((s) => (s.reps ?? 0) >= goal)) return null;
    return {
      stepUp: { addReps: 1 },
      title: 'Try one more rep per set',
      why: `Last time you hit ${goal}+ on every set.`,
    };
  }
  if (kind === 'time') {
    const goal = target.seconds ?? DEFAULT_TARGET.time.seconds!;
    if (!lastSets.every((s) => (s.seconds ?? 0) >= goal)) return null;
    return {
      stepUp: { addSeconds: 5 },
      title: 'Try 5 seconds longer',
      why: `Last time every set lasted ${formatSeconds(goal)} or more.`,
    };
  }
  return null;
};

/** Prefilled numbers with an accepted step-up applied. */
export const applyStepUp = (values: SetValues, stepUp?: StepUp): SetValues => {
  if (!stepUp || stepUp.declined) return values;
  return {
    ...values,
    ...(stepUp.weightKg !== undefined ? { weightKg: stepUp.weightKg } : {}),
    ...(stepUp.addReps && values.reps !== undefined ? { reps: values.reps + stepUp.addReps } : {}),
    ...(stepUp.addSeconds && values.seconds !== undefined ? { seconds: values.seconds + stepUp.addSeconds } : {}),
  };
};

export const answerStepUp = (session: WorkoutSession, key: string, stepUp: StepUp): WorkoutSession => ({
  ...session,
  stepUps: { ...(session.stepUps ?? {}), [key]: stepUp },
});

// --- The lighter last week ------------------------------------------------------------------

/** About 40% fewer sets: 3 → 2, 4 → 2, 5 → 3, never under 1. */
export const lighterRounds = (rounds: number): number => Math.max(1, Math.round(rounds * 0.6));

/**
 * The plan's sets cut back for the light week. plannedRounds keeps the saved
 * workout's number, so finishing a light session never offers to save fewer
 * sets back to the workout.
 */
export const lightenSession = (session: WorkoutSession): WorkoutSession => ({
  ...session,
  lighter: true,
  blocks: session.blocks.map((b) => ({ ...b, rounds: lighterRounds(b.rounds) })),
});
