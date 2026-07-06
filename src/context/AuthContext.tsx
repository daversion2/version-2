import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import * as Localization from 'expo-localization';
import { subscribeToAuth } from '../services/auth';
import { getUserProfile, saveTimezone } from '../services/users';
import { loadPracticeCatalog } from '../services/practiceCatalog';
import { User } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  refreshProfile: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType>({ user: null, userProfile: null, loading: true, refreshProfile: async () => null });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (u) => {
      setUser(u);
      if (u) {
        const profile = await getUserProfile(u.uid);
        setUserProfile(profile);

        // Hydrate the practice catalog from Firestore (best-effort — the bundled
        // defaults are already live, so a failure just keeps those).
        loadPracticeCatalog();

        // Sync timezone on every app launch — keeps it current if user travels
        // or if it was never set (e.g. user never enabled notifications)
        const deviceTimezone = Localization.getCalendars()[0]?.timeZone;
        if (deviceTimezone && deviceTimezone !== profile?.timezone) {
          saveTimezone(u.uid, deviceTimezone).catch(() => {});
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Stable identity (keyed on user) — consumers list refreshProfile as an
  // effect dependency, so a fresh function every render would refire their
  // data loads in a loop. Returns the fetched profile so callers can use it
  // without a second Firestore read.
  const refreshProfile = useCallback(async (): Promise<User | null> => {
    if (!user) return null;
    const profile = await getUserProfile(user.uid);
    setUserProfile(profile);
    return profile;
  }, [user]);

  const value = useMemo(
    () => ({ user, userProfile, loading, refreshProfile }),
    [user, userProfile, loading, refreshProfile]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
