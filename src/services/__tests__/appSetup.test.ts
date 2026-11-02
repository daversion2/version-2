import {
  defaultAppSetup,
  GOAL_NOUNS,
  hiddenAppsOf,
  isSetupReplay,
  loadAppSetup,
  needsGoalSetup,
  planOnboardingFinish,
  reminderChange,
  resolveStartApp,
  saveAppSetup,
  setupProfilePatch,
  shouldExplainRating,
  startAppOf,
  startHereLine,
  stepGoal,
  toggleApp,
  visibleApps,
} from '../appSetup';
import { getMockDB } from '../__mocks__/firestore';

describe('defaultAppSetup', () => {
  it('starts with every app on, goals of 3 / 3 / 5, and Meditate first', () => {
    expect(defaultAppSetup()).toEqual({
      hidden: [],
      goals: { meditate: 3, workouts: 3, meals: 5 },
      startApp: 'meditate',
    });
  });

  it('counts Meals in days logged', () => {
    expect(GOAL_NOUNS.meals).toBe('days logged');
  });
});

describe('switching apps off', () => {
  it('flips one app, keeping section order', () => {
    expect(toggleApp([], 'meals')).toEqual(['meals']);
    expect(toggleApp(['meals'], 'meditate')).toEqual(['meditate', 'meals']);
    expect(toggleApp(['meditate', 'meals'], 'meals')).toEqual(['meditate']);
  });

  it('never switches off the last app left on', () => {
    expect(toggleApp(['meditate', 'workouts'], 'meals')).toEqual(['meditate', 'workouts']);
  });

  it('shows what is left on, in section order', () => {
    expect(visibleApps(['workouts'])).toEqual(['meditate', 'meals']);
    expect(visibleApps(undefined)).toEqual(['meditate', 'workouts', 'meals']);
  });

  it('cleans a stored list: unknown ids dropped, all-three treated as none', () => {
    expect(hiddenAppsOf({ hidden_apps: ['meals', 'compose'] })).toEqual(['meals']);
    expect(hiddenAppsOf({ hidden_apps: ['meals', 'workouts', 'meditate'] })).toEqual([]);
    expect(hiddenAppsOf(null)).toEqual([]);
  });
});

describe('goals', () => {
  it('steps within 1–7', () => {
    expect(stepGoal(3, 1, 'meditate')).toBe(4);
    expect(stepGoal(7, 1, 'meditate')).toBe(7);
    expect(stepGoal(1, -1, 'meals')).toBe(1);
  });

  it('asks for goals once, only from accounts that finished onboarding without them', () => {
    expect(needsGoalSetup({ has_completed_onboarding: true })).toBe(true);
    expect(needsGoalSetup({ has_completed_onboarding: true, app_goals_set: true })).toBe(false);
    expect(needsGoalSetup({ has_completed_onboarding: false })).toBe(false);
    expect(needsGoalSetup(null)).toBe(false);
  });
});

describe('start here', () => {
  it('moves off an app that has been switched off', () => {
    expect(resolveStartApp('meditate', ['meditate'])).toBe('workouts');
    expect(resolveStartApp('meals', ['meditate'])).toBe('meals');
    expect(resolveStartApp(null, [])).toBeNull();
  });

  it('reads only a real app id from the user doc', () => {
    expect(startAppOf({ start_app: 'workouts' })).toBe('workouts');
    expect(startAppOf({ start_app: 'compose' })).toBeNull();
    expect(startAppOf({})).toBeNull();
  });

  it('shows on Today until that app has its first rated session', () => {
    expect(startHereLine('meditate', [], [])).toMatch(/^Start here: your first Meditate session/);
    expect(startHereLine('meditate', [], [{ reference_id: 'app:workouts' }])).not.toBeNull();
    expect(startHereLine('meditate', [], [{ reference_id: 'app:meditate' }])).toBeNull();
  });

  it('says nothing for no start app, or one switched off', () => {
    expect(startHereLine(null, [], [])).toBeNull();
    expect(startHereLine('meals', ['meals'], [])).toBeNull();
  });
});

describe('shouldExplainRating', () => {
  it('explains once, to an account that has never rated a session', () => {
    expect(shouldExplainRating({}, [])).toBe(true);
    expect(shouldExplainRating({ seen_intros: { rating: true } }, [])).toBe(false);
  });

  it('skips accounts that already know the question', () => {
    expect(shouldExplainRating({}, [{ reference_id: 'app:meals' }])).toBe(false);
    expect(shouldExplainRating({}, [{ reference_id: 'habit-1' }])).toBe(true);
  });

  it('waits for the profile', () => {
    expect(shouldExplainRating(null, [])).toBe(false);
  });
});

describe('saveAppSetup', () => {
  it('writes each goal to its app, then the user doc', async () => {
    await saveAppSetup('u1', { hidden: ['meditate'], goals: { meditate: 4, workouts: 2, meals: 9 }, startApp: 'meditate' });
    const db = getMockDB();
    expect(db['users/u1/lab_meditate_prefs'].main.data.weekly_goal).toBe(4);
    expect(db['users/u1/lab_workout_prefs'].main.data.weekly_goal).toBe(2);
    expect(db['users/u1/lab_meals_prefs'].main.data.weekly_goal).toBe(7); // clamped
    expect(db.users.u1.data).toMatchObject({ hidden_apps: ['meditate'], start_app: 'workouts', app_goals_set: true });
  });

  it('reads back what it saved', async () => {
    const setup = { hidden: ['meals' as const], goals: { meditate: 6, workouts: 2, meals: 4 }, startApp: 'workouts' as const };
    await saveAppSetup('u1', setup);
    const db = getMockDB();
    expect(await loadAppSetup('u1', db.users.u1.data)).toEqual(setup);
  });

  it('loads the defaults for an account with nothing saved', async () => {
    expect(await loadAppSetup('u3', null)).toEqual({ ...defaultAppSetup(), startApp: null });
  });

  it('can leave the saved start app alone', async () => {
    await saveAppSetup('u2', defaultAppSetup(), { includeStart: false });
    expect(getMockDB().users.u2.data).not.toHaveProperty('start_app');
  });

  it('puts the start app through the same switched-off check', () => {
    expect(setupProfilePatch({ ...defaultAppSetup(), hidden: ['meditate'] }).start_app).toBe('workouts');
  });
});

describe('finishing onboarding', () => {
  const chosen = { hidden: ['meals' as const], goals: { meditate: 5, workouts: 2, meals: 5 }, startApp: 'workouts' as const };

  it('is a replay once an account has saved a setup', () => {
    expect(isSetupReplay({ app_goals_set: true })).toBe(true);
    expect(isSetupReplay({})).toBe(false);
    expect(isSetupReplay(null)).toBe(false);
  });

  it('skipping a first run saves the defaults and no reminder', () => {
    expect(
      planOnboardingFinish({ replay: false, skipped: true, setup: chosen, savedReminder: null, chosenReminder: '21:00' })
    ).toEqual({ setup: defaultAppSetup(), reminder: null });
  });

  it('skipping a replay saves nothing — the setup already there survives', () => {
    expect(
      planOnboardingFinish({ replay: true, skipped: true, setup: chosen, savedReminder: '21:00', chosenReminder: null })
    ).toEqual({ setup: null, reminder: null });
  });

  it('finishing saves what was chosen', () => {
    expect(
      planOnboardingFinish({ replay: true, skipped: false, setup: chosen, savedReminder: null, chosenReminder: '20:00' })
    ).toEqual({ setup: chosen, reminder: { kind: 'set', time: '20:00' } });
  });

  it('"No reminder" turns an existing reminder off', () => {
    expect(
      planOnboardingFinish({ replay: true, skipped: false, setup: chosen, savedReminder: '21:00', chosenReminder: null })
        .reminder
    ).toEqual({ kind: 'off' });
  });

  it('leaves the reminder alone when nothing about it changed', () => {
    expect(reminderChange('21:00', '21:00')).toBeNull();
    expect(reminderChange(null, null)).toBeNull();
    expect(reminderChange(undefined, null)).toBeNull();
    expect(reminderChange('21:00', '20:00')).toEqual({ kind: 'set', time: '20:00' });
  });
});
