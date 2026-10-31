import type { PracticeCompletionInput } from '../types';
import { completePractice, CompletePracticeResult } from './practices';
import { appCheckinId, TodayAppId } from './appCheckins';
import { MINI_APPS } from './miniApps';

// =============================================================================
// APP RATINGS — "How hard was it to start?" for a finished app session
// (docs/app-checkins-design.md §1). Same log, XP and streak path as before;
// what's gone is the habit: no PracticeInstance, and no mirror log onto a
// matching habit.
//
// The log keeps `reference_id: 'app:<id>'`, so every existing rating reads
// the same, and adds `app_id` plus `session_id` — the session doc it rates,
// for Meditate and Workouts. A Workouts past session and a Meals day close
// have none.
// =============================================================================

export interface AppRatingInput extends PracticeCompletionInput {
  sessionId?: string;
}

export const rateAppSession = (
  userId: string,
  appId: TodayAppId,
  { sessionId, ...input }: AppRatingInput
): Promise<CompletePracticeResult> =>
  completePractice(
    userId,
    { id: appCheckinId(appId), name: MINI_APPS[appId].title },
    input,
    { appId, ...(sessionId ? { sessionId } : {}) }
  );
