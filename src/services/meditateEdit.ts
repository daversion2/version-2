import type { CompletedMeditateSession } from '../types/meditate';
import { clampMinutes } from './meditateMath';

// =============================================================================
// CORRECTING A FINISHED MEDITATE SESSION (founder, 2026-11-23): its length, or
// deleting it. Records and totals are computed from the sessions, so they follow
// on their own. A session's day and its ratings are deliberately not editable.
// =============================================================================

/** A guided session counts only when played to the end, so its length is the recording's. */
export const canEditMeditateLength = (session: Pick<CompletedMeditateSession, 'style'>): boolean =>
  session.style !== 'guided';

export const meditateMinutes = (session: Pick<CompletedMeditateSession, 'duration_sec'>): number =>
  Math.round(session.duration_sec / 60);

/**
 * The length, on the mode's own steps. A session that ran as planned stays "as
 * planned", so next time opens on the corrected length. One that ended early
 * stays early until it reaches its plan.
 */
export const withMeditateMinutes = (
  session: CompletedMeditateSession,
  minutes: number
): CompletedMeditateSession => {
  if (!canEditMeditateLength(session)) return session;
  const wanted = clampMinutes(session.mode, minutes);
  if (wanted === meditateMinutes(session)) return session;
  const sec = wanted * 60;
  const stillEarly = session.ended_early && sec < session.planned_sec;
  return { ...session, duration_sec: sec, planned_sec: stillEarly ? session.planned_sec : sec, ended_early: stillEarly };
};

/** Sessions with one replaced (or removed, when `next` is null), newest first. */
export const replaceMeditateSession = (
  sessions: CompletedMeditateSession[],
  id: string,
  next: CompletedMeditateSession | null
): CompletedMeditateSession[] => {
  const rest = sessions.filter((s) => s.id !== id);
  return next ? [next, ...rest].sort((a, b) => b.started_at.localeCompare(a.started_at)) : rest;
};
