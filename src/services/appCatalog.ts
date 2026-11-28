import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { APP_CATALOG, CatalogApp, CatalogAppId, TodayRowId } from '../data/appCatalog';
import { clampWeeklyGoal, TodayAppId } from './appCheckins';
import { AppSetup, loadAppSetup, saveAppSetup, toggleApp, visibleApps } from './appSetup';
import type { User } from '../types';
import { isCatalogAppHidden, isTodayRowHidden } from './hiddenApps';

/** The catalog minus apps hidden from everyone (services/hiddenApps.ts). */
export const VISIBLE_CATALOG: CatalogApp[] = APP_CATALOG.filter((a) => !isCatalogAppHidden(a.id));

// =============================================================================
// THE APPS SCREEN'S LOGIC — what each app's state is, how the screen groups
// them, and what adding or removing one does to the saved setup.
//
// Content lives in data/appCatalog.ts; the screens in screens/Apps/. Adding a
// Today app takes it out of `hidden_apps` and saves its weekly goal, through
// the same path as Settings → Apps and weekly goals (services/appSetup.ts).
// =============================================================================

/**
 * - onToday: a Today app that's switched on.
 * - addable: a Today app that's switched off.
 * - standalone: opens on its own (not on Today yet).
 */
export type CatalogStatus = 'onToday' | 'addable' | 'standalone';

export const catalogStatus = (
  app: CatalogApp,
  hidden: readonly TodayAppId[],
  hiddenRows: readonly TodayRowId[] = []
): CatalogStatus => {
  if (app.todayRow) return hiddenRows.includes(app.todayRow) ? 'addable' : 'onToday';
  if (!app.todayAppId) return 'standalone';
  return visibleApps(hidden).includes(app.todayAppId) ? 'onToday' : 'addable';
};

export interface CatalogSections {
  /** Big cards at the top: new apps first, then Today apps not added yet. */
  featured: CatalogApp[];
  onToday: CatalogApp[];
  addable: CatalogApp[];
  standalone: CatalogApp[];
}

export const catalogSections = (
  hidden: readonly TodayAppId[],
  hiddenRows: readonly TodayRowId[] = [],
  apps: readonly CatalogApp[] = VISIBLE_CATALOG
): CatalogSections => {
  const status = (a: CatalogApp) => catalogStatus(a, hidden, hiddenRows);
  const by = (s: CatalogStatus) => apps.filter((a) => status(a) === s);
  const addable = by('addable');
  const standalone = by('standalone');
  const featured = [...apps.filter((a) => a.isNew && status(a) !== 'onToday'), ...addable].filter(
    (a, i, all) => all.findIndex((b) => b.id === a.id) === i
  );
  return { featured, onToday: by('onToday'), addable, standalone };
};

export const findCatalogApp = (id: string): CatalogApp | undefined => VISIBLE_CATALOG.find((a) => a.id === id);

/** At least one app stays on Today, so the last one can't be removed. */
export const canRemoveFromToday = (hidden: readonly TodayAppId[], appId: TodayAppId): boolean =>
  visibleApps(hidden).includes(appId) && visibleApps(hidden).length > 1;

/** The setup with one Today app added, at that goal. */
export const withAppAdded = (setup: AppSetup, appId: TodayAppId, goal: number): AppSetup => ({
  ...setup,
  hidden: setup.hidden.includes(appId) ? toggleApp(setup.hidden, appId) : setup.hidden,
  goals: { ...setup.goals, [appId]: clampWeeklyGoal(goal, appId) },
});

/** The setup with one Today app removed. The last app left on stays on. */
export const withAppRemoved = (setup: AppSetup, appId: TodayAppId): AppSetup =>
  setup.hidden.includes(appId) ? setup : { ...setup, hidden: toggleApp(setup.hidden, appId) };

/** "3 a week" under an app on Today. */
export const goalLine = (goal: number): string => `${goal} a week`;

/** The catalog ids, for a route param check. */
export const isCatalogAppId = (id: unknown): id is CatalogAppId =>
  typeof id === 'string' && APP_CATALOG.some((a) => a.id === id);

// --- Today rows (Close out the day, Craving Crusher) ---------------------------

export const TODAY_ROWS: TodayRowId[] = ['nightly', 'craving', 'hotcold', 'avoidance'];

/** On Today for an account that hasn't chosen: the two that were always there. */
export const DEFAULT_TODAY_ROWS: TodayRowId[] = ['nightly', 'craving'];

/**
 * The rows on Today. `today_rows` once the account has added or removed one
 * (since 2026-11-20, when Hot & Cold and Avoidance joined, off by default);
 * before that, the defaults minus the older `hidden_rows`.
 */
export const todayRowsOf = (profile: Pick<User, 'hidden_rows' | 'today_rows'> | null | undefined): TodayRowId[] => {
  // Rows hidden from everyone never show, whatever the account chose.
  if (Array.isArray(profile?.today_rows))
    return TODAY_ROWS.filter((r) => profile!.today_rows!.includes(r) && !isTodayRowHidden(r));
  return DEFAULT_TODAY_ROWS.filter((r) => !(profile?.hidden_rows ?? []).includes(r) && !isTodayRowHidden(r));
};

/** The rows not on Today. */
export const hiddenRowsOf = (profile: Pick<User, 'hidden_rows' | 'today_rows'> | null | undefined): TodayRowId[] => {
  const on = todayRowsOf(profile);
  return TODAY_ROWS.filter((r) => !on.includes(r));
};

/** The switched-off rows with one row put on or taken off Today. */
export const withRowOnToday = (hiddenRows: readonly TodayRowId[], row: TodayRowId, on: boolean): TodayRowId[] =>
  TODAY_ROWS.filter((r) => (r === row ? !on : hiddenRows.includes(r)));

/** Put a row on Today or take it off, then save. */
export const setRowOnToday = async (
  userId: string,
  profile: Pick<User, 'hidden_rows' | 'today_rows'> | null | undefined,
  row: TodayRowId,
  on: boolean
): Promise<void> => {
  const hidden = withRowOnToday(hiddenRowsOf(profile), row, on);
  await setDoc(
    doc(db, 'users', userId),
    { today_rows: TODAY_ROWS.filter((r) => !hidden.includes(r)), hidden_rows: hidden },
    { merge: true }
  );
};

// --- Saving ------------------------------------------------------------------

/** Add a Today app at a goal (or update its goal), then save. Leaves the start app alone. */
export const addAppToToday = async (
  userId: string,
  profile: Pick<User, 'hidden_apps' | 'start_app'> | null | undefined,
  appId: TodayAppId,
  goal: number
): Promise<void> => {
  const setup = await loadAppSetup(userId, profile);
  await saveAppSetup(userId, withAppAdded(setup, appId, goal), { includeStart: false });
};

/** Take a Today app off Today, then save. Its history stays. */
export const removeAppFromToday = async (
  userId: string,
  profile: Pick<User, 'hidden_apps' | 'start_app'> | null | undefined,
  appId: TodayAppId
): Promise<void> => {
  const setup = await loadAppSetup(userId, profile);
  await saveAppSetup(userId, withAppRemoved(setup, appId), { includeStart: false });
};
