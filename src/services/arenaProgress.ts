import { collection, query, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { CompletionLog, Challenge, PracticeInstance, ArenaId } from '../types';
import { getChallengeArenaId } from '../utils/arenaForChallenge';
import { getHabitArenaId } from '../utils/arenaForHabit';
import { ARENAS } from '../constants/arenas';
import { getCurrentWeekBounds } from './practices';

// =============================================================================
// ARENA PROGRESS — the proof-of-growth aggregation (Phase 3.1)
//
// Override Score = how many times you overrode the stop signal this week, across
// arenas. Discipline Map = per-arena rep totals (which arenas you train / avoid).
//
// Each completion's arena is resolved by reference_id -> item -> resolver, so
// completions logged BEFORE arena tagging still count (a denormalized
// log.arena_id is preferred when present). Only challenge + habit completions
// count as overrides; programs and worksheets are excluded.
// See docs/phase-3-proof-layer.md
// =============================================================================

export interface ArenaStat {
  arenaId: ArenaId;
  name: string;
  color: string;
  icon: string;
  reps: number;
  lastDate: string | null;
}

export interface ArenaProgress {
  breakdown: ArenaStat[]; // all arenas, in order (reps 0 = untrained)
  weekScore: number; // Override Score: total overrides this week
  weekByArena: Record<string, number>;
  weekStart: string; // YYYY-MM-DD (Monday)
}

const logsRef = (uid: string) => collection(db, 'users', uid, 'completionLogs');
const challengesRef = (uid: string) => collection(db, 'users', uid, 'challenges');
const habitsRef = (uid: string) => collection(db, 'users', uid, 'habits');

type LogLike = CompletionLog & { arena_id?: ArenaId };

/**
 * Compute the Discipline Map breakdown + the weekly Override Score from a single
 * Firestore load (logs + challenges + habits).
 */
export const getArenaProgress = async (userId: string): Promise<ArenaProgress> => {
  const [logSnap, challengeSnap, habitSnap] = await Promise.all([
    getDocs(query(logsRef(userId))),
    getDocs(query(challengesRef(userId))),
    getDocs(query(habitsRef(userId))),
  ]);

  // reference_id -> arena_id (resolved via the shared resolvers)
  const challengeArena = new Map<string, ArenaId | undefined>();
  challengeSnap.docs.forEach((d) => {
    challengeArena.set(d.id, getChallengeArenaId({ id: d.id, ...d.data() } as Challenge));
  });
  const habitArena = new Map<string, ArenaId | undefined>();
  habitSnap.docs.forEach((d) => {
    habitArena.set(d.id, getHabitArenaId({ id: d.id, ...d.data() } as PracticeInstance));
  });

  const arenaForLog = (log: LogLike): ArenaId | undefined => {
    if (log.arena_id) return log.arena_id;
    if (log.type === 'challenge') return challengeArena.get(log.reference_id);
    if (log.type === 'nudge') return habitArena.get(log.reference_id);
    return undefined; // programs / worksheets are not overrides
  };

  const { mondayStr } = getCurrentWeekBounds();

  const allReps = new Map<ArenaId, { reps: number; lastDate: string }>();
  const weekByArena: Record<string, number> = {};
  let weekScore = 0;

  logSnap.docs.forEach((d) => {
    const log = d.data() as LogLike;
    const arenaId = arenaForLog(log);
    if (!arenaId) return;

    const ex = allReps.get(arenaId) || { reps: 0, lastDate: '' };
    ex.reps += 1;
    if ((log.date || '') > ex.lastDate) ex.lastDate = log.date || ex.lastDate;
    allReps.set(arenaId, ex);

    if (log.date && log.date >= mondayStr) {
      weekByArena[arenaId] = (weekByArena[arenaId] || 0) + 1;
      weekScore += 1;
    }
  });

  const breakdown: ArenaStat[] = ARENAS.map((a) => {
    const s = allReps.get(a.id);
    return {
      arenaId: a.id,
      name: a.name,
      color: a.color,
      icon: a.icon,
      reps: s?.reps ?? 0,
      lastDate: s?.lastDate || null,
    };
  });

  return { breakdown, weekScore, weekByArena, weekStart: mondayStr };
};
