import { useState } from 'react';
import type { ExerciseRecord, Workout, WorkoutSession } from '../../../../../types/workouts';
import { applySessionToWorkout, savedWorkoutIdFor, toCompletedSession, workoutFromSession } from '../../../../../services/workoutSession';
import { computeSessionRecords } from '../../../../../services/workoutMath';
import {
  getRecordsFor,
  isTimeoutError,
  SAVE_TIMEOUT_MS,
  saveFinishedSession,
  withTimeout,
} from '../../../../../services/labWorkouts';
import { toLocalDateString } from '../../../../../utils/date';
import { showAlert } from '../../../../../utils/alert';
import { LoadedWorkouts, useWorkouts } from '../WorkoutsContext';

/** A fresh read of the records gets this long before the loaded ones are used instead. */
const FRESH_READ_MS = 5000;

const SAVE_FAILED = ['Couldn\'t save your workout', 'It’s kept on this phone. Check your connection and tap Finish again.'] as const;

export interface FinishOptions {
  /** Fold added exercises and extra sets into the saved workout. */
  saveChanges?: boolean;
  /** An unplanned session saved as a new workout under this name ('' = dated default). */
  saveAsNewName?: string;
  /** The save timed out and is still queued: keep the session, marked, so Discard can say so. */
  onTimedOut?: (marked: WorkoutSession) => void;
}

/**
 * Saving a finished workout — run live (the summary) or logged with Done it —
 * then handing it to Today to be rated. One path, so both land in history,
 * records, stats and the week the same way.
 */
export const useFinishWorkout = () => {
  const { userId, exercisesById, recordFinished, closeAndCheckOff, ensureLoaded } = useWorkouts();
  const [saving, setSaving] = useState(false);

  const finish = async (session: WorkoutSession, opts: FinishOptions = {}) => {
    if (saving) return;
    setSaving(true);
    const now = new Date();

    // Records are written whole, so they're computed against what's really
    // saved: a load that failed with no signal leaves {} on screen, and a
    // save built on that would reset every record this workout touched.
    let loaded: LoadedWorkouts;
    try {
      loaded = await ensureLoaded();
    } catch (e) {
      console.warn('Workouts: not loaded, not saving:', e);
      setSaving(false);
      showAlert(...SAVE_FAILED);
      return;
    }
    const exerciseIds = [...new Set(session.blocks.flatMap((b) => b.sets.map((s) => s.exerciseId)))];
    let base: Record<string, ExerciseRecord> = loaded.records;
    try {
      const fresh = await withTimeout(getRecordsFor(userId, exerciseIds), FRESH_READ_MS);
      base = { ...loaded.records };
      for (const id of exerciseIds) {
        if (fresh[id]) base[id] = fresh[id];
        else delete base[id];
      }
    } catch (e) {
      // Offline after a good load: what loaded is the best there is, and the
      // save queues as it always has.
      console.warn('Workouts: records not re-read, using loaded ones:', e);
    }
    const { records: toSave, prs: finalPrs } = computeSessionRecords(session, exercisesById, base);

    let toWrite: Workout | undefined;
    // Every finished workout is the Workouts check-in on Today; no habit is
    // chosen here (services/appCheckins.ts ticks a matching Workout habit).
    let final = { ...session };
    delete final.habitId;
    delete final.saveTimedOutAt;
    const ran = session.workoutId ? loaded.workouts.find((w) => w.id === session.workoutId) : undefined;
    const doneBlocks = session.blocks.filter((b) => b.sets.length > 0);
    if (ran) {
      toWrite = opts.saveChanges ? applySessionToWorkout(ran, session, now) : ran;
    } else if (!session.workoutId && opts.saveAsNewName !== undefined && doneBlocks.length) {
      toWrite = workoutFromSession(session, {
        // One id per session: a retry after a timed-out save (which may still
        // land) rewrites this workout rather than adding a second.
        id: savedWorkoutIdFor(session.id),
        name: opts.saveAsNewName || `Workout ${now.toLocaleDateString()}`,
        now,
      });
      final = { ...final, workoutId: toWrite.id, workoutName: toWrite.name };
    }
    const completed = toCompletedSession(final, { now, prs: finalPrs, exercisesById });
    try {
      await withTimeout(saveFinishedSession(userId, { session: completed, records: toSave, workout: toWrite }), SAVE_TIMEOUT_MS);
    } catch (e) {
      console.warn('Workouts: save failed:', e);
      setSaving(false);
      if (isTimeoutError(e)) opts.onTimedOut?.({ ...session, saveTimedOutAt: now.toISOString() });
      showAlert(...SAVE_FAILED);
      return;
    }
    recordFinished({ completed, records: toSave, workout: toWrite });
    // A session finished (or logged) for another day is rated as that day's.
    const day = toLocalDateString(new Date(completed.finished_at));
    closeAndCheckOff(completed.duration_sec, day !== toLocalDateString(now) ? day : undefined, completed.id);
  };

  return { saving, finish };
};
