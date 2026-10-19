import { Colors } from '../constants/theme';
import { getHabitDefinition } from './practices';

// =============================================================================
// HABIT SECTIONS — Mind, Movement, Meals.
//
// The taxonomy users see. Stored category ids (Move, Fuel, Sleep, Mind, Focus)
// stay exactly as they are on habits and catalog docs; a section is a grouping
// of them for display, so no data had to move. Sleep and Focus live under Mind.
//
// Order here is the display order everywhere: Today, the Library chips,
// Create habit and onboarding.
//
// Colour: every section is the brand teal (Neuro-Nudge brand guidelines —
// teal #217180 leads, orange #FF5B02 is for action). Sections are told apart
// by name and icon; the purple and amber they launched with aren't brand colours.
// =============================================================================

export type HabitSectionId = 'mind' | 'movement' | 'meals';

export interface HabitSection {
  id: HabitSectionId;
  name: string;
  /** Ionicons name. */
  icon: string;
  color: string;
  /** Stored category ids shown in this section, in sub-group order. */
  categoryIds: string[];
  /** The category a custom habit created in this section is filed under. */
  defaultCategoryId: string;
}

export const HABIT_SECTIONS: HabitSection[] = [
  {
    id: 'mind',
    name: 'Mind',
    icon: 'leaf-outline',
    color: Colors.primary,
    categoryIds: ['Mind', 'Sleep', 'Focus'],
    defaultCategoryId: 'Mind',
  },
  {
    id: 'movement',
    name: 'Movement',
    icon: 'barbell-outline',
    color: Colors.primary,
    categoryIds: ['Move'],
    defaultCategoryId: 'Move',
  },
  {
    id: 'meals',
    name: 'Meals',
    icon: 'nutrition-outline',
    color: Colors.primary,
    categoryIds: ['Fuel'],
    defaultCategoryId: 'Fuel',
  },
];

export const getHabitSection = (id: HabitSectionId): HabitSection =>
  HABIT_SECTIONS.find((s) => s.id === id)!;

/** The section a stored category id belongs to; undefined for retired ones (Money, Body, Connection). */
export const sectionForCategory = (categoryId?: string | null): HabitSectionId | undefined =>
  categoryId ? HABIT_SECTIONS.find((s) => s.categoryIds.includes(categoryId))?.id : undefined;

/**
 * Where an adopted habit shows. The catalog definition wins for library habits
 * — an admin re-filing a habit should move it for everyone — and the habit's
 * own category covers custom ones. Anything unplaceable lands in Mind rather
 * than vanishing off Today.
 */
export const sectionOfHabit = (habit: {
  practice_id?: string;
  category_id?: string;
}): HabitSectionId =>
  sectionForCategory(getHabitDefinition(habit.practice_id)?.category_id) ??
  sectionForCategory(habit.category_id) ??
  'mind';
