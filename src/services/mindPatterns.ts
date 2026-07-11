/**
 * Mind pattern detection — turns the Capture flow's mind tags back into a
 * pre-practice insight. A pattern is a tag that appeared in at least 3 of the
 * last 5 completions of that specific practice, so it emerges fast and expires
 * naturally as the mind changes — no dismissal state needed.
 *
 * Surfaced as the "Your pattern" block on the Ready beat (PracticeReady).
 */
import { getHabitCompletionLogs } from './practices';
import { getMindTag, MindTagWithGroup } from '../data/mindTags';

/** Completions considered when looking for a pattern. */
const PATTERN_WINDOW = 5;
/** Minimum appearances within the window for a tag to count as a pattern. */
const PATTERN_MIN_COUNT = 3;

export interface MindPattern {
  tag: MindTagWithGroup;
  /** How many of the windowed reps carried this tag. */
  count: number;
  /** How many reps were actually in the window (< 5 for newer practices). */
  window: number;
}

/**
 * The dominant mind pattern for one practice (habit), or null when none has
 * emerged. Struggle tags outrank Steady ones — the struggle is the training
 * target — then higher counts win.
 */
export const getMindPattern = async (
  userId: string,
  habitId: string
): Promise<MindPattern | null> => {
  const logs = await getHabitCompletionLogs(userId, habitId);
  const recent = logs
    .sort((a, b) => (b.completed_at ?? b.date).localeCompare(a.completed_at ?? a.date))
    .slice(0, PATTERN_WINDOW);
  if (recent.length < PATTERN_MIN_COUNT) return null;

  const counts = new Map<string, number>();
  recent.forEach((log) => {
    // A rep counts a tag once, so `count` reads as "N of your last M reps".
    new Set(log.mindTags ?? []).forEach((id) => {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    });
  });

  const candidates = [...counts.entries()]
    .filter(([, count]) => count >= PATTERN_MIN_COUNT)
    .map(([id, count]) => ({ tag: getMindTag(id), count }))
    .filter((c): c is { tag: MindTagWithGroup; count: number } => !!c.tag)
    .sort((a, b) => {
      if (a.tag.group !== b.tag.group) return a.tag.group === 'struggle' ? -1 : 1;
      return b.count - a.count;
    });

  const top = candidates[0];
  return top ? { tag: top.tag, count: top.count, window: recent.length } : null;
};

/** The one-liner shown in the Ready beat's "Your pattern" block. */
export const buildMindPatternText = ({ tag, count, window }: MindPattern): string => {
  const reps = `${count} of your last ${window} reps`;
  return tag.group === 'struggle'
    ? `${tag.label} has shown up in ${reps}. ${tag.description} Expect it today — naming it is the rep.`
    : `${tag.label} is becoming your default — ${reps}. Keep training it.`;
};
