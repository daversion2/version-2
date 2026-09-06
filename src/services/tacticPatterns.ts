/**
 * Override Playbook — turns the tactics logged after hard reps back into a
 * pre-practice prompt: "the last N times this took everything you had, you
 * counted it down 3 of them."
 *
 * The window is HARD REPS ONLY (see isHardRep), and that is the entire point:
 * tactics are only ever asked when resistance was ≥ TACTIC_GATE_RESISTANCE, so
 * windowing over all completions would mix in reps that were never offered the
 * question and quietly deflate every count.
 *
 * Surfaced as the "What works for you" block on the Ready beat (PracticeReady).
 */
import { getHabitCompletionLogs } from './practices';
import { getTactic, OverrideTactic } from '../data/overrideTactics';
import { isHardRep } from '../constants/resistance';
import { CompletionLog } from '../types';

/** Hard reps considered when looking for a pattern. */
export const PATTERN_WINDOW = 6;
/** Minimum appearances within the window for a tactic to count as a pattern. */
export const PATTERN_MIN_COUNT = 2;

export interface TacticPattern {
  tactic: OverrideTactic;
  /** How many of the windowed hard reps carried this tactic. */
  count: number;
  /** How many hard reps were actually in the window (< PATTERN_WINDOW when newer). */
  window: number;
}

/**
 * The dominant tactic across a habit's recent hard reps, or null when none has
 * emerged. Pure so it can be tested without Firestore.
 */
export const findTacticPattern = (logs: CompletionLog[]): TacticPattern | null => {
  const hard = logs
    .filter(isHardRep)
    .sort((a, b) => (b.completed_at ?? b.date).localeCompare(a.completed_at ?? a.date))
    .slice(0, PATTERN_WINDOW);

  if (hard.length < PATTERN_MIN_COUNT) return null;

  const counts = new Map<string, number>();
  hard.forEach((log) => {
    // A rep counts a tactic once, so `count` reads as "N of your last M".
    new Set(log.tactics ?? []).forEach((id) => {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    });
  });

  const top = [...counts.entries()]
    .filter(([, count]) => count >= PATTERN_MIN_COUNT)
    .map(([id, count]) => ({ tactic: getTactic(id), count }))
    .filter((c): c is { tactic: OverrideTactic; count: number } => !!c.tactic)
    // Ties break on the tactic list's own order, which keeps the line stable
    // across renders instead of flickering between two equally-used moves.
    .sort((a, b) => b.count - a.count)[0];

  return top ? { tactic: top.tactic, count: top.count, window: hard.length } : null;
};

export const getTacticPattern = async (
  userId: string,
  habitId: string
): Promise<TacticPattern | null> => findTacticPattern(await getHabitCompletionLogs(userId, habitId));

/**
 * The sentence shown to the user. Phrased as what they DID — never as advice —
 * because the whole value is that it's their own evidence, not a tip.
 */
export const buildTacticPatternText = ({ tactic, count, window }: TacticPattern): string =>
  `The last ${window} times this was hard, you ${tactic.recall} ${count} of them.`;
