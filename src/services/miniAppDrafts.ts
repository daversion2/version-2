import type { MiniAppId } from './miniApps';

// =============================================================================
// SESSION DRAFTS — the in-progress session, saved on the phone after every
// change, so a dropped signal, a killed app or a dead battery costs nothing.
// One helper for every mini-app with a live session (contract handoff #4);
// only the in-progress session is kept here, never history.
//
// AsyncStorage is required lazily, like services/alertPreferences.ts, so
// importing this never touches native storage until it's actually used.
// =============================================================================

const DRAFT_VERSION = 1;

interface StoredDraft<T> {
  v: number;
  savedAt: string;
  data: T;
}

const storage = () => require('@react-native-async-storage/async-storage').default;

const keyFor = (appId: MiniAppId, userId: string) => `miniapp_draft:${appId}:${userId}`;

export const saveSessionDraft = async <T>(
  appId: MiniAppId,
  userId: string,
  data: T,
  now: Date = new Date()
): Promise<void> => {
  const draft: StoredDraft<T> = { v: DRAFT_VERSION, savedAt: now.toISOString(), data };
  await storage().setItem(keyFor(appId, userId), JSON.stringify(draft));
};

/** The saved draft, or null. A draft from another version, or unreadable, is dropped. */
export const loadSessionDraft = async <T>(
  appId: MiniAppId,
  userId: string
): Promise<{ data: T; savedAt: string } | null> => {
  const raw: string | null = await storage().getItem(keyFor(appId, userId));
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as StoredDraft<T>;
    if (draft?.v !== DRAFT_VERSION || draft.data === undefined) {
      await clearSessionDraft(appId, userId);
      return null;
    }
    return { data: draft.data, savedAt: draft.savedAt };
  } catch {
    await clearSessionDraft(appId, userId);
    return null;
  }
};

export const clearSessionDraft = async (appId: MiniAppId, userId: string): Promise<void> => {
  await storage().removeItem(keyFor(appId, userId));
};
