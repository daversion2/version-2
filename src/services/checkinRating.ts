import { PracticeCompletionInput } from '../types';
import { asLevel, OverrideRated, resistanceToDifficulty } from '../constants/resistance';
import { buildQuickSheetInput } from './lastMetrics';
import type { TodayAppId } from './appCheckins';
import { addDays } from './homeDashboard';

// =============================================================================
// WHAT THE RATING SHEET ASKS, and what its answers save as.
//
// A session is the override used twice (constants/resistance.ts, "THE
// OVERRIDE, TWICE"): to start, and to keep going. Which of them the sheet on
// Today still has to ask depends on how the session began:
//   'afterStart'  started in the app: the start was tapped on Start, so only
//                 keep going
//   'both'        Done it, or a past session from yesterday: the start (past
//                 tense), then keep going
//   'late'        a session logged more than a day after it happened: only
//                 keep going. Nobody remembers how hard a start was days ago,
//                 and a guess would bend the start line.
//   'meals'       a Meals day: its one rating, nothing else
// =============================================================================

export type CheckinMode = 'afterStart' | 'both' | 'late' | 'meals';

/** The answers the sheet collected. */
export interface CheckinRating {
  /** The start override. */
  override?: number;
  keepGoing?: number;
  /** Meals only. */
  day?: number;
}

/**
 * What the sheet has to ask for this app, given the start override the session
 * brought back (if any) and the day it was for (absent = today).
 */
export const checkinModeFor = (appId: TodayAppId, override?: number, date?: string, today?: string): CheckinMode => {
  if (appId === 'meals') return 'meals';
  if (asLevel(override)) return 'afterStart';
  if (date && today && date < addDays(today, -1)) return 'late';
  return 'both';
};

/** Does this mode ask the start question on the sheet? */
export const asksStart = (mode: CheckinMode): boolean => mode === 'both';

/** Has the sheet everything it needs to save? */
export const checkinComplete = (mode: CheckinMode, rating: CheckinRating): boolean => {
  if (mode === 'meals') return !!asLevel(rating.day);
  if (mode === 'late') return !!asLevel(rating.keepGoing);
  return !!asLevel(rating.override) && !!asLevel(rating.keepGoing);
};

/**
 * The completion input for a finished sheet. The start override keeps its old
 * home in `resistance` (and with it the XP, the friction chart and the toast),
 * marked with when it was given; keep going rides alongside in `keep_going`.
 * A Meals day saves its rating as `day_rating`, and a late session only
 * `keep_going`: neither has a `resistance`, so neither touches the start line.
 */
export const buildCheckinInput = (
  mode: CheckinMode,
  rating: CheckinRating,
  values: Record<string, number>,
  prefilled: Record<string, number>,
  date?: string
): PracticeCompletionInput => {
  if (mode === 'meals' || mode === 'late') {
    const level = asLevel(mode === 'meals' ? rating.day : rating.keepGoing) ?? 1;
    const { resistance: _unused, ...rest } = buildQuickSheetInput(level, values, prefilled, date);
    return {
      ...rest,
      difficulty: resistanceToDifficulty(level),
      ...(mode === 'meals' ? { day_rating: level } : { keep_going: level }),
    };
  }
  const override = asLevel(rating.override) ?? 1;
  const overrideRated: OverrideRated = mode === 'afterStart' ? 'start' : 'after';
  const keepGoing = asLevel(rating.keepGoing);
  return {
    ...buildQuickSheetInput(override, values, prefilled, date),
    override_rated: overrideRated,
    ...(keepGoing ? { keep_going: keepGoing } : {}),
  };
};
