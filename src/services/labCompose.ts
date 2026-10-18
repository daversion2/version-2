import { collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import {
  COMPOSE_WORKING,
  validateComposeRequest,
  type ComposeRequest,
  type ComposeSession,
  type ComposeStatus,
  type ComposeUsage,
} from '../utils/meditation/compose';
import { COMPOSE_BACKGROUNDS, COMPOSE_VOICES } from '../data/composeCatalog';

// =============================================================================
// Compose (Lab): guided sessions written and voiced on request.
//
// The app only ever creates a request (status 'queued') and later saves,
// renames or deletes it. Everything in between — writing, voicing, mixing,
// the audio URL — is the composeSession Cloud Function's job
// (functions/src/compose.ts). Docs live in the owner's users/{uid}/lab_compose,
// which only they can read, so saved recordings stay private.
// =============================================================================

const COL = 'lab_compose';

/**
 * The function gives up after 9 minutes. A session still "working" well past
 * that never got its final status (a crash, a deploy mid-run) — show it as
 * failed rather than spinning forever.
 */
const STUCK_AFTER_MS = 15 * 60 * 1000;

const col = (userId: string) => collection(db, 'users', userId, COL);
const ref = (userId: string, id: string) => doc(db, 'users', userId, COL, id);

/**
 * Validates (throwing on a bad request), then queues it. The id comes back at
 * once and the doc is already in the local cache, so the caller can move on
 * immediately; `written` settles when the server has it. Waiting for that
 * before navigating would leave the user stuck on a slow connection — and
 * navigate from the wrong screen if they'd gone back in the meantime.
 */
export function createComposeSession(
  userId: string,
  req: ComposeRequest,
  known: { voices: string[]; ambience: string[] },
  now: Date = new Date(),
): { id: string; written: Promise<void> } {
  const problem = validateComposeRequest(req, known);
  if (problem) throw new Error(problem);
  const id = doc(col(userId)).id;
  const at = now.toISOString();
  const written = setDoc(ref(userId, id), {
    request: req.request.trim(),
    kind: req.kind,
    minutes: req.minutes,
    voice: req.voice,
    ambience: req.ambience,
    status: 'queued',
    saved: false,
    created_at: at,
    updated_at: at,
  });
  return { id, written };
}

/** Live list, newest first. Returns an unsubscribe. */
export function watchComposeSessions(
  userId: string,
  onChange: (sessions: ComposeSession[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  return onSnapshot(
    query(col(userId), orderBy('created_at', 'desc'), limit(200)),
    (snap) => onChange(snap.docs.map((d) => ({ ...(d.data() as Omit<ComposeSession, 'id'>), id: d.id }))),
    onError,
  );
}

/** Live single session, or null once it's deleted. Returns an unsubscribe. */
export function watchComposeSession(
  userId: string,
  id: string,
  onChange: (session: ComposeSession | null) => void,
  onError?: (error: unknown) => void,
): () => void {
  return onSnapshot(
    ref(userId, id),
    (snap) => onChange(snap.exists() ? { ...(snap.data() as Omit<ComposeSession, 'id'>), id: snap.id } : null),
    onError,
  );
}

/**
 * Live monthly allowance (composeUsage/{uid}, written only by the Cloud
 * Function), or null before the first session. Pass it to minutesLeft().
 */
export function watchComposeUsage(
  userId: string,
  onChange: (usage: ComposeUsage | null) => void,
  onError?: (error: unknown) => void,
): () => void {
  return onSnapshot(
    doc(db, 'composeUsage', userId),
    (snap) => onChange(snap.exists() ? (snap.data() as ComposeUsage) : null),
    onError,
  );
}

/** Into "My recordings" — private to this account. An optional new title. */
export async function saveComposeSession(userId: string, id: string, title?: string, now: Date = new Date()) {
  const changes: Record<string, unknown> = { saved: true, saved_at: now.toISOString(), updated_at: now.toISOString() };
  const trimmed = title?.trim();
  if (trimmed) changes.title = trimmed.slice(0, 80);
  await updateDoc(ref(userId, id), changes);
}

export async function unsaveComposeSession(userId: string, id: string, now: Date = new Date()) {
  await updateDoc(ref(userId, id), { saved: false, updated_at: now.toISOString() });
}

export async function renameComposeSession(userId: string, id: string, title: string, now: Date = new Date()) {
  const trimmed = title.trim().slice(0, 80);
  if (!trimmed) throw new Error('Give it a name.');
  await updateDoc(ref(userId, id), { title: trimmed, updated_at: now.toISOString() });
}

/** Removes the session; the Cloud Function removes its recording. */
export async function deleteComposeSession(userId: string, id: string) {
  await deleteDoc(ref(userId, id));
}

// --- Display helpers ----------------------------------------------------------

/** A working session that's been at it far too long counts as failed. */
export function effectiveStatus(session: Pick<ComposeSession, 'status' | 'updated_at'>, now: Date = new Date()): ComposeStatus {
  if (!COMPOSE_WORKING.includes(session.status)) return session.status;
  const age = now.getTime() - new Date(session.updated_at).getTime();
  return age > STUCK_AFTER_MS ? 'failed' : session.status;
}

export const isComposeWorking = (status: ComposeStatus): boolean => COMPOSE_WORKING.includes(status);

/** "My recordings" (saved, most recently saved first) and "Recent" (everything else, newest first). */
export function splitComposeSessions(sessions: ComposeSession[]): { saved: ComposeSession[]; recent: ComposeSession[] } {
  const saved = sessions
    .filter((s) => s.saved)
    .sort((a, b) => (b.saved_at ?? b.created_at).localeCompare(a.saved_at ?? a.created_at));
  const recent = sessions.filter((s) => !s.saved).sort((a, b) => b.created_at.localeCompare(a.created_at));
  return { saved, recent };
}

export const COMPOSE_STATUS_LABEL: Record<ComposeStatus, string> = {
  queued: 'Starting…',
  writing: 'Writing your script…',
  recording: 'Recording…',
  mixing: 'Mixing…',
  ready: 'Ready',
  declined: "Couldn't make this one",
  failed: 'Something went wrong',
};

/** The three visible steps of making a session, and which one we're on (0–3; 3 = done). */
export const COMPOSE_STEPS = ['Writing', 'Recording', 'Mixing'] as const;
export function composeStepIndex(status: ComposeStatus): number {
  switch (status) {
    case 'queued':
    case 'writing':
      return 0;
    case 'recording':
      return 1;
    case 'mixing':
      return 2;
    default:
      return 3;
  }
}

/** 6:00, 12:05 */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The title to show: Claude's, once written; until then, the start of the request. */
export function composeDisplayTitle(session: Pick<ComposeSession, 'title' | 'request'>): string {
  if (session.title) return session.title;
  const req = session.request.trim();
  return req.length > 48 ? `${req.slice(0, 47).trimEnd()}…` : req;
}

/** "Guided imagery · 6 min · Regina · Rain" */
export function composeSessionMeta(session: Pick<ComposeSession, 'kind' | 'minutes' | 'voice' | 'ambience'>): string {
  return [
    session.kind === 'imagery' ? 'Guided imagery' : 'Meditation',
    `${session.minutes} min`,
    COMPOSE_VOICES.find((v) => v.key === session.voice)?.name ?? session.voice,
    session.ambience
      ? (COMPOSE_BACKGROUNDS.find((b) => b.key === session.ambience)?.label ?? session.ambience)
      : 'No background',
  ].join(' · ');
}
