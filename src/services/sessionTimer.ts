// =============================================================================
// SESSION TIMER — the lock-and-bell clock any timed mini-app can run on
// (Meditate today; Cold and Focus are the next candidates).
//
// Nothing ticks. The session is a start time and a planned length, so it keeps
// running with the phone locked, the app closed or the battery swapped: every
// question ("is it over?", "how long was it?") is answered from the wall clock
// when asked. The bell is a scheduled local notification — services/
// sessionBell.ts — because a locked phone runs none of our code.
//
// This replaces the in-app countdown dropped in d897ff6, which needed the
// screen lit and awake for the whole sit.
// =============================================================================

export interface TimerClock {
  /** ISO time the session started. */
  startedAt: string;
  /** How long it was meant to run, in seconds. */
  plannedSec: number;
}

/** When the bell rings. */
export const endsAt = (clock: TimerClock): Date =>
  new Date(new Date(clock.startedAt).getTime() + clock.plannedSec * 1000);

/** Whole seconds since the start; never negative (a clock that moved backwards). */
export const elapsedSec = (clock: TimerClock, now: Date): number =>
  Math.max(0, Math.floor((now.getTime() - new Date(clock.startedAt).getTime()) / 1000));

/** Seconds until the bell; 0 once it has rung. */
export const remainingSec = (clock: TimerClock, now: Date): number =>
  Math.max(0, clock.plannedSec - elapsedSec(clock, now));

export const isDue = (clock: TimerClock, now: Date): boolean => remainingSec(clock, now) === 0;

/**
 * What a session logs. Ended early: the real time. Back after the bell: the
 * planned length — coming back an hour late doesn't make it a 70-minute sit.
 */
export const loggedSec = (clock: TimerClock, now: Date): number =>
  Math.min(clock.plannedSec, elapsedSec(clock, now));

/** Seconds → "10 min", "1 min", "45 sec" — for copy, never for a running clock. */
export const formatMinutes = (sec: number): string => {
  if (sec < 60) return `${Math.max(0, Math.round(sec))} sec`;
  const min = Math.round(sec / 60);
  return `${min} min`;
};
