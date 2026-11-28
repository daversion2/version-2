import type { TodayAppId } from './appCheckins';
import type { CatalogAppId, TodayRowId } from '../data/appCatalog';

// =============================================================================
// HIDDEN APPS — apps taken out of the product for everyone, admins included,
// without deleting them (founder, 2026-11-28: Meals and Craving Crusher).
//
// Their code, routes and saved data stay. Hiding only changes what's offered:
// not on Today (ring, icon, row, dashboard page), not in Apps, not in
// onboarding or the goals sheet, not on Progress, not in the Lab, and
// canOpenMiniApp() says no. Nothing about it is written to a user doc, so
// emptying these lists brings an app back exactly as each account left it.
// =============================================================================

/** Today apps (rings with an app page) hidden from everyone. */
export const HIDDEN_TODAY_APPS: readonly TodayAppId[] = ['meals'];

/** Today rows hidden from everyone. */
export const HIDDEN_TODAY_ROWS: readonly TodayRowId[] = ['craving'];

const HIDDEN_CATALOG: readonly CatalogAppId[] = [...HIDDEN_TODAY_APPS, ...HIDDEN_TODAY_ROWS];

export const isTodayAppHidden = (id: string): boolean => (HIDDEN_TODAY_APPS as readonly string[]).includes(id);
export const isTodayRowHidden = (id: string): boolean => (HIDDEN_TODAY_ROWS as readonly string[]).includes(id);
export const isCatalogAppHidden = (id: string): boolean => (HIDDEN_CATALOG as readonly string[]).includes(id);
