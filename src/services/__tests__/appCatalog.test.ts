import { APP_CATALOG } from '../../data/appCatalog';
import {
  canRemoveFromToday,
  catalogSections,
  catalogStatus,
  findCatalogApp,
  isCatalogAppId,
  withAppAdded,
  withAppRemoved,
} from '../appCatalog';
import { defaultAppSetup } from '../appSetup';

const app = (id: string) => findCatalogApp(id)!;

describe('the catalog content', () => {
  it('has every Today app and the two Lab apps, each with a description', () => {
    expect(APP_CATALOG.map((a) => a.id)).toEqual(['meditate', 'workouts', 'meals', 'hotcold', 'avoidance']);
    for (const a of APP_CATALOG) {
      expect(a.tagline.length).toBeGreaterThan(0);
      expect(a.description.length).toBeGreaterThan(40);
      expect(a.features.length).toBeGreaterThan(0);
      expect(a.features.length).toBeLessThanOrEqual(3);
      expect(a.override.length).toBeGreaterThan(0);
      expect(!!a.todayAppId !== !!a.route).toBe(true);
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

  it('reads a Lab app as standalone', () => {
    expect(catalogStatus(app('hotcold'), [])).toBe('standalone');
  });

  it('treats a stored list that hides everything as everything on', () => {
    expect(catalogStatus(app('meals'), ['meditate', 'workouts', 'meals'])).toBe('onToday');
  });
});

describe('catalogSections', () => {
  it('groups the apps and features new ones first, then ones to add', () => {
    const s = catalogSections(['workouts', 'meals']);
    expect(s.onToday.map((a) => a.id)).toEqual(['meditate']);
    expect(s.addable.map((a) => a.id)).toEqual(['workouts', 'meals']);
    expect(s.standalone.map((a) => a.id)).toEqual(['hotcold', 'avoidance']);
    expect(s.featured.map((a) => a.id)).toEqual(['hotcold', 'avoidance', 'workouts', 'meals']);
  });

  it('with everything on, features only the new apps', () => {
    expect(catalogSections([]).featured.map((a) => a.id)).toEqual(['hotcold', 'avoidance']);
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

describe('isCatalogAppId', () => {
  it('accepts catalog ids only', () => {
    expect(isCatalogAppId('avoidance')).toBe(true);
    expect(isCatalogAppId('compose')).toBe(false);
    expect(isCatalogAppId(undefined)).toBe(false);
  });
});
