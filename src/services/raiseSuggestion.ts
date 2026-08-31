import { CompletionLog } from '../types';
import { TrackingField } from '../data/practices';
import { logResistance } from '../constants/resistance';

// =============================================================================
// RAISE SUGGESTION — "this has gotten easy. Raise it?"
//
// The falling resistance curve is the product's proof of change. This is what
// makes it ACTIONABLE: when a habit stops being hard and the committed amount is
// being hit consistently, the commitment has stopped doing any work.
//
// It only ever SUGGESTS. The app never moves a number the user promised — a
// commitment that changes itself is not a commitment, and being told your goal
// has been raised for you is how people quit.
// =============================================================================

/** Logs carrying the metric before a suggestion is even considered. */
export const MIN_LOGS_FOR_RAISE = 8;
/** Share of recent logs that must have met the goal, 0–1. */
export const HIT_RATE_FOR_RAISE = 0.8;
/** Mean resistance at or below which the habit counts as "easy now". */
export const EASY_RESISTANCE = 1.5;
/** How many recent logs the judgement is made on. */
const WINDOW = 10;

export interface RaiseSuggestion {
  metricKey: string;
  currentGoal: number;
  suggestedGoal: number;
  unit?: string;
  /** Percentage of the recent window that met the goal, 0–100. */
  hitRate: number;
  /** Mean resistance across the recent window. */
  recentResistance: number;
}

const avg = (n: number[]): number => n.reduce((s, v) => s + v, 0) / n.length;

/**
 * Should this habit be offered a higher commitment?
 *
 * Requires BOTH that the goal is being met and that the habit has stopped
 * feeling hard. Either alone is not enough: hitting 80 oz every day while still
 * rating it a 3 means the amount is right and the difficulty is real, and an
 * easy habit you keep missing needs consistency, not a bigger number.
 *
 * Returns null when there is nothing honest to say.
 */
export const buildRaiseSuggestion = (
  logs: CompletionLog[],
  field: TrackingField | undefined,
  currentGoal: number | undefined
): RaiseSuggestion | null => {
  if (!field || typeof currentGoal !== 'number' || currentGoal <= 0) return null;
  // A 'scale' commitment ("how well did you hold to it?") has a fixed ceiling,
  // so there is no larger version to suggest.
  if (field.type === 'scale') return null;

  const withMetric = [...logs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter((l) => typeof l.metrics?.[field.key] === 'number');
  if (withMetric.length < MIN_LOGS_FOR_RAISE) return null;

  const window = withMetric.slice(-WINDOW);
  const hits = window.filter((l) => (l.metrics![field.key] as number) >= currentGoal).length;
  const hitRate = hits / window.length;
  if (hitRate < HIT_RATE_FOR_RAISE) return null;

  const resistances = window
    .map(logResistance)
    .filter((v): v is number => typeof v === 'number');
  if (!resistances.length) return null;
  const recentResistance = avg(resistances);
  if (recentResistance > EASY_RESISTANCE) return null;

  // One step up, or 25% for fields with no meaningful step. Clamped to the
  // field's own ceiling so the suggestion is never something the picker
  // cannot express.
  const step = field.step ?? 1;
  const raw = currentGoal + Math.max(step, Math.round((currentGoal * 0.25) / step) * step);
  const suggestedGoal = field.max ? Math.min(raw, field.max) : raw;
  // Already at the ceiling — nothing to offer.
  if (suggestedGoal <= currentGoal) return null;

  return {
    metricKey: field.key,
    currentGoal,
    suggestedGoal,
    unit: field.unit,
    hitRate: Math.round(hitRate * 100),
    recentResistance: Math.round(recentResistance * 10) / 10,
  };
};
