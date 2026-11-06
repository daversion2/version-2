import { getMealsPrefs, saveMealsPrefs } from '../labMeals';
import { getMockDB } from '../__mocks__/firestore';

const prefsDoc = () => getMockDB()['users/u1/lab_meals_prefs'].main.data;

describe('Meals prefs', () => {
  it('a new account starts on Balanced with no changed scores', async () => {
    const prefs = await getMealsPrefs('u1');
    expect(prefs.goal).toBe('balanced');
    expect(prefs.score_overrides).toEqual({});
  });

  it('a score reset out of the overrides is really gone, not deep-merged back', async () => {
    await saveMealsPrefs('u1', { score_overrides: { veggies: 95, fruit: 70 } });
    await saveMealsPrefs('u1', { score_overrides: { fruit: 70 } });
    expect(prefsDoc().score_overrides).toEqual({ fruit: 70 });
  });

  it('saving one field leaves the others alone', async () => {
    await saveMealsPrefs('u1', { goal: 'muscle', weekly_goal: 4 });
    await saveMealsPrefs('u1', { score_overrides: {} });
    expect(prefsDoc()).toMatchObject({ goal: 'muscle', weekly_goal: 4, score_overrides: {} });
  });
});
