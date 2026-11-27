/**
 * Pods: a partner or small accountability group (2–5 people). See docs/pods.md.
 *
 * Everything that touches more than the caller's own member doc happens here,
 * so the security rules stay simple and the size cap can't be raced:
 *   createPod, joinPod, newPodInvite, leavePod, removeFromPod  (callables)
 *   sendPodReaction                                            (callable + push)
 *   onPodMemberWritten        (trigger: everyone showed up → one push to all)
 *   leavePodFor               (used by deleteAccount in index.ts)
 *
 * The app writes only pods/{podId}/members/{its own uid}: the days it shares,
 * its goals, time zone, first name and friction toggle (firestore.rules
 * limits it to those fields).
 *
 * The rules themselves (cap, streaks, limits, wording) are
 * src/services/podMath.ts, copied into ./pod-core by `npm run sync-core`
 * (runs before deploy) and tested there. Edit the original, never the copy.
 *
 * Data:
 *   pods/{podId}                 created_by, created_at, member_ids (join
 *                                order), everyone_days, invite {code, expires_at}
 *   pods/{podId}/members/{uid}   first_name, joined_at, timezone, goals,
 *                                share_friction, days, updated_at
 *   pods/{podId}/reactions/{id}  from, to, kind, preset, session_id?, for_day,
 *                                created_at. Ids are deterministic, so a double
 *                                tap can't send twice.
 *   podInvites/{code}            pod_id, expires_at   (server-only)
 *   users/{uid}                  pod_id, pod_push_history (server-only);
 *                                first_name, pod_muted (the app's)
 */

import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { randomInt } from "crypto";
import {
  POD_DAYS_KEPT,
  addedSessionOn,
  afterLeave,
  canRemoveMember,
  celebrationDay,
  checkJoin,
  checkPodReaction,
  cleanFirstName,
  cleanGoals,
  cleanTimezone,
  everyonePush,
  isPodDay,
  isPodPreset,
  localDay,
  newInvite,
  normalizeInviteCode,
  podPushAllows,
  podReactionPush,
  recordEveryoneDay,
  recordPodPush,
  shiftDay,
  type JoinCheck,
  type PodDays,
  type PodInvite,
  type PodMemberSummary,
  type PodReactionCheck,
  type PodReactionRecord,
} from "./pod-core/podMath";
import { deliverPush } from "./push";

// Lazy: index.ts imports this module before it calls initializeApp().
const db = () => admin.firestore();

/** The zone the rest of the server assumes when a user has none. */
const DEFAULT_TIMEZONE = "America/New_York";

const podRef = (podId: string) => db().collection("pods").doc(podId);
const memberRef = (podId: string, uid: string) => podRef(podId).collection("members").doc(uid);
const inviteRef = (code: string) => db().collection("podInvites").doc(code);
const userRef = (uid: string) => db().collection("users").doc(uid);

/** Uniform in [0, 1), from the crypto module: invite codes shouldn't be guessable. */
const secureRandom = () => randomInt(0, 2 ** 32) / 2 ** 32;

interface PodDoc {
  created_by: string;
  created_at: string;
  member_ids: string[];
  everyone_days?: string[];
  invite?: PodInvite | null;
}

/** Errors carry a machine-readable reason the app maps to its own wording. */
const fail = (
  code: "invalid-argument" | "not-found" | "failed-precondition" | "permission-denied" | "resource-exhausted",
  reason: string,
  message: string
): never => {
  throw new HttpsError(code, message, { reason });
};

const requireAuth = (request: CallableRequest): string => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "You must be signed in.");
  return uid;
};

const asRecord = (data: unknown): Record<string, unknown> =>
  data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};

/** The member fields the app sends when starting or joining. */
const memberInput = (data: Record<string, unknown>) => {
  const firstName = cleanFirstName(typeof data.firstName === "string" ? data.firstName : null);
  if (!firstName) fail("invalid-argument", "bad_name", "That doesn't look like a first name.");
  return {
    first_name: firstName as string,
    timezone: cleanTimezone(data.timezone) ?? DEFAULT_TIMEZONE,
    goals: cleanGoals(data.goals),
    share_friction: data.shareFriction !== false,
  };
};

/**
 * The pod a user is really in: their pod_id, but only if that pod still lists
 * them. A stale pointer (pod deleted, removed while offline) reads as none.
 */
const currentPod = async (
  tx: admin.firestore.Transaction,
  uid: string,
  userData: admin.firestore.DocumentData | undefined
): Promise<{ id: string; data: PodDoc } | null> => {
  const id = typeof userData?.pod_id === "string" ? userData.pod_id : null;
  if (!id) return null;
  const snap = await tx.get(podRef(id));
  const data = snap.data() as PodDoc | undefined;
  return data && data.member_ids.includes(uid) ? { id, data } : null;
};

/**
 * A fresh invite whose code nobody live is using. Reads only, so call it
 * before the transaction's writes. An expired code can be reused.
 */
const freeInvite = async (tx: admin.firestore.Transaction, nowIso: string): Promise<PodInvite> => {
  for (let attempt = 0; attempt < 6; attempt++) {
    const invite = newInvite(nowIso, secureRandom);
    const snap = await tx.get(inviteRef(invite.code));
    const expires = snap.exists ? Date.parse(String(snap.get("expires_at"))) : NaN;
    if (!snap.exists || Number.isNaN(expires) || expires <= Date.parse(nowIso)) return invite;
  }
  return fail("resource-exhausted", "no_code", "Couldn't make an invite code. Try again.");
};

const JOIN_ERRORS: Record<Exclude<JoinCheck, "ok" | "already_member">, () => never> = {
  no_invite: () => fail("not-found", "no_invite", "That code doesn't match a pod."),
  expired: () => fail("failed-precondition", "expired", "That code has expired. Ask for a new one."),
  full: () => fail("failed-precondition", "full", "That pod is full."),
  in_another_pod: () => fail("failed-precondition", "in_another_pod", "You're already in a pod."),
};

// ---------------------------------------------------------------------------
// Starting, joining, inviting
// ---------------------------------------------------------------------------

/** Start a pod with yourself in it. Returns its id and an invite to share. */
export const createPod = onCall(async (request) => {
  const uid = requireAuth(request);
  const member = memberInput(asRecord(request.data));
  const now = new Date().toISOString();
  const ref = db().collection("pods").doc();

  const invite = await db().runTransaction(async (tx) => {
    const user = await tx.get(userRef(uid));
    if (await currentPod(tx, uid, user.data())) JOIN_ERRORS.in_another_pod();
    const fresh = await freeInvite(tx, now);

    const pod: PodDoc = { created_by: uid, created_at: now, member_ids: [uid], everyone_days: [], invite: fresh };
    tx.set(ref, pod);
    tx.set(memberRef(ref.id, uid), { ...member, joined_at: now, days: {}, updated_at: now });
    tx.set(inviteRef(fresh.code), { pod_id: ref.id, expires_at: fresh.expires_at });
    tx.set(userRef(uid), { pod_id: ref.id, first_name: member.first_name }, { merge: true });
    return fresh;
  });

  return { podId: ref.id, code: invite.code, expiresAt: invite.expires_at };
});

/** Join with a code. Joining a pod you're already in just returns it. */
export const joinPod = onCall(async (request) => {
  const uid = requireAuth(request);
  const data = asRecord(request.data);
  const code = normalizeInviteCode(typeof data.code === "string" ? data.code : "");
  if (!code) JOIN_ERRORS.no_invite();
  const member = memberInput(data);
  const now = new Date().toISOString();

  const podId = await db().runTransaction(async (tx) => {
    const invite = await tx.get(inviteRef(code as string));
    const id = invite.get("pod_id");
    if (typeof id !== "string") return JOIN_ERRORS.no_invite();
    const podSnap = await tx.get(podRef(id));
    const pod = podSnap.data() as PodDoc | undefined;
    if (!pod) return JOIN_ERRORS.no_invite();
    const user = await tx.get(userRef(uid));
    const mine = await currentPod(tx, uid, user.data());

    const check = checkJoin({
      uid,
      code: code as string,
      memberIds: pod.member_ids,
      invite: pod.invite,
      currentPodId: mine?.id ?? null,
      podId: id,
      nowIso: now,
    });
    if (check === "already_member") return id;
    if (check !== "ok") return JOIN_ERRORS[check]();

    tx.update(podRef(id), { member_ids: [...pod.member_ids, uid] });
    tx.set(memberRef(id, uid), { ...member, joined_at: now, days: {}, updated_at: now });
    tx.set(userRef(uid), { pod_id: id, first_name: member.first_name }, { merge: true });
    return id;
  });

  return { podId };
});

/** A new invite code for your pod. The old one stops working. */
export const newPodInvite = onCall(async (request) => {
  const uid = requireAuth(request);
  const now = new Date().toISOString();

  const invite = await db().runTransaction(async (tx) => {
    const user = await tx.get(userRef(uid));
    const pod = await currentPod(tx, uid, user.data());
    if (!pod) return fail("failed-precondition", "no_pod", "You're not in a pod.");
    const fresh = await freeInvite(tx, now);

    const old = pod.data.invite?.code;
    if (old) tx.delete(inviteRef(old));
    tx.set(inviteRef(fresh.code), { pod_id: pod.id, expires_at: fresh.expires_at });
    tx.update(podRef(pod.id), { invite: fresh });
    return fresh;
  });

  return { code: invite.code, expiresAt: invite.expires_at };
});

// ---------------------------------------------------------------------------
// Leaving and removing
// ---------------------------------------------------------------------------

/**
 * Take `uid` out of their pod: off the member list, their member doc and every
 * reaction from or to them deleted, their pod_id cleared. The last one out
 * deletes the pod. If the starter leaves, the longest-standing member can
 * remove people from then on.
 *
 * `actor` is who asked: themselves (leaving, or deleting their account), or
 * the pod's starter (removing them). Safe to call when they're in no pod.
 */
export const leavePodFor = async (uid: string, actor: string = uid): Promise<void> => {
  const result = await db().runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef(uid));
    const pod = await currentPod(tx, uid, userSnap.data());
    if (!pod) {
      if (userSnap.exists && userSnap.get("pod_id") !== undefined) {
        tx.update(userRef(uid), { pod_id: FieldValue.delete() });
      }
      return null;
    }
    if (actor !== uid && !canRemoveMember(actor, uid, pod.data.created_by, pod.data.member_ids)) {
      return fail("permission-denied", "not_allowed", "Only the person who started the pod can remove someone.");
    }

    const next = afterLeave(pod.data.member_ids, uid, pod.data.created_by);
    if (next.deletePod) {
      tx.delete(podRef(pod.id));
      if (pod.data.invite?.code) tx.delete(inviteRef(pod.data.invite.code));
    } else {
      tx.update(podRef(pod.id), { member_ids: next.memberIds, created_by: next.createdBy });
    }
    tx.delete(memberRef(pod.id, uid));
    tx.update(userRef(uid), { pod_id: FieldValue.delete() });
    return { podId: pod.id, deleted: next.deletePod };
  });

  if (!result) return;
  if (result.deleted) {
    // What's left under the pod (old reactions).
    await db().recursiveDelete(podRef(result.podId));
    return;
  }
  const reactions = podRef(result.podId).collection("reactions");
  const [from, to] = await Promise.all([
    reactions.where("from", "==", uid).get(),
    reactions.where("to", "==", uid).get(),
  ]);
  const writer = db().bulkWriter();
  for (const d of [...from.docs, ...to.docs]) writer.delete(d.ref);
  await writer.close();
};

export const leavePod = onCall(async (request) => {
  const uid = requireAuth(request);
  await leavePodFor(uid);
  return { left: true };
});

/** The starter removes someone. */
export const removeFromPod = onCall(async (request) => {
  const actor = requireAuth(request);
  const target = asRecord(request.data).uid;
  if (typeof target !== "string" || target === actor) {
    return fail("invalid-argument", "bad_member", "Pick someone else in your pod.");
  }
  // leavePodFor reads the TARGET's pod; make sure it's the actor's too.
  const actorPod = (await userRef(actor).get()).get("pod_id");
  const targetPod = (await userRef(target).get()).get("pod_id");
  if (!actorPod || actorPod !== targetPod) {
    return fail("permission-denied", "not_allowed", "They're not in your pod.");
  }
  await leavePodFor(target, actor);
  return { removed: true };
});

// ---------------------------------------------------------------------------
// Reactions and nudges
// ---------------------------------------------------------------------------

const REACTION_ERRORS: Record<Exclude<PodReactionCheck, "ok">, () => never> = {
  self: () => fail("invalid-argument", "self", "That's you."),
  already_sent: () => fail("failed-precondition", "already_sent", "Already sent."),
  already_showed_up: () => fail("failed-precondition", "already_showed_up", "They've already shown up today."),
  no_session: () => fail("not-found", "no_session", "That session isn't there any more."),
};

/** Ids go into doc ids: nothing that could be a path. */
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * React to a podmate's session, or nudge one who hasn't shown up today.
 * The reaction is saved whatever happens to the push; the push respects the
 * receiver's mute and the pod push budget (POD_PUSHES_PER_DAY).
 */
export const sendPodReaction = onCall(async (request) => {
  const from = requireAuth(request);
  const data = asRecord(request.data);
  const kind = data.kind === "nudge" ? "nudge" : data.kind === "reaction" ? "reaction" : null;
  const to = data.to;
  const preset = data.preset;
  if (!kind || typeof to !== "string" || !SAFE_ID.test(to) || !isPodPreset(kind, preset)) {
    return fail("invalid-argument", "bad_reaction", "That can't be sent.");
  }
  const sessionId = typeof data.sessionId === "string" ? data.sessionId : undefined;
  if (kind === "reaction" && (!sessionId || !SAFE_ID.test(sessionId))) REACTION_ERRORS.no_session();

  const now = new Date();
  const nowIso = now.toISOString();

  const sent = await db().runTransaction(async (tx) => {
    const fromUser = await tx.get(userRef(from));
    const pod = await currentPod(tx, from, fromUser.data());
    if (!pod || !pod.data.member_ids.includes(to)) {
      return fail("permission-denied", "not_allowed", "They're not in your pod.");
    }
    const [receiverSnap, senderSnap] = await tx.getAll(memberRef(pod.id, to), memberRef(pod.id, from));
    const receiver = receiverSnap.data();
    if (!receiver) return REACTION_ERRORS.no_session();

    // A nudge is always for the receiver's own today, whatever the app thinks.
    const forDay =
      kind === "nudge" ? localDay(nowIso, receiver.timezone) : typeof data.forDay === "string" ? data.forDay : "";
    if (!isPodDay(forDay)) return REACTION_ERRORS.no_session();

    const id = kind === "nudge" ? `nudge_${from}_${to}_${forDay}` : `r_${from}_${sessionId}`;
    const ref = podRef(pod.id).collection("reactions").doc(id);
    const existing = await tx.get(ref);

    const attempt: PodReactionRecord = { from, to, kind, for_day: forDay, ...(sessionId && kind === "reaction" ? { session_id: sessionId } : {}) };
    const check = checkPodReaction(attempt, { days: (receiver.days ?? {}) as PodDays }, existing.exists ? [attempt] : []);
    if (check !== "ok") return REACTION_ERRORS[check]();

    tx.create(ref, { ...attempt, preset, created_at: nowIso });

    const app =
      kind === "reaction"
        ? ((receiver.days?.[forDay] ?? []) as { id: string; app: string }[]).find((s) => s.id === sessionId)?.app
        : undefined;
    return { podId: pod.id, senderName: String(senderSnap.get("first_name") ?? "Your pod"), app, forDay };
  });

  const pushed = await sendPodPush(to, nowIso, podReactionPush(kind, preset as string, sent.senderName, sent.app), {
    type: "pod",
    kind,
  });

  // Housekeeping: reactions older than the days members keep.
  const cutoff = shiftDay(localDay(nowIso), -POD_DAYS_KEPT);
  const old = await podRef(sent.podId).collection("reactions").where("for_day", "<", cutoff).limit(100).get();
  if (!old.empty) {
    const batch = db().batch();
    old.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  return { sent: true, pushed };
});

/** A reaction or nudge push, if the receiver hasn't muted pods and has budget left. */
const sendPodPush = async (
  uid: string,
  nowIso: string,
  text: { title: string; body: string },
  data: Record<string, string>
): Promise<boolean> => {
  const ref = userRef(uid);
  const token = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.get("pod_muted") === true) return null;
    const token = snap.get("expoPushToken");
    if (typeof token !== "string" || !token) return null;
    const history = snap.get("pod_push_history") as string[] | undefined;
    if (!podPushAllows(history, nowIso)) return null;
    tx.update(ref, { pod_push_history: recordPodPush(history, nowIso) });
    return token;
  });
  return token ? deliverPush(uid, token, text.title, text.body, data) : false;
};

// ---------------------------------------------------------------------------
// Everyone showed up
// ---------------------------------------------------------------------------

/**
 * When a member's write adds a session on their own today and that makes
 * everyone in the pod, record the day and tell everyone, once. A late Done it,
 * a friction toggle or a goal change never sets it off.
 */
export const onPodMemberWritten = onDocumentWritten("pods/{podId}/members/{uid}", async (event) => {
  const after = event.data?.after.data();
  if (!after) return;
  const before = event.data?.before.data();
  const podId = event.params.podId;
  const nowIso = new Date().toISOString();
  const writerToday = localDay(nowIso, after.timezone);
  if (!addedSessionOn(before?.days, after.days, writerToday)) return;

  const memberIds = await db().runTransaction(async (tx) => {
    const podSnap = await tx.get(podRef(podId));
    const pod = podSnap.data() as PodDoc | undefined;
    if (!pod || pod.member_ids.length < 2) return null;
    const snaps = await tx.getAll(...pod.member_ids.map((id) => memberRef(podId, id)));
    if (snaps.some((s) => !s.exists)) return null;
    const members: PodMemberSummary[] = snaps.map((s) => ({
      uid: s.id,
      goals: (s.get("goals") ?? {}) as Record<string, number>,
      days: (s.get("days") ?? {}) as PodDays,
    }));
    const day = celebrationDay(members, writerToday, writerToday, pod.everyone_days);
    if (!day) return null;
    tx.update(podRef(podId), { everyone_days: recordEveryoneDay(pod.everyone_days, day) });
    return pod.member_ids;
  });
  if (!memberIds) return;

  const text = everyonePush(memberIds.length);
  const users = await db().getAll(...memberIds.map(userRef));
  await Promise.all(
    users.map((u) => {
      const token = u.get("expoPushToken");
      if (u.get("pod_muted") === true || typeof token !== "string" || !token) return false;
      return deliverPush(u.id, token, text.title, text.body, { type: "pod", kind: "everyone" });
    })
  );
});
