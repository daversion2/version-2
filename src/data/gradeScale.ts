import { ReflectionGrade } from '../types';

// =============================================================================
// GRADE SCALE — A–F, stored as 5–1.
//
// Two places in the app ask you to grade something: the nightly reflection
// ("how far did you push?") and any habit whose tracking template is a grade
// ("how well did you stick to it?"). They are the same vocabulary, so they are
// defined once, here. A B has to mean the same thing on both screens or the
// word stops carrying information.
//
// LETTERS ARE DISPLAY; NUMBERS ARE STORAGE. A grade is written to
// CompletionLog.metrics as 5…1, exactly as it always was — which is what lets
// it average, trend, and roll up with every other metric. Nothing in the data
// changed when the letters arrived, and logs written before them read back
// correctly: a stored 4 was a 4-out-of-5 then and is a B now.
//
// NO E. School grades skip it, and a scale people already know how to read is
// the entire reason for using letters instead of 1–5.
// =============================================================================

export const GRADE_MIN = 1;
export const GRADE_MAX = 5;

const GRADE_TO_NUM: Record<ReflectionGrade, number> = {
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  F: 1,
};

const NUM_TO_GRADE: [number, ReflectionGrade][] = [
  [4.5, 'A'],
  [3.5, 'B'],
  [2.5, 'C'],
  [1.5, 'D'],
  [0, 'F'],
];

export const gradeToNumber = (grade: ReflectionGrade): number => GRADE_TO_NUM[grade];

/**
 * The letter for a number, including a fractional one — an average of 4.3 is a
 * B. The thresholds are ordinary rounding (≥4.5 is an A), so a mean and a
 * single rep are lettered by the same rule.
 */
export const numberToGrade = (num: number): ReflectionGrade => {
  for (const [threshold, grade] of NUM_TO_GRADE) {
    if (num >= threshold) return grade;
  }
  return 'F';
};

/**
 * The value→letter map a TrackingField carries to declare itself graded.
 *
 * Data rather than a `type: 'grade'` flag, so the display layer stays generic:
 * anything that renders a metric asks the field for a label and gets one or
 * doesn't. A future 1–3 scale with words at the stops needs no new code.
 */
export const GRADE_VALUE_LABELS: Record<number, string> = {
  5: 'A',
  4: 'B',
  3: 'C',
  2: 'D',
  1: 'F',
};

/**
 * How a field's value should READ, or null when the field has no labels and the
 * number speaks for itself.
 *
 * Every surface that shows a metric — the capture slider, records, the Progress
 * families, the per-session bars, the coaching lines — goes through here. The
 * one that doesn't is the one that shows a user "4" for a grade they entered as
 * a B.
 *
 * Fractional values land on the nearest stop, so an average of 4.3 reads B.
 * TIES ROUND UP — 4.5 is an A — because that is what numberToGrade's `>=`
 * thresholds already do, and a mean of 4.5 must not read as a B here and an A
 * on the reflection screen.
 *
 * Values outside the labelled range clamp rather than vanish; a metric that
 * renders as an empty string is worse than one that renders imprecisely.
 */
export const scaleLabel = (
  field: { valueLabels?: Record<number, string> } | undefined | null,
  value: number
): string | null => {
  const labels = field?.valueLabels;
  if (!labels) return null;
  const stops = Object.keys(labels)
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (stops.length === 0) return null;
  // `<=` with ascending stops is what makes a tie pick the HIGHER stop.
  const nearest = stops.reduce((best, stop) =>
    Math.abs(stop - value) <= Math.abs(best - value) ? stop : best
  );
  return labels[nearest] ?? null;
};
