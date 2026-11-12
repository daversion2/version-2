import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { asLevel } from '../constants/resistance';
import { toLocalDateString } from '../utils/date';

// =============================================================================
// STARTS THAT NEVER FINISHED.
//
// The override is tapped on Start (constants/resistance.ts, "TWO RATINGS"), so
// a session thrown away before Finish still had a real start: the hard part
// was done. It earns no check-in, XP or streak — those need a finished session
// — but the start is kept here, one doc per session, so it isn't lost.
//
// Nothing reads these yet (docs/backlog.md). A user subcollection, so the
// rules' users/{uid}/{subcollection} wildcard already covers it.
// =============================================================================

export interface OverrideStart {
  app_id: string;
  session_id: string;
  /** The override, 1–3. */
  resistance: number;
  started_at: string;
  /** Local YYYY-MM-DD the session started on. */
  date: string;
  discarded_at: string;
}

/** The doc for a discarded session that had an override, or null when there's nothing to keep. */
export const abandonedStart = (
  appId: string,
  session: { id: string; override?: number; startedAt: string },
  now: Date
): OverrideStart | null => {
  const level = asLevel(session.override);
  if (!level) return null;
  return {
    app_id: appId,
    session_id: session.id,
    resistance: level,
    started_at: session.startedAt,
    date: toLocalDateString(new Date(session.startedAt)),
    discarded_at: now.toISOString(),
  };
};

/** Best-effort: a failed write loses only this record, never the discard. */
export const recordAbandonedStart = async (
  userId: string,
  appId: string,
  session: { id: string; override?: number; startedAt: string } | null | undefined
): Promise<void> => {
  if (!session) return;
  const start = abandonedStart(appId, session, new Date());
  if (!start) return;
  try {
    await setDoc(doc(db, 'users', userId, 'overrideStarts', session.id), start);
  } catch (e) {
    console.warn('Could not keep the discarded start:', e);
  }
};
