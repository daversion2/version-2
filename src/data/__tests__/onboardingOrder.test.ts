import {
  ONBOARDING_LEAD_HABITS,
  ONBOARDING_TRAILING_HABITS,
  getOnboardingHabitsByCategory,
} from '../onboardingOrder';
import { getHabitDefinitionsByCategory } from '../practices';
import { HABIT_CATEGORIES } from '../habitLibrary';

describe('onboarding order', () => {
  it('names only habits that are browsable in the category they are listed under', () => {
    // A retired or superseded id would be skipped silently and the list would
    // quietly shrink. Failing here means the list gets fixed instead.
    const missing: string[] = [];
    for (const lists of [ONBOARDING_LEAD_HABITS, ONBOARDING_TRAILING_HABITS]) {
      for (const [categoryId, ids] of Object.entries(lists)) {
        const available = new Set(getHabitDefinitionsByCategory(categoryId).map((d) => d.id));
        missing.push(...ids.filter((id) => !available.has(id)).map((id) => `${categoryId}: ${id}`));
      }
    }
    expect(missing).toEqual([]);
  });

  it('never lists a habit as both a lead and a trailing one', () => {
    for (const [categoryId, lead] of Object.entries(ONBOARDING_LEAD_HABITS)) {
      const trailing = new Set(ONBOARDING_TRAILING_HABITS[categoryId] ?? []);
      expect(lead.filter((id) => trailing.has(id))).toEqual([]);
    }
  });

  it('puts the lead habits first, in the listed order', () => {
    for (const [categoryId, lead] of Object.entries(ONBOARDING_LEAD_HABITS)) {
      const ids = getOnboardingHabitsByCategory(categoryId).map((d) => d.id);
      expect(ids.slice(0, lead.length)).toEqual(lead);
    }
  });

  it('puts the trailing habits last, in the listed order', () => {
    for (const [categoryId, trailing] of Object.entries(ONBOARDING_TRAILING_HABITS)) {
      const ids = getOnboardingHabitsByCategory(categoryId).map((d) => d.id);
      expect(ids.slice(ids.length - trailing.length)).toEqual(trailing);
    }
  });

  it('reorders without adding or dropping anything', () => {
    for (const category of HABIT_CATEGORIES) {
      const reordered = getOnboardingHabitsByCategory(category.id).map((d) => d.id).sort();
      const catalog = getHabitDefinitionsByCategory(category.id).map((d) => d.id).sort();
      expect(reordered).toEqual(catalog);
    }
  });

  it('keeps catalog order for everything in between', () => {
    const listed = new Set([...ONBOARDING_LEAD_HABITS.Body, ...ONBOARDING_TRAILING_HABITS.Body]);
    const middle = getOnboardingHabitsByCategory('Body').map((d) => d.id).filter((id) => !listed.has(id));
    const catalog = getHabitDefinitionsByCategory('Body').map((d) => d.id).filter((id) => !listed.has(id));
    expect(middle).toEqual(catalog);
  });

  it('is a plain catalog listing for a category with no lists', () => {
    expect(getOnboardingHabitsByCategory('NotACategory')).toEqual([]);
  });
});
