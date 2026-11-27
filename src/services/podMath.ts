/**
 * Pods: the pure rules behind a partner or small accountability group.
 * See docs/pods.md for the product decisions.
 *
 * No Firestore and NO IMPORTS, on purpose: the Cloud Functions (joinPod,
 * sendPodReaction, the everyone-showed-up trigger) need the same rules, and
 * functions/ is a separate package. Step 2 copies this file across the way
 * sync-core copies src/utils/meditation/. Keep it self-contained.
 *
 * Days are 'YYYY-MM-DD' strings in the member's own time zone. Ratings are the
 * app's 3-level resistance scale (1 easy … 3 hard).
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Founder, 2026-11-27: "Size cap of 5. No more." */
export const POD_MAX_MEMBERS = 5;
/** How many days of sessions a member doc keeps. Enough for a 7-day week plus slack. */
export const POD_DAYS_KEPT = 14;
/** How many everyone-showed-up days the pod doc keeps. */
export const POD_EVERYONE_DAYS_KEPT = 60;
/** An invite code works for this long (or until the pod is full). */
export const POD_INVITE_DAYS = 7;
export const POD_INVITE_CODE_LENGTH = 6;
/** No look-alikes: no O/0, I/1/L, S/5, B/8, Z/2. */
export const POD_INVITE_ALPHABET = 'ACDEFGHJKMNPQRTUVWXY34679';
/** Pod pushes (reactions + nudges) a member receives a day. Separate from the rule budget. */
export const POD_PUSHES_PER_DAY = 3;
export const POD_FIRST_NAME_MAX = 20;

/** Apps whose weekly count is days logged, not sessions (as Today's Meals ring). */
const DAY_COUNTED_APPS: readonly string[] = ['meals'];

const RATING_MIN = 1;
const RATING_MAX = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One session as the pod sees it. Ratings are absent when friction isn't shared. */
export interface PodSession {
  /** The session or log id, so a deleted session can be taken back out. */
  id: string;
  /** A Today app id: 'meditate' | 'workouts' | 'meals' | later apps. */
  app: string;
  /** How hard to start (1–3). */
  start?: number;
  /** How hard to keep going (1–3). */
  keep?: number;
  /** Meals' day rating (1–3). */
  day?: number;
}

export type PodDays = Record<string, PodSession[]>;

/** What a member doc holds that these rules read. */
export interface PodMemberSummary {
  uid: string;
  /** Weekly goal per app on their Today. An app not here doesn't count. */
  goals: Record<string, number>;
  days: PodDays;
}

export interface PodInvite {
  code: string;
  expires_at: string;
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isPodDay = (s: unknown): s is string =>
  typeof s === 'string' && DAY_PATTERN.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

/** The calendar day of an instant in a time zone. Falls back to the UTC day. */
export const localDay = (iso: string, timezone?: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  if (timezone) {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);
    } catch {
      // Unknown zone: fall through to UTC.
    }
  }
  return d.toISOString().slice(0, 10);
};

/** `day` moved by `n` calendar days (n may be negative). */
export const shiftDay = (day: string, n: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

/** The last `count` days ending on `today`, oldest first. */
export const lastDays = (today: string, count: number): string[] =>
  Array.from({ length: count }, (_, i) => shiftDay(today, i - count + 1));

// ---------------------------------------------------------------------------
// A member's shared days
// ---------------------------------------------------------------------------

const cleanRating = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v)
    ? Math.min(RATING_MAX, Math.max(RATING_MIN, Math.round(v)))
    : undefined;

/**
 * The session as it's shared: ratings clamped to 1–3, and left out entirely
 * when the member has friction sharing off.
 */
export const sharedSession = (session: PodSession, shareFriction: boolean): PodSession => {
  const out: PodSession = { id: session.id, app: session.app };
  if (!shareFriction) return out;
  const start = cleanRating(session.start);
  const keep = cleanRating(session.keep);
  const day = cleanRating(session.day);
  if (start !== undefined) out.start = start;
  if (keep !== undefined) out.keep = keep;
  if (day !== undefined) out.day = day;
  return out;
};

/** Only the last POD_DAYS_KEPT days up to `today`; empty and malformed days dropped. */
export const pruneDays = (days: PodDays | undefined, today: string): PodDays => {
  const oldest = shiftDay(today, -(POD_DAYS_KEPT - 1));
  const out: PodDays = {};
  for (const [day, sessions] of Object.entries(days ?? {})) {
    if (!isPodDay(day) || day < oldest || day > today) continue;
    if (Array.isArray(sessions) && sessions.length > 0) out[day] = sessions;
  }
  return out;
};

/**
 * `days` with the session on `day`. A session already there under the same id
 * (on any day) is replaced, so re-rating or moving a session never doubles it.
 */
export const withSession = (
  days: PodDays | undefined,
  day: string,
  session: PodSession,
  today: string
): PodDays => {
  const cleared = withoutSession(days, session.id);
  cleared[day] = [...(cleared[day] ?? []), session];
  return pruneDays(cleared, today);
};

/** `days` without the session, wherever it was. */
export const withoutSession = (days: PodDays | undefined, id: string): PodDays => {
  const out: PodDays = {};
  for (const [day, sessions] of Object.entries(days ?? {})) {
    const kept = (sessions ?? []).filter((s) => s.id !== id);
    if (kept.length > 0) out[day] = kept;
  }
  return out;
};

export const showedUp = (member: Pick<PodMemberSummary, 'days'>, day: string): boolean =>
  (member.days[day]?.length ?? 0) > 0;

// ---------------------------------------------------------------------------
// Streaks and everyone-showed-up
// ---------------------------------------------------------------------------

/**
 * Days in a row when ANYONE in the pod showed up, ending today. A today with
 * nothing yet never breaks it: the count starts from yesterday instead.
 * Limited by what members keep (POD_DAYS_KEPT): a longer run reads as that.
 */
export const podStreak = (members: readonly Pick<PodMemberSummary, 'days'>[], today: string): number => {
  const anyone = (day: string) => members.some((m) => showedUp(m, day));
  let day = anyone(today) ? today : shiftDay(today, -1);
  let streak = 0;
  while (streak < POD_DAYS_KEPT && anyone(day)) {
    streak += 1;
    day = shiftDay(day, -1);
  }
  return streak;
};

/**
 * Every member showed up on `day`. A pod of one never counts: there's no
 * "everyone" to celebrate yet.
 */
export const everyoneShowedUp = (members: readonly Pick<PodMemberSummary, 'days'>[], day: string): boolean =>
  members.length >= 2 && members.every((m) => showedUp(m, day));

/**
 * The day to celebrate after a member's write, or null.
 *
 * Only a session logged for the writer's own today can set it off: a late
 * Done it for yesterday sends no push, even if it completes yesterday. Once a
 * day is in `alreadyCelebrated` it never fires again.
 */
export const celebrationDay = (
  members: readonly Pick<PodMemberSummary, 'days'>[],
  writtenDay: string,
  writerToday: string,
  alreadyCelebrated: readonly string[] | undefined
): string | null => {
  if (writtenDay !== writerToday) return null;
  if ((alreadyCelebrated ?? []).includes(writtenDay)) return null;
  return everyoneShowedUp(members, writtenDay) ? writtenDay : null;
};

/** `list` with `day` added: unique, sorted, the last POD_EVERYONE_DAYS_KEPT. */
export const recordEveryoneDay = (list: readonly string[] | undefined, day: string): string[] =>
  Array.from(new Set([...(list ?? []).filter(isPodDay), day]))
    .sort()
    .slice(-POD_EVERYONE_DAYS_KEPT);

export interface EveryoneDaysSummary {
  total: number;
  /** Everyone days in a row ending today (or yesterday, if today isn't one yet). */
  current: number;
  best: number;
}

export const everyoneDaysSummary = (list: readonly string[] | undefined, today: string): EveryoneDaysSummary => {
  const days = Array.from(new Set((list ?? []).filter((d) => isPodDay(d) && d <= today))).sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev !== null && shiftDay(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  const set = new Set(days);
  let day = set.has(today) ? today : shiftDay(today, -1);
  let current = 0;
  while (set.has(day)) {
    current += 1;
    day = shiftDay(day, -1);
  }
  return { total: days.length, current, best };
};

// ---------------------------------------------------------------------------
// The week: "Pod: 11 of 14"
// ---------------------------------------------------------------------------

export interface PodWeek {
  done: number;
  goal: number;
}

const cleanGoal = (g: unknown): number =>
  typeof g === 'number' && Number.isFinite(g) && g > 0 ? Math.floor(g) : 0;

/**
 * One member's rolling 7 days ending `today`. Each app counts up to its own
 * goal, so doing extra Workouts can't cover for no Meditate (the same as
 * Today's rings). Meals counts days logged, others count sessions.
 *
 * Meals counts days LOGGED, not days on target: on target is an outcome (the
 * plate score), and the pod shares effort only.
 */
export const memberWeek = (member: PodMemberSummary, today: string): PodWeek => {
  const window = lastDays(today, 7);
  let done = 0;
  let goal = 0;
  for (const [app, rawGoal] of Object.entries(member.goals ?? {})) {
    const g = cleanGoal(rawGoal);
    if (g === 0) continue;
    goal += g;
    const count = DAY_COUNTED_APPS.includes(app)
      ? window.filter((d) => (member.days[d] ?? []).some((s) => s.app === app)).length
      : window.reduce((n, d) => n + (member.days[d] ?? []).filter((s) => s.app === app).length, 0);
    done += Math.min(count, g);
  }
  return { done, goal };
};

/** The pod's week: members' weeks added up. Never says who fell short. */
export const podWeek = (members: readonly PodMemberSummary[], today: string): PodWeek =>
  members.reduce(
    (acc, m) => {
      const w = memberWeek(m, today);
      return { done: acc.done + w.done, goal: acc.goal + w.goal };
    },
    { done: 0, goal: 0 }
  );

// ---------------------------------------------------------------------------
// Reactions, nudges and the pod push budget
// ---------------------------------------------------------------------------

export interface PodReactionRecord {
  from: string;
  to: string;
  kind: 'reaction' | 'nudge';
  /** The session reacted to. Absent on a nudge. */
  session_id?: string;
  for_day: string;
}

export type PodReactionCheck = 'ok' | 'self' | 'already_sent' | 'already_showed_up' | 'no_session';

/**
 * Can `attempt` be sent?
 * - Never to yourself.
 * - A reaction needs a session the receiver shared; one per sender per session.
 * - A nudge only while the receiver hasn't shown up on `for_day` (their today);
 *   one per sender per receiver per day.
 */
export const checkPodReaction = (
  attempt: PodReactionRecord,
  receiver: Pick<PodMemberSummary, 'days'>,
  sent: readonly PodReactionRecord[]
): PodReactionCheck => {
  if (attempt.from === attempt.to) return 'self';
  if (attempt.kind === 'reaction') {
    const exists = (receiver.days[attempt.for_day] ?? []).some((s) => s.id === attempt.session_id);
    if (!attempt.session_id || !exists) return 'no_session';
    const dup = sent.some(
      (r) => r.kind === 'reaction' && r.from === attempt.from && r.session_id === attempt.session_id
    );
    return dup ? 'already_sent' : 'ok';
  }
  if (showedUp(receiver, attempt.for_day)) return 'already_showed_up';
  const dup = sent.some(
    (r) => r.kind === 'nudge' && r.from === attempt.from && r.to === attempt.to && r.for_day === attempt.for_day
  );
  return dup ? 'already_sent' : 'ok';
};

const parseTimes = (list: readonly string[] | undefined): number[] =>
  (list ?? []).map((s) => Date.parse(s)).filter((t) => !Number.isNaN(t));

/**
 * Room for another pod push to this member in the last 24 hours? Kept apart
 * from the rule budget (1 a day, 3 a week), so a reaction never uses up the
 * day's rule push or gets silently dropped by it. The everyone-showed-up push
 * doesn't go through this.
 */
export const podPushAllows = (history: readonly string[] | undefined, nowIso: string): boolean => {
  const now = Date.parse(nowIso);
  if (Number.isNaN(now)) return false;
  return parseTimes(history).filter((t) => now - t < DAY_MS).length < POD_PUSHES_PER_DAY;
};

/** The history to store after a pod push: this one added, older than a day dropped. */
export const recordPodPush = (history: readonly string[] | undefined, nowIso: string): string[] => {
  const now = Date.parse(nowIso);
  const kept = parseTimes(history).filter((t) => Number.isNaN(now) || now - t < DAY_MS);
  const next = Number.isNaN(now) ? kept : [...kept, now];
  return next.slice(-POD_PUSHES_PER_DAY).map((t) => new Date(t).toISOString());
};

// ---------------------------------------------------------------------------
// Invites, joining, leaving
// ---------------------------------------------------------------------------

/** A new code. `random` is injected (Math.random in the app, crypto in functions) for tests. */
export const makeInviteCode = (random: () => number = Math.random): string =>
  Array.from({ length: POD_INVITE_CODE_LENGTH }, () => {
    const i = Math.floor(random() * POD_INVITE_ALPHABET.length);
    return POD_INVITE_ALPHABET[Math.min(Math.max(i, 0), POD_INVITE_ALPHABET.length - 1)];
  }).join('');

/** What someone typed, as a code to look up: upper case, spaces and dashes gone. Null if it can't be one. */
export const normalizeInviteCode = (input: string): string | null => {
  const code = String(input ?? '').toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== POD_INVITE_CODE_LENGTH) return null;
  return [...code].every((c) => POD_INVITE_ALPHABET.includes(c)) ? code : null;
};

export const newInvite = (nowIso: string, random: () => number = Math.random): PodInvite => ({
  code: makeInviteCode(random),
  expires_at: new Date(Date.parse(nowIso) + POD_INVITE_DAYS * DAY_MS).toISOString(),
});

export type JoinCheck = 'ok' | 'no_invite' | 'expired' | 'full' | 'already_member' | 'in_another_pod';

/** Can `uid` join a pod with these members and this invite? (The function runs this in a transaction.) */
export const checkJoin = (args: {
  uid: string;
  code: string;
  memberIds: readonly string[];
  invite: PodInvite | null | undefined;
  /** The joiner's current users/{uid}.pod_id, if any. */
  currentPodId?: string | null;
  podId: string;
  nowIso: string;
}): JoinCheck => {
  const { uid, code, memberIds, invite, currentPodId, podId, nowIso } = args;
  if (memberIds.includes(uid)) return 'already_member';
  if (currentPodId && currentPodId !== podId) return 'in_another_pod';
  if (!invite || invite.code !== code) return 'no_invite';
  const now = Date.parse(nowIso);
  const expires = Date.parse(invite.expires_at);
  if (Number.isNaN(now) || Number.isNaN(expires) || now >= expires) return 'expired';
  if (memberIds.length >= POD_MAX_MEMBERS) return 'full';
  return 'ok';
};

/** Only the person who started the pod can remove someone, and never themselves (that's leaving). */
export const canRemoveMember = (actor: string, target: string, createdBy: string, memberIds: readonly string[]): boolean =>
  actor === createdBy && target !== actor && memberIds.includes(target);

export interface AfterLeave {
  memberIds: string[];
  /** Who can remove members now. The longest-standing member takes over if the starter left. */
  createdBy: string | null;
  /** Nobody left: delete the pod. */
  deletePod: boolean;
}

/** The pod after `uid` leaves or is removed. `memberIds` is in join order. */
export const afterLeave = (memberIds: readonly string[], uid: string, createdBy: string): AfterLeave => {
  const rest = memberIds.filter((id) => id !== uid);
  if (rest.length === 0) return { memberIds: [], createdBy: null, deletePod: true };
  return { memberIds: rest, createdBy: createdBy === uid ? rest[0] : createdBy, deletePod: false };
};

// ---------------------------------------------------------------------------
// First names
// ---------------------------------------------------------------------------

/** Characters a first name can't contain: digits, and anything link- or markup-like. */
const NAME_FORBIDDEN = /[0-9@/\\:<>{}[\]#$%^&*=+_|~`"!?;,()]/;
/** Characters that don't count as the name itself. */
const NAME_PUNCTUATION = /^[\s.'-]*$/;

/**
 * A first name as members will see it: trimmed, inner spaces collapsed, at
 * most POD_FIRST_NAME_MAX characters. Null if it can't be a name (empty,
 * digits, links, symbols). It's the only text a member types, so it's kept to
 * something that reads as a name.
 */
export const cleanFirstName = (input: string | null | undefined): string | null => {
  const name = String(input ?? '').trim().replace(/\s+/g, ' ');
  if (name.length === 0 || [...name].length > POD_FIRST_NAME_MAX) return null;
  if (NAME_FORBIDDEN.test(name) || NAME_PUNCTUATION.test(name)) return null;
  return name;
};

/**
 * The name to pre-fill: Google's given name, else the first word of the full
 * name, cleaned. Null when neither works (then the field starts empty).
 */
export const suggestedFirstName = (givenName?: string | null, fullName?: string | null): string | null =>
  cleanFirstName(givenName) ?? cleanFirstName(String(fullName ?? '').trim().split(/\s+/)[0]);

// ---------------------------------------------------------------------------
// Input from the app (the callables clean everything they're sent)
// ---------------------------------------------------------------------------

const APP_ID = /^[a-z][a-z0-9_]{1,19}$/;
const MAX_GOAL = 14;
const MAX_APPS = 10;

/** Weekly goals as the app sent them: known-looking app ids, whole numbers 1–14, at most 10 apps. */
export const cleanGoals = (input: unknown): Record<string, number> => {
  const out: Record<string, number> = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
  for (const [app, g] of Object.entries(input as Record<string, unknown>)) {
    if (Object.keys(out).length >= MAX_APPS) break;
    if (!APP_ID.test(app) || typeof g !== 'number' || !Number.isFinite(g)) continue;
    const goal = Math.min(MAX_GOAL, Math.floor(g));
    if (goal >= 1) out[app] = goal;
  }
  return out;
};

/** An IANA time zone the runtime knows, else null. */
export const cleanTimezone = (input: unknown): string | null => {
  if (typeof input !== 'string' || input.length === 0 || input.length > 64) return null;
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: input });
    return input;
  } catch {
    return null;
  }
};

/**
 * Did this write add a session on `day` that wasn't there before? The
 * everyone-showed-up trigger only looks when it did, so a friction toggle or a
 * goal change never sets it off.
 */
export const addedSessionOn = (before: PodDays | undefined, after: PodDays | undefined, day: string): boolean => {
  const had = new Set((before?.[day] ?? []).map((s) => s.id));
  return (after?.[day] ?? []).some((s) => !had.has(s.id));
};

// ---------------------------------------------------------------------------
// Presets and push wording
// ---------------------------------------------------------------------------

/** Reactions on a session. Ids are stored; the wording can change. */
export const POD_REACTIONS = {
  showed_up: 'Showed up anyway',
  hard_one: 'Hard one, done',
  proud: 'Proud of you',
} as const;
export type PodReactionPreset = keyof typeof POD_REACTIONS;

/** Nudges for someone who hasn't shown up yet today. */
export const POD_NUDGES = {
  with_you: 'Your pod is with you today',
} as const;
export type PodNudgePreset = keyof typeof POD_NUDGES;

export const isPodPreset = (kind: 'reaction' | 'nudge', preset: unknown): boolean =>
  typeof preset === 'string' &&
  Object.prototype.hasOwnProperty.call(kind === 'reaction' ? POD_REACTIONS : POD_NUDGES, preset);

const APP_LABELS: Record<string, string> = { meditate: 'Meditate', workouts: 'Workouts', meals: 'Meals' };

export const podAppLabel = (app: string): string =>
  APP_LABELS[app] ?? (app ? app.charAt(0).toUpperCase() + app.slice(1) : 'session');

export interface PodPushText {
  title: string;
  body: string;
}

/** A reaction or nudge push, from `sender` (a first name). `app` is the session's, for a reaction. */
export const podReactionPush = (
  kind: 'reaction' | 'nudge',
  preset: string,
  sender: string,
  app?: string
): PodPushText => {
  if (kind === 'nudge') {
    const line = POD_NUDGES[preset as PodNudgePreset] ?? POD_NUDGES.with_you;
    return { title: sender, body: `${line}.` };
  }
  const line = POD_REACTIONS[preset as PodReactionPreset] ?? POD_REACTIONS.showed_up;
  return { title: sender, body: `On your ${podAppLabel(app ?? '')}: “${line}”` };
};

/** The push everyone gets when the whole pod showed up. */
export const everyonePush = (memberCount: number): PodPushText => ({
  title: 'Everyone showed up today',
  body: memberCount === 2 ? 'Both of you did it.' : `All ${memberCount} of you did it.`,
});
