import { HabitDefinition, getHabitDefinitionsByCategory } from './practices';
import { HabitSectionId, getHabitSection } from './habitSections';

// =============================================================================
// ONBOARDING ORDER — which habits a new user sees first in the "pick one" beat.
//
// Without this the picker falls back to the catalog order: the curated practices
// by `order`, then everything else ALPHABETICALLY — so the first plain habits in
// a tab were whichever started with "A". This puts the likeliest first
// picks for the target user on top instead: recognisable to the self-optimizer
// crowd, done most days so data builds in week one, and carrying resistance that
// actually varies from day to day, which is what the rating is there to show.
//
// Onboarding only. The Library keeps its own sort (getBrowsableHabits).
//
// Any habit in neither list keeps the catalog order, between the two. An id that
// is retired or superseded is simply skipped — the test in __tests__ flags it so
// the list gets fixed rather than silently shrinking.
// =============================================================================

/** Shown first, in this order. Keyed by HabitCategory id. */
export const ONBOARDING_LEAD_HABITS: Record<string, string[]> = {
  Move: ['workout', 'cold_exposure', 'morning-daylight'],
  // Meals itself is an app, always on Today — not a habit to pick here.
  Fuel: ['alcohol-free-day'],
  Sleep: ['no-snooze', 'caffeine-cutoff'],
  Focus: ['dreaded-task-first', 'deep-focus-session', 'trad-read', 'plan-tomorrow'],
  Mind: ['protect-attention', 'meditation', 'breathwork', 'nsdr'],
};

/** Shown last, in this order — still pickable, just not what a new user meets first. */
export const ONBOARDING_TRAILING_HABITS: Record<string, string[]> = {
  Sleep: ['trad-floss'],
  Focus: ['trad-make-bed', 'trad-tidy'],
  Mind: ['trad-limit-screens'],
};

/** Leads first in listed order, trailing last, everything else between in catalog order. */
const orderHabits = (defs: HabitDefinition[], lead: string[], trailing: string[]): HabitDefinition[] => {
  // Leads get negative ranks, trailing ranks past everything; the rest share 0,
  // and the stable sort keeps them in catalog order.
  const rank = (id: string): number => {
    const l = lead.indexOf(id);
    if (l !== -1) return l - lead.length;
    const t = trailing.indexOf(id);
    return t !== -1 ? 1 + t : 0;
  };
  return [...defs].sort((a, b) => rank(a.id) - rank(b.id));
};

/** The onboarding picker's habits for one category: leads, the rest, then trailing. */
export const getOnboardingHabitsByCategory = (categoryId: string): HabitDefinition[] =>
  orderHabits(
    getHabitDefinitionsByCategory(categoryId),
    ONBOARDING_LEAD_HABITS[categoryId] ?? [],
    ONBOARDING_TRAILING_HABITS[categoryId] ?? []
  );

/**
 * The picker's habits for one section (Mind / Movement / Meals). A section
 * holds several categories — Mind is Mind, Sleep and Focus — so every
 * category's leads come first, in section order, then the rest, then trailing.
 */
export const getOnboardingHabitsBySection = (sectionId: HabitSectionId): HabitDefinition[] => {
  const ids = getHabitSection(sectionId).categoryIds;
  return orderHabits(
    ids.flatMap((c) => getHabitDefinitionsByCategory(c)),
    ids.flatMap((c) => ONBOARDING_LEAD_HABITS[c] ?? []),
    ids.flatMap((c) => ONBOARDING_TRAILING_HABITS[c] ?? [])
  );
};
