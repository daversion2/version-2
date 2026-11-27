/**
 * Delivering one push through Expo. Shared by the rule pushes (index.ts, which
 * check the global push budget first) and the pod pushes (pods.ts, which have
 * their own budget). Nothing here decides WHETHER to send: callers do.
 */

import * as admin from "firebase-admin";
import { Expo, ExpoPushMessage } from "expo-server-sdk";

// Global kill switch for push notifications — set to false to disable all sends
export const PUSH_NOTIFICATIONS_ENABLED = true;

const expo = new Expo();

/** Null the user's push token, but only if it's still the one that failed. */
const clearStaleToken = async (userId: string, pushToken: string): Promise<void> => {
  const db = admin.firestore();
  try {
    const ref = db.collection("users").doc(userId);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.get("expoPushToken") === pushToken) tx.update(ref, { expoPushToken: null });
    });
    console.log(`Cleared unregistered push token for user ${userId}`);
  } catch (error) {
    console.error(`Couldn't clear push token for user ${userId}:`, error);
  }
};

export const isPushToken = (token: unknown): token is string =>
  typeof token === "string" && Expo.isExpoPushToken(token);

/**
 * Send one push. Returns whether Expo accepted it. A token Expo reports as
 * gone (app deleted, new phone) is cleared so the account stops sending into
 * the void, and the app can ask again next time it opens.
 */
export const deliverPush = async (
  userId: string,
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> => {
  if (!PUSH_NOTIFICATIONS_ENABLED) {
    console.log("Push notifications disabled — skipping");
    return false;
  }
  if (!isPushToken(pushToken)) {
    console.log(`Invalid Expo push token: ${pushToken}`);
    return false;
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
      const tickets = await expo.sendPushNotificationsAsync(chunk);
      const gone = tickets.some(
        (t) => t.status === "error" && t.details?.error === "DeviceNotRegistered"
      );
      if (gone) {
        await clearStaleToken(userId, pushToken);
        return false;
      }
    }
    console.log(`Notification sent to user ${userId}: ${title}`);
    return true;
  } catch (error) {
    console.error("Error sending push notification:", error);
    return false;
  }
};
