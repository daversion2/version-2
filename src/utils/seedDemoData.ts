/**
 * Demo data for live demos — admin-only, fully reversible.
 *
 * Usage (from the Admin dashboard):
 *   import { enableDemoData, disableDemoData } from '../utils/seedDemoData';
 *   await enableDemoData(userId);   // seeds tagged demo docs into YOUR account
 *   await disableDemoData(userId);  // deletes them and restores counters
 *
 * How it stays reversible:
 * - Every seeded doc (completionLogs, challenges, habits) carries `is_demo: true`,
 *   so disable is a simple tagged-doc sweep. Real history is never modified.
 * - Demo logs attach to the account's LIVE habits (active, not archived) —
 *   exactly what Today and Progress show. If there are too few, tagged demo
 *   habits are added from the library first, and removed again on disable.
 * - User-doc counters are bumped by exact deltas recorded in `demo_data` on
 *   the user doc, then reversed on disable; streak/lastActivityDate are
 *   recomputed from the remaining real logs via recalculateUserStats.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  updateDoc,
  deleteField,
  increment,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { recalculateUserStats } from '../services/willpower';
import {
  scheduledDays,
  defaultDaysForTarget,
  defaultScheduleForTarget,
  scheduleFields,
  weeklyTarget,
  weekdayOf,
} from '../services/habitSchedule';
import { getHabitDefinition, TrackingField } from '../data/practices';
import { resolveHabitTrackingFields } from '../data/habitTemplates';
import { RESISTANCE_SCALE } from '../constants/resistance';
import { PracticeInstance } from '../types';
import { toLocalDateString, getTodayString } from './date';
import { isHabitLinkedToMiniApp } from '../services/miniApps';
import { getWorkoutPrefs } from '../services/labWorkouts';
import { getMeditatePrefs } from '../services/labMeditate';
import { modeForHabit } from '../services/meditateMath';
import {
  DemoDay,
  miniAppDemoDeleteOps,
  miniAppDemoOps,
  restoreWorkoutsAfterDemoOps,
} from './seedMiniAppDemo';

const logsRef = (userId: string) => collection(db, 'users', userId, 'completionLogs');
const challengesRef = (userId: string) => collection(db, 'users', userId, 'challenges');
const habitsRef = (userId: string) => collection(db, 'users', userId, 'habits');

/** Deltas recorded on the user doc while demo mode is on (User.demo_data). */
export interface DemoDataState {
  enabled: boolean;
  enabled_at: string;
  xp_added: number;
  habit_logs_added: number;
  challenges_completed_added: number;
  habits_added?: number;
  /** Lab mini-apps — informational; disable sweeps by is_demo regardless. */
  workout_sessions_added?: number;
  meditate_sessions_added?: number;
}

// Firestore batches cap at 500 ops; stay well under.
const BATCH_LIMIT = 400;

const dateNDaysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalDateString(d);
};

/** ISO timestamp on a given past day (fixed evening hour — exact time is cosmetic). */
const timestampNDaysAgo = (n: number, hour: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 17, 0, 0);
  return d.toISOString();
};

/** Small deterministic hash so the data looks organic without Math.random. */
const jitter = (seed: number, mod: number): number => {
  const h = (seed * 2654435761) % 4294967296;
  return Math.abs(h) % mod;
};

// ---------------------------------------------------------------------------
// Demo habit logs, shaped for the Progress screen:
// - "Friction you can handle": habits start at staggered points (STARTS) and
//   are rated on the 1–3 scale, Hard early and easing off, so friction faced
//   climbs as habits are added while friction felt falls behind it.
// - Habit by Habit / Totals by Type: metrics come from each habit's own
//   tracking fields, so every habit has amounts to show.
// ---------------------------------------------------------------------------

/** 8 weeks — the friction card's full window. */
const DAYS = 56;
/** Top the account up to this many live habits with tagged demo habits. */
export const DEMO_TARGET_HABITS = 5;
/**
 * Plain library habits with tracked amounts in different families. Never
 * curated practices: ensureCuratedPractices manages those and a second
 * instance would confuse it.
 */
export const DEMO_HABIT_IDS = ['workout', 'trad-10k-steps', 'protein-target', 'deep-focus-session', 'trad-read'];
/** Days ago each habit starts, by position — two from the start, then one added every couple of weeks. */
const STARTS = [DAYS - 1, DAYS - 1, 41, 27, 13];
/** Starting rating by position: mostly Hard, a couple of Meds. */
const BASELINES = [3, 2, 3, 3, 2];
/** Tactics on Med/Hard logs, so the post-log "Your pattern" has a favourite to find. */
const DEMO_TACTICS = [['first_step'], ['first_step'], ['made_smaller'], ['first_step', 'countdown']];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * The rating for one demo check-in. The first three hold at the habit's
 * baseline (that's what its starting difficulty is computed from); after
 * that it eases with time since the habit began, plus a little noise.
 */
export const demoRating = (baseline: number, k: number, daysIn: number, seed: number): number => {
  if (k < 3) return baseline;
  const drop = (daysIn / DAYS) * 2 + (jitter(seed, 10) / 10) * 0.8 - 0.4;
  return clamp(Math.round(baseline - drop), 1, 3);
};

/** A plausible value for one tracking field. Durations grow a little over time. */
export const demoMetric = (
  field: TrackingField,
  k: number,
  daysIn: number,
  seed: number
): number | string | undefined => {
  if (field.type === 'choice') {
    const options = field.options ?? [];
    return options.length ? options[k % options.length].value : undefined;
  }
  const min = field.min ?? 1;
  const max = field.max ?? Number.MAX_SAFE_INTEGER;
  const step = field.step ?? 1;
  const base = field.default ?? (field.type === 'scale' ? Math.round((min + (field.max ?? 5)) / 2) : min);
  const progress = daysIn / DAYS;
  const raw =
    field.type === 'duration'
      ? base * (0.8 + 0.5 * progress) + jitter(seed, 3) * step
      : base * (0.9 + 0.05 * jitter(seed, 5));
  return clamp(Math.round(raw / step) * step, min, max);
};

// ---------------------------------------------------------------------------
// Demo challenges — a believable mix of history + one live card for the demo.
// ---------------------------------------------------------------------------

interface DemoChallengeSpec {
  name: string;
  category: string;
  daysAgo: number;
  status: 'completed' | 'active';
  difficulty_expected: number;
  difficulty_actual?: number;
  reflection_note?: string;
  mind_tags?: string[];
  barrier_type?: string;
}

const DEMO_DAILY_CHALLENGES: DemoChallengeSpec[] = [
  {
    name: 'Finish your shower cold',
    category: 'Physical',
    daysAgo: 9,
    status: 'completed',
    difficulty_expected: 3,
    difficulty_actual: 4,
    reflection_note: 'Wanted to bail the second the water turned. Stayed 60 seconds.',
    mind_tags: ['bargaining'],
    barrier_type: 'comfort-zone',
  },
  {
    name: 'No phone for the first hour awake',
    category: 'Mind',
    daysAgo: 6,
    status: 'completed',
    difficulty_expected: 3,
    difficulty_actual: 3,
    reflection_note: 'Reached for it twice on autopilot. Caught it both times.',
    mind_tags: ['escaping'],
    barrier_type: 'discipline',
  },
  {
    name: 'Sit with boredom for 15 minutes',
    category: 'Mind',
    daysAgo: 13,
    status: 'completed',
    difficulty_expected: 2,
    difficulty_actual: 2,
    reflection_note: 'Mind kept generating errands to escape to.',
    mind_tags: ['rationalizing'],
    barrier_type: 'comfort-zone',
  },
  {
    name: 'Feet on the floor at first alarm',
    category: 'Physical',
    daysAgo: 3,
    status: 'completed',
    difficulty_expected: 3,
    difficulty_actual: 3,
    reflection_note: 'The 5-more-minutes voice was loud. Moved anyway.',
    mind_tags: ['bargaining'],
    barrier_type: 'discipline',
  },
  {
    name: 'Eat one meal with no screen',
    category: 'Mind',
    daysAgo: 0,
    status: 'active',
    difficulty_expected: 2,
    barrier_type: 'discipline',
  },
];

const DEMO_EXTENDED_CHALLENGE = {
  name: '7 days without added sugar',
  category: 'Physical',
  startDaysAgo: 25,
  duration_days: 7,
  difficulty_expected: 4,
  barrier_type: 'delayed-gratification',
};

// ---------------------------------------------------------------------------

/** Commit an array of batch-op closures in chunks under the 500-op limit. */
const commitInChunks = async (ops: ((batch: ReturnType<typeof writeBatch>) => void)[]) => {
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    ops.slice(i, i + BATCH_LIMIT).forEach((apply) => apply(batch));
    await batch.commit();
  }
};

export const isDemoDataEnabled = async (userId: string): Promise<boolean> => {
  const snap = await getDoc(doc(db, 'users', userId));
  return snap.exists() && snap.data().demo_data?.enabled === true;
};

/**
 * Seed tagged demo data into the account. Throws if demo mode is already on.
 * Returns the counts written (also recorded on the user doc for reversal).
 */
export const enableDemoData = async (
  userId: string
): Promise<{ habitLogs: number; challenges: number; xp: number; workoutSessions: number; meditateSessions: number }> => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists() && userSnap.data().demo_data?.enabled === true) {
    throw new Error('Demo data is already enabled for this account.');
  }

  const ops: ((batch: ReturnType<typeof writeBatch>) => void)[] = [];
  let habitLogs = 0;
  let xp = 0;
  const loggedDates = new Set<string>();

  // The habits Progress actually shows: active, not archived. Leftover demo
  // habits never count (enable refuses to run twice, but be safe).
  const habitsSnap = await getDocs(habitsRef(userId));
  const live = habitsSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as PracticeInstance & { is_demo?: boolean })
    .filter((h) => h.is_active && !h.archived_at && !h.is_demo);

  // Too few habits for a convincing screen → add tagged demo habits.
  const owned = new Set(live.map((h) => h.practice_id).filter(Boolean));
  const habits: PracticeInstance[] = [...live];
  let habitsAdded = 0;
  for (const id of DEMO_HABIT_IDS) {
    if (habits.length >= DEMO_TARGET_HABITS) break;
    const def = getHabitDefinition(id);
    if (!def || owned.has(def.id)) continue;
    const ref = doc(habitsRef(userId));
    const start = STARTS[Math.min(habits.length, STARTS.length - 1)];
    const data = {
      user_id: userId,
      name: def.name,
      practice_id: def.id,
      category_id: def.category_id,
      is_active: true,
      created_by_user: false,
      ...scheduleFields(defaultScheduleForTarget(def.suggested_target_per_week)),
      action_plan: def.action_plan ?? {},
      created_at: timestampNDaysAgo(start, 8),
      is_demo: true,
    };
    ops.push((batch) => batch.set(ref, data));
    habits.push({ id: ref.id, ...data } as PracticeInstance);
    habitsAdded++;
  }

  // Mini-app sessions go on the days their linked habits are checked off.
  const [workoutPrefs, meditatePrefs] = await Promise.all([getWorkoutPrefs(userId), getMeditatePrefs(userId)]);
  const workoutDays: DemoDay[] = [];
  const meditateDays: DemoDay[] = [];

  habits.forEach((habit, idx) => {
    const forWorkouts = isHabitLinkedToMiniApp('workouts', habit, workoutPrefs.linked_habit_ids);
    const forMeditate = isHabitLinkedToMiniApp('meditate', habit, meditatePrefs.linked_habit_ids);
    const start = STARTS[Math.min(idx, STARTS.length - 1)];
    const baseline = BASELINES[idx % BASELINES.length];
    const days = scheduledDays(habit) ?? defaultDaysForTarget(weeklyTarget(habit) || 3);
    const fields = resolveHabitTrackingFields(habit);
    let k = 0;
    for (let offset = start; offset >= 0; offset--) {
      const date = dateNDaysAgo(offset);
      if (!days.includes(weekdayOf(date))) continue;
      // The occasional miss, so the calendar looks lived-in — never in the last two days.
      if (offset > 1 && jitter(offset * 7 + idx, 9) === 0) continue;
      const seed = offset * 13 + idx;
      const daysIn = start - offset;
      const rating = demoRating(baseline, k, daysIn, seed);
      const metrics: Record<string, number | string> = {};
      for (const field of fields) {
        const value = demoMetric(field, k, daysIn, seed);
        if (value !== undefined) metrics[field.key] = value;
      }
      const logDoc: Record<string, unknown> = {
        user_id: userId,
        type: 'nudge',
        reference_id: habit.id,
        points: rating,
        difficulty: rating === 1 ? 1 : 2,
        resistance: rating,
        resistance_scale: RESISTANCE_SCALE,
        date,
        completed_at: timestampNDaysAgo(offset, 7 + jitter(seed, 12)),
        hitHardMoment: rating === RESISTANCE_SCALE,
        is_demo: true,
      };
      if (Object.keys(metrics).length) logDoc.metrics = metrics;
      const durationKey = fields.find((f) => f.type === 'duration')?.key;
      const durationMin = durationKey ? (metrics[durationKey] as number | undefined) : undefined;
      if (forWorkouts) workoutDays.push({ offset, habitId: habit.id, durationMin });
      if (forMeditate) {
        meditateDays.push({ offset, habitId: habit.id, durationMin, mode: modeForHabit(habit.practice_id) ?? 'sit' });
      }
      if (rating >= 2) logDoc.tactics = DEMO_TACTICS[seed % DEMO_TACTICS.length];
      ops.push((batch) => batch.set(doc(logsRef(userId)), logDoc));
      habitLogs++;
      xp += rating;
      loggedDates.add(date);
      k++;
    }
  });

  // Daily challenges (+ a matching type:'challenge' log for each completed one,
  // mirroring completeChallenge's side effects)
  let challengesCompleted = 0;
  for (const c of DEMO_DAILY_CHALLENGES) {
    const challengeRef = doc(challengesRef(userId));
    const base: Record<string, unknown> = {
      user_id: userId,
      name: c.name,
      category_id: c.category,
      date: dateNDaysAgo(c.daysAgo),
      difficulty_expected: c.difficulty_expected,
      status: c.status,
      challenge_type: 'daily',
      barrier_type: c.barrier_type,
      created_at: timestampNDaysAgo(c.daysAgo, 8),
      is_demo: true,
    };
    if (c.status === 'completed') {
      base.difficulty_actual = c.difficulty_actual;
      base.points_awarded = c.difficulty_actual;
      base.reflection_note = c.reflection_note || '';
      if (c.mind_tags?.length) base.mind_tags = c.mind_tags;
      base.completed_at = timestampNDaysAgo(c.daysAgo, 19);

      ops.push((batch) =>
        batch.set(doc(logsRef(userId)), {
          user_id: userId,
          type: 'challenge',
          reference_id: challengeRef.id,
          points: c.difficulty_actual,
          difficulty: c.difficulty_actual,
          date: dateNDaysAgo(c.daysAgo),
          is_demo: true,
        })
      );
      xp += c.difficulty_actual || 0;
      challengesCompleted++;
      loggedDates.add(dateNDaysAgo(c.daysAgo));
    }
    ops.push((batch) => batch.set(challengeRef, base));
  }

  // One completed extended challenge with a full milestone trail
  {
    const e = DEMO_EXTENDED_CHALLENGE;
    const endDaysAgo = e.startDaysAgo - (e.duration_days - 1);
    const milestones = Array.from({ length: e.duration_days }, (_, i) => {
      const dayPoints = 2 + jitter(i, 3); // 2–4
      return {
        id: `day-${i + 1}`,
        day_number: i + 1,
        completed: true,
        succeeded: true,
        completed_at: timestampNDaysAgo(e.startDaysAgo - i, 20),
        points_awarded: dayPoints,
      };
    });
    const totalPoints = milestones.reduce((s, m) => s + (m.points_awarded || 0), 0);
    const challengeRef = doc(challengesRef(userId));
    ops.push((batch) =>
      batch.set(challengeRef, {
        user_id: userId,
        name: e.name,
        category_id: e.category,
        date: dateNDaysAgo(e.startDaysAgo),
        difficulty_expected: e.difficulty_expected,
        status: 'completed',
        challenge_type: 'extended',
        duration_days: e.duration_days,
        start_date: dateNDaysAgo(e.startDaysAgo),
        end_date: dateNDaysAgo(endDaysAgo),
        milestones,
        barrier_type: e.barrier_type,
        points_awarded: totalPoints,
        reflection_note: 'Day 3 was the wall. After that the cravings lost their teeth.',
        created_at: timestampNDaysAgo(e.startDaysAgo, 8),
        completed_at: timestampNDaysAgo(endDaysAgo, 20),
        is_demo: true,
      })
    );
    ops.push((batch) =>
      batch.set(doc(logsRef(userId)), {
        user_id: userId,
        type: 'challenge',
        reference_id: challengeRef.id,
        points: totalPoints,
        difficulty: e.difficulty_expected,
        date: dateNDaysAgo(endDaysAgo),
        is_demo: true,
      })
    );
    xp += totalPoints;
    challengesCompleted++;
  }

  const miniApps = await miniAppDemoOps(userId, { workoutDays, meditateDays, windowDays: DAYS });
  ops.push(...miniApps.ops);

  await commitInChunks(ops);

  // Streak from the seeded logs: consecutive days ending today. Never lower
  // the account's real streak.
  let demoStreak = 0;
  while (loggedDates.has(dateNDaysAgo(demoStreak))) demoStreak++;
  const existing = userSnap.exists() ? userSnap.data() : {};
  const demoState: DemoDataState = {
    enabled: true,
    enabled_at: new Date().toISOString(),
    xp_added: xp,
    habit_logs_added: habitLogs,
    challenges_completed_added: challengesCompleted,
    habits_added: habitsAdded,
    workout_sessions_added: miniApps.workoutSessions,
    meditate_sessions_added: miniApps.meditateSessions,
  };
  await updateDoc(userRef, {
    demo_data: demoState,
    totalWillpowerPoints: increment(xp),
    totalHabitsCompleted: increment(habitLogs),
    totalChallengesCompleted: increment(challengesCompleted),
    currentStreak: Math.max(existing.currentStreak || 0, demoStreak),
    lastActivityDate: getTodayString(),
  });

  console.log(`Demo data enabled: ${habitLogs} logs, ${challengesCompleted + 1} challenges, +${xp} XP`);
  return {
    habitLogs,
    challenges: challengesCompleted + 1,
    xp,
    workoutSessions: miniApps.workoutSessions,
    meditateSessions: miniApps.meditateSessions,
  };
};

/**
 * Delete every is_demo-tagged doc, reverse the counter deltas, and recompute
 * streak/lastActivityDate from the remaining real logs.
 */
export const disableDemoData = async (
  userId: string
): Promise<{ deletedLogs: number; deletedChallenges: number; deletedSessions: number }> => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const demoState: DemoDataState | undefined = userSnap.exists()
    ? userSnap.data().demo_data
    : undefined;

  const [logsSnap, challengesSnap, habitsSnap] = await Promise.all([
    getDocs(query(logsRef(userId), where('is_demo', '==', true))),
    getDocs(query(challengesRef(userId), where('is_demo', '==', true))),
    getDocs(query(habitsRef(userId), where('is_demo', '==', true))),
  ]);

  const sessionDeletes = await miniAppDemoDeleteOps(userId);
  const ops: ((batch: ReturnType<typeof writeBatch>) => void)[] = [
    ...sessionDeletes,
    ...logsSnap.docs.map((d) => (batch: ReturnType<typeof writeBatch>) => batch.delete(d.ref)),
    ...challengesSnap.docs.map((d) => (batch: ReturnType<typeof writeBatch>) => batch.delete(d.ref)),
    ...habitsSnap.docs.map((d) => (batch: ReturnType<typeof writeBatch>) => batch.delete(d.ref)),
  ];
  await commitInChunks(ops);
  // With the demo sessions gone, Workouts' records and last-done dates go
  // back to what the real sessions say.
  await commitInChunks(await restoreWorkoutsAfterDemoOps(userId));

  // Reverse the exact deltas we added (clamped at 0 so a partial/legacy state
  // can never drive a counter negative).
  const data = userSnap.exists() ? userSnap.data() : {};
  await updateDoc(userRef, {
    demo_data: deleteField(),
    totalWillpowerPoints: Math.max(0, (data.totalWillpowerPoints || 0) - (demoState?.xp_added || 0)),
    totalHabitsCompleted: Math.max(0, (data.totalHabitsCompleted || 0) - (demoState?.habit_logs_added || 0)),
    totalChallengesCompleted: Math.max(
      0,
      (data.totalChallengesCompleted || 0) - (demoState?.challenges_completed_added || 0)
    ),
  });

  // Streak + lastActivityDate honestly recomputed from what's left.
  await recalculateUserStats(userId);

  console.log(
    `Demo data disabled: removed ${logsSnap.size} logs, ${challengesSnap.size} challenges`
  );
  return { deletedLogs: logsSnap.size, deletedChallenges: challengesSnap.size, deletedSessions: sessionDeletes.length };
};
