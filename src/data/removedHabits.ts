// =============================================================================
// REMOVED HABITS — gone from the app, not just hidden.
//
// Two removals, decided 2026-10-18 with the move to Mind / Movement / Meals:
//   - Money as a whole. The category is out of the taxonomy.
//   - The food habits the Meals app replaces. Meals is now the one food
//     check-in, so these would double-count the same plate.
//
// Unlike a retired habit (`active: false`, still resolvable so history keeps
// working), a removed habit's adopted copies are DELETED with their check-ins
// on the user's next open — see services/habitCleanup.ts. XP is not touched: it
// lives on the user doc, not in the logs.
//
// The catalog forces these inactive in code (data/practices.ts and the
// Firestore merge in services/practiceCatalog.ts), so a catalog doc that still
// says active: true can't bring one back.
// =============================================================================

/** Food habits replaced by the Meals app. Alcohol-free day, Fasting and the water habits stay. */
export const MEALS_REPLACED_HABIT_IDS = [
  'trad-eat-vegetables',
  'protein-target',
  'trad-no-sugar',
  'eat_healthy_unenjoyable',
  'cook-real-meal',
];

/** Whole categories removed from the taxonomy. */
export const REMOVED_CATEGORY_IDS = ['Money'];

export const isRemovedDefinition = (def: { id: string; category_id?: string }): boolean =>
  MEALS_REPLACED_HABIT_IDS.includes(def.id) ||
  (!!def.category_id && REMOVED_CATEGORY_IDS.includes(def.category_id));
