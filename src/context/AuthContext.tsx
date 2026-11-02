import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import * as Localization from 'expo-localization';
import { ensureBaseProfile, subscribeToAuth } from '../services/auth';
import { getUserProfile, saveTimezone } from '../services/users';
import { loadPracticeCatalog } from '../services/practiceCatalog';
import { refreshPushToken } from '../services/notifications';
import { User } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  /**
   * The signed-in user's profile has been read (or the read failed). False
   * from every sign-in until then — RootNavigator holds the spinner meanwhile,
   * so nothing routes on a profile that hasn't arrived.
   */
  profileLoaded: boolean;
  refreshProfile: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  profileLoaded: false,
  refreshProfile: async () => null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Each auth change gets a number; a slower load for an earlier user (signed
  // out mid-read) must not land on the next one.
  const authSeq = useRef(0);

  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (u) => {
      const seq = ++authSeq.current;
      const stale = () => seq !== authSeq.current;
      // Batched with setUser, so the navigator never sees the new user with
      // the old (or no) profile marked as loaded.
      setProfileLoaded(false);
      setUserProfile(null);
      setUser(u);
      if (u) {
        try {
          // On a fresh signup this listener fires before the profile doc is
          // written, so a null result gets a few short retries — otherwise the
          // navigator briefly treats the new user as fully onboarded and
          // flashes the main app before yanking them into onboarding.
          let profile = await getUserProfile(u.uid);
          for (let attempt = 0; profile === null && attempt < 3; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            profile = await getUserProfile(u.uid);
          }
          // Still nothing, or a doc some merge write created before the
          // account was set up: give it its base fields (and its onboarding).
          if (!profile?.created_at && (await ensureBaseProfile(u.uid, u.email))) {
            profile = await getUserProfile(u.uid);
          }
          if (stale()) return;
          setUserProfile(profile);

          // A token can change (reinstall, restore to a new phone). Only for
          // someone who already turned notifications on; never prompts.
          refreshPushToken(u.uid, profile?.expoPushToken);

          // Hydrate the practice catalog from Firestore (best-effort — the bundled
          // defaults are already live, so a failure just keeps those).
          loadPracticeCatalog();

          // Sync timezone on every app launch — keeps it current if user travels
          // or if it was never set (e.g. user never enabled notifications)
          const deviceTimezone = Localization.getCalendars()[0]?.timeZone;
          if (deviceTimezone && deviceTimezone !== profile?.timezone) {
            saveTimezone(u.uid, deviceTimezone).catch(() => {});
          }
        } catch (err) {
          // Offline or transient Firestore failure — without this catch the
          // app would stay on the boot spinner forever
          console.warn('Failed to load user profile:', err);
          if (stale()) return;
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      if (stale()) return;
      setProfileLoaded(true);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Stable identity (keyed on user) — consumers list refreshProfile as an
  // effect dependency, so a fresh function every render would refire their
  // data loads in a loop. Returns the fetched profile so callers can use it
  // without a second Firestore read.
  //
  // Refreshes can overlap (Today's load and a rating's both refresh). Only the
  // newest one may set the profile: an older read finishing last would put a
  // stale XP back on screen.
  const refreshSeq = useRef(0);
  const refreshProfile = useCallback(async (): Promise<User | null> => {
    if (!user) return null;
    const seq = ++refreshSeq.current;
    const profile = await getUserProfile(user.uid);
    if (seq === refreshSeq.current) setUserProfile(profile);
    return profile;
  }, [user]);

  const value = useMemo(
    () => ({ user, userProfile, loading, profileLoaded, refreshProfile }),
    [user, userProfile, loading, profileLoaded, refreshProfile]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
