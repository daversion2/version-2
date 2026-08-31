import {
  RESISTANCE_MIN,
  RESISTANCE_MAX,
  RESISTANCE_LEVELS,
  RESISTANCE_SCALE,
  LEGACY_RESISTANCE_MAX,
  CHALLENGING_THRESHOLD,
  resistanceToDifficulty,
  legacyDifficultyToResistance,
  normalizeResistance,
  logResistance,
  resistanceLabel,
} from '../resistance';
import {
  HABIT_TEMPLATE_PRESETS,
  getTemplatePreset,
  resolveTemplateFields,
} from '../../data/habitTemplates';

describe('resistance scale', () => {
  it('offers exactly three levels', () => {
    expect(RESISTANCE_LEVELS).toHaveLength(3);
    expect(RESISTANCE_LEVELS.map((l) => l.value)).toEqual([1, 2, 3]);
    expect(RESISTANCE_MAX).toBe(3);
    expect(RESISTANCE_SCALE).toBe(RESISTANCE_MAX);
  });

  it('gives every level a label and a clarifying sub-line', () => {
    for (const level of RESISTANCE_LEVELS) {
      expect(level.label.length).toBeGreaterThan(0);
      expect(level.sublabel.length).toBeGreaterThan(0);
    }
  });

  it('derives the legacy binary difficulty from a rating', () => {
    expect(resistanceToDifficulty(1)).toBe('easy');
    expect(resistanceToDifficulty(CHALLENGING_THRESHOLD - 1)).toBe('easy');
    expect(resistanceToDifficulty(CHALLENGING_THRESHOLD)).toBe('challenging');
    expect(resistanceToDifficulty(RESISTANCE_MAX)).toBe('challenging');
  });

  it('labels every point on the scale', () => {
    for (let r = RESISTANCE_MIN; r <= RESISTANCE_MAX; r++) {
      expect(resistanceLabel(r).length).toBeGreaterThan(0);
    }
  });
});

describe('scale migration', () => {
  // The two ranges OVERLAP: a stored 2 means "very easy" on the old 1-10 scale
  // and "difficult but manageable" on the new one. Every value must therefore be
  // read against the scale it was recorded on.
  it('folds the old 1-10 range into thirds', () => {
    expect(normalizeResistance(1, LEGACY_RESISTANCE_MAX)).toBe(1);
    expect(normalizeResistance(3, LEGACY_RESISTANCE_MAX)).toBe(1);
    expect(normalizeResistance(4, LEGACY_RESISTANCE_MAX)).toBe(2);
    expect(normalizeResistance(7, LEGACY_RESISTANCE_MAX)).toBe(2);
    expect(normalizeResistance(8, LEGACY_RESISTANCE_MAX)).toBe(3);
    expect(normalizeResistance(10, LEGACY_RESISTANCE_MAX)).toBe(3);
  });

  it('leaves a value already on the new scale untouched', () => {
    for (const v of [1, 2, 3]) {
      expect(normalizeResistance(v, RESISTANCE_SCALE)).toBe(v);
    }
  });

  it('reads a log against the scale it recorded', () => {
    // Same stored number, opposite meanings.
    expect(logResistance({ resistance: 2, resistance_scale: 3 })).toBe(2);
    expect(logResistance({ resistance: 2, resistance_scale: 10 })).toBe(1);
  });

  it('treats a log with no recorded scale as the old 1-10', () => {
    // Nothing wrote a scale before the rewrite, so absence is not ambiguity.
    expect(logResistance({ resistance: 9 })).toBe(3);
  });

  it('never produces a level outside the three that exist', () => {
    for (const v of [-5, 0, 1, 5, 10, 99]) {
      const level = normalizeResistance(v, LEGACY_RESISTANCE_MAX);
      expect(level).toBeGreaterThanOrEqual(1);
      expect(level).toBeLessThanOrEqual(3);
    }
  });
});

describe('legacy log migration', () => {
  // The reason resistance is a NEW field rather than a widened `difficulty`:
  // a legacy 2 means "challenging", a new 2 means "trivial". These must not be
  // conflated, or every historical trend silently inverts.
  it('maps the old binary values conservatively', () => {
    // 'challenging' lumped "had to push" and "nearly didn't" together, so
    // promoting all of it to level 3 would overstate the history.
    expect(legacyDifficultyToResistance(1)).toBe(1);
    expect(legacyDifficultyToResistance(2)).toBe(2);
  });

  it('refuses to invent a value for anything unrecognized', () => {
    expect(legacyDifficultyToResistance(undefined)).toBeUndefined();
    expect(legacyDifficultyToResistance(7)).toBeUndefined();
  });

  it('prefers a real rating over the legacy fallback', () => {
    expect(logResistance({ resistance: 3, resistance_scale: 3, difficulty: 1 })).toBe(3);
    expect(logResistance({ difficulty: 2 })).toBe(2);
    expect(logResistance({})).toBeUndefined();
  });

  it('treats a legitimate low rating as real, not missing', () => {
    // resistance: 1 is falsy-adjacent in JS; a `||` fallback here would silently
    // replace the easiest possible check-in with the legacy estimate.
    expect(logResistance({ resistance: 1, resistance_scale: 3, difficulty: 2 })).toBe(1);
  });
});

describe('habit templates', () => {
  it('gives every preset a unique id and a usable shape', () => {
    const ids = HABIT_TEMPLATE_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const preset of HABIT_TEMPLATE_PRESETS) {
      expect(preset.label.length).toBeGreaterThan(0);
      expect(Array.isArray(preset.fields)).toBe(true);
    }
  });

  it("makes 'none' the only preset with no fields", () => {
    for (const preset of HABIT_TEMPLATE_PRESETS) {
      if (preset.id === 'none') expect(preset.fields).toHaveLength(0);
      else expect(preset.fields.length).toBeGreaterThan(0);
    }
  });

  it('keeps every preset field numeric so custom habits still get trends', () => {
    for (const preset of HABIT_TEMPLATE_PRESETS) {
      for (const field of preset.fields) {
        expect(field.type).not.toBe('choice');
      }
    }
  });

  it("models a grade as 'scale' so it draws a line, not a distribution", () => {
    const grade = getTemplatePreset('grade');
    expect(grade?.fields[0].type).toBe('scale');
    expect(grade?.fields[0].labels).toBeDefined();
  });

  it('resolves fields for a custom habit and returns none for an unknown preset', () => {
    expect(resolveTemplateFields({ template_id: 'time' })).toHaveLength(1);
    expect(resolveTemplateFields({ template_id: 'nope' })).toEqual([]);
    expect(resolveTemplateFields({})).toEqual([]);
  });
});
