import { BUILT_IN_EXERCISES } from '../../data/workoutExercises';
import { EXERCISE_DEMOS, NO_DEMO, PILOT_IDS } from '../../data/exerciseDemos';
import {
  approvedPair,
  estimateCost,
  exerciseStatus,
  finishedPairs,
  imagesIn,
  nextBatch,
  planPairs,
  type Candidate,
  type ExerciseState,
} from '../exerciseArt/status';
import { followPrompt, leadPrompt, referencePrompt } from '../exerciseArt/prompt';

const at = '2026-11-01T00:00:00.000Z';
const start = (index: number, basis = 'ref1'): Candidate => ({
  index,
  file: `push-up_start.c${index}.png`,
  sha256: `s${index}`,
  basis,
});
/** An end made from start `index` (its basis is that start's fingerprint). */
const end = (index: number, basis = `s${index}`): Candidate => ({
  index,
  file: `push-up_end.c${index}.png`,
  sha256: `e${index}`,
  basis,
});
const state = (over: Partial<ExerciseState> = {}): ExerciseState => ({
  hasEnd: true,
  starts: [],
  ends: [],
  reference: 'ref1',
  ...over,
});
const approve = (n: number) => ({
  status: 'approved' as const,
  start: { file: `push-up_start.c${n}.png`, sha256: `s${n}` },
  end: { file: `push-up_end.c${n}.png`, sha256: `e${n}` },
  at,
});

describe('exercise demo spec', () => {
  it('covers every built-in exercise, or says why not', () => {
    const missing = BUILT_IN_EXERCISES.filter((e) => !EXERCISE_DEMOS[e.id] && !NO_DEMO.includes(e.id));
    expect(missing.map((e) => e.id)).toEqual([]);
  });

  it('only describes exercises that exist', () => {
    const ids = new Set(BUILT_IN_EXERCISES.map((e) => e.id));
    expect(Object.keys(EXERCISE_DEMOS).filter((id) => !ids.has(id))).toEqual([]);
    expect(PILOT_IDS.filter((id) => !EXERCISE_DEMOS[id])).toEqual([]);
  });

  it('keeps cues to three, so they fit under the photos', () => {
    const long = Object.entries(EXERCISE_DEMOS).filter(([, d]) => (d.cues?.length ?? 0) > 3);
    expect(long.map(([id]) => id)).toEqual([]);
  });

  it('gives holds one photo and moves two', () => {
    expect(EXERCISE_DEMOS.plank.end).toBeUndefined();
    expect(EXERCISE_DEMOS['push-up'].end).toBeDefined();
  });
});

describe('exerciseStatus', () => {
  it('is pending with nothing made, waiting with no master photo', () => {
    expect(exerciseStatus(state())).toBe('pending');
    expect(exerciseStatus(state({ reference: null }))).toBe('waiting');
  });

  it('needs both photos of a pair before it counts as ready', () => {
    expect(exerciseStatus(state({ starts: [start(1)] }))).toBe('pending');
    expect(exerciseStatus(state({ starts: [start(1)], ends: [end(1)] }))).toBe('generated');
  });

  it('counts a one-photo exercise as ready with just the start', () => {
    expect(exerciseStatus(state({ hasEnd: false, starts: [start(1)] }))).toBe('generated');
  });

  it('only pairs an end with the start it was made from', () => {
    // end c1 was made from some other start
    expect(finishedPairs(state({ starts: [start(1)], ends: [end(1, 'other')] }))).toEqual([]);
  });

  it('is approved while both picked photos are unchanged', () => {
    const s = state({ starts: [start(1), start(2)], ends: [end(1), end(2)], decision: approve(2) });
    expect(exerciseStatus(s)).toBe('approved');
    expect(approvedPair(s)?.index).toBe(2);
  });

  it('drops back if either picked photo changed', () => {
    const edited = { ...end(2), sha256: 'edited' };
    expect(exerciseStatus(state({ starts: [start(2)], ends: [edited], decision: approve(2) }))).toBe('generated');
  });

  it('ignores everything made from an old master photo', () => {
    expect(exerciseStatus(state({ starts: [start(1, 'old')], ends: [end(1)], decision: approve(1) }))).toBe('pending');
  });

  it('shows needs_regen until fresh pairs arrive', () => {
    const decision = { status: 'needs_regen' as const, note: 'head up', at };
    expect(exerciseStatus(state({ decision }))).toBe('needs_regen');
    expect(exerciseStatus(state({ decision, starts: [start(4)], ends: [end(4)] }))).toBe('generated');
  });

  it('stays rejected whatever else is there', () => {
    expect(exerciseStatus(state({ reference: null, decision: { status: 'rejected', at } }))).toBe('rejected');
  });
});

describe('reverse pairs (end made first)', () => {
  // A reverse end is made from the master photo; its start is an edit of that end.
  const rEnd = (i: number): Candidate => ({ index: i, file: `pull-up_end.c${i}.png`, sha256: `e${i}`, basis: 'ref1' });
  const rStart = (i: number): Candidate => ({ index: i, file: `pull-up_start.c${i}.png`, sha256: `s${i}`, basis: `e${i}` });

  it('pairs each start with the end it was edited from', () => {
    const pairs = finishedPairs(state({ reverse: true, ends: [rEnd(1), rEnd(2)], starts: [rStart(1)] }));
    expect(pairs.map((p) => [p.index, p.start.file, p.end?.file])).toEqual([[1, 'pull-up_start.c1.png', 'pull-up_end.c1.png']]);
  });

  it('makes just the missing start when an end exists', () => {
    expect(planPairs(state({ reverse: true, ends: [rEnd(1)] }), 2)).toEqual({ followFor: [1], newPairs: [2] });
  });

  it('stops counting pairs made the normal way round', () => {
    expect(finishedPairs(state({ reverse: true, starts: [start(1)], ends: [end(1)] }))).toEqual([]);
  });
});

describe('planPairs', () => {
  it('makes a full set of pairs for a new exercise', () => {
    const plan = planPairs(state(), 3);
    expect(plan).toEqual({ followFor: [], newPairs: [1, 2, 3] });
    expect(imagesIn(plan, true)).toBe(6);
    expect(imagesIn(plan, false)).toBe(3);
  });

  it('finishes a pair whose end failed, and tops up the rest', () => {
    const plan = planPairs(state({ starts: [start(1), start(2)], ends: [end(1)] }), 3);
    expect(plan).toEqual({ followFor: [2], newPairs: [3] });
  });

  it('numbers fresh pairs after old ones, never reusing a file name', () => {
    expect(planPairs(state({ starts: [start(1, 'old'), start(2, 'old')] }), 3).newPairs).toEqual([3, 4, 5]);
  });

  it('makes nothing for approved, rejected or waiting exercises', () => {
    const none = { followFor: [], newPairs: [] };
    expect(planPairs(state({ starts: [start(1)], ends: [end(1)], decision: approve(1) }), 3)).toEqual(none);
    expect(planPairs(state({ decision: { status: 'rejected', at } }), 3)).toEqual(none);
    expect(planPairs(state({ reference: null }), 3)).toEqual(none);
  });
});

describe('nextBatch', () => {
  it('takes redo requests first, then untouched exercises, in order', () => {
    const status: Record<string, ReturnType<typeof exerciseStatus>> = {
      a: 'approved',
      b: 'pending',
      c: 'needs_regen',
      d: 'generated',
      e: 'pending',
    };
    expect(nextBatch(['a', 'b', 'c', 'd', 'e'], (id) => status[id], 2)).toEqual(['c', 'b']);
  });
});

describe('estimateCost', () => {
  it('prices images by model', () => {
    expect(estimateCost(100, 'gemini-2.5-flash-image')).toBe(3.9);
    expect(estimateCost(60, 'gemini-3-pro-image')).toBe(8.04);
  });

  it('refuses a model it has no price for, rather than guessing', () => {
    expect(() => estimateCost(1, 'mystery-model')).toThrow(/No price/);
  });
});

describe('prompts', () => {
  const pushUp = BUILT_IN_EXERCISES.find((e) => e.id === 'push-up')!;
  const demo = EXERCISE_DEMOS['push-up'];

  it('puts the exercise lines into the lead prompt', () => {
    const p = leadPrompt(pushUp, demo, { frame: 'start', hasPoseRef: true });
    expect(p).toContain(demo.start);
    expect(p).toContain('Image 2');
    expect(p).not.toContain(demo.end!);
  });

  it('can lead with the end, for a reverse exercise', () => {
    const p = leadPrompt(pushUp, demo, { frame: 'end', hasPoseRef: false });
    expect(p).toContain(demo.end!);
    expect(p).toContain('END position');
  });

  it('leaves out the pose-photo line when there is none', () => {
    expect(leadPrompt(pushUp, demo, { frame: 'start', hasPoseRef: false })).not.toContain('Image 2');
  });

  it('leads the follow prompt with the movement, then what stays the same', () => {
    const p = followPrompt(pushUp, demo, { frame: 'end', note: 'hips sagging' });
    expect(p).toContain(demo.end!);
    expect(p.indexOf('Move the body')).toBeLessThan(p.indexOf('Everything else stays the same'));
    expect(p).toContain('hips sagging');
    expect(followPrompt(pushUp, demo, { frame: 'start' })).toContain('a moment earlier');
  });

  it('refuses a second photo for a one-photo exercise', () => {
    const plank = BUILT_IN_EXERCISES.find((e) => e.id === 'plank')!;
    expect(() => followPrompt(plank, EXERCISE_DEMOS.plank, { frame: 'end' })).toThrow();
  });

  it('locks the athlete and clothing in the master prompt', () => {
    expect(referencePrompt()).toMatch(/charcoal-grey/);
  });
});
