import type {
  LibraryGear,
  LibraryLevel,
  LibraryOption,
  LibraryWorkout,
  Workout,
  WorkoutBlock,
} from '../types/workouts';
import type { User } from '../types';
import { WORKOUT_LIBRARY } from '../data/workoutLibrary';

// The Workout library's logic (data/workoutLibrary.ts holds the templates):
// fitting a template to someone's equipment, listing what fits, and copying
// one into their own workouts.

/**
 * Who sees the library. Everyone since 2026-11-26 (it was admin-only for a
 * day); kept as the one gate so it can be narrowed again here.
 */
export const canSeeWorkoutLibrary = (_profile: Pick<User, 'is_admin'> | null | undefined): boolean => true;

const covers = (gear: ReadonlySet<LibraryGear>, option: LibraryOption): boolean =>
  (option.needs ?? []).every((g) => gear.has(g));

/** A template fitted to one kit: every slot filled with the first option it covers. */
export interface ResolvedLibraryWorkout {
  template: LibraryWorkout;
  blocks: WorkoutBlock[];
  /** Gear the chosen exercises actually use, in the order first used. */
  uses: LibraryGear[];
}

/**
 * Fill every slot with its first option the gear covers. Null when a slot
 * can't be filled — the template needs kit they don't have. Block ids are
 * stable (`<template>_<n>`), so a copy's blocks line up with the template.
 */
export const resolveLibraryWorkout = (
  template: LibraryWorkout,
  gear: readonly LibraryGear[]
): ResolvedLibraryWorkout | null => {
  const have = new Set(gear);
  const uses: LibraryGear[] = [];
  const blocks: WorkoutBlock[] = [];
  for (let i = 0; i < template.blocks.length; i++) {
    const block = template.blocks[i];
    const items = [];
    for (const s of block.slots) {
      const chosen = s.options.find((o) => covers(have, o));
      if (!chosen) return null;
      for (const g of chosen.needs ?? []) if (!uses.includes(g)) uses.push(g);
      items.push({ exerciseId: chosen.exerciseId, target: { ...chosen.target } });
    }
    blocks.push({
      id: `${template.id}_${i + 1}`,
      type: items.length > 1 ? 'circuit' : 'single',
      ...(items.length > 1 && block.name ? { name: block.name } : {}),
      items,
      rounds: block.rounds,
      restSec: block.restSec,
      ...(block.intervalSec ? { intervalSec: block.intervalSec } : {}),
    });
  }
  return { template, blocks, uses };
};

export interface LibraryListing {
  /** Templates at this level that fit the gear, in library order. */
  fits: ResolvedLibraryWorkout[];
  /** How many at this level need kit they haven't ticked. */
  needMoreGear: number;
}

export const listLibrary = (
  level: LibraryLevel,
  gear: readonly LibraryGear[],
  library: readonly LibraryWorkout[] = WORKOUT_LIBRARY
): LibraryListing => {
  const atLevel = library.filter((w) => w.level === level);
  const fits = atLevel
    .map((w) => resolveLibraryWorkout(w, gear))
    .filter((r): r is ResolvedLibraryWorkout => r !== null);
  return { fits, needMoreGear: atLevel.length - fits.length };
};

/** Total sets in a fitted template, movement prep included. */
export const countLibrarySets = (resolved: ResolvedLibraryWorkout): number =>
  resolved.blocks.reduce((n, b) => n + b.rounds * b.items.length, 0);

/**
 * The user's own copy, to edit, run or delete like any workout. No weights:
 * the first session's numbers become "last time" from then on.
 */
export const libraryWorkoutToWorkout = (
  resolved: ResolvedLibraryWorkout,
  id: string,
  now: Date
): Workout => {
  const at = now.toISOString();
  return {
    id,
    name: resolved.template.name,
    blocks: resolved.blocks.map((b) => ({ ...b, items: b.items.map((it) => ({ ...it, target: { ...it.target } })) })),
    created_at: at,
    updated_at: at,
    library_id: resolved.template.id,
  };
};

/** The user's existing copy of a template, if they've added it before. */
export const findLibraryCopy = (workouts: readonly Workout[], libraryId: string): Workout | undefined =>
  workouts.find((w) => w.library_id === libraryId);
