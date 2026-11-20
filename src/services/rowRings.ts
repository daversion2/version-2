import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { TodayRowId } from '../data/appCatalog';
import { inWeek } from './homeDashboard';
import type { User } from '../types';

// =============================================================================
// RINGS FOR CLOSE OUT THE DAY AND CRAVING CRUSHER (2026-11-20).
//
// Founder: treat them like the other apps, with a ring on Today and a weekly
// goal. They aren't TodayAppIds (no start/keep-going ratings, no session
// collections), so their rings come from here: nights closed out, and urges
// faced in Craving Crusher (ridden out or logged; logging honestly is the
// behaviour that app needs most), counted Monday to today like every ring.
// Goals live on the user doc (`row_goals`), 1–7.
// =============================================================================

export const ROW_DEFAULT_GOALS: Record<TodayRowId, number> = { nightly: 5, craving: 3 };

/** What a row's goal counts, after the number: "5 nights a week". */
export const ROW_GOAL_NOUNS: Record<TodayRowId, string> = { nightly: 'nights', craving: 'urges faced' };

export const clampRowGoal = (n: number | undefined, row: TodayRowId): number =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(7, Math.max(1, Math.round(n))) : ROW_DEFAULT_GOALS[row];

/** The user doc's row goals, with defaults for anything unset or out of range. */
export const rowGoalsOf = (profile: Pick<User, 'row_goals'> | null | undefined): Record<TodayRowId, number> => ({
  nightly: clampRowGoal(profile?.row_goals?.nightly, 'nightly'),
  craving: clampRowGoal(profile?.row_goals?.craving, 'craving'),
});

/** How many of these dates fall this week (Monday start), each date once. */
export const weekDone = (dates: string[], today: string): number =>
  new Set(dates.filter((d) => inWeek(d, today))).size;

/** Craving Crusher's count: every urge faced this week, either outcome. */
export const urgesThisWeek = (logs: { date: string }[], today: string): number =>
  logs.filter((l) => inWeek(l.date, today)).length;

export interface RowRing {
  id: TodayRowId;
  done: number;
  goal: number;
  /** 0–1. */
  pct: number;
}

export const rowRing = (id: TodayRowId, done: number, goal: number): RowRing => ({
  id,
  done,
  goal,
  pct: goal > 0 ? Math.min(1, done / goal) : 0,
});

/** Save one row's weekly goal. */
export const saveRowGoal = async (userId: string, row: TodayRowId, goal: number): Promise<void> => {
  await setDoc(doc(db, 'users', userId), { row_goals: { [row]: clampRowGoal(goal, row) } }, { merge: true });
};
