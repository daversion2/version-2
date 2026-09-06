import { PracticeCompletionInput, PracticeInstance } from '../types';
import { HabitDefinition, getCommitmentField } from '../data/practices';
import { RESISTANCE_MAX, RESISTANCE_MIN, resistanceToDifficulty } from '../constants/resistance';
import { resolveTemplateFields } from '../data/habitTemplates';

// =============================================================================
// QUICK LOG — one tap on Today, one complete log.
//
// The Today row's resistance chips call this. It produces exactly the same
// PracticeCompletionInput the capture sheet produces, so the rep runs through
// completePractice and gets identical XP, streak, celebration and tidbit
// handling. A quick log is not a lesser kind of log; it is the same log,
// answered faster.
//
// Two things are settled here and nowhere else:
//
//   THE RATING is never invented. It comes from the chip the user pressed. That
//   is the whole reason the chips replaced a checkmark — a one-tap log that
//   skipped the rating would bias the resistance trend toward hard days, since
//   people would tap through the easy ones and open the sheet for the notable
//   ones. The metric the product is built on would drift the wrong way.
//
//   THE METRIC is inferred, but only ever the amount the user themselves
//   promised at adoption, and it is flagged when it is. "80 oz" on a water habit
//   is not a measurement, it is the commitment being affirmed — so analytics can
//   tell the two apart via metrics_assumed.
// =============================================================================

/** Which habits can be logged in one tap, and which still need the sheet. */
export type QuickLogEligibility =
  | { kind: 'quick' }
  | { kind: 'sheet'; reason: 'timer' | 'multi_metric' };

/**
 * Can this habit be logged with a single chip tap?
 *
 * A timed practice can't: "how long" IS the practice, and a guessed duration is
 * worse than no duration. Neither can a habit asking for several numbers — the
 * commitment covers one amount, not a form. Everything else can, which is the
 * large majority of the library.
 */
export const quickLogEligibility = (
  habit: PracticeInstance,
  definition?: HabitDefinition
): QuickLogEligibility => {
  if (definition?.flow === 'timer') return { kind: 'sheet', reason: 'timer' };

  // Curated habits carry their template in the catalog; custom habits resolve a
  // preset off the instance. Same fallback the detail screen uses.
  const fields = definition?.tracking ?? resolveTemplateFields(habit);
  const commitment = getCommitmentField(definition);

  // One field that IS the commitment is answerable from the promise. Anything
  // beyond that is a form, and a form needs the sheet.
  const unanswerable = fields.filter((f) => f.key !== commitment?.key);
  if (unanswerable.length > 0) return { kind: 'sheet', reason: 'multi_metric' };

  return { kind: 'quick' };
};

/**
 * The completion input for a one-tap log at the given resistance level.
 *
 * `metrics` is populated only from the habit's committed amount — the number the
 * user chose when they adopted it — and `metrics_assumed` marks it so no later
 * analysis has to guess where it came from.
 */
export const buildQuickLogInput = (
  habit: PracticeInstance,
  definition: HabitDefinition | undefined,
  resistance: number
): PracticeCompletionInput => {
  const level = Math.min(Math.max(Math.round(resistance), RESISTANCE_MIN), RESISTANCE_MAX);

  const field = getCommitmentField(definition);
  // The user's own number wins; the catalog default is the fallback the adoption
  // screen showed them. Absent both, nothing is written rather than a zero.
  const amount = field ? habit.metric_goals?.[field.key] ?? field.default : undefined;
  const hasAmount = !!field && typeof amount === 'number';

  return {
    resistance: level,
    difficulty: resistanceToDifficulty(level),
    ...(hasAmount ? { metrics: { [field!.key]: amount as number }, metrics_assumed: true } : {}),
    logged_via: 'quick',
  };
};
