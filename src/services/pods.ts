import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import app, { db } from './firebase';
import { getTodayString } from '../utils/date';
import { KEEP_GOING_LEVELS, MEALS_DAY_LEVELS, START_LEVELS, type KeepGoingApp } from '../constants/resistance';
import {
  POD_REACTIONS,
  canRemoveMember,
  checkPodReaction,
  cleanFirstName,
  everyoneDaysSummary,
  everyoneShowedUp,
  lastDays,
  localDay,
  podAppLabel,
  podStreak,
  podWeek,
  sharedSession,
  showedUp,
  withSession,
  withoutSession,
  type EveryoneDaysSummary,
  type PodDays,
  type PodInvite,
  type PodReactionPreset,
  type PodSession,
  type PodWeek,
} from './podMath';

// =============================================================================
// PODS, the app's side (docs/pods.md). The rules are podMath.ts; the server is
// functions/src/pods.ts. This file:
//   - calls the pod functions (start, join, invite, leave, remove, react),
//   - reads a pod (the doc, its members, its reactions),
//   - writes the one thing the app writes: the signed-in member's own doc
//     (shared sessions, goals, time zone, first name, friction toggle),
//   - builds what the Pod screen and Today's card show (buildPodView).
// Sharing is best-effort and only for someone in a pod (users/{uid}.pod_id).
// =============================================================================

export const APP_STORE_URL = 'https://apps.apple.com/us/app/neuro-nudge/id6479909452';

export interface PodDoc {
  id: string;
  created_by: string;
  created_at: string;
  member_ids: string[];
  everyone_days?: string[];
  invite?: PodInvite | null;
}

export interface PodMember {
  uid: string;
  first_name: string;
  joined_at: string;
  timezone: string;
  goals: Record<string, number>;
  share_friction: boolean;
  days: PodDays;
  updated_at?: string;
}

export interface PodReaction {
  id: string;
  from: string;
  to: string;
  kind: 'reaction' | 'nudge';
  preset: string;
  session_id?: string;
  for_day: string;
  created_at: string;
}

export interface PodData {
  pod: PodDoc;
  /** In join order (the pod's member_ids). */
  members: PodMember[];
  reactions: PodReaction[];
}

// -----------------------------------------------------------------------------
// The functions
// -----------------------------------------------------------------------------

/** What starting or joining sends about you. */
export interface PodMemberInput {
  firstName: string;
  goals: Record<string, number>;
  shareFriction: boolean;
}

const deviceTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
  } catch {
    return 'America/New_York';
  }
};

const callable = <In, Out>(name: string) => httpsCallable<In, Out>(getFunctions(app), name);

const withTimezone = (input: PodMemberInput) => ({ ...input, timezone: deviceTimezone() });

export const startPod = async (input: PodMemberInput) =>
  (await callable<object, { podId: string; code: string; expiresAt: string }>('createPod')(withTimezone(input))).data;

export const joinPodWithCode = async (code: string, input: PodMemberInput) =>
  (await callable<object, { podId: string }>('joinPod')({ code, ...withTimezone(input) })).data;

export const makeNewInvite = async () =>
  (await callable<object, { code: string; expiresAt: string }>('newPodInvite')({})).data;

export const leaveMyPod = async () => {
  await callable<object, { left: boolean }>('leavePod')({});
};

export const removeFromMyPod = async (uid: string) => {
  await callable<object, { removed: boolean }>('removeFromPod')({ uid });
};

export const sendPodReaction = async (args: {
  to: string;
  kind: 'reaction' | 'nudge';
  preset: string;
  sessionId?: string;
  forDay?: string;
}) => (await callable<object, { sent: boolean; pushed: boolean }>('sendPodReaction')(args)).data;

/** The machine-readable reason a pod function gave for refusing, if any. */
export const podErrorReason = (e: unknown): string | null => {
  const reason = (e as { details?: { reason?: unknown } } | null)?.details?.reason;
  return typeof reason === 'string' ? reason : null;
};

const ERROR_MESSAGES: Record<string, string> = {
  bad_name: 'Use your first name: letters only, up to 20.',
  no_invite: 'That code doesn’t match a pod. Check it and try again.',
  expired: 'That code has expired. Ask for a new one.',
  full: 'That pod is full: five is the most.',
  in_another_pod: 'You’re already in a pod. Leave it first.',
  already_sent: 'Already sent.',
  already_showed_up: 'They’ve already shown up today.',
  no_session: 'That session isn’t there any more.',
  not_allowed: 'You can’t do that in this pod.',
  no_pod: 'You’re not in a pod.',
};

export const podErrorMessage = (e: unknown): string =>
  ERROR_MESSAGES[podErrorReason(e) ?? ''] ?? 'Something went wrong. Check your connection and try again.';

/** The text the share sheet sends with an invite. */
export const inviteMessage = (firstName: string | null | undefined, code: string): string =>
  `${firstName ? `${firstName} wants` : 'Want'} you in their Neuro-Nudge pod: we see each other show up, ` +
  `and how hard it was. Get the app (${APP_STORE_URL}), then Pod → Join with code ${code}.`;

// -----------------------------------------------------------------------------
// Reading a pod
// -----------------------------------------------------------------------------

export const loadPod = async (podId: string): Promise<PodData | null> => {
  const podSnap = await getDoc(doc(db, 'pods', podId));
  if (!podSnap.exists()) return null;
  const pod = { id: podId, ...(podSnap.data() as Omit<PodDoc, 'id'>) };
  const [memberSnap, reactionSnap] = await Promise.all([
    getDocs(collection(db, 'pods', podId, 'members')),
    getDocs(collection(db, 'pods', podId, 'reactions')),
  ]);
  const byUid = new Map(
    memberSnap.docs.map((d) => {
      const m = d.data() as Partial<PodMember>;
      return [d.id, { ...m, uid: d.id, days: m.days ?? {}, goals: m.goals ?? {} } as PodMember];
    })
  );
  return {
    pod,
    members: pod.member_ids.map((id) => byUid.get(id)).filter((m): m is PodMember => !!m),
    reactions: reactionSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PodReaction, 'id'>) })),
  };
};

// -----------------------------------------------------------------------------
// Writing your own member doc
// -----------------------------------------------------------------------------

const memberRef = (podId: string, uid: string) => doc(db, 'pods', podId, 'members', uid);
const nowIso = () => new Date().toISOString();

/** A rating as the pod gets it. `logId` is the rating's log id, so deleting it can take it back out. */
export interface PodRatingShare {
  logId: string;
  appId: string;
  /** The day the rating landed on (YYYY-MM-DD). */
  date: string;
  start?: number;
  keep?: number;
  day?: number;
}

/**
 * Share a rating with your pod, right after it's saved. Friction goes only if
 * you share it. Returns whether anything was written. Never throws for "not
 * in a pod".
 */
export const sharePodRating = async (userId: string, podId: string | null | undefined, rating: PodRatingShare): Promise<boolean> => {
  if (!podId) return false;
  const ref = memberRef(podId, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;
  const member = snap.data() as PodMember;
  const session: PodSession = sharedSession(
    { id: rating.logId, app: rating.appId, start: rating.start, keep: rating.keep, day: rating.day },
    member.share_friction !== false
  );
  await updateDoc(ref, { days: withSession(member.days, rating.date, session, getTodayString()), updated_at: nowIso() });
  return true;
};

/** A rating was deleted: take it out of what your pod sees. Reads your pod_id itself. */
export const unsharePodRating = async (userId: string, logId: string): Promise<boolean> => {
  const podId = (await getDoc(doc(db, 'users', userId))).data()?.pod_id;
  if (typeof podId !== 'string' || !podId) return false;
  const ref = memberRef(podId, userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;
  const days = (snap.data() as PodMember).days ?? {};
  const next = withoutSession(days, logId);
  if (JSON.stringify(next) === JSON.stringify(days)) return false;
  await updateDoc(ref, { days: next, updated_at: nowIso() });
  return true;
};

/**
 * Friction on or off. Turning it off also strips the ratings from what's
 * already shared: whoever turns it off expects their pod to stop seeing it.
 */
export const setPodFriction = async (userId: string, podId: string, share: boolean, days: PodDays): Promise<void> => {
  const patch: Record<string, unknown> = { share_friction: share, updated_at: nowIso() };
  if (!share) {
    patch.days = Object.fromEntries(
      Object.entries(days).map(([d, sessions]) => [d, sessions.map((s) => sharedSession(s, false))])
    );
  }
  await updateDoc(memberRef(podId, userId), patch);
};

/** Keep your goals and time zone current (opened the Pod screen, changed a goal, travelled). */
export const syncPodMember = async (
  userId: string,
  podId: string,
  current: Pick<PodMember, 'goals' | 'timezone'>,
  goals: Record<string, number>
): Promise<boolean> => {
  const timezone = deviceTimezone();
  if (current.timezone === timezone && JSON.stringify(current.goals) === JSON.stringify(goals)) return false;
  await updateDoc(memberRef(podId, userId), { goals, timezone, updated_at: nowIso() });
  return true;
};

/** Change your first name: on your profile and in your pod. Throws if it can't be a name. */
export const setPodFirstName = async (userId: string, podId: string | null | undefined, input: string): Promise<string> => {
  const name = cleanFirstName(input);
  if (!name) throw new Error(ERROR_MESSAGES.bad_name);
  await setDoc(doc(db, 'users', userId), { first_name: name }, { merge: true });
  if (podId) await updateDoc(memberRef(podId, userId), { first_name: name, updated_at: nowIso() });
  return name;
};

export const setPodMuted = async (userId: string, muted: boolean): Promise<void> => {
  await setDoc(doc(db, 'users', userId), { pod_muted: muted }, { merge: true });
};

/** The weekly goals a pod counts: each app on your Today, at its goal. */
export const podGoalsFrom = (goals: Record<string, number>, hidden: readonly string[]): Record<string, number> =>
  Object.fromEntries(Object.entries(goals).filter(([app, g]) => !hidden.includes(app) && g > 0));

// -----------------------------------------------------------------------------
// What the screens show
// -----------------------------------------------------------------------------

const levelLabel = (levels: { value: number; label: string }[], v?: number) =>
  levels.find((l) => l.value === v)?.label ?? null;

/** "Almost didn’t · Took everything", in the rating sheet's own words. Null when not shared. */
export const frictionLine = (s: PodSession): string | null => {
  if (s.app === 'meals') return levelLabel(MEALS_DAY_LEVELS, s.day);
  const keepLevels = KEEP_GOING_LEVELS[s.app as KeepGoingApp] ?? KEEP_GOING_LEVELS.workouts;
  const parts = [levelLabel(START_LEVELS, s.start), levelLabel(keepLevels, s.keep)].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
};

/** The hardest level in a session (for a tint), or null when nothing's shared. */
export const hardestLevel = (s: PodSession): 1 | 2 | 3 | null => {
  const v = Math.max(s.start ?? 0, s.keep ?? 0, s.day ?? 0);
  return v >= 1 && v <= 3 ? (v as 1 | 2 | 3) : null;
};

export interface PodSessionView {
  id: string;
  app: string;
  appLabel: string;
  friction: string | null;
  level: 1 | 2 | 3 | null;
  /** The day it's on (the member's own today, for Today's list). */
  day: string;
  /** Reactions on it: one row per preset that has any. */
  reactions: { preset: string; label: string; count: number }[];
  /** What I reacted with, if I did. */
  myReaction: string | null;
  canReact: boolean;
}

export interface PodMemberRow {
  uid: string;
  name: string;
  initial: string;
  isMe: boolean;
  isStarter: boolean;
  /** Their own today (their time zone). */
  today: string;
  sessionsToday: PodSessionView[];
  showedUpToday: boolean;
  /** Last 7 days ending the viewer's today, oldest first. */
  week: boolean[];
  canNudge: boolean;
  nudgedByMe: boolean;
  canRemove: boolean;
}

export interface PodView {
  members: PodMemberRow[];
  me: PodMemberRow | null;
  isStarter: boolean;
  week: PodWeek;
  weekLine: string;
  streak: number;
  streakLine: string;
  everyone: EveryoneDaysSummary;
  everyoneToday: boolean;
  /** Short line for the card: "Pod: 11 of 14 this week · 6-day streak". */
  summary: string;
  /** The 7 days of the grid, oldest first. */
  weekDays: string[];
  invite: (PodInvite & { live: boolean }) | null;
  /** Fewer than 2 members: nothing to compare yet. */
  alone: boolean;
}

const reactionLabel = (preset: string) => POD_REACTIONS[preset as PodReactionPreset] ?? preset;

/**
 * Everything the Pod screen and Today's card show, from a loaded pod. Pure:
 * `now` is passed in so tests (and a stale screen) get one consistent clock.
 */
export const buildPodView = (data: PodData, myUid: string, now: Date = new Date()): PodView => {
  const iso = now.toISOString();
  const me = data.members.find((m) => m.uid === myUid);
  const viewerToday = localDay(iso, me?.timezone);
  const weekDays = lastDays(viewerToday, 7);

  const members: PodMemberRow[] = data.members.map((m) => {
    const today = localDay(iso, m.timezone);
    const isMe = m.uid === myUid;
    const sessionsToday: PodSessionView[] = (m.days[today] ?? []).map((s) => {
      const on = data.reactions.filter((r) => r.kind === 'reaction' && r.session_id === s.id);
      const counts = new Map<string, number>();
      for (const r of on) counts.set(r.preset, (counts.get(r.preset) ?? 0) + 1);
      const mine = on.find((r) => r.from === myUid) ?? null;
      return {
        id: s.id,
        app: s.app,
        appLabel: podAppLabel(s.app),
        friction: frictionLine(s),
        level: hardestLevel(s),
        day: today,
        reactions: [...counts.entries()].map(([preset, count]) => ({ preset, label: reactionLabel(preset), count })),
        myReaction: mine?.preset ?? null,
        canReact: !isMe && !mine,
      };
    });
    const nudge = { from: myUid, to: m.uid, kind: 'nudge' as const, for_day: today };
    const sent = data.reactions.filter((r) => r.kind === 'nudge');
    const nudgedByMe = sent.some((r) => r.from === myUid && r.to === m.uid && r.for_day === today);
    return {
      uid: m.uid,
      name: m.first_name || 'Someone',
      initial: (m.first_name || '?').charAt(0).toUpperCase(),
      isMe,
      isStarter: m.uid === data.pod.created_by,
      today,
      sessionsToday,
      showedUpToday: showedUp(m, today),
      week: weekDays.map((d) => showedUp(m, d)),
      canNudge: checkPodReaction(nudge, m, sent) === 'ok',
      nudgedByMe,
      canRemove: canRemoveMember(myUid, m.uid, data.pod.created_by, data.pod.member_ids),
    };
  });

  const week = podWeek(data.members, viewerToday);
  const streak = podStreak(data.members, viewerToday);
  const everyone = everyoneDaysSummary(data.pod.everyone_days, viewerToday);
  const weekLine = week.goal > 0 ? `${week.done} of ${week.goal} this week` : `${week.done} this week`;
  const streakLine = streak > 0 ? `${streak}-day streak` : 'No streak yet';
  const invite = data.pod.invite
    ? { ...data.pod.invite, live: Date.parse(data.pod.invite.expires_at) > now.getTime() && data.members.length < 5 }
    : null;

  return {
    members,
    me: members.find((m) => m.isMe) ?? null,
    isStarter: data.pod.created_by === myUid,
    week,
    weekLine,
    streak,
    streakLine,
    everyone,
    everyoneToday: everyoneShowedUp(data.members, viewerToday),
    summary: `Pod: ${weekLine} · ${streakLine}`,
    weekDays,
    invite,
    alone: data.members.length < 2,
  };
};
