import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import {
  appCheckinId,
  appIdFromCheckinId,
  clampWeeklyGoal,
  DEFAULT_APP_WEEKLY_GOALS,
  TODAY_APPS,
  TodayAppId,
} from './appCheckins';
import { getMeditatePrefs, saveMeditatePrefs } from './labMeditate';
import { getWorkoutPrefs, saveWorkoutPrefs } from './labWorkouts';
import { getMealsPrefs, saveMealsPrefs } from './labMeals';
import type { CompletionLog, User } from '../types';

// =============================================================================
// APP SETUP — which apps are on, each one's weekly goal, and where to start.
//
// Onboarding sets it (founder, 2026-11-01): Meditate, Workouts and Meals all on
// by default, any one can be switched off, goals prefilled at 3 / 3 / 5, and
// one app picked as "start here" for Today's plan card. Existing accounts get
// the same goals once, as a sheet on Today; Settings reopens it.
//
// Where it lives: the switched-off apps, the start app and the "goals set"
// flag on the user doc; each goal in its own app's prefs (the apps already read
// weekly_goal from there, so their own settings screens stay in step).
// =============================================================================

export interface AppSetup {
  /** Switched off: not on Today, not in the weekly review. Never all three. */
  hidden: TodayAppId[];
  goals: Record<TodayAppId, number>;
  /** Today's plan card shows this until its first session. Null = none. */
  startApp: TodayAppId | null;
}

/** What a goal counts, after the number: "3 sessions a week". */
export const GOAL_NOUNS: Record<TodayAppId, string> = {
  meditate: 'sessions',
  workouts: 'workouts',
  meals: 'days logged',
};

export const ALL_APPS: TodayAppId[] = TODAY_APPS.map((a) => a.id);

/** In section order. A stored list that hid everything (or garbage) shows everything. */
export const visibleApps = (hidden: readonly string[] | undefined): TodayAppId[] => {
  const shown = ALL_APPS.filter((a) => !hidden?.includes(a));
  return shown.length ? shown : ALL_APPS;
};

/** The user doc's switched-off apps, cleaned. */
export const hiddenAppsOf = (profile: Pick<User, 'hidden_apps'> | null | undefined): TodayAppId[] => {
  const hidden = ALL_APPS.filter((a) => (profile?.hidden_apps ?? []).includes(a));
  return hidden.length < ALL_APPS.length ? hidden : [];
};

/** The user doc's start app, if it names one. */
export const startAppOf = (profile: Pick<User, 'start_app'> | null | undefined): TodayAppId | null =>
  ALL_APPS.find((a) => a === profile?.start_app) ?? null;

/** Flip one app. Switching off the last one left on does nothing. */
export const toggleApp = (hidden: TodayAppId[], appId: TodayAppId): TodayAppId[] => {
  if (hidden.includes(appId)) return hidden.filter((a) => a !== appId);
  const next = [...hidden, appId];
  return next.length >= ALL_APPS.length ? hidden : ALL_APPS.filter((a) => next.includes(a));
};

/** − / + on a goal: 1–7 days. */
export const stepGoal = (goal: number, by: -1 | 1, appId: TodayAppId): number => clampWeeklyGoal(goal + by, appId);

/** A start app that's been switched off moves to the first app still on. */
export const resolveStartApp = (startApp: TodayAppId | null, hidden: TodayAppId[]): TodayAppId | null =>
  startApp === null ? null : hidden.includes(startApp) ? visibleApps(hidden)[0] : startApp;

/** Onboarding's starting point: everything on, the default goals, Meditate first. */
export const defaultAppSetup = (): AppSetup => ({
  hidden: [],
  goals: { ...DEFAULT_APP_WEEKLY_GOALS },
  startApp: ALL_APPS[0],
});

/** An account that finished onboarding before goals existed sees the goals sheet once. */
export const needsGoalSetup = (
  profile: Pick<User, 'has_completed_onboarding' | 'app_goals_set'> | null | undefined
): boolean => !!profile?.has_completed_onboarding && !profile.app_goals_set;

/** "Start here" for Today's plan card, until the start app has its first rated session. */
export const startHereLine = (
  startApp: TodayAppId | null | undefined,
  hidden: TodayAppId[],
  logs: Pick<CompletionLog, 'reference_id'>[]
): string | null => {
  if (!startApp || hidden.includes(startApp)) return null;
  if (logs.some((l) => l.reference_id === appCheckinId(startApp))) return null;
  return START_HERE[startApp];
};

/**
 * The rating sheet explains its question once, on the first rating ever.
 * Onboarding doesn't demo it. An account with app ratings already knows it.
 */
export const shouldExplainRating = (
  profile: Pick<User, 'seen_intros'> | null | undefined,
  logs: Pick<CompletionLog, 'reference_id'>[]
): boolean => !!profile && !profile.seen_intros?.rating && !logs.some((l) => appIdFromCheckinId(l.reference_id));

const START_HERE: Record<TodayAppId, string> = {
  meditate: 'Start here: your first Meditate session. Ten minutes is plenty.',
  workouts: 'Start here: your first workout. Any length counts.',
  meals: 'Start here: log your next meal in Meals.',
};

/** The user-doc half of a setup. */
export const setupProfilePatch = (setup: AppSetup) => ({
  hidden_apps: setup.hidden,
  start_app: resolveStartApp(setup.startApp, setup.hidden),
  app_goals_set: true,
});

/** The setup as saved now: goals from each app's prefs, the rest from the user doc. */
export const loadAppSetup = async (
  userId: string,
  profile: Pick<User, 'hidden_apps' | 'start_app'> | null | undefined
): Promise<AppSetup> => {
  const [med, work, meals] = await Promise.all([
    getMeditatePrefs(userId),
    getWorkoutPrefs(userId),
    getMealsPrefs(userId),
  ]);
  return {
    hidden: hiddenAppsOf(profile),
    goals: {
      meditate: clampWeeklyGoal(med.weekly_goal, 'meditate'),
      workouts: clampWeeklyGoal(work.weekly_goal, 'workouts'),
      meals: clampWeeklyGoal(meals.weekly_goal, 'meals'),
    },
    startApp: startAppOf(profile),
  };
};

/**
 * Save a setup: each goal into its app's prefs, then the user doc. The flag is
 * last, so a failed goal write leaves the account still due its goals sheet.
 * `includeStart` false leaves any start app already saved alone (the sheet).
 */
export const saveAppSetup = async (userId: string, setup: AppSetup, { includeStart = true } = {}): Promise<void> => {
  const goal = (a: TodayAppId) => clampWeeklyGoal(setup.goals[a], a);
  await Promise.all([
    saveMeditatePrefs(userId, { weekly_goal: goal('meditate') }),
    saveWorkoutPrefs(userId, { weekly_goal: goal('workouts') }),
    saveMealsPrefs(userId, { weekly_goal: goal('meals') }),
  ]);
  const { start_app, ...rest } = setupProfilePatch(setup);
  await setDoc(doc(db, 'users', userId), includeStart ? { ...rest, start_app } : rest, { merge: true });
};

// -----------------------------------------------------------------------------
// Finishing onboarding — first run or a replay from Settings → Replay intro.
// -----------------------------------------------------------------------------

/**
 * A replay: this account has saved a setup before (onboarding or the goals
 * sheet). Onboarding then opens on what's saved instead of the defaults.
 */
export const isSetupReplay = (profile: Pick<User, 'app_goals_set'> | null | undefined): boolean =>
  !!profile?.app_goals_set;

/** What finishing does to the evening reminder: set a time, turn it off, or leave it. */
export type ReminderChange = { kind: 'set'; time: string } | { kind: 'off' } | null;

export const reminderChange = (saved: string | null | undefined, chosen: string | null): ReminderChange => {
  if (chosen) return chosen === saved ? null : { kind: 'set', time: chosen };
  return saved ? { kind: 'off' } : null;
};

/**
 * What finishing onboarding writes. Skipping a first run saves the defaults
 * (Today still has goals to count) and no reminder; skipping a replay saves
 * nothing, so the setup the person already had survives. Finishing saves what
 * they chose, and "No reminder" turns an existing reminder off.
 */
export const planOnboardingFinish = (args: {
  replay: boolean;
  skipped: boolean;
  setup: AppSetup;
  savedReminder: string | null | undefined;
  chosenReminder: string | null;
}): { setup: AppSetup | null; reminder: ReminderChange } => {
  if (args.skipped) return { setup: args.replay ? null : defaultAppSetup(), reminder: null };
  return { setup: args.setup, reminder: reminderChange(args.savedReminder, args.chosenReminder) };
};
