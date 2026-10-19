import { MINI_APPS } from './miniApps';
import { CompletionLog, PracticeInstance } from '../types';
import type { TrackingField } from '../data/practices';
import type { HabitSectionId } from '../data/habitSections';

// =============================================================================
// APP CHECK-INS — the apps are the main thing; habits support underneath.
//
// Decided 2026-10-18 (docs/apps-first-today.md): Workouts, Meditate and Meals
// are always on Today, and a finished session is a check-in in its own right —
// "How hard was it to start?", 1–3 XP — not a way of checking off a habit.
//
// How it fits the habit machinery without a second copy of it: each app is a
// synthetic habit with the id `app:<id>` and the app's weekly goal as its
// target. Its check-ins are ordinary nudge logs filed under that id, so pace,
// the weekly skip review, the day streak and "Friction you can handle" all
// count them with no changes of their own.
//
// A session also ticks its DIRECT library match (Workouts → Workout, Meditate →
// Meditation, or Breathwork / NSDR for those modes) with a mirror log: no
// rating and no XP (difficulty 0 reads as unrated everywhere — see
// constants/resistance.logResistance), so the habit counts as done for its week
// and streak while the effort is counted once, under the app.
// =============================================================================

export type TodayAppId = 'workouts' | 'meditate' | 'meals';

/** In section order: Mind, Movement, Meals. */
export const TODAY_APPS: { id: TodayAppId; section: HabitSectionId; route: 'WorkoutsApp' | 'MeditateApp' | 'MealsApp' }[] = [
  { id: 'meditate', section: 'mind', route: 'MeditateApp' },
  { id: 'workouts', section: 'movement', route: 'WorkoutsApp' },
  { id: 'meals', section: 'meals', route: 'MealsApp' },
];

/** Sessions a week, until the user changes it in the app. Meals counts days on target. */
export const DEFAULT_APP_WEEKLY_GOALS: Record<TodayAppId, number> = {
  workouts: 3,
  meditate: 5,
  meals: 7,
};

export const APP_CHECKIN_PREFIX = 'app:';

export const appCheckinId = (appId: TodayAppId): string => `${APP_CHECKIN_PREFIX}${appId}`;

export const appIdFromCheckinId = (referenceId?: string | null): TodayAppId | undefined => {
  if (!referenceId?.startsWith(APP_CHECKIN_PREFIX)) return undefined;
  const id = referenceId.slice(APP_CHECKIN_PREFIX.length);
  return TODAY_APPS.some((a) => a.id === id) ? (id as TodayAppId) : undefined;
};

/** A goal is days in a week: 1–7. */
export const clampWeeklyGoal = (n: number | undefined, appId: TodayAppId): number => {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : DEFAULT_APP_WEEKLY_GOALS[appId];
  return Math.min(7, Math.max(1, v));
};

/** The app as the habit the pace / skip / streak code already understands. */
export const appCheckinHabit = (appId: TodayAppId, weeklyGoal?: number): PracticeInstance => ({
  id: appCheckinId(appId),
  user_id: '',
  name: MINI_APPS[appId].title,
  is_active: true,
  created_by_user: false,
  target_count_per_week: clampWeeklyGoal(weeklyGoal, appId),
});

/** What the quick sheet asks after a session (the duration, filled in from it). */
export const APP_TRACKING: Record<TodayAppId, TrackingField[]> = {
  workouts: [{ key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min', min: 5, max: 180, step: 5, default: 45 }],
  meditate: [{ key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min', min: 1, max: 90, step: 1, default: 10 }],
  meals: [],
};

/** Library habits a session ticks, by app and (for Meditate) by mode. */
const TICKED_PRACTICE_IDS: Record<TodayAppId, (mode?: string) => string[]> = {
  workouts: () => ['workout', 'trad-exercise'],
  meditate: (mode) =>
    mode === 'breathe'
      ? ['breathwork', 'breathing-break']
      : mode === 'nsdr'
        ? ['nsdr']
        : ['meditation', 'morning-meditation', 'trad-meditate'],
  meals: () => [],
};

/**
 * The habit a finished session also ticks, if the user has one. Direct library
 * matches only — custom habits are never ticked (founder, 2026-10-18).
 */
export const habitTickedBy = (
  appId: TodayAppId,
  habits: Pick<PracticeInstance, 'id' | 'practice_id' | 'is_active' | 'archived_at'>[],
  mode?: string
): string | undefined => {
  const ids = TICKED_PRACTICE_IDS[appId](mode);
  return habits.find((h) => h.is_active && !h.archived_at && !!h.practice_id && ids.includes(h.practice_id))?.id;
};

/** Is this the library habit an app's sessions tick (any mode)? */
export const habitMatchesApp = (appId: TodayAppId, habit: Pick<PracticeInstance, 'practice_id'>): boolean => {
  const all = new Set([undefined, 'breathe', 'nsdr'].flatMap((m) => TICKED_PRACTICE_IDS[appId](m)));
  return !!habit.practice_id && all.has(habit.practice_id);
};

/** The app's most recent rated check-in — the card's "last time" line. */
export const lastAppCheckin = (appId: TodayAppId, logs: CompletionLog[]): CompletionLog | undefined => {
  const id = appCheckinId(appId);
  return logs
    .filter((l) => l.reference_id === id)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))[0];
};
