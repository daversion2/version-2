import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import * as Localization from 'expo-localization';
import { subscribeToAuth } from '../services/auth';
import { getUserProfile, saveTimezone } from '../services/users';
import { User } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, userProfile: null, loading: true, refreshProfile: async () => {} });

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

  const refreshProfile = async () => {
    if (user) {
      const profile = await getUserProfile(user.uid);
      setUserProfile(profile);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
