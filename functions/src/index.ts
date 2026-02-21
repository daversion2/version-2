import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentUpdated, onDocumentCreated } from "firebase-functions/v2/firestore";
import { Expo, ExpoPushMessage } from "expo-server-sdk";

admin.initializeApp();
const db = admin.firestore();
const expo = new Expo();

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

// Helper to send push notification via Expo
const sendPushNotification = async (
  pushToken: string,
  title: string,
  body: string
): Promise<void> => {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.log(`Invalid Expo push token: ${pushToken}`);
    return;
  }

  const message: ExpoPushMessage = {
    to: pushToken,
    sound: "default",
    title,
    body,
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

    const usersSnapshot = await db.collection("users").get();

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const pushToken = userData.expoPushToken;
      const timezone = userData.timezone || "America/New_York";

      if (!pushToken) continue;

      // Check if it's 8 AM in user's timezone
      const currentHour = getHourInTimezone(timezone);
      if (currentHour !== 8) continue;

      const today = getDateInTimezone(timezone);

      // Check if user has a challenge for today
      const challengesSnapshot = await db
        .collection("users")
        .doc(userDoc.id)
        .collection("challenges")
        .where("date", "==", today)
        .limit(1)
        .get();

      if (challengesSnapshot.empty) {
        // No challenge started for today - send reminder
        await sendPushNotification(
          pushToken,
          "Start Your Challenge",
          "You haven't set today's challenge yet. What will you conquer today?"
        );
        console.log(`Sent morning reminder to user ${userDoc.id} (${timezone})`);
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

    const usersSnapshot = await db.collection("users").get();

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const pushToken = userData.expoPushToken;
      const timezone = userData.timezone || "America/New_York";

      if (!pushToken) continue;

      // Check if it's 8 PM (20:00) in user's timezone
      const currentHour = getHourInTimezone(timezone);
      if (currentHour !== 20) continue;

      const today = getDateInTimezone(timezone);

      // Check user's challenges for today
      const challengesSnapshot = await db
        .collection("users")
        .doc(userDoc.id)
        .collection("challenges")
        .where("date", "==", today)
        .get();

      if (challengesSnapshot.empty) {
        // No challenge at all today - skip (morning reminder handles this)
        continue;
      }

      for (const challengeDoc of challengesSnapshot.docs) {
        const challenge = challengeDoc.data();

        if (challenge.status === "active") {
          // Challenge not completed - send reminder
          await sendPushNotification(
            pushToken,
            "Complete Your Challenge",
            "Don't forget to complete your challenge today. You've got this!"
          );
          console.log(`Sent completion reminder to user ${userDoc.id} (${timezone})`);
        } else if (challenge.status === "completed") {
          // Challenge completed successfully - send congrats
          await sendPushNotification(
            pushToken,
            "Amazing Work Today!",
            "You crushed your challenge! Keep the momentum going tomorrow."
          );
          console.log(`Sent congrats to user ${userDoc.id} (${timezone})`);
        }
        // Note: 'failed' status is handled by the Firestore trigger below
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
    if (notifications.length > 0) {
      console.log(`Sending ${notifications.length} notifications`);
      const chunks = expo.chunkPushNotifications(notifications);
      for (const chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk);
      }
      console.log("All team activity notifications sent");
    } else {
      console.log("No notifications to send");
    }
  }
);
