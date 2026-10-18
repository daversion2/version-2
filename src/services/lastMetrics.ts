import { CompletionLog, PracticeCompletionInput, PracticeInstance } from '../types';
import type { TrackingField } from '../data/practices';
import { RESISTANCE_MAX, RESISTANCE_MIN, resistanceToDifficulty } from '../constants/resistance';
import { scaleLabel } from '../data/gradeScale';

// =============================================================================
// LAST METRICS — what the quick sheet fills in.
//
// A tap on a Today row opens a sheet with the habit's numbers already set to
// last time ("3 min · 50°F"), so a normal day is still just the rating. The
// founder's rule (2026-10-18): amounts are filled in automatically.
//
// Where a value comes from, in order:
//   1. the most recent check-in that recorded it,
//   2. the amount the user committed to when they adopted the habit,
//   3. the field's own default.
//
// Only numeric fields are pre-filled. A choice (a technique, say) is a decision
// about today, not a quantity, so it is left to the detailed capture.
// =============================================================================

export const isNumericField = (f: TrackingField): boolean =>
  f.type === 'duration' || f.type === 'number' || f.type === 'scale';

/** Newest first: by day, then by when it was written. */
const newestFirst = (a: CompletionLog, b: CompletionLog): number =>
  b.date.localeCompare(a.date) || (b.completed_at ?? '').localeCompare(a.completed_at ?? '');

export const prefillMetrics = (
  fields: TrackingField[] | undefined,
  habit: Pick<PracticeInstance, 'id' | 'metric_goals'>,
  logs: CompletionLog[]
): Record<string, number> => {
  const numeric = (fields ?? []).filter(isNumericField);
  if (numeric.length === 0) return {};
  const own = logs.filter((l) => l.reference_id === habit.id && l.metrics).sort(newestFirst);
  const out: Record<string, number> = {};
  for (const f of numeric) {
    const fromLog = own.find((l) => typeof l.metrics?.[f.key] === 'number')?.metrics?.[f.key];
    const value =
      typeof fromLog === 'number' ? fromLog : habit.metric_goals?.[f.key] ?? f.default ?? f.min;
    if (typeof value === 'number') out[f.key] = value;
  }
  return out;
};

/** A value as the user reads it: "3 min", "50°F", "10,400", a grade's letter. */
export const formatMetricValue = (f: TrackingField, v: number): string => {
  const label = f.type === 'scale' ? scaleLabel(f, v) : null;
  if (label) return label;
  const n = v >= 1000 ? v.toLocaleString() : String(v);
  if (!f.unit) return n;
  return f.unit === '$' ? `$${n}` : f.unit.startsWith('°') ? `${n}${f.unit}` : `${n} ${f.unit}`;
};

/** One stepper press, kept on the field's grid and inside its bounds. */
export const stepMetric = (f: TrackingField, value: number, direction: 1 | -1): number => {
  const step = f.step ?? 1;
  const next = Math.round((value + direction * step) / step) * step;
  const min = f.min ?? 0;
  const max = f.max ?? Number.POSITIVE_INFINITY;
  return Math.min(max, Math.max(min, next));
};

/**
 * The check-in a quick-sheet rating produces. Same shape as the capture
 * sheet's, so it runs through completePractice like any other log.
 *
 * `metrics_assumed` is set when every number was left as filled in — the user
 * affirmed last time rather than measuring today — so analysis can tell a
 * carried-over amount from a fresh one.
 */
export const buildQuickSheetInput = (
  resistance: number,
  values: Record<string, number>,
  prefilled: Record<string, number>,
  date?: string
): PracticeCompletionInput => {
  const level = Math.min(Math.max(Math.round(resistance), RESISTANCE_MIN), RESISTANCE_MAX);
  const keys = Object.keys(values);
  const unchanged = keys.every((k) => values[k] === prefilled[k]);
  return {
    resistance: level,
    difficulty: resistanceToDifficulty(level),
    ...(keys.length ? { metrics: { ...values }, metrics_assumed: unchanged } : {}),
    ...(date ? { date } : {}),
    logged_via: 'quick',
  };
};
