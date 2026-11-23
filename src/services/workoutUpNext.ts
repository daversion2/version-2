import type { CompletedWorkoutSession, TrainingPhase, Workout, WorkoutSession, WorkoutsLaunch } from '../types/workouts';
import { STARTER_WORKOUTS } from '../data/workoutExercises';
import { isRetestDue, nextProgramWorkout, phaseWeek } from './trainingPhases';
import { totalSetsLogged } from './workoutSession';

// =============================================================================
// WHAT "START" STARTS. The Workouts page on Today names one workout on its
// button and opens straight into it; Workouts' home shows the same pick as
// its Up next card. In a phase it's the phase's next workout; otherwise the
// saved workouts take turns (Push → Pull → Legs → Push…).
// =============================================================================

const starterRank = (w: Workout): number => {
  const i = STARTER_WORKOUTS.findIndex((s) => s.starter_id === w.starter_id);
  return i < 0 ? STARTER_WORKOUTS.length : i;
};

/**
 * The order workouts take turns in: oldest first, so a new one joins the end.
 * Push/Pull/Legs are created together, so they keep their own order. Empty
 * workouts can't be started and sit out.
 */
export const rotationOrder = (workouts: Workout[]): Workout[] =>
  workouts
    .filter((w) => w.blocks.length > 0)
    .sort(
      (a, b) =>
        a.created_at.localeCompare(b.created_at) || starterRank(a) - starterRank(b) || a.name.localeCompare(b.name)
    );

/** The workout after the one done last, wrapping round; the first one if none has been done. */
export const nextInRotation = (workouts: Workout[]): { workout: Workout; after?: Workout } | undefined => {
  const order = rotationOrder(workouts);
  if (!order.length) return undefined;
  const last = order.reduce<Workout | undefined>(
    (best, w) => (w.last_done_at && (!best?.last_done_at || w.last_done_at > best.last_done_at) ? w : best),
    undefined
  );
  if (!last) return { workout: order[0] };
  const next = order[(order.indexOf(last) + 1) % order.length];
  return { workout: next, after: next.id === last.id ? undefined : last };
};

export interface UpNext {
  workout: Workout;
  /** Small line above the name: "Phase 2, week 3 of 6" or "After Push Day". */
  why: string;
  inPhase: boolean;
}

/** The workout to suggest: the phase's next one while training, else the next in rotation. */
export const upNextWorkout = (opts: {
  phase?: TrainingPhase;
  workouts: Workout[];
  sessions: CompletedWorkoutSession[];
  today: string;
}): UpNext | undefined => {
  const { phase, workouts, sessions, today } = opts;
  if (phase?.status === 'training') {
    const w = nextProgramWorkout(phase, workouts, sessions);
    if (w && w.blocks.length > 0) {
      return { workout: w, why: `Phase ${phase.number}, week ${phaseWeek(phase, today)} of ${phase.weeks}`, inPhase: true };
    }
  }
  const pick = nextInRotation(workouts);
  if (!pick) return undefined;
  return { workout: pick.workout, why: pick.after ? `After ${pick.after.name}` : 'Up next', inPhase: false };
};

export interface StartAction {
  label: string;
  /** One quiet line under the button. */
  meta: string;
  launch: WorkoutsLaunch;
  /** Offer "Something else" (opens Workouts' home). Off when a workout is already under way. */
  canChoose: boolean;
}

/**
 * The start button on the Workouts page. In order: a workout left open, a
 * phase test that's due, the up-next workout, else just open Workouts (a new
 * account's Push/Pull/Legs are only copied in when it first opens).
 */
export const workoutStartAction = (opts: {
  draft?: WorkoutSession | null;
  phase?: TrainingPhase;
  workouts: Workout[];
  sessions: CompletedWorkoutSession[];
  today: string;
}): StartAction => {
  const { draft, phase, today } = opts;
  if (draft) {
    const sets = totalSetsLogged(draft);
    return {
      label: `Resume ${draft.workoutName}`,
      meta: `${sets} ${sets === 1 ? 'set' : 'sets'} logged`,
      launch: { kind: 'resume' },
      canChoose: false,
    };
  }
  if (phase?.status === 'baseline') {
    return {
      label: 'Start the test',
      meta: `Phase ${phase.number} starts with a test`,
      launch: { kind: 'phaseTest', mode: 'baseline' },
      canChoose: true,
    };
  }
  if (phase && isRetestDue(phase, today)) {
    return {
      label: 'Retest now',
      meta: `Phase ${phase.number} is done`,
      launch: { kind: 'phaseTest', mode: 'retest' },
      canChoose: true,
    };
  }
  const next = upNextWorkout(opts);
  if (next) {
    return {
      label: `Start ${next.workout.name}`,
      meta: next.why,
      launch: { kind: 'workout', workoutId: next.workout.id },
      canChoose: true,
    };
  }
  return { label: 'Start a workout', meta: 'Pick a workout or start empty', launch: { kind: 'home' }, canChoose: false };
};

/** The top of Workouts' home: the one thing to do now. */
export type HomeFocus =
  | { kind: 'resume' }
  | { kind: 'test'; mode: 'baseline' | 'retest'; label: string; meta: string }
  | { kind: 'workout'; workout: Workout; why: string; inPhase: boolean }
  | { kind: 'create' };

/** Built on workoutStartAction, so the home and the Workouts page always name the same thing. */
export const workoutHomeFocus = (opts: {
  draft?: WorkoutSession | null;
  phase?: TrainingPhase;
  workouts: Workout[];
  sessions: CompletedWorkoutSession[];
  today: string;
}): HomeFocus => {
  const action = workoutStartAction(opts);
  const { launch } = action;
  if (launch.kind === 'resume') return { kind: 'resume' };
  if (launch.kind === 'phaseTest') return { kind: 'test', mode: launch.mode, label: action.label, meta: action.meta };
  const next = launch.kind === 'workout' ? upNextWorkout(opts) : undefined;
  return next ? { kind: 'workout', workout: next.workout, why: next.why, inPhase: next.inPhase } : { kind: 'create' };
};

export interface PhaseEntry {
  title: string;
  subtitle: string;
  target: { screen: 'Phase' | 'PhaseResults'; phaseId: string } | { screen: 'PhaseSetup' };
}

/** Where "phases" leads right now: the current one, the last one's results, or setting one up. */
export const phaseEntry = (current: TrainingPhase | undefined, latest: TrainingPhase | undefined, today: string): PhaseEntry => {
  if (current) {
    return {
      title: 'Your phase',
      subtitle:
        current.status === 'baseline'
          ? `Phase ${current.number} · test day`
          : `Phase ${current.number} · week ${phaseWeek(current, today)} of ${current.weeks}`,
      target: { screen: 'Phase', phaseId: current.id },
    };
  }
  if (latest?.status === 'complete') {
    return {
      title: 'Next phase',
      subtitle: `Phase ${latest.number} done · see results`,
      target: { screen: 'PhaseResults', phaseId: latest.id },
    };
  }
  return { title: 'Start a phase', subtitle: 'Test yourself, follow a program, then retest', target: { screen: 'PhaseSetup' } };
};

/** Personal records set so far this calendar month. */
export const prsThisMonth = (sessions: CompletedWorkoutSession[], now: Date): number =>
  sessions.reduce((n, s) => {
    const at = new Date(s.finished_at);
    return at.getFullYear() === now.getFullYear() && at.getMonth() === now.getMonth() ? n + s.prs.length : n;
  }, 0);
