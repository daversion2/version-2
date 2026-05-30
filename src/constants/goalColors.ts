/**
 * Auto-assigned goal colors. Since MAX_ACTIVE = 3, we use 3 distinct colors.
 */
export const GOAL_COLOR_PALETTE = [
  '#217180', // Teal (brand primary)
  '#FF5B02', // Orange (brand secondary)
  '#7B61FF', // Purple
] as const;

/** Full palette for manual color picking */
export const ALL_GOAL_COLORS = [
  '#217180', '#FF5B02', '#7B61FF',
  '#4A90D9', '#E85D75', '#2ECC71',
  '#2B2B2B', '#656565',
] as const;

/** Fallback color for items with no linked goal */
export const NO_GOAL_COLOR = '#656565';

/**
 * Pick the next available color from GOAL_COLOR_PALETTE
 * based on colors already in use by existing goals.
 */
export function pickNextGoalColor(existingGoals: { color: string }[]): string {
  const usedColors = new Set(existingGoals.map(g => g.color));
  for (const color of GOAL_COLOR_PALETTE) {
    if (!usedColors.has(color)) return color;
  }
  return GOAL_COLOR_PALETTE[0];
}

/**
 * Resolve an item's display color from its linked goals.
 * Returns the color of the first matching goal, or NO_GOAL_COLOR.
 */
export function getGoalColor(
  goalIds: string[] | undefined,
  goals: { id: string; color: string }[]
): string {
  if (!goalIds || goalIds.length === 0) return NO_GOAL_COLOR;
  const goal = goals.find(g => goalIds.includes(g.id));
  return goal?.color || NO_GOAL_COLOR;
}
