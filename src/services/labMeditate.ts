import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { CompletedMeditateSession, GuidedRecording, MeditatePrefs } from '../types/meditate';
import { stripUndefined } from './labWorkouts';

// =============================================================================
// Meditate (Lab) storage, in the user's own users/{uid}/lab_meditate_*
// subcollections — the wildcard rule already covers them. Nothing here writes
// completionLogs: the check-in goes through Today's normal path (see
// services/miniApps.ts). History is the app's own sessions only; check-ins
// logged before it existed are not read in.
// =============================================================================

const COL = {
  sessions: 'lab_meditate_sessions',
  prefs: 'lab_meditate_prefs',
} as const;

const PREFS_DOC = 'main';

export const DEFAULT_MEDITATE_PREFS: MeditatePrefs = {
  linked_habit_ids: [],
  nsdr_links: [],
};

const col = (userId: string, name: string) => collection(db, 'users', userId, name);
const ref = (userId: string, name: string, id: string) => doc(db, 'users', userId, name, id);

export const getMeditatePrefs = async (userId: string): Promise<MeditatePrefs> => {
  const snap = await getDoc(ref(userId, COL.prefs, PREFS_DOC));
  return { ...DEFAULT_MEDITATE_PREFS, ...(snap.exists() ? (snap.data() as Partial<MeditatePrefs>) : {}) };
};

export const saveMeditatePrefs = async (userId: string, changes: Partial<MeditatePrefs>): Promise<void> => {
  await setDoc(ref(userId, COL.prefs, PREFS_DOC), stripUndefined(changes), { merge: true });
};

/** Newest first. */
export const sortSessions = (sessions: CompletedMeditateSession[]): CompletedMeditateSession[] =>
  [...sessions].sort((a, b) => b.started_at.localeCompare(a.started_at));

export const listMeditateSessions = async (userId: string, max = 5000): Promise<CompletedMeditateSession[]> => {
  const snap = await getDocs(query(col(userId, COL.sessions), orderBy('started_at', 'desc'), limit(max)));
  return sortSessions(snap.docs.map((d) => ({ ...(d.data() as CompletedMeditateSession), id: d.id })));
};

/** Keyed by the session's own id, so a retried save overwrites rather than duplicates. */
export const saveMeditateSession = async (userId: string, session: CompletedMeditateSession): Promise<void> => {
  await setDoc(ref(userId, COL.sessions, session.id), stripUndefined(session));
};

export const newMeditateId = (userId: string): string => doc(col(userId, COL.sessions)).id;

/**
 * The published guided recordings (guidedRecordings — read-only to the app;
 * scripts/publishMeditations.ts writes it, and only with recordings the
 * founder approved).
 */
export const listGuidedRecordings = async (): Promise<GuidedRecording[]> => {
  const snap = await getDocs(collection(db, 'guidedRecordings'));
  return snap.docs
    .map((d) => ({ ...(d.data() as GuidedRecording), id: d.id }))
    .filter((r) => !!r.audio_url && r.duration_sec > 0);
};
