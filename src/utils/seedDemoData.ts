/**
 * Demo data for live demos — admin-only, fully reversible.
 *
 * Usage (from the Admin dashboard):
 *   import { enableDemoData, disableDemoData } from '../utils/seedDemoData';
 *   await enableDemoData(userId);   // seeds tagged demo docs into YOUR account
 *   await disableDemoData(userId);  // deletes them and restores counters
 *
 * How it stays reversible:
 * - Every seeded doc (completionLogs + challenges) carries `is_demo: true`,
 *   so disable is a simple tagged-doc sweep. Real history is never modified.
 * - Demo logs attach to the account's EXISTING curated practice instances
 *   (ensureCuratedPractices guarantees they exist), so every screen — home
 *   cards, weekly counts, streaks, the Performance section — lights up with
 *   no changes to any read path.
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
import { toLocalDateString, getTodayString } from './date';

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
// Demo practice reps — one spec per curated practice, spread over ~8 weeks so
// every Performance gate clears: metric trends (≥10 sessions), weekly
// challenging chart (≥6 rated), choice breakdowns (≥3 per option), mind-tag
// insight (top tag ≥5), and the streak (daily coverage of recent days).
// ---------------------------------------------------------------------------

interface DemoLogSpec {
  offset: number; // days ago
  difficulty: 1 | 2; // 1 = easy, 2 = challenging
  metrics: Record<string, number | string>;
  mindTags?: string[];
  hitHardMoment?: boolean;
  notes?: string;
}

const DAYS = 56; // 8 Monday-based weeks

/** Progress from `from` (oldest) to `to` (newest) across the window, stepped. */
const trend = (offset: number, from: number, to: number, step: number): number => {
  const progress = (DAYS - offset) / DAYS;
  const raw = from + (to - from) * progress;
  return Math.round(raw / step) * step;
};

const buildMeditationSpecs = (): DemoLogSpec[] => {
  const specs: DemoLogSpec[] = [];
  const techniques = ['breath', 'breath', 'breath', 'open', 'body_scan'];
  const tagSets = [['bargaining'], ['bargaining', 'watching'], ['letting-go'], ['bargaining'], ['watching']];
  for (let offset = 0; offset < DAYS; offset++) {
    const dow = new Date(new Date().setDate(new Date().getDate() - offset)).getDay();
    if (![1, 2, 4, 6].includes(dow)) continue;
    const i = specs.length;
    specs.push({
      offset,
      // Early sessions mostly challenging, recent mostly easy → adaptation arc
      difficulty: offset > 21 ? (jitter(offset, 4) === 0 ? 1 : 2) : jitter(offset, 3) === 0 ? 2 : 1,
      metrics: {
        duration_min: trend(offset, 8, 16, 1) + jitter(offset, 2),
        technique: techniques[i % techniques.length],
      },
      mindTags: tagSets[i % tagSets.length],
      hitHardMoment: jitter(offset + 1, 3) !== 0,
    });
  }
  return specs;
};

const buildBreathworkSpecs = (): DemoLogSpec[] => {
  const specs: DemoLogSpec[] = [];
  const patterns = ['sigh', 'box', 'coherent', 'sigh', 'extended'];
  for (let offset = 0; offset < DAYS; offset++) {
    const dow = new Date(new Date().setDate(new Date().getDate() - offset)).getDay();
    // Daily for the last 12 days (guarantees a 12-day streak), ~4×/wk before
    if (offset >= 12 && ![0, 1, 3, 5].includes(dow)) continue;
    const i = specs.length;
    specs.push({
      offset,
      difficulty: jitter(offset + 2, 5) === 0 ? 2 : 1,
      metrics: {
        duration_min: 4 + jitter(offset, 3),
        technique: patterns[i % patterns.length],
      },
      hitHardMoment: false,
    });
  }
  return specs;
};

const buildCardioSpecs = (): DemoLogSpec[] => {
  const specs: DemoLogSpec[] = [];
  const tagSets = [['escaping'], ['escaping', 'pushing'], ['pushing'], ['escaping']];
  for (let offset = 0; offset < DAYS; offset++) {
    const dow = new Date(new Date().setDate(new Date().getDate() - offset)).getDay();
    if (![2, 4, 6].includes(dow)) continue;
    const i = specs.length;
    const pace = offset > 35 ? 'walk' : offset > 14 ? 'mixed' : 'run';
    specs.push({
      offset,
      difficulty: jitter(offset + 3, 4) === 0 ? 1 : 2,
      metrics: {
        duration_min: trend(offset, 20, 40, 5),
        pace,
      },
      mindTags: tagSets[i % tagSets.length],
      hitHardMoment: jitter(offset + 4, 4) !== 0,
    });
  }
  return specs;
};

const buildColdSpecs = (): DemoLogSpec[] => {
  const specs: DemoLogSpec[] = [];
  const tagSets = [['resisting'], ['catastrophizing'], ['resisting', 'catastrophizing']];
  for (let offset = 0; offset < DAYS; offset++) {
    const dow = new Date(new Date().setDate(new Date().getDate() - offset)).getDay();
    if (![1, 3, 5].includes(dow)) continue;
    const i = specs.length;
    specs.push({
      offset,
      difficulty: jitter(offset + 5, 5) === 0 ? 1 : 2,
      metrics: {
        duration_min: trend(offset, 1, 3, 1),
        water_temp_f: trend(offset, 58, 50, 1) - jitter(offset, 2),
      },
      mindTags: tagSets[i % tagSets.length],
      hitHardMoment: true,
      notes: i % 6 === 0 ? 'First 30 seconds were brutal, then it settled.' : undefined,
    });
  }
  return specs;
};

/** practice_id → rep specs. Only practices the account has instances for get seeded. */
const DEMO_PRACTICE_SPECS: Record<string, () => DemoLogSpec[]> = {
  meditation: buildMeditationSpecs,
  breathwork: buildBreathworkSpecs,
  unplugged_cardio: buildCardioSpecs,
  cold_exposure: buildColdSpecs,
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
): Promise<{ habitLogs: number; challenges: number; xp: number }> => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists() && userSnap.data().demo_data?.enabled === true) {
    throw new Error('Demo data is already enabled for this account.');
  }

  // Resolve the account's existing practice instances (curated ones are
  // guaranteed by ensureCuratedPractices on home load). Logs must reference
  // the instance doc id — that's what every screen queries by.
  const habitsSnap = await getDocs(habitsRef(userId));
  const instanceIdByPracticeId = new Map<string, string>();
  habitsSnap.docs.forEach((d) => {
    const pid = d.data().practice_id;
    if (pid) instanceIdByPracticeId.set(pid, d.id);
  });

  const ops: ((batch: ReturnType<typeof writeBatch>) => void)[] = [];
  let habitLogs = 0;
  let xp = 0;
  const loggedDates = new Set<string>();

  for (const [practiceId, buildSpecs] of Object.entries(DEMO_PRACTICE_SPECS)) {
    const instanceId = instanceIdByPracticeId.get(practiceId);
    if (!instanceId) continue; // practice not on this account — skip quietly
    for (const spec of buildSpecs()) {
      const logDoc: Record<string, unknown> = {
        user_id: userId,
        type: 'nudge',
        reference_id: instanceId,
        points: spec.difficulty,
        difficulty: spec.difficulty,
        date: dateNDaysAgo(spec.offset),
        completed_at: timestampNDaysAgo(spec.offset, 7 + jitter(spec.offset, 12)),
        metrics: spec.metrics,
        is_demo: true,
      };
      if (spec.mindTags?.length) logDoc.mindTags = spec.mindTags;
      if (typeof spec.hitHardMoment === 'boolean') logDoc.hitHardMoment = spec.hitHardMoment;
      if (spec.notes) logDoc.notes = spec.notes;

      ops.push((batch) => batch.set(doc(logsRef(userId)), logDoc));
      habitLogs++;
      xp += spec.difficulty;
      loggedDates.add(logDoc.date as string);
    }
  }

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
  return { habitLogs, challenges: challengesCompleted + 1, xp };
};

/**
 * Delete every is_demo-tagged doc, reverse the counter deltas, and recompute
 * streak/lastActivityDate from the remaining real logs.
 */
export const disableDemoData = async (
  userId: string
): Promise<{ deletedLogs: number; deletedChallenges: number }> => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const demoState: DemoDataState | undefined = userSnap.exists()
    ? userSnap.data().demo_data
    : undefined;

  const [logsSnap, challengesSnap] = await Promise.all([
    getDocs(query(logsRef(userId), where('is_demo', '==', true))),
    getDocs(query(challengesRef(userId), where('is_demo', '==', true))),
  ]);

  const ops: ((batch: ReturnType<typeof writeBatch>) => void)[] = [
    ...logsSnap.docs.map((d) => (batch: ReturnType<typeof writeBatch>) => batch.delete(d.ref)),
    ...challengesSnap.docs.map((d) => (batch: ReturnType<typeof writeBatch>) => batch.delete(d.ref)),
  ];
  await commitInChunks(ops);

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
  return { deletedLogs: logsSnap.size, deletedChallenges: challengesSnap.size };
};
