import { ArenaId } from '../types';
import { HABIT_LIBRARY } from '../data/habitLibrary';
import { TRADITIONAL_HABIT_LIBRARY } from '../data/traditionalHabits';

// Name -> arena lookup derived from the (arena-tagged) habit libraries, so habits
// the user added before arena tagging still resolve to an arena for display.
// Habit categories don't map cleanly to arenas, so there is no category fallback:
// a habit resolves by its explicit tag or by name, otherwise no chip.
// See docs/phase-0-arena-taxonomy.md
const HABIT_ARENA_BY_NAME: Record<string, { arena_id?: ArenaId; off_thesis?: boolean }> =
  [...HABIT_LIBRARY, ...TRADITIONAL_HABIT_LIBRARY].reduce((acc, h) => {
    acc[h.name] = { arena_id: h.arena_id, off_thesis: h.off_thesis };
    return acc;
  }, {} as Record<string, { arena_id?: ArenaId; off_thesis?: boolean }>);

/**
 * Resolve a habit's arena for display: explicit `arena_id` → library lookup by name.
 * Returns undefined for off-thesis or unmatched habits (no chip).
 */
export const getHabitArenaId = (habit: {
  arena_id?: ArenaId;
  name?: string;
  off_thesis?: boolean;
}): ArenaId | undefined => {
  if (habit.arena_id) return habit.arena_id;
  if (habit.off_thesis) return undefined;
  const lib = habit.name ? HABIT_ARENA_BY_NAME[habit.name] : undefined;
  if (lib?.off_thesis) return undefined;
  return lib?.arena_id;
};
