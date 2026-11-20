import { APP_CATALOG } from '../../data/appCatalog';
import {
  canRemoveFromToday,
  catalogSections,
  catalogStatus,
  findCatalogApp,
  hiddenRowsOf,
  isCatalogAppId,
  todayRowsOf,
  withAppAdded,
  withRowOnToday,
  withAppRemoved,
} from '../appCatalog';
import { defaultAppSetup } from '../appSetup';

const app = (id: string) => findCatalogApp(id)!;

describe('the catalog content', () => {
  it('has every Today app, the two Today rows and the two Lab apps, each with a description', () => {
    expect(APP_CATALOG.map((a) => a.id)).toEqual([
      'meditate', 'workouts', 'meals', 'nightly', 'craving', 'hotcold', 'avoidance',
    ]);
    for (const a of APP_CATALOG) {
      expect(a.tagline.length).toBeGreaterThan(0);
      expect(a.description.length).toBeGreaterThan(40);
      expect(a.features.length).toBeGreaterThan(0);
      expect(a.features.length).toBeLessThanOrEqual(3);
      expect(a.override.length).toBeGreaterThan(0);
      // Exactly one kind: a Today app, a Today row (which opens a route), or a standalone route.
      const kind = a.todayAppId ? 'app' : a.todayRow ? 'row' : 'standalone';
      expect(kind === 'app' ? !a.route : !!a.route).toBe(true);
      expect(a.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('never promises it gets easier, and never says "rep"', () => {
    const text = APP_CATALOG.flatMap((a) => [
      a.tagline,
      a.description,
      a.goodFor,
      ...a.features.map((f) => f.text),
      ...a.override.flatMap((o) => [o.label, o.text]),
    ]).join(' ');
    expect(text).not.toMatch(/easier|\brep\b|\breps\b/i);
  });
});

describe('catalogStatus', () => {
  it('reads a Today app as on or addable from the switched-off list', () => {
    expect(catalogStatus(app('meals'), [])).toBe('onToday');
    expect(catalogStatus(app('meals'), ['meals'])).toBe('addable');
  });

  it('reads Hot & Cold as addable until it is added (off by default)', () => {
    expect(catalogStatus(app('hotcold'), [], ['hotcold', 'avoidance'])).toBe('addable');
    expect(catalogStatus(app('hotcold'), [], [])).toBe('onToday');
  });

  it('treats a stored list that hides everything as everything on', () => {
    expect(catalogStatus(app('meals'), ['meditate', 'workouts', 'meals'])).toBe('onToday');
  });
});

describe('catalogSections', () => {
  // A new account: Hot & Cold and Avoidance start off Today.
  const NEW_ROWS = ['hotcold', 'avoidance'] as const;

  it('groups the apps and features new ones first, then ones to add', () => {
    const s = catalogSections(['workouts', 'meals'], [...NEW_ROWS]);
    expect(s.onToday.map((a) => a.id)).toEqual(['meditate', 'nightly', 'craving']);
    expect(s.addable.map((a) => a.id)).toEqual(['workouts', 'meals', 'hotcold', 'avoidance']);
    expect(s.standalone).toEqual([]);
    expect(s.featured.map((a) => a.id)).toEqual(['hotcold', 'avoidance', 'workouts', 'meals']);
  });

  it('puts a switched-off Today row under Add to Today', () => {
    const s = catalogSections([], ['craving', ...NEW_ROWS]);
    expect(s.onToday.map((a) => a.id)).toEqual(['meditate', 'workouts', 'meals', 'nightly']);
    expect(s.addable.map((a) => a.id)).toEqual(['craving', 'hotcold', 'avoidance']);
  });

  it('with everything on, features nothing', () => {
    expect(catalogSections([], []).featured).toEqual([]);
  });
});

describe('adding and removing', () => {
  it('adds an app at the chosen goal', () => {
    const setup = { ...defaultAppSetup(), hidden: ['workouts' as const] };
    const next = withAppAdded(setup, 'workouts', 4);
    expect(next.hidden).toEqual([]);
    expect(next.goals.workouts).toBe(4);
  });

  it('only changes the goal of an app already on', () => {
    const next = withAppAdded(defaultAppSetup(), 'meals', 6);
    expect(next.hidden).toEqual([]);
    expect(next.goals.meals).toBe(6);
  });

  it('clamps a goal outside 1–7', () => {
    expect(withAppAdded(defaultAppSetup(), 'meditate', 12).goals.meditate).toBe(7);
  });

  it('removes an app, but never the last one on', () => {
    expect(withAppRemoved(defaultAppSetup(), 'meals').hidden).toEqual(['meals']);
    const onlyMeditate = { ...defaultAppSetup(), hidden: ['workouts' as const, 'meals' as const] };
    expect(withAppRemoved(onlyMeditate, 'meditate').hidden).toEqual(['workouts', 'meals']);
  });

  it('says when an app can be removed', () => {
    expect(canRemoveFromToday([], 'meals')).toBe(true);
    expect(canRemoveFromToday(['workouts', 'meals'], 'meditate')).toBe(false);
    expect(canRemoveFromToday(['meals'], 'meals')).toBe(false);
  });
});

describe('Today rows', () => {
  it('starts with Close out and Craving Crusher on, the new two off', () => {
    expect(todayRowsOf(null)).toEqual(['nightly', 'craving']);
    expect(hiddenRowsOf(null)).toEqual(['hotcold', 'avoidance']);
  });

  it('reads the older hidden list until rows are chosen, then the chosen list', () => {
    expect(todayRowsOf({ hidden_rows: ['craving', 'nonsense'] })).toEqual(['nightly']);
    expect(todayRowsOf({ hidden_rows: ['craving'], today_rows: ['craving', 'hotcold', 'junk'] })).toEqual([
      'craving',
      'hotcold',
    ]);
  });

  it('puts a row on or takes it off', () => {
    expect(withRowOnToday([], 'nightly', false)).toEqual(['nightly']);
    expect(withRowOnToday(['nightly', 'craving'], 'nightly', true)).toEqual(['craving']);
    expect(withRowOnToday(['hotcold', 'avoidance'], 'hotcold', true)).toEqual(['avoidance']);
    expect(withRowOnToday(['craving'], 'craving', false)).toEqual(['craving']);
  });

  it('reads a row app as on Today or addable', () => {
    expect(catalogStatus(app('nightly'), [], [])).toBe('onToday');
    expect(catalogStatus(app('nightly'), [], ['nightly'])).toBe('addable');
  });
});

describe('isCatalogAppId', () => {
  it('accepts catalog ids only', () => {
    expect(isCatalogAppId('avoidance')).toBe(true);
    expect(isCatalogAppId('compose')).toBe(false);
    expect(isCatalogAppId(undefined)).toBe(false);
  });
});
