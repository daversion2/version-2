import {
  RESISTANCE_MIN,
  RESISTANCE_MAX,
  CHALLENGING_THRESHOLD,
  resistanceToDifficulty,
  legacyDifficultyToResistance,
  logResistance,
  resistanceLabel,
} from '../resistance';
import {
  HABIT_TEMPLATE_PRESETS,
  getTemplatePreset,
  resolveTemplateFields,
} from '../../data/habitTemplates';

describe('resistance scale', () => {
  it('derives the legacy binary difficulty from a rating', () => {
    expect(resistanceToDifficulty(1)).toBe('easy');
    expect(resistanceToDifficulty(CHALLENGING_THRESHOLD - 1)).toBe('easy');
    expect(resistanceToDifficulty(CHALLENGING_THRESHOLD)).toBe('challenging');
    expect(resistanceToDifficulty(RESISTANCE_MAX)).toBe('challenging');
  });

  it('labels every point on the scale', () => {
    for (let r = RESISTANCE_MIN; r <= RESISTANCE_MAX; r++) {
      expect(typeof resistanceLabel(r)).toBe('string');
      expect(resistanceLabel(r).length).toBeGreaterThan(0);
    }
  });
});

describe('legacy log migration', () => {
  // The reason resistance is a NEW field rather than a widened `difficulty`:
  // a legacy 2 means "challenging", a new 2 means "trivial". These must not be
  // conflated, or every historical trend silently inverts.
  it('maps the old binary values into the middle of the new scale', () => {
    expect(legacyDifficultyToResistance(1)).toBe(3);
    expect(legacyDifficultyToResistance(2)).toBe(7);
  });

  it('refuses to invent a value for anything unrecognized', () => {
    expect(legacyDifficultyToResistance(undefined)).toBeUndefined();
    expect(legacyDifficultyToResistance(7)).toBeUndefined();
  });

  it('prefers a real rating over the legacy fallback', () => {
    expect(logResistance({ resistance: 9, difficulty: 1 })).toBe(9);
    expect(logResistance({ difficulty: 2 })).toBe(7);
    expect(logResistance({})).toBeUndefined();
  });

  it('treats a legitimate low rating as real, not missing', () => {
    // resistance: 1 is falsy-adjacent in JS; a `||` fallback here would silently
    // replace the easiest possible check-in with the legacy estimate.
    expect(logResistance({ resistance: 1, difficulty: 2 })).toBe(1);
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
