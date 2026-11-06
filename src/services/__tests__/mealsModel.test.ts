import {
  getMealsModel,
  modelChangeCount,
  onTargetCount,
  previewPlates,
  resetMealsModel,
  sanitizeMealsModel,
  saveMealsModel,
  withBase,
  withCeiling,
  withRating,
  withWeight,
} from '../mealsModel';
import { goalScores, rulesOf, chipReason } from '../mealsMath';
import { BUILT_IN_MEALS_MODEL, DEFAULT_MEALS_PREFS, SAMPLE_PLATES } from '../../data/mealGroups';
import { addMockDocument, getDoc, getMockDB } from '../__mocks__/firestore';

const modelDoc = () => getMockDB().config?.mealsModel;

describe('sanitizeMealsModel', () => {
  it('fills anything missing from the built-in model', () => {
    expect(sanitizeMealsModel(undefined)).toEqual(BUILT_IN_MEALS_MODEL);
    expect(sanitizeMealsModel({ base: 60 })).toEqual({ ...BUILT_IN_MEALS_MODEL, base: 60 });
  });

  it('brings every number into range and rounds it', () => {
    const m = sanitizeMealsModel({
      base: 140,
      ceilings: [100, 90, 60, -5],
      weights: { balanced: { protein: 99, fiber: 4.6 } },
      profiles: { veggies: { fiber: 9, animal: 5 } },
    });
    expect(m.base).toBe(100);
    expect(m.ceilings).toEqual([100, 90, 60, 0]);
    expect(m.weights.balanced.protein).toBe(30);
    expect(m.weights.balanced.fiber).toBe(5);
    expect(m.profiles.veggies.fiber).toBe(3);
    expect(m.profiles.veggies.animal).toBe(2); // animal food tops out at 2
  });

  it('ignores junk and unknown keys', () => {
    const m = sanitizeMealsModel({ base: 'lots', weights: { nope: { protein: 1 } }, profiles: { tacos: { protein: 3 } } });
    expect(m).toEqual(BUILT_IN_MEALS_MODEL);
  });
});

describe('loading and saving', () => {
  it('uses the built-in model when nothing is saved', async () => {
    expect(await getMealsModel()).toBe(BUILT_IN_MEALS_MODEL);
  });

  it('reads back what an admin saved, with who and when', async () => {
    const draft = withBase(BUILT_IN_MEALS_MODEL, 55);
    await saveMealsModel(draft, 'admin1');
    expect(modelDoc().data).toMatchObject({ base: 55, updated_by: 'admin1', updated_at: expect.any(String) });
    expect(await getMealsModel()).toEqual(draft);
  });

  it('a failed read falls back to the built-in model, so Meals always scores', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    getDoc.mockRejectedValueOnce(new Error('offline'));
    expect(await getMealsModel()).toBe(BUILT_IN_MEALS_MODEL);
  });

  it('cleans a document someone edited by hand', async () => {
    addMockDocument('config', 'mealsModel', { base: 500 });
    expect((await getMealsModel()).base).toBe(100);
  });

  it('reset goes back to built-in', async () => {
    await saveMealsModel(withBase(BUILT_IN_MEALS_MODEL, 55), 'admin1');
    await resetMealsModel();
    expect(await getMealsModel()).toBe(BUILT_IN_MEALS_MODEL);
  });
});

describe('editing a draft', () => {
  it('changes one number at a time, never the original', () => {
    const a = withWeight(BUILT_IN_MEALS_MODEL, 'muscle', 'fiber', 7);
    const b = withRating(a, 'dairy', 'protein', 0);
    const c = withCeiling(b, 3, 20);
    expect(c.weights.muscle.fiber).toBe(7);
    expect(c.profiles.dairy.protein).toBe(0);
    expect(c.ceilings[3]).toBe(20);
    expect(BUILT_IN_MEALS_MODEL.weights.muscle.fiber).toBe(3);
    expect(modelChangeCount(BUILT_IN_MEALS_MODEL, c)).toBe(3);
  });

  it('keeps edits in range', () => {
    expect(withWeight(BUILT_IN_MEALS_MODEL, 'balanced', 'protein', 99).weights.balanced.protein).toBe(30);
    expect(withRating(BUILT_IN_MEALS_MODEL, 'beef', 'animal', 3).profiles.beef.animal).toBe(2);
  });
});

describe('scoring with a saved model', () => {
  it('a saved model changes chip scores, rules and reasons', () => {
    // Build muscle with fiber and vitamins weighted like Balanced: veggies climb.
    const draft = withWeight(withWeight(BUILT_IN_MEALS_MODEL, 'muscle', 'fiber', 5), 'muscle', 'micros', 7);
    expect(goalScores('muscle', BUILT_IN_MEALS_MODEL).veggies).toBe(74);
    expect(goalScores('muscle', draft).veggies).toBe(86);
    expect(rulesOf({ ...DEFAULT_MEALS_PREFS, goal: 'muscle' }, draft).group_scores?.veggies).toBe(86);
    expect(chipReason('dairy', withRating(draft, 'dairy', 'protein', 3))).toMatch(/^Lots of protein/);
  });

  it('the caps apply from the model', () => {
    expect(goalScores('balanced', withCeiling(BUILT_IN_MEALS_MODEL, 3, 10)).processed_meat).toBe(10);
  });

  it('previews which sample plates move, and how many end up on target', () => {
    // Raising the processed cap moves nothing: no processed chip reaches 60 under Balanced.
    const draft = withCeiling(BUILT_IN_MEALS_MODEL, 2, 80);
    const rows = previewPlates(SAMPLE_PLATES, BUILT_IN_MEALS_MODEL, draft, 'balanced');
    expect(rows).toHaveLength(SAMPLE_PLATES.length);
    expect(rows.every((r) => r.before === r.after)).toBe(true);

    const tough = withBase(BUILT_IN_MEALS_MODEL, 40);
    const moved = previewPlates(SAMPLE_PLATES, BUILT_IN_MEALS_MODEL, tough, 'balanced');
    const eggs = moved.find((r) => r.name === 'Eggs and berries')!;
    expect(eggs).toMatchObject({ before: 82, after: 72 });
    expect(onTargetCount(moved.map((r) => r.after))).toBeLessThan(onTargetCount(moved.map((r) => r.before)));
  });
});
