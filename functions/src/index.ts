import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentUpdated, onDocumentCreated } from "firebase-functions/v2/firestore";
import { Expo, ExpoPushMessage } from "expo-server-sdk";

admin.initializeApp();
const db = admin.firestore();
const expo = new Expo();

// Global kill switch for push notifications — set to true to re-enable
const PUSH_NOTIFICATIONS_ENABLED = false;

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
    return parseInt(formatter.format(now), 10);
  } catch {
    return -1; // Invalid timezone
  }
};

// Helper to calculate 1-based day number from a start date and today's date (both YYYY-MM-DD)
const getCurrentDayNumber = (startDate: string, today: string): number => {
  const start = new Date(startDate + "T00:00:00");
  const current = new Date(today + "T00:00:00");
  const diffDays = Math.floor(
    (current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diffDays + 1;
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
// 1. Hourly check for 8 AM - Start challenge reminder
// Runs every hour and checks if it's 8 AM in user's timezone
// ============================================
export const morningChallengeReminder = onSchedule(
  {
    schedule: "0 * * * *", // Every hour at minute 0
    timeZone: "UTC",
  },
  async () => {
    console.log("Running morning reminder check...");

    // Only fetch users whose timezone is currently at 8 AM
    const userDocs = await getUsersAtHour(8);
    console.log(`Found ${userDocs.length} users at 8 AM`);

    for (const userDoc of userDocs) {
      try {
        const userData = userDoc.data();
        const pushToken = userData.expoPushToken;
        const timezone = userData.timezone || "America/New_York";

        if (!pushToken) continue;

        const today = getDateInTimezone(timezone);

        // Priority 1: Active program
        const enrollmentSnapshot = await db
          .collection("users")
          .doc(userDoc.id)
          .collection("programEnrollments")
          .where("status", "==", "active")
          .limit(1)
          .get();

        if (!enrollmentSnapshot.empty) {
          const enrollment = enrollmentSnapshot.docs[0].data();
          const dayNumber = getCurrentDayNumber(enrollment.start_date, today);
          await sendPushNotification(
            pushToken,
            `Day ${dayNumber} of ${enrollment.program_name}`,
            "Time to check in for today's challenge."
          );
          console.log(`Sent morning program reminder to user ${userDoc.id} (Day ${dayNumber})`);
          continue;
        }

        // Priority 2: Active habits
        const habitsSnapshot = await db
          .collection("users")
          .doc(userDoc.id)
          .collection("habits")
          .where("is_active", "==", true)
          .get();

        if (!habitsSnapshot.empty) {
          const habitCount = habitsSnapshot.size;
          await sendPushNotification(
            pushToken,
            "Keep Building",
            `You have ${habitCount} habit${habitCount === 1 ? "" : "s"} to work on today. Keep building momentum.`
          );
          console.log(`Sent morning habit reminder to user ${userDoc.id} (${habitCount} habits)`);
          continue;
        }

        // Priority 3: Fallback — challenge reminder
        const challengesSnapshot = await db
          .collection("users")
          .doc(userDoc.id)
          .collection("challenges")
          .where("date", "==", today)
          .limit(1)
          .get();

        if (challengesSnapshot.empty) {
          await sendPushNotification(
            pushToken,
            "Start Your Challenge",
            "You haven't set today's challenge yet. What will you conquer today?"
          );
          console.log(`Sent morning challenge reminder to user ${userDoc.id} (${timezone})`);
        }
      } catch (error) {
        console.error(`Error processing morning reminder for user ${userDoc.id}:`, error);
      }
    }
  }
);

// ============================================
// 2. Hourly check for 8 PM - Complete or congrats
// Runs every hour and checks if it's 8 PM in user's timezone
// ============================================
export const eveningChallengeReminder = onSchedule(
  {
    schedule: "0 * * * *", // Every hour at minute 0
    timeZone: "UTC",
  },
  async () => {
    console.log("Running evening reminder check...");

    // Only fetch users whose timezone is currently at 8 PM
    const userDocs = await getUsersAtHour(20);
    console.log(`Found ${userDocs.length} users at 8 PM`);

    for (const userDoc of userDocs) {
      try {
        const userData = userDoc.data();
        const pushToken = userData.expoPushToken;
        const timezone = userData.timezone || "America/New_York";

        if (!pushToken) continue;

        const today = getDateInTimezone(timezone);

        // Priority 1: Active program
        const enrollmentSnapshot = await db
          .collection("users")
          .doc(userDoc.id)
          .collection("programEnrollments")
          .where("status", "==", "active")
          .limit(1)
          .get();

        if (!enrollmentSnapshot.empty) {
          const enrollment = enrollmentSnapshot.docs[0].data();
          const dayNumber = getCurrentDayNumber(enrollment.start_date, today);
          const percentComplete = Math.round(
            (dayNumber / enrollment.duration_days) * 100
          );
          const milestones = enrollment.milestones || [];
          const todayMilestone = milestones.find(
            (m: { day_number: number }) => m.day_number === dayNumber
          );

          if (todayMilestone?.completed) {
            const daysRemaining = enrollment.duration_days - dayNumber;
            await sendPushNotification(
              pushToken,
              "Amazing Work Today!",
              `Day ${dayNumber} of ${enrollment.program_name} — done! ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} to go.`
            );
            console.log(`Sent evening program congrats to user ${userDoc.id} (Day ${dayNumber})`);
          } else {
            await sendPushNotification(
              pushToken,
              `Complete Day ${dayNumber}`,
              `Don't forget Day ${dayNumber} of ${enrollment.program_name}. You're ${percentComplete}% through!`
            );
            console.log(`Sent evening program reminder to user ${userDoc.id} (Day ${dayNumber})`);
          }
          continue;
        }

        // Priority 2: Active habits
        const habitsSnapshot = await db
          .collection("users")
          .doc(userDoc.id)
          .collection("habits")
          .where("is_active", "==", true)
          .get();

        if (!habitsSnapshot.empty) {
          const totalHabits = habitsSnapshot.size;

          // Count unique habits completed today (single-field query + client-side filter)
          const logsSnapshot = await db
            .collection("users")
            .doc(userDoc.id)
            .collection("completionLogs")
            .where("date", "==", today)
            .get();

          const completedHabitIds = new Set(
            logsSnapshot.docs
              .filter((d) => d.data().type === "nudge")
              .map((d) => d.data().reference_id)
          );
          const remaining = totalHabits - completedHabitIds.size;

          if (remaining > 0) {
            await sendPushNotification(
              pushToken,
              "Finish Strong",
              `You still have ${remaining} habit${remaining === 1 ? "" : "s"} left today. Finish strong.`
            );
            console.log(`Sent evening habit reminder to user ${userDoc.id} (${remaining} remaining)`);
          } else {
            await sendPushNotification(
              pushToken,
              "All Habits Logged!",
              "All habits logged today. Nice consistency."
            );
            console.log(`Sent evening habit congrats to user ${userDoc.id}`);
          }
          continue;
        }

        // Priority 3: Fallback — challenge logic
        const challengesSnapshot = await db
          .collection("users")
          .doc(userDoc.id)
          .collection("challenges")
          .where("date", "==", today)
          .get();

        if (challengesSnapshot.empty) continue;

        for (const challengeDoc of challengesSnapshot.docs) {
          const challenge = challengeDoc.data();

          if (challenge.status === "active") {
            await sendPushNotification(
              pushToken,
              "Complete Your Challenge",
              "Don't forget to complete your challenge today. You've got this!"
            );
            console.log(`Sent evening challenge reminder to user ${userDoc.id} (${timezone})`);
          } else if (challenge.status === "completed") {
            await sendPushNotification(
              pushToken,
              "Amazing Work Today!",
              "You crushed your challenge! Keep the momentum going tomorrow."
            );
            console.log(`Sent evening challenge congrats to user ${userDoc.id} (${timezone})`);
          }
        }
      } catch (error) {
        console.error(`Error processing evening reminder for user ${userDoc.id}:`, error);
      }
    }
  }
);

// ============================================
// 3. Challenge Failed: Immediate encouragement
// Triggers when a challenge status changes to 'failed'
// ============================================
export const onChallengeFailure = onDocumentUpdated(
  "users/{userId}/challenges/{challengeId}",
  async (event) => {
    console.log("onChallengeFailure triggered");

    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    console.log("Before status:", beforeData?.status);
    console.log("After status:", afterData?.status);

    if (!beforeData || !afterData) {
      console.log("Missing before or after data");
      return;
    }

    // Only trigger when status changes TO 'failed'
    if (beforeData.status !== "failed" && afterData.status === "failed") {
      console.log("Status changed to failed - sending notification");
      const userId = event.params.userId;

      // Get user's push token
      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.data();

      console.log("User ID:", userId);
      console.log("Push token:", userData?.expoPushToken);

      if (!userData?.expoPushToken) {
        console.log("No push token found for user");
        return;
      }

      await sendPushNotification(
        userData.expoPushToken,
        "Growth Through Effort",
        "Failure is part of the journey. The fact that you tried is what matters most. Every attempt builds your willpower."
      );

      console.log(`Sent encouragement to user ${userId} after challenge failure`);
    } else {
      console.log("Status change condition not met");
    }
  }
);

// ============================================
// 4. Team Activity Notification
// Triggers when a team member completes a challenge or habit
// Sends push notifications to other team members who have opted in
// ============================================
export const sendTeamActivityNotification = onDocumentCreated(
  "teams/{teamId}/activity/{activityId}",
  async (event) => {
    console.log("sendTeamActivityNotification triggered");

    const activity = event.data?.data();
    const teamId = event.params.teamId;

    if (!activity) {
      console.log("No activity data found");
      return;
    }

    console.log("Activity:", activity);

    // Get the completing user's username
    const completingUserDoc = await db.collection("users").doc(activity.user_id).get();
    const completingUserData = completingUserDoc.data();
    const username = completingUserData?.username || "A teammate";

    console.log(`User ${username} completed a ${activity.type}`);

    // Get all team members
    const membersSnapshot = await db
      .collection("teams")
      .doc(teamId)
      .collection("members")
      .get();

    const notifications: ExpoPushMessage[] = [];

    for (const memberDoc of membersSnapshot.docs) {
      const member = memberDoc.data();

      // Skip the user who completed the activity
      if (member.user_id === activity.user_id) {
        console.log(`Skipping notification for completing user ${member.user_id}`);
        continue;
      }

      // Check notification preference based on activity type
      const settingsKey = activity.type === "challenge"
        ? "challenge_completions"
        : "habit_completions";

      if (!member.notification_settings?.[settingsKey]) {
        console.log(`User ${member.user_id} has ${settingsKey} notifications disabled`);
        continue;
      }

      // Get member's push token
      const userDoc = await db.collection("users").doc(member.user_id).get();
      const userData = userDoc.data();
      const pushToken = userData?.expoPushToken;

      if (!pushToken) {
        console.log(`No push token for user ${member.user_id}`);
        continue;
      }

      if (!Expo.isExpoPushToken(pushToken)) {
        console.log(`Invalid push token for user ${member.user_id}`);
        continue;
      }

      // Build message without category
      const activityType = activity.type === "challenge" ? "challenge" : "habit";
      const title = "Team Activity";
      const body = `${username} just completed a ${activityType}!`;

      notifications.push({
        to: pushToken,
        sound: "default",
        title,
        body,
      });

      console.log(`Queued notification for user ${member.user_id}`);
    }

    // Send all notifications
    if (notifications.length > 0 && PUSH_NOTIFICATIONS_ENABLED) {
      console.log(`Sending ${notifications.length} notifications`);
      const chunks = expo.chunkPushNotifications(notifications);
      for (const chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk);
      }
      console.log("All team activity notifications sent");
    } else if (notifications.length > 0) {
      console.log(`Push notifications disabled — skipping ${notifications.length} team notifications`);
    } else {
      console.log("No notifications to send");
    }
  }
);

// ============================================
// 5. Buddy Challenge Invite Notification
// Triggers when a new buddy challenge is created (status=pending)
// Notifies the partner that they've been invited
// ============================================
export const sendBuddyChallengeInvite = onDocumentCreated(
  "buddyChallenges/{buddyChallengeId}",
  async (event) => {
    console.log("sendBuddyChallengeInvite triggered");

    const data = event.data?.data();
    if (!data) {
      console.log("No buddy challenge data found");
      return;
    }

    // Only notify on pending invites
    if (data.status !== "pending") {
      console.log("Buddy challenge status is not pending, skipping");
      return;
    }

    const partnerId = data.partner_id;
    const inviterUsername = data.inviter_username || "A teammate";
    const challengeName = data.challenge_name || "a challenge";

    // Get partner's push token
    const partnerDoc = await db.collection("users").doc(partnerId).get();
    const partnerData = partnerDoc.data();

    if (!partnerData?.expoPushToken) {
      console.log(`No push token for partner ${partnerId}`);
      return;
    }

    await sendPushNotification(
      partnerData.expoPushToken,
      "Buddy Challenge Invite!",
      `${inviterUsername} wants to do "${challengeName}" with you!`
    );

    console.log(`Sent buddy challenge invite notification to partner ${partnerId}`);
  }
);

// ============================================
// 6. Buddy Challenge Nudge Notification
// Triggers when a nudge field is updated on a buddy challenge
// ============================================
export const sendBuddyChallengeNudge = onDocumentUpdated(
  "buddyChallenges/{buddyChallengeId}",
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) return;

    // Detect nudge from inviter (field changed)
    const inviterNudged =
      beforeData.last_nudge_by_inviter !== afterData.last_nudge_by_inviter &&
      afterData.last_nudge_by_inviter;

    // Detect nudge from partner (field changed)
    const partnerNudged =
      beforeData.last_nudge_by_partner !== afterData.last_nudge_by_partner &&
      afterData.last_nudge_by_partner;

    if (!inviterNudged && !partnerNudged) return;

    // Determine who to notify
    const targetUserId = inviterNudged ? afterData.partner_id : afterData.inviter_id;
    const senderUsername = inviterNudged
      ? (afterData.inviter_username || "Your buddy")
      : (afterData.partner_username || "Your buddy");

    // Get target's push token
    const targetDoc = await db.collection("users").doc(targetUserId).get();
    const targetData = targetDoc.data();

    if (!targetData?.expoPushToken) {
      console.log(`No push token for nudge target ${targetUserId}`);
      return;
    }

    await sendPushNotification(
      targetData.expoPushToken,
      "Buddy Nudge!",
      `${senderUsername} sent you a nudge. You've got this!`
    );

    console.log(`Sent nudge notification to ${targetUserId}`);
  }
);

// ============================================
// 7. Buddy Challenge Both Complete Notification
// Triggers when buddy challenge status changes to 'completed'
// Notifies both users that they both crushed it
// ============================================
export const sendBuddyBothComplete = onDocumentUpdated(
  "buddyChallenges/{buddyChallengeId}",
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) return;

    // Only trigger when status changes TO 'completed'
    if (beforeData.status === "completed" || afterData.status !== "completed") return;

    const challengeName = afterData.challenge_name || "a challenge";
    const inviterId = afterData.inviter_id;
    const partnerId = afterData.partner_id;

    // Fetch both users' push tokens in parallel
    const [inviterDoc, partnerDoc] = await Promise.all([
      db.collection("users").doc(inviterId).get(),
      db.collection("users").doc(partnerId).get(),
    ]);

    const inviterData = inviterDoc.data();
    const partnerData = partnerDoc.data();

    const title = "Buddy Challenge Complete!";
    const body = `You both crushed "${challengeName}"! Check out your reflections.`;

    const notifications: ExpoPushMessage[] = [];

    if (inviterData?.expoPushToken && Expo.isExpoPushToken(inviterData.expoPushToken)) {
      notifications.push({
        to: inviterData.expoPushToken,
        sound: "default",
        title,
        body,
      });
    }

    if (partnerData?.expoPushToken && Expo.isExpoPushToken(partnerData.expoPushToken)) {
      notifications.push({
        to: partnerData.expoPushToken,
        sound: "default",
        title,
        body,
      });
    }

    if (notifications.length > 0 && PUSH_NOTIFICATIONS_ENABLED) {
      const chunks = expo.chunkPushNotifications(notifications);
      for (const chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk);
      }
      console.log(`Sent both-complete notifications for buddy challenge ${event.params.buddyChallengeId}`);
    } else if (notifications.length > 0) {
      console.log(`Push notifications disabled — skipping buddy both-complete notifications`);
    }
  }
);

// ============================================
// 8. Seed Inspiration Feed with Realistic Activity
// Runs every 3 hours to keep the feed populated
// Creates 2-4 varied entries per run (~16-32 active at any time)
// ============================================

const SEED_USERNAMES = [
  "Alex", "Jordan", "Casey", "Morgan", "Riley",
  "Taylor", "Quinn", "Avery", "Jamie", "Sam",
  "Drew", "Kai", "Reese", "Skyler", "Dakota",
  "Rowan", "Sage", "Blake", "Phoenix", "Emery",
  "Finley", "Harley", "Lennox", "Marley", "Nico",
];

const SEED_CHALLENGES: Array<{
  name: string;
  difficulty: number;
}> = [
  // Physical — difficulty 3+
  { name: "Cold Shower for X Minutes", difficulty: 3 },
  { name: "Ice Bath / Cold Plunge for X Minutes", difficulty: 5 },
  { name: "Eat Only One Meal Today (OMAD)", difficulty: 4 },
  { name: "Fast for X Hours", difficulty: 4 },
  { name: "Sleep on the Floor", difficulty: 4 },
  { name: "Attend Spin Class — Then Run for X Min", difficulty: 4 },
  { name: "Go an Entire Day Without Sitting", difficulty: 5 },
  { name: "Carry a Loaded Rucksack for X Miles", difficulty: 4 },
  { name: "Hold a Wall Sit for As Long As You Can", difficulty: 3 },
  { name: "No Hot Water for the Entire Day", difficulty: 4 },
  // Social — difficulty 3+
  { name: "Start a Conversation with X Strangers", difficulty: 3 },
  { name: "Ask Someone for Brutally Honest Feedback About You", difficulty: 4 },
  { name: "Disagree with Someone Out Loud in a Group Setting", difficulty: 3 },
  { name: "Record and Post a Video of Yourself", difficulty: 3 },
  { name: "Eat Alone at a Restaurant — No Phone", difficulty: 3 },
  { name: "Make a Request You Fully Expect to Be Denied", difficulty: 3 },
  { name: "Sing or Perform in Front of People", difficulty: 5 },
  // Mind — difficulty 3+
  { name: "No Complaining for 24 Hours", difficulty: 4 },
  { name: "Deep Work Block for X Minutes — Zero Distractions", difficulty: 3 },
  { name: "Do the Hardest Task on Your List First", difficulty: 3 },
  { name: "Sit with an Uncomfortable Emotion for X Minutes", difficulty: 3 },
  { name: "Journal About Your Biggest Fear in Brutal Detail", difficulty: 4 },
  { name: "Do Absolutely Nothing for One Hour", difficulty: 4 },
  { name: "Go the Entire Day with Zero Background Noise", difficulty: 4 },
  { name: "Go an Entire Day Without Speaking", difficulty: 5 },
  { name: "Meditate for X Minutes Without Moving", difficulty: 3 },
  { name: "No Social Media for the Entire Day", difficulty: 3 },
  { name: "No Lying — Including White Lies — for 24 Hours", difficulty: 4 },
  { name: "No Phone for X Hours", difficulty: 3 },
  { name: "Go 24 Hours Without Checking the Time", difficulty: 3 },
];

const STREAK_TIER_POOL = [
  { tier: "On Fire", days: 3 },
  { tier: "On Fire", days: 5 },
  { tier: "On Fire", days: 7 },
  { tier: "Dedicated", days: 10 },
  { tier: "Dedicated", days: 14 },
  { tier: "Unstoppable", days: 21 },
  { tier: "Legendary", days: 30 },
];

const PROGRAM_POOL = [
  { name: "Phone Detox", durationDays: 30, mode: "gradual_build" as const },
  { name: "Diet Reset", durationDays: 21, mode: "cold_turkey" as const },
  { name: "Cold Exposure", durationDays: 14, mode: "gradual_build" as const },
  { name: "Digital Minimalism", durationDays: 30, mode: "gradual_build" as const },
  { name: "Morning Discipline", durationDays: 21, mode: "cold_turkey" as const },
];

const COMPLETION_MESSAGES = [
  "That was harder than I expected",
  "Easier the second time around",
  "My brain fought me on this one",
  "Feeling accomplished",
  "Didn't think I could do it",
  "Building momentum",
  "Worth the discomfort",
  "The resistance was real today",
  "Getting stronger every day",
  "This is becoming a habit",
];

// Helper: pick a random element from an array
const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Helper: pick N unique random elements from an array
const pickUniqueRandom = <T>(arr: T[], n: number): T[] => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
};

// Helper: map difficulty to tier
const seedDifficultyTier = (difficulty: number): string => {
  if (difficulty === 3) return "moderate";
  if (difficulty === 4) return "hard";
  return "very_hard";
};

// Helper: weighted random entry type selection
// 80% challenge_completion, 15% streak_milestone, 5% program_completion
const pickEntryType = (): string => {
  const roll = Math.random();
  if (roll < 0.80) return "challenge_completion";
  if (roll < 0.95) return "streak_milestone";
  return "program_completion";
};

export const seedInspirationFeed = onSchedule(
  {
    schedule: "0 */3 * * *", // Every 3 hours
    timeZone: "UTC",
  },
  async () => {
    console.log("Running seedInspirationFeed...");

    const numEntries = 2 + Math.floor(Math.random() * 3); // 2-4 entries
    const selectedUsernames = pickUniqueRandom(SEED_USERNAMES, numEntries);

    let createdCount = 0;

    for (const username of selectedUsernames) {
      const entryType = pickEntryType();
      const now = new Date();

      // Jitter timestamp ±90 minutes so entries don't cluster
      const jitterMs = (Math.random() - 0.5) * 2 * 90 * 60 * 1000;
      const completedAt = new Date(now.getTime() + jitterMs);
      const displayTimestamp = new Date(completedAt.getTime() + (Math.random() - 0.5) * 2 * 30 * 60 * 1000);
      const expiresAt = new Date(completedAt.getTime() + 48 * 60 * 60 * 1000);

      const fakeUserId = `seed-${username.toLowerCase()}-${Math.floor(Math.random() * 10000)}`;
      const streak = pickRandom(STREAK_TIER_POOL);

      let entryData: Record<string, any> = {
        user_id: fakeUserId,
        username: username,
        completed_at: completedAt.toISOString(),
        display_timestamp: displayTimestamp.toISOString(),
        expires_at: expiresAt.toISOString(),
        entry_type: entryType,
        streak_tier: streak.tier,
        streak_days: streak.days,
        fist_bump_count: 0,
      };

      if (entryType === "challenge_completion") {
        const challenge = pickRandom(SEED_CHALLENGES);
        entryData = {
          ...entryData,
          difficulty_tier: seedDifficultyTier(challenge.difficulty),
          challenge_teaser: challenge.name.length > 50
            ? challenge.name.substring(0, 47) + "..."
            : challenge.name,
        };

        // ~40% chance to include a completion message
        if (Math.random() < 0.4) {
          entryData.completion_message = pickRandom(COMPLETION_MESSAGES);
        }

      } else if (entryType === "streak_milestone") {
        entryData = {
          ...entryData,
          difficulty_tier: "moderate",
          milestone_value: streak.days,
        };

      } else if (entryType === "program_completion") {
        const program = pickRandom(PROGRAM_POOL);
        entryData = {
          ...entryData,
          difficulty_tier: "very_hard",
          program_name: program.name,
          program_duration_days: program.durationDays,
          program_mode: program.mode,
        };
      }

      // Strip undefined values before writing
      const cleaned: Record<string, any> = {};
      for (const key of Object.keys(entryData)) {
        if (entryData[key] !== undefined) {
          cleaned[key] = entryData[key];
        }
      }

      await db.collection("inspirationFeed").add(cleaned);
      createdCount++;
      console.log(`Created seed entry: ${entryType} by ${username}`);
    }

    console.log(`seedInspirationFeed complete: created ${createdCount} entries`);
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
    console.log("Running micro commitment follow-up check...");

    // Only fetch users whose timezone is currently at 10 AM
    const userDocs = await getUsersAtHour(10);
    console.log(`Found ${userDocs.length} users at 10 AM`);

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

        // Query micro exercises where follow-up hasn't been sent yet
        const exercisesSnapshot = await db
          .collection("users")
          .doc(userDoc.id)
          .collection("worksheets")
          .where("type", "==", "micro_exercise")
          .where("commitment_follow_up_sent", "==", false)
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

          await sendPushNotification(
            pushToken,
            "How did your commitment go?",
            `Yesterday you said: "${displayCommitment}"`,
            {
              screen: "MicroExerciseFollowUp",
              entry_id: exerciseDoc.id,
              user_id: userDoc.id,
            }
          );

          // Mark as sent so we don't send again
          await exerciseDoc.ref.update({ commitment_follow_up_sent: true });

          console.log(
            `Sent commitment follow-up to user ${userDoc.id} for entry ${exerciseDoc.id}`
          );
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
