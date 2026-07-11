import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { Expo, ExpoPushMessage } from "expo-server-sdk";
import {
  POOL_PLACEHOLDER_KEYS,
  Rule,
  RuleState,
  buildUserFacts,
  ctaTargetData,
  frequencyAllows,
  referencedGlobalKeys,
  renderTemplate,
  resolveUserGlobals,
  ruleMatches,
  truncateForPush,
} from "./rulesEngine";

admin.initializeApp();
const db = admin.firestore();
const expo = new Expo();

// Global kill switch for push notifications — set to false to disable all sends
const PUSH_NOTIFICATIONS_ENABLED = true;

// Common timezones to check against for hourly scheduled functions.
// Firestore 'in' queries support up to 30 values, so we can include all major zones.
const COMMON_TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Phoenix", "America/Anchorage", "Pacific/Honolulu", "America/Toronto",
  "America/Vancouver", "America/Edmonton", "America/Winnipeg", "America/Halifax",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Rome",
  "Europe/Madrid", "Europe/Amsterdam", "Europe/Stockholm", "Europe/Zurich",
  "Asia/Tokyo", "Asia/Shanghai", "Asia/Kolkata", "Asia/Dubai",
  "Australia/Sydney", "Australia/Melbourne", "Australia/Perth",
  "Pacific/Auckland", "America/Sao_Paulo", "America/Mexico_City",
];

/**
 * Returns the list of timezones where the current hour matches `targetHour`.
 * Used to pre-filter users by timezone in scheduled functions instead of
 * fetching all users and checking the hour in a loop.
 */
const getTimezonesAtHour = (targetHour: number): string[] => {
  return COMMON_TIMEZONES.filter((tz) => getHourInTimezone(tz) === targetHour);
};

/**
 * Fetch only users whose timezone is currently at the given hour and who have
 * a push token. Falls back to fetching users with the default timezone
 * ("America/New_York") if no matching timezones are found.
 *
 * Uses Firestore 'in' query (max 30 values) to avoid reading every user doc.
 */
const getUsersAtHour = async (
  targetHour: number
): Promise<admin.firestore.QueryDocumentSnapshot[]> => {
  const matchingTimezones = getTimezonesAtHour(targetHour);
  if (matchingTimezones.length === 0) return [];

  // Firestore 'in' supports up to 30 values — we stay under that limit
  const chunks: string[][] = [];
  for (let i = 0; i < matchingTimezones.length; i += 30) {
    chunks.push(matchingTimezones.slice(i, i + 30));
  }

  const allDocs: admin.firestore.QueryDocumentSnapshot[] = [];
  for (const chunk of chunks) {
    const snap = await db
      .collection("users")
      .where("timezone", "in", chunk)
      .get();
    allDocs.push(...snap.docs);
  }

  // Also include users with no timezone set, defaulting them to America/New_York
  if (matchingTimezones.includes("America/New_York")) {
    const noTzSnap = await db
      .collection("users")
      .where("timezone", "==", null)
      .get();
    allDocs.push(...noTzSnap.docs);

    // Also catch users where timezone field doesn't exist (empty string)
    const emptyTzSnap = await db
      .collection("users")
      .where("timezone", "==", "")
      .get();
    allDocs.push(...emptyTzSnap.docs);
  }

  return allDocs;
};

// Helper to get today's date in YYYY-MM-DD format for a specific timezone
const getDateInTimezone = (timezone: string): string => {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(now); // Returns YYYY-MM-DD
  } catch {
    // Fallback to UTC if timezone is invalid
    return new Date().toISOString().split("T")[0];
  }
};

// Helper to get current hour in a specific timezone
const getHourInTimezone = (timezone: string): number => {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    // Intl with hour12:false can return "24" at midnight — normalize to 0
    return parseInt(formatter.format(now), 10) % 24;
  } catch {
    return -1; // Invalid timezone
  }
};

// Helper to send push notification via Expo
const sendPushNotification = async (
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> => {
  if (!PUSH_NOTIFICATIONS_ENABLED) {
    console.log("Push notifications disabled — skipping");
    return;
  }
  if (!Expo.isExpoPushToken(pushToken)) {
    console.log(`Invalid Expo push token: ${pushToken}`);
    return;
  }

  const message: ExpoPushMessage = {
    to: pushToken,
    sound: "default",
    title,
    body,
    ...(data && { data }),
  };

  try {
    const chunks = expo.chunkPushNotifications([message]);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
    console.log(`Notification sent to ${pushToken}: ${title}`);
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
};

// ============================================
// Rules engine: event-triggered push rules
// The Firestore triggers and crons below are thin evaluation points — they
// detect their event, but whether a push fires (and its copy, conditions,
// and frequency cap) comes from the matching `rules/` document. When no rule
// document exists for an event, the default below is auto-seeded ENABLED
// with the original hardcoded copy, so behavior is continuous and the rule
// becomes editable from the Admin screen.
// KEEP IN SYNC with DEFAULT_RULES in src/services/rules.ts (matched by name).
// ============================================

const DEFAULT_EVENT_RULES: Record<string, Omit<Rule, "id" | "created_at" | "updated_at">> = {
  challenge_failed: {
    name: "Challenge failed encouragement",
    description: "Immediate encouragement when a user's challenge is marked failed.",
    enabled: true,
    surface: "push",
    event: "challenge_failed",
    conditions: [],
    frequency: { type: "always" },
    priority: 20,
    content: {
      title: "Growth Through Effort",
      body: "Failure is part of the journey. The fact that you tried is what matters most. Every attempt builds your willpower.",
    },
  },
  micro_commitment_followup: {
    name: "Micro-commitment follow-up",
    description: "Day-after check-in on a micro-exercise commitment. The 'Hour of day' condition sets the local send hour. Placeholders: {commitment}.",
    enabled: true,
    surface: "push",
    event: "micro_commitment_followup",
    conditions: [{ fact: "local_hour", op: "==", value: 10 }],
    frequency: { type: "always" },
    priority: 20,
    content: {
      title: "How did your commitment go?",
      body: 'Yesterday you said: "{commitment}"',
    },
  },
};

/**
 * Load the highest-priority enabled push rule for an event. If NO rule
 * document exists for the event (as opposed to existing but disabled), the
 * default rule is auto-seeded enabled and returned.
 */
const getPushRuleForEvent = async (event: string): Promise<Rule | null> => {
  const snap = await db.collection("rules").where("event", "==", event).get();

  if (snap.empty) {
    const def = DEFAULT_EVENT_RULES[event];
    if (!def) return null;
    const now = new Date().toISOString();
    const ref = await db
      .collection("rules")
      .add({ ...def, created_at: now, updated_at: now });
    console.log(`Auto-seeded default rule for event "${event}" (${ref.id})`);
    return { ...def, id: ref.id, created_at: now, updated_at: now };
  }

  const rules = snap.docs
    .map((d) => ({ ...(d.data() as Omit<Rule, "id">), id: d.id }))
    .filter((r) => r.enabled && r.surface === "push")
    .sort((a, b) => b.priority - a.priority);
  return rules[0] ?? null;
};

// Per-run cache of shared content pools (tidbits, fun facts, reward
// messages), loaded lazily — only when a rule's content references them.
type PoolCache = Record<string, string[] | undefined>;

const loadPool = async (key: string, cache: PoolCache): Promise<string[]> => {
  const cached = cache[key];
  if (cached) return cached;
  let values: string[] = [];
  if (key === "tidbit") {
    const snap = await db.collection("neuroscienceTidbits").where("active", "==", true).get();
    values = snap.docs.map((d) => d.data().text).filter(Boolean);
  } else if (key === "fun_fact") {
    const snap = await db.collection("funFacts").get();
    values = snap.docs.map((d) => d.data().fact).filter(Boolean);
  } else if (key === "reward_message") {
    const snap = await db.collection("rewardMessages").where("active", "==", true).get();
    values = snap.docs.map((d) => d.data().text).filter(Boolean);
  }
  cache[key] = values;
  return values;
};

/**
 * Resolve the global placeholders a rule references, for one user. Returns
 * null when any referenced placeholder is unresolvable — per policy the
 * rule then does not fire for that user at all.
 */
const resolveGlobalVars = async (
  rule: Rule,
  userId: string,
  userData: Record<string, any>,
  poolCache: PoolCache
): Promise<Record<string, string> | null> => {
  const keys = referencedGlobalKeys(rule.content);
  if (keys.length === 0) return {};

  const { vars, missing } = resolveUserGlobals(
    keys.filter((k) => !POOL_PLACEHOLDER_KEYS.includes(k)),
    userData
  );
  if (missing.length > 0) {
    console.log(
      `Rule "${rule.name}": user ${userId} has no value for {${missing.join("}, {")}} — skipping`
    );
    return null;
  }

  for (const key of keys.filter((k) => POOL_PLACEHOLDER_KEYS.includes(k))) {
    let value: string | null = null;
    if (key === "proof_point") {
      const snap = await db.collection("users").doc(userId).collection("proofPoints").get();
      const entries = snap.docs.map((d) => d.data().what_you_did).filter(Boolean);
      value = entries.length ? entries[Math.floor(Math.random() * entries.length)] : null;
    } else {
      const pool = await loadPool(key, poolCache);
      value = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    }
    if (!value || !String(value).trim()) {
      console.log(`Rule "${rule.name}": no content for {${key}} (user ${userId}) — skipping`);
      return null;
    }
    vars[key] = truncateForPush(String(value));
  }
  return vars;
};

/**
 * Evaluate an event-triggered push rule for one recipient: condition match
 * against their user facts, frequency cap via ruleState, template rendering,
 * send, and fire recording. Returns true if a push was sent.
 */
const fireEventRuleForUser = async (
  rule: Rule,
  userId: string,
  userData: Record<string, any> | undefined,
  templateVars: Record<string, string>,
  data?: Record<string, string>
): Promise<boolean> => {
  const pushToken = userData?.expoPushToken;
  if (!userData || !pushToken || !Expo.isExpoPushToken(pushToken)) {
    console.log(`No valid push token for user ${userId} — skipping rule "${rule.name}"`);
    return false;
  }

  const timezone = userData.timezone || "America/New_York";
  const localHour = getHourInTimezone(timezone);
  if (localHour < 0) return false; // invalid timezone
  const todayLocal = getDateInTimezone(timezone);
  const facts = buildUserFacts(userData, todayLocal, localHour);

  if (!ruleMatches(rule, facts)) {
    console.log(`Rule "${rule.name}" conditions not met for user ${userId}`);
    return false;
  }

  const stateRef = db
    .collection("users")
    .doc(userId)
    .collection("ruleState")
    .doc(rule.id);
  const stateSnap = await stateRef.get();
  const state = stateSnap.exists ? (stateSnap.data() as RuleState) : null;
  const nowIso = new Date().toISOString();
  if (!frequencyAllows(rule, state, nowIso, todayLocal)) {
    console.log(`Rule "${rule.name}" frequency cap blocked user ${userId}`);
    return false;
  }

  // Global placeholders ({tidbit}, {why_statement}, ...); unresolvable → no
  // push for this user. Event vars win on key collisions (e.g. {username}
  // on team_activity is the teammate, not the recipient).
  const globalVars = await resolveGlobalVars(rule, userId, userData, {});
  if (globalVars === null) return false;
  const vars = { ...globalVars, ...templateVars };

  await sendPushNotification(
    pushToken,
    renderTemplate(rule.content.title, vars),
    renderTemplate(rule.content.body, vars),
    { rule_id: rule.id, ...ctaTargetData(rule), ...data }
  );
  await stateRef.set(
    {
      rule_id: rule.id,
      last_fired_at: nowIso,
      last_fired_date: todayLocal,
      fire_count: admin.firestore.FieldValue.increment(1),
    },
    { merge: true }
  );
  console.log(`Rule "${rule.name}" fired for user ${userId}`);
  return true;
};

// ============================================
// 3. Challenge Failed: Immediate encouragement
// Triggers when a challenge status changes to 'failed'
// ============================================
export const onChallengeFailure = onDocumentUpdated(
  "users/{userId}/challenges/{challengeId}",
  async (event) => {
    if (!PUSH_NOTIFICATIONS_ENABLED) return;

    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData) return;

    // Only trigger when status changes TO 'failed'
    if (beforeData.status === "failed" || afterData.status !== "failed") return;

    const rule = await getPushRuleForEvent("challenge_failed");
    if (!rule) {
      console.log("No enabled challenge_failed rule — skipping");
      return;
    }

    const userId = event.params.userId;
    const userDoc = await db.collection("users").doc(userId).get();
    await fireEventRuleForUser(rule, userId, userDoc.data(), {
      challenge_name: afterData.name || "your challenge",
    });
  }
);

// ============================================================================
// 9. Micro-commitment follow-up notifications
// Runs every hour; sends a follow-up notification the day after a micro-exercise
// is completed, checking in on the user's commitment.
// ============================================================================
export const checkMicroCommitmentFollowUps = onSchedule(
  {
    schedule: "0 * * * *", // Every hour at minute 0
    timeZone: "UTC",
  },
  async () => {
    if (!PUSH_NOTIFICATIONS_ENABLED) {
      console.log("Push notifications disabled — skipping commitment follow-ups");
      return;
    }
    console.log("Running micro commitment follow-up check...");

    const rule = await getPushRuleForEvent("micro_commitment_followup");
    if (!rule) {
      console.log("No enabled micro_commitment_followup rule — skipping");
      return;
    }

    // The rule's "Hour of day ==" condition sets the local send hour
    const hourCond = rule.conditions.find((c) => c.fact === "local_hour" && c.op === "==");
    const targetHour = hourCond ? hourCond.value : 10;

    // Only fetch users whose timezone is currently at the target hour
    const userDocs = await getUsersAtHour(targetHour);
    console.log(`Found ${userDocs.length} users at hour ${targetHour}`);

    for (const userDoc of userDocs) {
      try {
        const userData = userDoc.data();
        const pushToken = userData.expoPushToken;
        const timezone = userData.timezone || "America/New_York";

        if (!pushToken) continue;

        const today = getDateInTimezone(timezone);
        const yesterdayDate = new Date(today + "T00:00:00");
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = yesterdayDate.toISOString().split("T")[0];

        // Query micro exercises completed recently where follow-up hasn't been sent
        // Bound to last 7 days to avoid scanning entire history
        const sevenDaysAgo = new Date(today + "T00:00:00");
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const cutoffDate = sevenDaysAgo.toISOString();

        const exercisesSnapshot = await db
          .collection("users")
          .doc(userDoc.id)
          .collection("worksheets")
          .where("type", "==", "micro_exercise")
          .where("commitment_follow_up_sent", "==", false)
          .where("completed_at", ">=", cutoffDate)
          .get();

        for (const exerciseDoc of exercisesSnapshot.docs) {
          const exercise = exerciseDoc.data();

          // Only process entries completed yesterday
          if (!exercise.completed_at) continue;
          const completedDate = (exercise.completed_at as string).split("T")[0];
          if (completedDate !== yesterday) continue;

          const commitment = exercise.micro_commitment as string | undefined;
          if (!commitment) continue;

          // Truncate commitment text for the notification body
          const displayCommitment =
            commitment.length > 80
              ? commitment.substring(0, 77) + "..."
              : commitment;

          const sent = await fireEventRuleForUser(
            rule,
            userDoc.id,
            userData,
            { commitment: displayCommitment },
            {
              screen: "MicroExerciseFollowUp",
              entry_id: exerciseDoc.id,
              user_id: userDoc.id,
            }
          );

          if (sent) {
            // Mark as sent so we don't send again
            await exerciseDoc.ref.update({ commitment_follow_up_sent: true });
          }
        }
      } catch (error) {
        console.error(
          `Error processing commitment follow-up for user ${userDoc.id}:`,
          error
        );
      }
    }

    console.log("checkMicroCommitmentFollowUps complete");
  }
);

// ============================================================================
// AUTO-EXPIRE STALE DAILY CHALLENGES
// Runs every hour. At midnight in each user's timezone, marks active daily
// challenges from previous days as 'not_yet'. Extended challenges are excluded.
// ============================================================================
export const expireStaleChallenges = onSchedule(
  {
    schedule: "0 * * * *",
    timeZone: "UTC",
  },
  async () => {
    console.log("Running stale challenge expiry check...");

    // Only fetch users whose timezone is currently at midnight
    const userDocs = await getUsersAtHour(0);
    console.log(`Found ${userDocs.length} users at midnight`);

    for (const userDoc of userDocs) {
      try {
        const userData = userDoc.data();
        const timezone = userData.timezone || "America/New_York";

        const today = getDateInTimezone(timezone);

        const challengesSnapshot = await db
          .collection("users")
          .doc(userDoc.id)
          .collection("challenges")
          .where("status", "==", "active")
          .get();

        // Batch all updates for this user's stale challenges
        const batch = db.batch();
        let expiredCount = 0;
        for (const challengeDoc of challengesSnapshot.docs) {
          const challenge = challengeDoc.data();
          // Skip extended challenges — they span multiple days
          if (challenge.challenge_type === "extended") continue;
          if (challenge.date < today) {
            batch.update(challengeDoc.ref, { status: "not_yet" });
            expiredCount++;
          }
        }

        if (expiredCount > 0) {
          await batch.commit();
          console.log(
            `Expired ${expiredCount} stale challenges for user ${userDoc.id}`
          );
        }
      } catch (error) {
        console.error(
          `Error expiring challenges for user ${userDoc.id}:`,
          error
        );
      }
    }

    console.log("expireStaleChallenges complete");
  }
);

// ============================================
// Rules engine: hourly evaluator for admin-configured push rules
// Rules live in the `rules/` Firestore collection and are managed from the
// in-app Admin > Rules screen. Each enabled push rule is evaluated against
// per-user facts (days since last activity, streak, local hour, ...) with
// frequency capping recorded at users/{userId}/ruleState/{ruleId}.
// ============================================
export const evaluatePushRules = onSchedule(
  {
    schedule: "0 * * * *", // Every hour at minute 0
    timeZone: "UTC",
  },
  async () => {
    if (!PUSH_NOTIFICATIONS_ENABLED) {
      console.log("Push notifications disabled — skipping rule evaluation");
      return;
    }

    const rulesSnap = await db
      .collection("rules")
      .where("enabled", "==", true)
      .get();

    const rules: Rule[] = rulesSnap.docs
      .map((d) => ({ ...(d.data() as Omit<Rule, "id">), id: d.id }))
      .filter((r) => r.surface === "push" && r.event === "scheduled_hourly")
      .sort((a, b) => b.priority - a.priority);

    if (rules.length === 0) {
      console.log("No enabled push rules — nothing to evaluate");
      return;
    }
    console.log(`Evaluating ${rules.length} push rule(s)...`);

    // Only users with a push token can receive these
    const usersSnap = await db
      .collection("users")
      .where("expoPushToken", "!=", null)
      .get();

    const nowIso = new Date().toISOString();
    const poolCache: PoolCache = {};
    let sentCount = 0;

    for (const userDoc of usersSnap.docs) {
      try {
        const userData = userDoc.data();
        const pushToken = userData.expoPushToken;
        if (!pushToken || !Expo.isExpoPushToken(pushToken)) continue;

        const timezone = userData.timezone || "America/New_York";
        const localHour = getHourInTimezone(timezone);
        if (localHour < 0) continue; // invalid timezone
        const todayLocal = getDateInTimezone(timezone);
        const facts = buildUserFacts(userData, todayLocal, localHour);

        for (const rule of rules) {
          if (!ruleMatches(rule, facts)) continue;

          const stateRef = db
            .collection("users")
            .doc(userDoc.id)
            .collection("ruleState")
            .doc(rule.id);
          const stateSnap = await stateRef.get();
          const state = stateSnap.exists ? (stateSnap.data() as RuleState) : null;

          // Safety backstop: an hourly push rule with 'always' frequency would
          // fire 24x/day — cap it to once per day regardless
          const effectiveRule: Rule =
            rule.frequency?.type === "always"
              ? { ...rule, frequency: { type: "once_per_day" } }
              : rule;
          if (!frequencyAllows(effectiveRule, state, nowIso, todayLocal)) continue;

          // Global placeholders; unresolvable for this user → try the next
          // rule rather than sending broken copy
          const globalVars = await resolveGlobalVars(rule, userDoc.id, userData, poolCache);
          if (globalVars === null) continue;

          await sendPushNotification(
            pushToken,
            renderTemplate(rule.content.title, globalVars),
            renderTemplate(rule.content.body, globalVars),
            { rule_id: rule.id, ...ctaTargetData(rule) }
          );
          await stateRef.set(
            {
              rule_id: rule.id,
              last_fired_at: nowIso,
              last_fired_date: todayLocal,
              fire_count: admin.firestore.FieldValue.increment(1),
            },
            { merge: true }
          );
          sentCount++;
          console.log(`Rule "${rule.name}" fired for user ${userDoc.id}`);
          break; // at most one rules-engine push per user per run
        }
      } catch (error) {
        console.error(`Error evaluating rules for user ${userDoc.id}:`, error);
      }
    }

    console.log(`evaluatePushRules complete — ${sentCount} notification(s) sent`);
  }
);
