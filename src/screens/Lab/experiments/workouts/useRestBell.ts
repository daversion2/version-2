import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { RestState } from '../../../../types/workouts';
import { cancelBell, getBellPermission, requestBellPermission, scheduleBell } from '../../../../services/sessionBell';

/**
 * Rest's up, even with the phone locked or another app open. In front, the
 * session screen's own tap and the sheet closing do the job, and a banner on
 * top would be noise — so the bell is only scheduled when the app goes to the
 * background, and called off the moment it comes back.
 *
 * Reuses Meditate's bell (services/sessionBell.ts): the system sound, and a
 * Focus mode silences it like any other notification.
 */
export const useRestBell = (rest: RestState | undefined, nextLabel: string): void => {
  const restRef = useRef(rest);
  restRef.current = rest;
  const labelRef = useRef(nextLabel);
  labelRef.current = nextLabel;
  const bellId = useRef<string | undefined>(undefined);
  const asked = useRef(false);

  // Ask once, when the first rest starts — the moment the bell makes sense.
  // Never re-asks: iOS answers a second request itself.
  useEffect(() => {
    if (!rest || asked.current) return;
    asked.current = true;
    getBellPermission().then((p) => {
      if (p === 'undetermined') requestBellPermission();
    });
  }, [rest]);

  useEffect(() => {
    const callOff = () => {
      const id = bellId.current;
      bellId.current = undefined;
      cancelBell(id);
    };
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        callOff();
        return;
      }
      if (state !== 'background' || !restRef.current) return;
      const seconds = (new Date(restRef.current.endsAt).getTime() - Date.now()) / 1000;
      scheduleBell(seconds, { title: 'Rest’s up', body: `Up next: ${labelRef.current}` }).then((id) => {
        // Back in front before it was scheduled — the sheet has it covered.
        if (AppState.currentState === 'active') cancelBell(id);
        else bellId.current = id;
      });
    });
    return () => {
      sub.remove();
      callOff();
    };
  }, []);
};
