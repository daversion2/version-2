import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  getDoc,
  increment,
  deleteField,
} from 'firebase/firestore';
import { db } from './firebase';
import { PracticeInstance, HabitDifficulty, CompletionLog, HabitStreakInfo, HabitStats, HabitActionPlan, ArenaId, PracticeCompletionInput } from '../types';
import { PracticeGroup, getDefaultSeedPractices, getAllPractices } from '../data/practices';
import {
  getWillpowerStats,
  calculateHabitPoints,
  updateWillpowerStats,
  adjustWillpowerPoints,
  recalculateUserStats,
  getStreakMultiplier,
} from './willpower';
import { toLocalDateString, getTodayString } from '../utils/date';
import { RESISTANCE_SCALE } from '../constants/resistance';
import { HabitSchedule, Schedulable, scheduledDays } from './habitSchedule';

export type { HabitSchedule } from './habitSchedule';
import { computeStreak, streakInfo } from './habitStreaks';
import { buildAdherence } from './habitAdherence';

/** The window "recent adherence" reports on — four weeks, so every weekday lands in it four times. */
export const ADHERENCE_WINDOW_DAYS = 28;

const habitsRef = (userId: string) =>
  collection(db, 'users', userId, 'habits');

const logsRef = (userId: string) =>
  collection(db, 'users', userId, 'completionLogs');

/**
 * Returns the Monday 00:00 and Sunday 23:59:59.999 of the current week in local time,
 * formatted as ISO date strings (YYYY-MM-DD).
 */
export const getCurrentWeekBounds = (): { mondayStr: string; sundayStr: string } => {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return { mondayStr: fmt(monday), sundayStr: fmt(sunday) };
};

export const getActiveHabits = async (userId: string): Promise<PracticeInstance[]> => {
  const q = query(habitsRef(userId), where('is_active', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    // Default for habits created before this field existed
    target_count_per_week: d.data().target_count_per_week ?? 3,
  } as PracticeInstance));
};

export const createHabit = async (
  userId: string,
  data: {
    name: string;
    category_id?: string;
    target_count_per_week: number;
    goal_ids?: string[];
    arena_id?: ArenaId;
    practice_id?: string;
    /**
     * Preset template id for a CUSTOM habit (data/habitTemplates.ts). Curated
     * habits leave this unset and resolve their template from the catalog via
     * practice_id instead.
     */
    template_id?: string;
    /**
     * Specific weekdays (0 = Sunday … 6 = Saturday) instead of "any N days".
     * Callers should pass a `target_count_per_week` equal to its length — see
     * setHabitSchedule, which is the safe way to write both.
     */
    scheduled_days?: number[];
    /**
     * The per-occasion amounts the user committed to, keyed by tracking-field
     * key — e.g. `{ water_oz: 80 }`. See HabitDefinition.commitmentKey.
     */
    metric_goals?: Record<string, number>;
    group?: PracticeGroup;
    action_plan?: HabitActionPlan;
    created_by_user?: boolean;
    supports_pairing?: boolean;
  }
): Promise<string> => {
  const { created_by_user, ...rest } = data;
  // Drop undefined values before writing. Firestore REJECTS them outright
  // ("Unsupported field value: undefined") and this app does not enable
  // ignoreUndefinedProperties, so a caller passing an optional field through as
  // `arena_id: habit.arena_id` creates the key with an undefined value and the
  // whole write throws. 17 of the 42 library habits have no arena_id, which made
  // adopting any of them fail. Stripping here protects every caller rather than
  // requiring each one to remember.
  const defined = Object.fromEntries(
    Object.entries(rest).filter(([, v]) => v !== undefined)
  );
  const docRef = await addDoc(habitsRef(userId), {
    ...defined,
    user_id: userId,
    is_active: true,
    created_by_user: created_by_user ?? true,
    // Adherence needs to know when the clock started, or a habit adopted
    // yesterday is judged against a month of days it was never asked about.
    created_at: new Date().toISOString(),
  });
  return docRef.id;
};

/**
 * Ensure every curated practice exists as an ACTIVE instance on the user's
 * home. Practices are the app's focus: the whole curated protocol lives on
 * Home for everyone, with no add/remove step. Idempotent and safe to run on
 * every load — creates missing instances and reactivates deactivated ones
 * (matching by practice_id, falling back to name for legacy instances), and
 * deactivates instances of practices retired from the catalog (active: false)
 * so they disappear from Home. Returns the number of instances changed and the
 * deactivated instances, so the caller can cancel their local reminders —
 * a retired practice is invisible in-app, leaving no other way to stop them.
 */
export const ensureCuratedPractices = async (
  userId: string
): Promise<{ changed: number; deactivated: PracticeInstance[] }> => {
  // All instances, including inactive ones, so a previously removed curated
  // practice is reactivated rather than duplicated.
  const snap = await getDocs(habitsRef(userId));
  const instances = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PracticeInstance));
  const norm = (s: string) => s.trim().toLowerCase();

  let changed = 0;
  for (const p of getDefaultSeedPractices()) {
    const match =
      instances.find((h) => h.practice_id === p.id) ||
      instances.find((h) => norm(h.name) === norm(p.name));
    if (!match) {
      await createHabit(userId, {
        name: p.name,
        // Seeded with the catalog's suggested target rather than 0 ("unset").
        // A tracker that shows nothing until it is configured is one people
        // abandon: with no goal there is no pace, so Today could say nothing
        // useful about a brand-new account. The suggestion is a starting point,
        // adjustable per habit — a much smaller imposition than an empty screen.
        target_count_per_week: p.suggested_target_per_week ?? 3,
        practice_id: p.id,
        category_id: p.category_id,
        group: p.group,
        created_by_user: false,
      });
      changed++;
    } else {
      // `archived_at` means the user put this away deliberately. Reactivating it
      // here would undo that choice on the next app load — which is what made
      // archiving a curated practice impossible before the archive existed.
      if (match.is_active === false && !match.archived_at) {
        await updateDoc(doc(db, 'users', userId, 'habits', match.id), { is_active: true });
        changed++;
      }
      // Backfill a goal onto instances seeded before the above changed. Only
      // when the target is 0/absent — a real target the user chose, including a
      // deliberately low one, is never overwritten.
      if (!match.target_count_per_week) {
        await updateDoc(doc(db, 'users', userId, 'habits', match.id), {
          target_count_per_week: p.suggested_target_per_week ?? 3,
        });
        changed++;
      }
    }
  }

  // Retired curated practices (e.g. fasting) come OFF the home. Only curated
  // instances are touched — a user-authored practice that happens to share a
  // name keeps working. Logs/history are kept; the instance is just hidden.
  const retired = getAllPractices().filter((p) => p.active === false);
  const deactivated: PracticeInstance[] = [];
  for (const p of retired) {
    const matches = instances.filter(
      (h) =>
        h.is_active !== false &&
        h.created_by_user === false &&
        (h.practice_id === p.id || norm(h.name) === norm(p.name))
    );
    for (const m of matches) {
      await updateDoc(doc(db, 'users', userId, 'habits', m.id), { is_active: false });
      deactivated.push(m);
      changed++;
    }
  }
  return { changed, deactivated };
};

export const updateHabit = async (
  userId: string,
  habitId: string,
  data: Partial<PracticeInstance>
) => {
  const ref = doc(db, 'users', userId, 'habits', habitId);
  // Same undefined-stripping as createHabit: Firestore rejects undefined values
  // outright, so a caller spreading an optional field through would throw. Use
  // deleteField() explicitly if you actually mean to remove a field.
  const defined = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== undefined)
  );
  await updateDoc(ref, defined);
};

/**
 * Write a habit's schedule.
 *
 * The ONE writer for both fields, because they have to agree: a day-scheduled
 * habit's `target_count_per_week` is its day count, so pace, the weekly pips and
 * the trend chart stay correct without knowing days exist. Switching back to a
 * count DELETES the days — leaving them behind would silently keep the habit
 * pinned to weekdays it no longer claims to have.
 */
export const setHabitSchedule = async (
  userId: string,
  habitId: string,
  schedule: HabitSchedule
): Promise<void> => {
  const ref = doc(db, 'users', userId, 'habits', habitId);
  if (schedule.kind === 'days') {
    const days = [...new Set(schedule.days)].sort((a, b) => a - b);
    await updateDoc(ref, { scheduled_days: days, target_count_per_week: days.length });
    return;
  }
  await updateDoc(ref, {
    scheduled_days: deleteField(),
    target_count_per_week: schedule.target,
  });
};

/** Read a habit's schedule back in the shape the picker edits. */
export const habitSchedule = (habit: Schedulable): HabitSchedule => {
  const days = scheduledDays(habit);
  return days ? { kind: 'days', days } : { kind: 'count', target: habit.target_count_per_week ?? 0 };
};

/**
 * Habits the user has put away. Ordered newest-archived first, with instances
 * archived before `archived_at` existed (or retired from the catalog) last.
 */
export const getArchivedHabits = async (userId: string): Promise<PracticeInstance[]> => {
  const q = query(habitsRef(userId), where('is_active', '==', false));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({
      id: d.id,
      ...d.data(),
      target_count_per_week: d.data().target_count_per_week ?? 3,
    } as PracticeInstance))
    .sort((a, b) => (b.archived_at ?? '').localeCompare(a.archived_at ?? ''));
};

/**
 * Put a habit away without losing it: off Home, out of pace and streaks, history
 * intact and restorable.
 *
 * `archived_at` records that the USER did this. ensureCuratedPractices
 * reactivates any inactive curated instance on every load, so without an
 * explicit marker of intent a curated practice would reappear on Home the next
 * time the app opened — which is exactly what used to happen.
 */
export const archiveHabit = async (userId: string, habitId: string): Promise<void> => {
  await updateDoc(doc(db, 'users', userId, 'habits', habitId), {
    is_active: false,
    archived_at: new Date().toISOString(),
  });
};

/** Bring an archived habit back to Home, with its history and schedule as they were. */
export const unarchiveHabit = async (userId: string, habitId: string): Promise<void> => {
  await updateDoc(doc(db, 'users', userId, 'habits', habitId), {
    is_active: true,
    archived_at: deleteField(),
  });
};

/** Optional detailed tracking + override reflection captured at completion. */
export interface CompletionExtras {
  /**
   * How hard it was to START, 1–10 — the app's headline metric. Additive to the
   * legacy binary `difficulty`, which is still derived and written alongside it.
   * See constants/resistance.ts for why this isn't just a wider `difficulty`.
   */
  resistance?: number;
  metrics?: Record<string, number | string>;
  hitHardMoment?: boolean;
  tactics?: string[];
  /** Mind-noticing reflection text, stored under the 'noticing' key. */
  reflection?: Record<string, string>;
  /** Selected mind tag ids (data/mindTags.ts). */
  mindTags?: string[];
}

/**
 * Log a habit completion with optional backdating, notes, and tracking/reflection.
 * @param userId - User ID
 * @param habitId - Habit ID
 * @param difficulty - 'easy' (1 pt) or 'challenging' (2 pts)
 * @param date - Optional YYYY-MM-DD date string for backdating (defaults to today)
 * @param notes - Optional free-text notes for this completion
 * @param extras - Optional per-practice metrics + override reflection
 */
export const logHabitCompletion = async (
  userId: string,
  habitId: string,
  difficulty: HabitDifficulty,
  date?: string,
  notes?: string,
  extras?: CompletionExtras,
) => {
  const points = difficulty === 'easy' ? 1 : 2;
  const now = new Date();
  const logDate = date || toLocalDateString(now);

  const logData: Record<string, any> = {
    user_id: userId,
    type: 'nudge',
    reference_id: habitId,
    points,
    difficulty: points,
    date: logDate,
    completed_at: now.toISOString(), // Actual time logged
  };

  // Only add notes if provided and non-empty
  if (notes && notes.trim()) {
    logData.notes = notes.trim();
  }
  // Only persist tracking/reflection fields that are actually set — keeps logs
  // lean and avoids writing `undefined` (which Firestore rejects).
  if (typeof extras?.resistance === 'number') {
    logData.resistance = extras.resistance;
    // Stamp the scale so this value stays interpretable if the scale changes
    // again. Without it, a 2 recorded today is indistinguishable from a 2
    // recorded on the old 1–10 scale, which meant something completely different.
    logData.resistance_scale = RESISTANCE_SCALE;
  }
  if (extras?.metrics && Object.keys(extras.metrics).length) {
    logData.metrics = extras.metrics;
  }
  if (typeof extras?.hitHardMoment === 'boolean') {
    logData.hitHardMoment = extras.hitHardMoment;
  }
  if (extras?.tactics && extras.tactics.length) {
    logData.tactics = extras.tactics;
  }
  if (extras?.reflection && Object.keys(extras.reflection).length) {
    logData.reflection = extras.reflection;
  }
  if (extras?.mindTags && extras.mindTags.length) {
    logData.mindTags = extras.mindTags;
  }

  const docRef = await addDoc(logsRef(userId), logData);
  await updateDoc(doc(db, 'users', userId), { totalHabitsCompleted: increment(1) });
  return docRef.id;
};

/**
 * Attach a post-rep reflection to an ALREADY-LOGGED completion.
 *
 * The reflection used to be the last step before the "Log it" button, which put
 * it between the user and their reward — so it got skipped. It now runs after
 * the celebration, which means the log document already exists and we patch it
 * rather than writing it. Answering at all counts as hitting the hard moment,
 * matching what the Capture flow used to set inline.
 *
 * `tactics` (OVERRIDE_TACTICS ids) is the "what helped you get started?" answer,
 * only ever collected on reps rated at or above TACTIC_GATE_RESISTANCE — so it
 * is the only thing this patches now. The mind-noticing reflection it used to
 * also carry was retired from the practice flow; `mindTags`/`reflection` remain
 * on CompletionLog for historical logs and are simply no longer written here.
 */
export const saveLogReflection = async (
  userId: string,
  logId: string,
  input: { tactics?: string[]; notes?: string }
): Promise<void> => {
  const patch: Record<string, any> = {};
  if (input.notes && input.notes.trim()) {
    patch.notes = input.notes.trim();
  }
  if (input.tactics && input.tactics.length) {
    patch.tactics = input.tactics;
  }
  if (!Object.keys(patch).length) return;
  patch.hitHardMoment = true;
  await updateDoc(doc(db, 'users', userId, 'completionLogs', logId), patch);
};

export interface CompletePracticeResult {
  logId: string;
  pointsEarned: number;
  /** Streak (in days) as of *before* this completion — used for tidbit selection. */
  streakBefore: number;
  /** First-ever completion of this practice — points were doubled. */
  firstTry: boolean;
  /** The day this rep was filed under (YYYY-MM-DD, local). */
  date: string;
  /** True when `date` is not today — the caller should soften the reward copy. */
  backdated: boolean;
  willpower: Awaited<ReturnType<typeof updateWillpowerStats>>;
}

/**
 * Single source of truth for completing a practice, whether it happened just
 * now or on an earlier day. Beyond logging the completion it awards willpower
 * XP (with streak multiplier), pays the first-try bonus, and bumps the sampler
 * counter. Every entry point (Home, Practices tab, day detail) should call this
 * so the side effects stay consistent; each screen renders its own celebration
 * UI from the returned result.
 *
 * `input.date` backdates the rep. A past date takes a different XP path on
 * purpose: updateWillpowerStats() stamps `lastActivityDate` as TODAY, which
 * would credit today's streak for a rep the user did on Saturday. Backdated
 * reps instead adjust the XP total directly and then recalculate streak and
 * lastActivityDate from the logs — so a backfilled rep that closes a gap
 * extends the streak correctly, and one that doesn't leaves it alone.
 * Everything else (multiplier, first-try double, tracking metrics) is
 * identical, because a rep you did yesterday is not worth less than one you
 * did an hour ago.
 */
export const completePractice = async (
  userId: string,
  practice: { id: string; name: string },
  input: PracticeCompletionInput,
): Promise<CompletePracticeResult> => {
  const { difficulty, resistance, notes, metrics, hitHardMoment, tactics, reflection, mindTags } =
    input;
  const today = getTodayString();
  const date = input.date || today;
  const backdated = date !== today;

  // First-ever completion of this practice → bump the user's sampler counter
  // (powers the {practices_tried} rule placeholder) and flag the first-try
  // bonus. Best-effort: never block the completion.
  let firstTry = false;
  try {
    const prior = await getHabitCompletionLogs(userId, practice.id);
    firstTry = prior.length === 0;
    if (firstTry) {
      await updateDoc(doc(db, 'users', userId), { practices_tried: increment(1) });
    }
  } catch (err) {
    console.warn('Failed to update practices_tried counter:', err);
  }

  const logId = await logHabitCompletion(userId, practice.id, difficulty, date, notes, {
    resistance,
    metrics,
    hitHardMoment,
    tactics,
    reflection,
    mindTags,
  });

  // Award XP using the streak-aware multiplier; first time trying a practice
  // pays double — sampling the catalog is itself the behavior we reward.
  const difficultyNum = difficulty === 'easy' ? 1 : 2;
  const stats = await getWillpowerStats(userId);
  const basePoints = calculateHabitPoints(difficultyNum, stats.currentStreak);
  const pointsEarned = firstTry ? basePoints * 2 : basePoints;

  let willpower: Awaited<ReturnType<typeof updateWillpowerStats>>;
  if (backdated) {
    const newTotal = await adjustWillpowerPoints(userId, pointsEarned);
    const { newStreak } = await recalculateUserStats(userId);
    // newTierReached stays false so the caller never fires a "Streak Milestone!"
    // alert for a backfill. Crossing a tier is a moment you earn in the present;
    // discovering it while tidying up last week's log is not that moment.
    willpower = {
      newTotal,
      newStreak,
      multiplier: getStreakMultiplier(newStreak),
      newTierReached: false,
      tierInfo: null,
    };
  } else {
    willpower = await updateWillpowerStats(userId, pointsEarned);
  }

  return {
    logId,
    pointsEarned,
    streakBefore: stats.currentStreak,
    firstTry,
    date,
    backdated,
    willpower,
  };
};

/**
 * Fetch nudge-type completion logs for a user.
 * Call this once and pass the result to getWeeklyCompletionCountsFromLogs / getHabitsStreaksFromLogs
 * to avoid redundant Firestore reads.
 *
 * Pass `sinceDate` (YYYY-MM-DD) to bound the read — the log collection grows
 * forever, so hot paths (home screen) should fetch a window, not the full
 * history. Requires the completionLogs (type, date) composite index.
 */
export const fetchAllNudgeLogs = async (
  userId: string,
  sinceDate?: string
): Promise<CompletionLog[]> => {
  const q = sinceDate
    ? query(logsRef(userId), where('type', '==', 'nudge'), where('date', '>=', sinceDate))
    : query(logsRef(userId), where('type', '==', 'nudge'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CompletionLog));
};

/**
 * Compute weekly completion counts from pre-fetched logs (no Firestore call).
 */
export const getWeeklyCompletionCountsFromLogs = (
  logs: CompletionLog[]
): Record<string, number> => {
  const { mondayStr, sundayStr } = getCurrentWeekBounds();
  const counts: Record<string, number> = {};
  for (const log of logs) {
    if (log.date >= mondayStr && log.date <= sundayStr) {
      counts[log.reference_id] = (counts[log.reference_id] || 0) + 1;
    }
  }
  return counts;
};

/**
 * Returns a map of habitId -> completion count for the current Monday–Sunday week.
 */
export const getWeeklyCompletionCounts = async (
  userId: string
): Promise<Record<string, number>> => {
  // Only this week's logs are counted, so only fetch from Monday onward.
  const { mondayStr } = getCurrentWeekBounds();
  const logs = await fetchAllNudgeLogs(userId, mondayStr);
  return getWeeklyCompletionCountsFromLogs(logs);
};

/** An active practice paired with how many reps it already has on a given day. */
export interface HabitDayState {
  habit: PracticeInstance;
  /** Reps already logged for that date — 0 means nothing logged yet. */
  loggedCount: number;
}

/**
 * Returns every active practice for a date, annotated with how many reps it
 * already carries that day.
 *
 * This used to filter already-logged practices out of the list entirely, which
 * made a second rep of the same practice on a past day impossible — and said so
 * only via an "all practices have been logged" empty state. Callers now show
 * the full list and mark what's already there, so the user decides.
 *
 * Bounded to the one date via the (type, date) composite index; the log
 * collection grows forever, so this must never read it whole.
 */
export const getHabitsForDate = async (
  userId: string,
  date: string
): Promise<HabitDayState[]> => {
  const [activeHabits, snap] = await Promise.all([
    getActiveHabits(userId),
    getDocs(query(logsRef(userId), where('type', '==', 'nudge'), where('date', '==', date))),
  ]);

  const counts: Record<string, number> = {};
  snap.docs.forEach((d) => {
    const refId = d.data().reference_id as string;
    counts[refId] = (counts[refId] || 0) + 1;
  });

  return activeHabits.map((habit) => ({ habit, loggedCount: counts[habit.id] || 0 }));
};

/**
 * Get a single habit by ID
 */
export const getHabitById = async (
  userId: string,
  habitId: string
): Promise<PracticeInstance | null> => {
  const ref = doc(db, 'users', userId, 'habits', habitId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return {
    id: snap.id,
    ...snap.data(),
    target_count_per_week: snap.data().target_count_per_week ?? 3,
  } as PracticeInstance;
};

/**
 * Get all completion logs for a specific habit
 */
export const getHabitCompletionLogs = async (
  userId: string,
  habitId: string
): Promise<CompletionLog[]> => {
  const q = query(
    logsRef(userId),
    where('type', '==', 'nudge'),
    where('reference_id', '==', habitId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  } as CompletionLog));
};

/**
 * Current and longest streak for one habit.
 *
 * Schedule-aware: see services/habitStreaks.ts for what breaks a streak and
 * why calendar days were the wrong unit. Needs the habit itself, not just its
 * id — the schedule is what decides which days were ever owed.
 */
export const getHabitStreak = async (
  userId: string,
  habitId: string,
  habit?: Schedulable
): Promise<HabitStreakInfo> => {
  const [logs, resolved] = await Promise.all([
    getHabitCompletionLogs(userId, habitId),
    habit ? Promise.resolve(habit) : getHabitById(userId, habitId),
  ]);
  return streakInfo(habitId, resolved ?? {}, logs.map((l) => l.date), getTodayString());
};

/**
 * Compute streaks for several habits from pre-fetched logs (no Firestore call).
 *
 * Takes the habits rather than their ids: a schedule-aware streak cannot be
 * computed from a bare id, and passing ids used to mean every habit was judged
 * against the same every-single-day rule regardless of what it asked for.
 */
export const getHabitsStreaksFromLogs = (
  logs: CompletionLog[],
  habits: (Schedulable & { id: string })[]
): Record<string, HabitStreakInfo> => {
  const datesByHabit: Record<string, string[]> = {};
  for (const log of logs) {
    (datesByHabit[log.reference_id] ??= []).push(log.date);
  }

  const today = getTodayString();
  const result: Record<string, HabitStreakInfo> = {};
  for (const habit of habits) {
    result[habit.id] = streakInfo(habit.id, habit, datesByHabit[habit.id] ?? [], today);
  }
  return result;
};

/**
 * Get streaks for multiple habits at once
 */
export const getHabitsStreaks = async (
  userId: string,
  habits: (Schedulable & { id: string })[]
): Promise<Record<string, HabitStreakInfo>> => {
  const logs = await fetchAllNudgeLogs(userId);
  return getHabitsStreaksFromLogs(logs, habits);
};

/**
 * Get comprehensive stats for a habit (for detail screen)
 */
export const getHabitStats = async (
  userId: string,
  habitId: string,
  /** The habit itself, when the caller already has it — saves a read. */
  known?: PracticeInstance
): Promise<HabitStats> => {
  const [logs, resolved] = await Promise.all([
    getHabitCompletionLogs(userId, habitId),
    known ? Promise.resolve(known) : getHabitById(userId, habitId),
  ]);
  const habit: PracticeInstance | Schedulable = resolved ?? {};
  const today = getTodayString();
  const dates = logs.map((l) => l.date).sort();
  const streak = computeStreak(habit, dates, today);

  // When the clock started. A habit created before creation dates were recorded
  // falls back to its first rep — judging it from the window start would count
  // days before it existed as misses.
  const startedOn = (resolved as PracticeInstance | null)?.created_at?.slice(0, 10) ?? dates[0];

  // "Of the days this habit asked for, how many did I keep?" — computed for a
  // recent window AND for all time, because the two answer different questions:
  // whether it's working now, and whether it ever did.
  const recentAdherence = buildAdherence(habit, dates, today, {
    startedOn,
    windowDays: ADHERENCE_WINDOW_DAYS,
  });
  const lifetimeAdherence = buildAdherence(habit, dates, today, { startedOn });

  if (logs.length === 0) {
    return {
      habitId,
      currentStreak: 0,
      longestStreak: 0,
      totalCompletions: 0,
      totalPoints: 0,
      firstCompletionDate: null,
      weeklyTrend: [0, 0, 0, 0, 0, 0, 0, 0],
      completionsByDate: {},
      recentAdherence,
      lifetimeAdherence,
    };
  }

  // Total completions and points
  const totalCompletions = logs.length;
  const totalPoints = logs.reduce((sum, l) => sum + l.points, 0);

  // First completion date
  const sortedDates = logs.map((l) => l.date).sort();
  const firstCompletionDate = sortedDates[0];

  // Completions by date for calendar heat map
  const completionsByDate: Record<string, number> = {};
  logs.forEach((l) => {
    completionsByDate[l.date] = (completionsByDate[l.date] || 0) + 1;
  });

  // Weekly trend: last 8 weeks (including current week)
  const toDateStr = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  // Get start of current week (Monday)
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() + diffToMonday);
  currentWeekStart.setHours(0, 0, 0, 0);

  const weeklyTrend: number[] = [];

  for (let weekOffset = 7; weekOffset >= 0; weekOffset--) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() - weekOffset * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startStr = toDateStr(weekStart);
    const endStr = toDateStr(weekEnd);

    const weekCount = logs.filter((l) => l.date >= startStr && l.date <= endStr).length;
    weeklyTrend.push(weekCount);
  }

  return {
    habitId,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    totalCompletions,
    totalPoints,
    firstCompletionDate,
    weeklyTrend,
    completionsByDate,
    recentAdherence,
    lifetimeAdherence,
  };
};
