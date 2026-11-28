import { ALL_APPS, hiddenAppsOf, setupProfilePatch, toggleApp, visibleApps, defaultAppSetup } from '../appSetup';
import { catalogSections, findCatalogApp, hiddenRowsOf, todayRowsOf } from '../appCatalog';
import { canOpenMiniApp } from '../miniApps';
import { isCatalogAppHidden } from '../hiddenApps';

// Meals and Craving Crusher are hidden from everyone, admins too (2026-11-28).
describe('apps hidden from everyone', () => {
  it('leaves Meals out of the apps a person can have', () => {
    expect(ALL_APPS).toEqual(['meditate', 'workouts']);
    expect(visibleApps([])).toEqual(['meditate', 'workouts']);
    expect(defaultAppSetup().startApp).toBe('meditate');
  });

  it('counts Meals as hidden for every account, whatever it saved', () => {
    expect(hiddenAppsOf({ hidden_apps: [] })).toContain('meals');
    expect(hiddenAppsOf(null)).toContain('meals');
    expect(hiddenAppsOf({ hidden_apps: ['workouts'] })).toEqual(['workouts', 'meals']);
  });

  it('keeps one visible app on: switching off Meditate with Workouts off does nothing', () => {
    const hidden = hiddenAppsOf({ hidden_apps: ['workouts'] });
    expect(toggleApp(hidden, 'meditate')).toBe(hidden);
    expect(toggleApp(hiddenAppsOf(null), 'workouts')).toEqual(['workouts', 'meals']);
  });

  it('never writes a hidden app into the user doc', () => {
    const patch = setupProfilePatch({ hidden: ['workouts', 'meals'], goals: { meditate: 3, workouts: 3, meals: 5 }, startApp: 'meals' });
    expect(patch.hidden_apps).toEqual(['workouts']);
    expect(patch.start_app).toBe('meditate');
  });

  it('keeps Craving Crusher off Today, even for an account that chose it', () => {
    expect(todayRowsOf(null)).toEqual(['nightly']);
    expect(todayRowsOf({ today_rows: ['nightly', 'craving', 'hotcold'] })).toEqual(['nightly', 'hotcold']);
    expect(hiddenRowsOf({ today_rows: ['craving'] })).toContain('craving');
  });

  it('leaves both out of the Apps screen', () => {
    const s = catalogSections([], []);
    const ids = [...s.featured, ...s.onToday, ...s.addable, ...s.standalone].map((a) => a.id);
    expect(ids).not.toContain('meals');
    expect(ids).not.toContain('craving');
    expect(findCatalogApp('meals')).toBeUndefined();
    expect(findCatalogApp('craving')).toBeUndefined();
    expect(isCatalogAppHidden('hotcold')).toBe(false);
  });

  it('won’t open Meals, not even for an admin', () => {
    expect(canOpenMiniApp('meals', { is_admin: true })).toBe(false);
    expect(canOpenMiniApp('workouts', { is_admin: false })).toBe(true);
  });
});
