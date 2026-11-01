import type { FigureDemo } from '../utils/exerciseFigure/figure';

// =============================================================================
// Drawn-figure poses per exercise, keyed by the ids in BUILT_IN_EXERCISES.
// A Lab prototype (2026-11-01): push-up only, to compare against generated
// photos. Angles are explained in utils/exerciseFigure/figure.ts; the form
// each pose must hold is checked in __tests__/exerciseFigure.test.ts.
// =============================================================================

const HANDS = { x: 0, y: 1.75 };
/** Where the start pose's toes land with its hands at HANDS (worked out once, 2026-11-01). */
const TOE = { x: 72.0, y: 1.75 };

export const EXERCISE_FIGURES: Record<string, FigureDemo> = {
  // Side view, head to the left. The body pivots on the toes (the anchor): the
  // end is the start rotated 19.6° about the toe. The hands stay planted
  // (`reach`), and the arms bend to meet them, elbows rising toward the feet.
  // Upper arm drawn at 85% length at the bottom: it angles out ~45° from the
  // body, toward the camera.
  'push-up': {
    floor: true,
    start: {
      angles: { torso: 162.6, head: 162.6, upperArm: 270, forearm: 270, hand: 180, thigh: -17.4, shin: -17.4, foot: -107.4 },
      anchor: { joint: 'toe', at: TOE },
      reach: { wrist: HANDS, bend: 1 },
    },
    end: {
      angles: { torso: 182.2, head: 182.2, upperArm: 49.2, forearm: 265, hand: 180, thigh: 2.2, shin: 2.2, foot: -87.8 },
      scale: { upperArm: 0.85 },
      anchor: { joint: 'toe', at: TOE },
      reach: { wrist: HANDS, bend: 1 },
    },
  },
};
