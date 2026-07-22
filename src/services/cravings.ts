import { addDoc, collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { CravingLog, CravingOutcome } from '../types';
import { getCravingType } from '../data/cravings';
import { getTodayString, toLocalDateString } from '../utils/date';
import {
  adjustWillpowerPoints,
  calculateHabitPoints,
  getWillpowerStats,
  updateWillpowerStats,
} from './willpower';

/** Base points for riding a craving out — same as a 'challenging' practice rep. */
const CRAVING_PASSED_BASE_POINTS = 2;
/**
 * Logging a gave-in still earns a point: honest tracking is the behavior the
 * feature needs most, so it must never feel unsafe. Awarded without touching
 * the streak — the streak stays a record of completed reps.
 */
const CRAVING_LOGGED_POINTS = 1;
/**
 * Chance a ridden-out craving pays double. Variable-ratio rewards bind habit
 * loops measurably harder than fixed ones — the one mechanism worth borrowing
 * from slot machines for a good cause. The floor never drops: a normal win
 * always pays full points; the bonus only ever adds.
 */
const CRAVING_BONUS_CHANCE = 0.2;

const cravingLogsRef = (userId: string) =>
  collection(db, 'users', userId, 'cravingLogs');

const completionLogsRef = (userId: string) =>
  collection(db, 'users', userId, 'completionLogs');

export interface CravingSessionInput {
  cravingType: string;
  /** User-supplied name for an 'other' craving. */
  customLabel?: string;
  intensity: number;
  /** Intensity when logging, 0 (gone) – 10. */
  exitIntensity?: number;
  /** Times the timer was extended. */
  extensions?: number;
  outcome: CravingOutcome;
  secondsHeld: number;
  plannedSeconds: number;
  startedAt: Date;
  mindTags?: string[];
  note?: string;
  /** Off-app mission category id, when the ride left the app. */
  mission?: string;
}

export interface CravingSessionResult {
  logId: string;
  pointsEarned: number;
  /** True when the variable reward hit and points were doubled. */
  bonus: boolean;
  /** Present only when the outcome fed the streak (a ridden-out craving). */
  willpower: Awaited<ReturnType<typeof updateWillpowerStats>> | null;
}

/**
 * Persist one urge-surfing session. A ridden-out craving counts as a full rep:
 * it writes a completionLog (so streak recalculation from logs stays
 * consistent) and goes through updateWillpowerStats like any practice. A
 * gave-in writes only the craving log plus a small honesty point.
 */
export const logCravingSession = async (
  userId: string,
  input: CravingSessionInput
): Promise<CravingSessionResult> => {
  const endedAt = new Date();
  const log: Omit<CravingLog, 'id'> = {
    user_id: userId,
    craving_type: input.cravingType,
    ...(input.customLabel?.trim() ? { custom_label: input.customLabel.trim() } : {}),
    intensity: input.intensity,
    ...(typeof input.exitIntensity === 'number' ? { exit_intensity: input.exitIntensity } : {}),
    ...(input.extensions ? { extensions: input.extensions } : {}),
    outcome: input.outcome,
    seconds_held: input.secondsHeld,
    planned_seconds: input.plannedSeconds,
    date: toLocalDateString(input.startedAt),
    started_at: input.startedAt.toISOString(),
    ended_at: endedAt.toISOString(),
    ...(input.mindTags && input.mindTags.length ? { mindTags: input.mindTags } : {}),
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    ...(input.mission ? { mission: input.mission } : {}),
  };
  const docRef = await addDoc(cravingLogsRef(userId), log);

  if (input.outcome === 'gave_in') {
    await adjustWillpowerPoints(userId, CRAVING_LOGGED_POINTS);
    return { logId: docRef.id, pointsEarned: CRAVING_LOGGED_POINTS, bonus: false, willpower: null };
  }

  const { currentStreak } = await getWillpowerStats(userId);
  let points = calculateHabitPoints(CRAVING_PASSED_BASE_POINTS, currentStreak);
  const bonus = Math.random() < CRAVING_BONUS_CHANCE;
  if (bonus) points *= 2;
  const willpower = await updateWillpowerStats(userId, points);

  const minutes = Math.max(1, Math.round(input.secondsHeld / 60));
  // "Rode out a chocolate craving" > "rode out a something else craving" — use
  // the user's own name when they gave one, and drop the label entirely when
  // an 'other' craving went unnamed.
  const customLabel = input.customLabel?.trim();
  const noteLabel = customLabel
    ? `${customLabel.toLowerCase()} `
    : input.cravingType === 'other'
      ? ''
      : `${getCravingType(input.cravingType).label.toLowerCase()} `;
  await addDoc(completionLogsRef(userId), {
    user_id: userId,
    type: 'craving',
    reference_id: docRef.id,
    points,
    difficulty: CRAVING_PASSED_BASE_POINTS,
    date: getTodayString(),
    completed_at: endedAt.toISOString(),
    notes: `Rode out a ${noteLabel}craving (${minutes} min)`,
    ...(input.mindTags && input.mindTags.length ? { mindTags: input.mindTags } : {}),
  });

  return { logId: docRef.id, pointsEarned: points, bonus, willpower };
};

/**
 * Attach a one-tap implementation intention to a logged craving. If-then
 * plans formed right after a lapse roughly double follow-through next time.
 */
export const saveCravingPlan = async (
  userId: string,
  logId: string,
  plan: string
): Promise<void> => {
  await updateDoc(doc(db, 'users', userId, 'cravingLogs', logId), {
    if_then_plan: plan,
  });
};

export const getCravingLogs = async (
  userId: string,
  sinceDate?: string
): Promise<CravingLog[]> => {
  const q = sinceDate
    ? query(cravingLogsRef(userId), where('date', '>=', sinceDate))
    : query(cravingLogsRef(userId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as CravingLog))
    .sort((a, b) => b.started_at.localeCompare(a.started_at));
};

// ---------------------------------------------------------------------------
// Pattern surfacing — pure functions over fetched logs.
// ---------------------------------------------------------------------------

export interface CravingTypeBreakdown {
  cravingType: string;
  total: number;
  passed: number;
}

export interface CravingPatternSummary {
  total: number;
  passed: number;
  /** 0–1 share of logged cravings that were ridden out. */
  crushRate: number;
  byType: CravingTypeBreakdown[];
  /** e.g. "afternoons" — the part of day cravings most often hit, if one stands out. */
  peakWindow: string | null;
}

const PART_OF_DAY: { label: string; startHour: number; endHour: number }[] = [
  { label: 'mornings', startHour: 5, endHour: 12 },
  { label: 'afternoons', startHour: 12, endHour: 17 },
  { label: 'evenings', startHour: 17, endHour: 22 },
  { label: 'late nights', startHour: 22, endHour: 29 }, // wraps past midnight to 5am
];

/** Minimum sessions before patterns are worth showing. */
export const PATTERN_MIN_LOGS = 5;

export const summarizeCravingPatterns = (
  logs: CravingLog[]
): CravingPatternSummary | null => {
  if (logs.length < PATTERN_MIN_LOGS) return null;

  const passed = logs.filter((l) => l.outcome === 'passed').length;

  const typeCounts = new Map<string, CravingTypeBreakdown>();
  const windowCounts = new Map<string, number>();

  for (const log of logs) {
    const entry = typeCounts.get(log.craving_type) ?? {
      cravingType: log.craving_type,
      total: 0,
      passed: 0,
    };
    entry.total++;
    if (log.outcome === 'passed') entry.passed++;
    typeCounts.set(log.craving_type, entry);

    let hour = new Date(log.started_at).getHours();
    if (hour < 5) hour += 24; // fold 0–5am into the late-night window
    const window = PART_OF_DAY.find((w) => hour >= w.startHour && hour < w.endHour);
    if (window) {
      windowCounts.set(window.label, (windowCounts.get(window.label) ?? 0) + 1);
    }
  }

  // A window only counts as "the" pattern when it holds a plurality worth naming.
  let peakWindow: string | null = null;
  let peakCount = 0;
  for (const [label, count] of windowCounts) {
    if (count > peakCount) {
      peakWindow = label;
      peakCount = count;
    }
  }
  if (peakCount / logs.length < 0.4) peakWindow = null;

  return {
    total: logs.length,
    passed,
    crushRate: passed / logs.length,
    byType: [...typeCounts.values()].sort((a, b) => b.total - a.total),
    peakWindow,
  };
};
