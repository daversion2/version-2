import { collection, query, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { Challenge, Nudge, ArenaId } from '../types';
import { getChallengeArenaId } from '../utils/arenaForChallenge';
import { getHabitArenaId } from '../utils/arenaForHabit';
import { ARENA_IDS } from '../constants/arenas';

// =============================================================================
// ARENA TELEMETRY (Phase 3.4) — per-user adoption signal for the Phase-4 gate.
//
// Answers the two gate questions for the signed-in account:
//   1. Is arena_id getting densely SET (picker / auto-derive adoption)?
//      -> storedArena vs resolved (resolved = stored OR matched by name).
//   2. Is the proof layer being used? -> baseline coverage.
// (Override Score vs XP divergence is read from getArenaProgress + willpower.)
// See docs/phase-3-proof-layer.md (3.4)
// =============================================================================

export interface AdoptionStat {
  total: number;
  storedArena: number; // arena_id field actually persisted on the doc
  resolved: number;    // resolves to an arena (stored OR matched by name)
}

export interface ArenaAdoption {
  challenges: AdoptionStat;
  habits: AdoptionStat;
  baselineTests: number;      // total baseline docs
  arenasWithBaseline: number; // distinct arenas with >= 1 baseline
  totalArenas: number;
}

const challengesRef = (uid: string) => collection(db, 'users', uid, 'challenges');
const habitsRef = (uid: string) => collection(db, 'users', uid, 'habits');
const baselinesRef = (uid: string) => collection(db, 'users', uid, 'arenaBaselines');

export const getArenaAdoption = async (userId: string): Promise<ArenaAdoption> => {
  const [cSnap, hSnap, bSnap] = await Promise.all([
    getDocs(query(challengesRef(userId))),
    getDocs(query(habitsRef(userId))),
    getDocs(query(baselinesRef(userId))),
  ]);

  const challenges: AdoptionStat = { total: 0, storedArena: 0, resolved: 0 };
  cSnap.docs.forEach((d) => {
    const data = d.data() as Challenge;
    challenges.total += 1;
    if (data.arena_id) challenges.storedArena += 1;
    if (getChallengeArenaId(data)) challenges.resolved += 1;
  });

  const habits: AdoptionStat = { total: 0, storedArena: 0, resolved: 0 };
  hSnap.docs.forEach((d) => {
    const data = d.data() as Nudge;
    habits.total += 1;
    if (data.arena_id) habits.storedArena += 1;
    if (getHabitArenaId(data)) habits.resolved += 1;
  });

  const arenaSet = new Set<ArenaId>();
  bSnap.docs.forEach((d) => {
    const a = (d.data() as { arena_id?: ArenaId }).arena_id;
    if (a) arenaSet.add(a);
  });

  return {
    challenges,
    habits,
    baselineTests: bSnap.size,
    arenasWithBaseline: arenaSet.size,
    totalArenas: ARENA_IDS.length,
  };
};
