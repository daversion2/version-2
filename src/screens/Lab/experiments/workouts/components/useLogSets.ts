import { useCallback } from 'react';
import type { Exercise, SetValues } from '../../../../../types/workouts';
import { showAlert, showConfirm } from '../../../../../utils/alert';
import { isTimeoutError } from '../../../../../services/labWorkouts';
import { showNotSavedYet, useWorkouts } from '../WorkoutsContext';

/**
 * Save sets from This week, and — on the day's first, once — offer to rate
 * the day on Today (services/weeklyVolume.ts shouldAskCheckin). "Keep
 * logging" leaves a "Rate it" card on This week instead.
 *
 * Resolves true when saved. `closeSheet` runs before the question, so the
 * alert never lands on a sheet that's still closing.
 */
export const useLogSets = () => {
  const { logSets, rateLoggedSets } = useWorkouts();

  return useCallback(
    async (exercise: Exercise, values: SetValues, count: number, closeSheet: () => void): Promise<boolean> => {
      let result: Awaited<ReturnType<typeof logSets>>;
      try {
        result = await logSets(exercise, values, count);
      } catch (e) {
        if (isTimeoutError(e)) {
          // Queued and already on This week — it lands once back online.
          closeSheet();
          setTimeout(showNotSavedYet, 400);
          return true;
        }
        showAlert("Couldn't save those sets", 'Check your connection and try again.');
        return false;
      }
      closeSheet();
      if (result.askCheckin) {
        const { session } = result;
        setTimeout(
          () =>
            showConfirm(
              'That’s today’s workout',
              'Rate how hard it was to start and it counts toward your week. Or keep logging, and rate it from This week when you’re done.',
              () => {
                rateLoggedSets(session).catch(() =>
                  showAlert("Couldn't hand it to Today", 'Check your connection and try again.')
                );
              },
              'Rate it now',
              'Keep logging'
            ),
          400
        );
      }
      return true;
    },
    [logSets, rateLoggedSets]
  );
};
