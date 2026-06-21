import { collection, query, getDocs, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { ArenaId } from '../types';
import { BaselineUnit } from '../constants/arenas';

// =============================================================================
// ARENA BASELINES — periodic per-arena tests; the delta over time is the
// "Discomfort Shift" (Phase 3.3). Mirrors the measurements.ts pattern:
// single-field query + in-memory sort, so NO composite index is needed.
//
// value semantics by unit:
//   duration   -> seconds held (higher = better)
//   rating     -> stress reduction = before - after (higher = better)
//   completion -> urge intensity faced, 1-5 (lower = better over time)
// See docs/phase-3-proof-layer.md
// =============================================================================

export interface ArenaBaseline {
  id: string;
  user_id: string;
  arena_id: ArenaId;
  unit: BaselineUnit;
  value: number;
  value_before?: number; // rating only (stress before)
  value_after?: number;  // rating only (stress after)
  date: string;          // YYYY-MM-DD
  created_at: string;    // ISO
  note?: string;
}

export interface DiscomfortShift {
  unit: BaselineUnit;
  count: number;
  first: number | null;
  latest: number | null;
  delta: number | null;     // latest - first
  improved: boolean | null; // direction-aware; null until there are 2+ tests
}

const baselinesRef = (uid: string) => collection(db, 'users', uid, 'arenaBaselines');

/** Whether a higher baseline value means improvement, by unit. */
export const baselineHigherIsBetter = (unit: BaselineUnit): boolean => unit !== 'completion';

const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const logArenaBaseline = async (
  userId: string,
  entry: {
    arena_id: ArenaId;
    unit: BaselineUnit;
    value: number;
    value_before?: number;
    value_after?: number;
    note?: string;
  }
): Promise<string> => {
  const docData: Record<string, unknown> = {
    user_id: userId,
    arena_id: entry.arena_id,
    unit: entry.unit,
    value: entry.value,
    date: todayStr(),
    created_at: new Date().toISOString(),
  };
  if (entry.value_before !== undefined) docData.value_before = entry.value_before;
  if (entry.value_after !== undefined) docData.value_after = entry.value_after;
  if (entry.note && entry.note.trim()) docData.note = entry.note.trim();
  const ref = await addDoc(baselinesRef(userId), docData);
  return ref.id;
};

/** All baseline tests for an arena, oldest first. */
export const getArenaBaselines = async (
  userId: string,
  arenaId: ArenaId
): Promise<ArenaBaseline[]> => {
  const snap = await getDocs(query(baselinesRef(userId)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as ArenaBaseline))
    .filter((b) => b.arena_id === arenaId)
    .sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : a.created_at < b.created_at ? -1 : 1
    );
};

/** First → latest delta for an arena, interpreted by the unit's direction. */
export const getDiscomfortShift = async (
  userId: string,
  arenaId: ArenaId,
  unit: BaselineUnit
): Promise<DiscomfortShift> => {
  const list = await getArenaBaselines(userId, arenaId);
  if (list.length === 0) {
    return { unit, count: 0, first: null, latest: null, delta: null, improved: null };
  }
  const first = list[0].value;
  const latest = list[list.length - 1].value;
  const delta = latest - first;
  const improved =
    list.length < 2 ? null : baselineHigherIsBetter(unit) ? delta > 0 : delta < 0;
  return { unit, count: list.length, first, latest, delta, improved };
};
