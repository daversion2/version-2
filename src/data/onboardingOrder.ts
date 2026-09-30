import { HabitDefinition, getHabitDefinitionsByCategory } from './practices';

// =============================================================================
// ONBOARDING ORDER — which habits a new user sees first in the "pick one" beat.
//
// Without this the picker falls back to the catalog order: the curated practices
// by `order`, then everything else ALPHABETICALLY — so the first plain habits on
// the Body tab were whichever started with "A". This puts the likeliest first
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
  Body: [
    'no-snooze',
    'workout',
    'cold_exposure',
    'morning-daylight',
    'caffeine-cutoff',
    'alcohol-free-day',
  ],
  Focus: ['dreaded-task-first', 'deep-focus-session', 'trad-read', 'plan-tomorrow'],
  Mind: ['protect-attention', 'meditation', 'breathwork', 'nsdr'],
  Money: ['no-spend-day', 'check-the-numbers'],
};

/** Shown last, in this order — still pickable, just not what a new user meets first. */
export const ONBOARDING_TRAILING_HABITS: Record<string, string[]> = {
  Body: ['trad-floss', 'trad-eat-vegetables', 'cook-real-meal', 'eat_healthy_unenjoyable'],
  Focus: ['trad-make-bed', 'trad-tidy'],
  Mind: ['trad-limit-screens'],
  // A rule you only get to practise when you want to buy something — weak as a
  // first habit, since most days there is nothing to check in on.
  Money: ['pay-myself-first', 'wait-24-hours'],
};

/** The onboarding picker's habits for one category: leads, the rest, then trailing. */
export const getOnboardingHabitsByCategory = (categoryId: string): HabitDefinition[] => {
  const lead = ONBOARDING_LEAD_HABITS[categoryId] ?? [];
  const trailing = ONBOARDING_TRAILING_HABITS[categoryId] ?? [];
  // Leads get negative ranks, trailing ranks past everything; the rest share 0,
  // and the stable sort keeps them in catalog order.
  const rank = (id: string): number => {
    const l = lead.indexOf(id);
    if (l !== -1) return l - lead.length;
    const t = trailing.indexOf(id);
    return t !== -1 ? 1 + t : 0;
  };
  return [...getHabitDefinitionsByCategory(categoryId)].sort((a, b) => rank(a.id) - rank(b.id));
};
