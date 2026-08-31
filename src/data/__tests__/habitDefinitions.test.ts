import {
  BUNDLED_HABIT_DEFINITIONS,
  BUNDLED_PRACTICES,
  SUPERSEDED_HABIT_IDS,
  getHabitDefinition,
  getHabitFlow,
  getHabitDefinitionsByCategory,
  getCuratedPractices,
  getDefaultSeedPractices,
  hasTemplate,
} from '../practices';
import { HABIT_CATEGORIES } from '../habitLibrary';

// The habit/practice unification (docs/habit-template-unification.md). These tests
// guard the properties that are easy to break silently: the catalog staying whole,
// deduped ids still resolving, and seeding NOT ballooning to the whole library.

describe('unified habit catalog', () => {
  it('merges the curated practices and the habit library into one catalog', () => {
    // 9 practices + 42 library habits - 6 superseded duplicates.
    expect(BUNDLED_HABIT_DEFINITIONS.length).toBe(
      BUNDLED_PRACTICES.length + 42 - Object.keys(SUPERSEDED_HABIT_IDS).length
    );
  });

  it('gives every definition the fields the unified type requires', () => {
    for (const def of BUNDLED_HABIT_DEFINITIONS) {
      expect(typeof def.id).toBe('string');
      expect(def.id.length).toBeGreaterThan(0);
      expect(typeof def.name).toBe('string');
      expect(typeof def.description).toBe('string');
      expect(typeof def.category_id).toBe('string');
      expect(typeof def.suggested_target_per_week).toBe('number');
    }
  });

  it('has no duplicate ids across the merged sources', () => {
    const ids = BUNDLED_HABIT_DEFINITIONS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('points every category_id at a real category', () => {
    const known = new Set(HABIT_CATEGORIES.map((c) => c.id));
    const traditional = BUNDLED_HABIT_DEFINITIONS.filter((d) =>
      d.category_id.startsWith('traditional-')
    );
    const curated = BUNDLED_HABIT_DEFINITIONS.filter(
      (d) => !d.category_id.startsWith('traditional-')
    );
    for (const def of curated) expect(known.has(def.category_id)).toBe(true);
    // Traditional habits keep their own prefixed taxonomy until Phase 5 remaps them.
    expect(traditional.length).toBeGreaterThan(0);
  });
});

describe('superseded ids', () => {
  it('keeps deduped habits resolvable so adopted history is never orphaned', () => {
    for (const [oldId, survivorId] of Object.entries(SUPERSEDED_HABIT_IDS)) {
      const resolved = getHabitDefinition(oldId);
      expect(resolved).toBeDefined();
      expect(resolved!.id).toBe(survivorId);
    }
  });

  it('hides superseded habits from the browsable catalog', () => {
    const ids = new Set(BUNDLED_HABIT_DEFINITIONS.map((d) => d.id));
    for (const oldId of Object.keys(SUPERSEDED_HABIT_IDS)) {
      expect(ids.has(oldId)).toBe(false);
    }
  });

  it('resolves every superseded target to a definition that actually exists', () => {
    const ids = new Set(BUNDLED_HABIT_DEFINITIONS.map((d) => d.id));
    for (const survivorId of Object.values(SUPERSEDED_HABIT_IDS)) {
      expect(ids.has(survivorId)).toBe(true);
    }
  });
});

describe('flow', () => {
  it("defaults to 'tap' — an ordinary habit is a plain check-in", () => {
    expect(getHabitFlow(getHabitDefinition('trad-drink-water'))).toBe('tap');
    expect(getHabitFlow(undefined)).toBe('tap');
  });

  it('keeps the session flow on the curated practices', () => {
    expect(getHabitFlow(getHabitDefinition('cold_exposure'))).toBe('away');
    expect(getHabitFlow(getHabitDefinition('meditation'))).toBe('timer');
  });
});

describe('templates', () => {
  it('reports a template only where tracking fields exist', () => {
    expect(hasTemplate(getHabitDefinition('cold_exposure'))).toBe(true);
    expect(hasTemplate(getHabitDefinition('trad-floss'))).toBe(false);
  });
});

describe('seeding is scoped', () => {
  // The regression this guards: merging the library into the catalog made
  // getDefaultSeedPractices() briefly return all ~45 definitions, which would have
  // dumped the entire library onto every new user's home screen.
  it('seeds only the curated session-bearing habits, not the whole library', () => {
    // Retired practices (active: false) are excluded, exactly as before the merge.
    const expected = BUNDLED_PRACTICES.filter((p) => p.active !== false).length;
    const seeded = getDefaultSeedPractices();
    expect(seeded.length).toBe(expected);
    expect(seeded.length).toBeLessThan(BUNDLED_HABIT_DEFINITIONS.length);
    for (const def of seeded) expect(getHabitFlow(def)).not.toBe('tap');
  });

  it('never seeds a plain library habit onto a new user', () => {
    const seededIds = new Set(getDefaultSeedPractices().map((d) => d.id));
    expect(seededIds.has('trad-drink-water')).toBe(false);
    expect(seededIds.has('no-snooze')).toBe(false);
  });

  it('treats curated practices as a strict subset of the catalog', () => {
    expect(getCuratedPractices().length).toBeLessThan(BUNDLED_HABIT_DEFINITIONS.length);
  });
});

describe('category browsing', () => {
  it('returns habits for a real category and nothing for an unknown one', () => {
    expect(getHabitDefinitionsByCategory('Body').length).toBeGreaterThan(0);
    expect(getHabitDefinitionsByCategory('NotACategory')).toEqual([]);
  });

  it('only returns habits belonging to the requested category', () => {
    for (const def of getHabitDefinitionsByCategory('Mind')) {
      expect(def.category_id).toBe('Mind');
    }
  });
});
