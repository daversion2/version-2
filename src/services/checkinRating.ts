import { PracticeCompletionInput } from '../types';
import { asLevel, OverrideRated, resistanceToDifficulty } from '../constants/resistance';
import { buildQuickSheetInput } from './lastMetrics';
import type { TodayAppId } from './appCheckins';

// =============================================================================
// WHAT THE RATING SHEET ASKS, and what its answers save as.
//
// Two ratings per session since 2026-11-11 (constants/resistance.ts, "TWO
// RATINGS"): the override — how hard it was to start — and push — how hard
// they pushed once going. Which of them the sheet on Today still has to ask
// depends on how the session began:
//   'push'  started in the app: the override was tapped on Start, so only push
//   'both'  Done it, or a past session: the override (past tense), then push
//   'meals' a Meals day: its one rating, nothing else
// =============================================================================

export type CheckinMode = 'push' | 'both' | 'meals';

/** The answers the sheet collected. */
export interface CheckinRating {
  override?: number;
  push?: number;
  /** Meals only. */
  day?: number;
}

/** What the sheet has to ask for this app, given the override the session brought back (if any). */
export const checkinModeFor = (appId: TodayAppId, override?: number): CheckinMode =>
  appId === 'meals' ? 'meals' : asLevel(override) ? 'push' : 'both';

/** Has the sheet everything it needs to save? */
export const checkinComplete = (mode: CheckinMode, rating: CheckinRating): boolean =>
  mode === 'meals' ? !!asLevel(rating.day) : !!asLevel(rating.override) && !!asLevel(rating.push);

/**
 * The completion input for a finished sheet. The override keeps its old home in
 * `resistance` (and with it the XP, the friction chart and the toast), marked
 * with when it was given; push rides alongside. A Meals day saves its rating as
 * `day_rating` and no `resistance`, so it stays out of the override line.
 */
export const buildCheckinInput = (
  mode: CheckinMode,
  rating: CheckinRating,
  values: Record<string, number>,
  prefilled: Record<string, number>,
  date?: string
): PracticeCompletionInput => {
  if (mode === 'meals') {
    const day = asLevel(rating.day) ?? 1;
    const base = buildQuickSheetInput(day, values, prefilled, date);
    const { resistance: _unused, ...rest } = base;
    return { ...rest, difficulty: resistanceToDifficulty(day), day_rating: day };
  }
  const override = asLevel(rating.override) ?? 1;
  const overrideRated: OverrideRated = mode === 'push' ? 'start' : 'after';
  const push = asLevel(rating.push);
  return {
    ...buildQuickSheetInput(override, values, prefilled, date),
    override_rated: overrideRated,
    ...(push ? { push } : {}),
  };
};
