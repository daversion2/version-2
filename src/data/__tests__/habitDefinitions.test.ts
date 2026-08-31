import {
  BUNDLED_HABIT_DEFINITIONS,
  BUNDLED_PRACTICES,
  SUPERSEDED_HABIT_IDS,
  getHabitDefinition,
  getHabitFlow,
  getHabitDefinitionsByCategory,
  getCuratedPractices,
  getBrowsableHabits,
  getDefaultSeedPractices,
  hasTemplate,
} from '../practices';
import { HABIT_CATEGORIES } from '../habitLibrary';
import { HABITS_AWAITING_SCIENCE } from '../habitScience';
import { resolveTemplateFields } from '../habitTemplates';
import { buildPracticePerformance } from '../../services/practicePerformance';

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

  it('points every BROWSABLE habit at a real category (D1)', () => {
    // The former `traditional-*` taxonomy is gone: HabitCategory is the only axis.
    // Scoped to browsable habits on purpose — a retired habit may point at a
    // retired category (Connection was removed along with all three of its
    // habits), and that is correct rather than broken.
    const known = new Set(HABIT_CATEGORIES.map((c) => c.id));
    const unknown = getBrowsableHabits()
      .filter((d) => !known.has(d.category_id))
      .map((d) => `${d.id} -> ${d.category_id}`);
    expect(unknown).toEqual([]);
  });

  it('hides every habit retired in the audit from browsing', () => {
    const browsable = new Set(getBrowsableHabits().map((d) => d.id));
    for (const id of [
      'inbox-after-focus',
      'make-the-call',
      'note-one-good-thing',
      'plan-tomorrow',
      'phone-free-dinner',
      'reach-out',
      'trad-skincare',
      'trad-take-vitamins',
    ]) {
      expect(browsable.has(id)).toBe(false);
      // Still resolvable, so an already-adopted instance keeps working.
      expect(getHabitDefinition(id)).toBeDefined();
    }
  });

  it('leaves no category empty, so every browse tab has something in it', () => {
    for (const category of HABIT_CATEGORIES) {
      expect(getHabitDefinitionsByCategory(category.id).length).toBeGreaterThan(0);
    }
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

// ---------------------------------------------------------------------------
// Track B: science content coverage (D4).
// ---------------------------------------------------------------------------

describe('science content', () => {
  it('gives every browsable habit a science section', () => {
    const missing = BUNDLED_HABIT_DEFINITIONS.filter((d) => !d.science).map((d) => d.id);
    expect(missing).toEqual([]);
  });

  it('gives every browsable habit a whyItWorks hook', () => {
    const missing = BUNDLED_HABIT_DEFINITIONS.filter((d) => !d.whyItWorks).map((d) => d.id);
    expect(missing).toEqual([]);
  });

  it('never ships a research entry without a finding, a source and a link', () => {
    // The citation policy in data/habitScience.ts: a research entry means a real,
    // checkable study. A half-formed citation is worse than none.
    for (const def of BUNDLED_HABIT_DEFINITIONS) {
      for (const entry of def.research ?? []) {
        expect(entry.finding.length).toBeGreaterThan(0);
        expect(entry.source.length).toBeGreaterThan(0);
        expect(entry.url).toMatch(/^https:\/\//);
      }
    }
  });

  it('tracks any known content gap explicitly rather than silently', () => {
    expect(HABITS_AWAITING_SCIENCE).toEqual([]);
  });
});

describe('custom habit templates resolve without a catalog entry', () => {
  it('turns a stored template id into real tracking fields', () => {
    const fields = resolveTemplateFields({ template_id: 'time' });
    expect(fields).toHaveLength(1);
    expect(fields[0].key).toBe('duration_min');
  });

  it('feeds those fields through the performance builder', () => {
    // The link that makes a custom habit's metrics chart: buildPracticePerformance
    // takes resolved fields rather than requiring a catalog definition.
    const perf = buildPracticePerformance([], { tracking: resolveTemplateFields({ template_id: 'grade' }) });
    expect(perf.records).toEqual([]);
    expect(perf.primaryTrend).toBeNull();
  });

  it('handles a habit with no template at all', () => {
    const perf = buildPracticePerformance([], { tracking: resolveTemplateFields({}) });
    expect(perf.loggedSessions).toBe(0);
  });
});
