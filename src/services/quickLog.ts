import { PracticeCompletionInput, PracticeInstance } from '../types';
import { HabitDefinition, getCommitmentField } from '../data/practices';
import { RESISTANCE_MAX, RESISTANCE_MIN, resistanceToDifficulty } from '../constants/resistance';

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
//
// EVERY habit can be logged this way, including the ones that run a timer or
// carry a two-factor dose. There used to be a gate here that sent those to the
// capture sheet instead, on the reasoning that "how long" IS a timed practice.
// The reasoning was sound and the result was not: the six habits it caught are
// the curated practices seeded onto every home, so on a real screen the
// exception was the majority, and a row of chips sat next to a row with a bare
// chevron for reasons no user could infer.
//
// A session is now a ROUTE, not a gate. The timer lives one tap inside the
// card's expansion, so a user who wants to time their meditation still can, and
// one who already did it somewhere else is not made to run a countdown to say
// so. What a quick log costs on those habits is the duration or the dose — a
// real loss, taken knowingly, and only on the reps where speed was chosen.
// =============================================================================

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
