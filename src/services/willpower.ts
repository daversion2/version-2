import { doc, getDoc, setDoc, collection, getDocs, query, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { STREAK_TIERS } from '../constants/willpower';
import { getTodayString, getYesterdayString, toLocalDateString } from '../utils/date';

// A streak of 0 sits in the first tier, so a first-ever day is not a "new tier".
const streakTierIndex = (streakDays: number): number =>
  Math.max(0, STREAK_TIERS.findIndex((t) => streakDays >= t.minDays && streakDays <= t.maxDays));

// Get streak tier info for display
export const getStreakTierInfo = (streakDays: number): { tierName: string; minDays: number } => {
  const tier = STREAK_TIERS[streakTierIndex(streakDays)];
  return { tierName: tier.name, minDays: tier.minDays };
};

// Update user's willpower stats (points and streak)
export const updateWillpowerStats = async (
  userId: string,
  pointsToAdd: number
): Promise<{
  newTotal: number;
  newStreak: number;
  newTierReached: boolean;
  tierInfo: { tierName: string; minDays: number } | null;
}> => {
  const userRef = doc(db, 'users', userId);
  const today = getTodayString();

  const result = await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    const userData = userSnap.exists() ? userSnap.data() : {};

    const lastActivityDate = userData.lastActivityDate || null;
    const currentStreak = userData.currentStreak || 0;
    const totalPoints = userData.totalWillpowerPoints || 0;

    let newStreak = currentStreak;

    if (lastActivityDate === null) {
      newStreak = 1;
    } else if (lastActivityDate === today) {
      newStreak = currentStreak;
    } else {
      if (lastActivityDate === getYesterdayString()) {
        newStreak = currentStreak + 1;
      } else {
        newStreak = 1;
      }
    }

    const newTierReached = streakTierIndex(newStreak) > streakTierIndex(currentStreak);
    const tierInfo = newTierReached ? getStreakTierInfo(newStreak) : null;

    const newTotal = totalPoints + pointsToAdd;

    transaction.set(
      userRef,
      {
        totalWillpowerPoints: newTotal,
        currentStreak: newStreak,
        lastActivityDate: today,
      },
      { merge: true }
    );

    return { newTotal, newStreak, newTierReached, tierInfo };
  });

  return result;
};

// Get user's willpower stats
export const getWillpowerStats = async (
  userId: string
): Promise<{
  totalPoints: number;
  currentStreak: number;
}> => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : {};

  const totalPoints = userData.totalWillpowerPoints || 0;
  const currentStreak = userData.currentStreak || 0;
  const lastActivityDate = userData.lastActivityDate || null;

  // Check if streak is still valid (activity yesterday or today)
  let validStreak = currentStreak;
  if (lastActivityDate) {
    const today = getTodayString();
    const yesterdayStr = getYesterdayString();

    if (lastActivityDate !== today && lastActivityDate !== yesterdayStr) {
      // Streak has expired
      validStreak = 0;
    }
  }

  return {
    totalPoints,
    currentStreak: validStreak,
  };
};

// Get Suck Factor tier based on average difficulty (WPQ)
export const getSuckFactorTier = (wpq: number): {
  tier: string;
  description: string;
} => {
  if (wpq >= 4.1) {
    return { tier: 'Limit Pusher', description: 'Consistently tackling the hardest challenges' };
  }
  if (wpq >= 3.1) {
    return { tier: 'Challenge Seeker', description: 'Pushing beyond your comfort zone' };
  }
  if (wpq >= 2.1) {
    return { tier: 'Steady Builder', description: 'Building strength with balanced challenges' };
  }
  return { tier: 'Comfort Zone', description: 'Starting with manageable challenges' };
};

// Subtract points from user's willpower total (for deletions/modifications)
export const subtractWillpowerPoints = async (
  userId: string,
  pointsToSubtract: number
): Promise<number> => {
  const userRef = doc(db, 'users', userId);

  return runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    const userData = userSnap.exists() ? userSnap.data() : {};

    const currentTotal = userData.totalWillpowerPoints || 0;
    const newTotal = Math.max(0, currentTotal - pointsToSubtract);

    transaction.set(userRef, { totalWillpowerPoints: newTotal }, { merge: true });
    return newTotal;
  });
};

// Adjust XP by a delta (positive or negative)
export const adjustWillpowerPoints = async (
  userId: string,
  delta: number
): Promise<number> => {
  const userRef = doc(db, 'users', userId);

  return runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    const userData = userSnap.exists() ? userSnap.data() : {};

    const currentTotal = userData.totalWillpowerPoints || 0;
    const newTotal = Math.max(0, currentTotal + delta);

    transaction.set(userRef, { totalWillpowerPoints: newTotal }, { merge: true });
    return newTotal;
  });
};

// Recalculate user streak from completion logs
export const recalculateUserStats = async (userId: string): Promise<{
  newStreak: number;
  lastActivityDate: string | null;
}> => {
  const logsRef = collection(db, 'users', userId, 'completionLogs');
  const snap = await getDocs(query(logsRef));

  if (snap.empty) {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { currentStreak: 0, lastActivityDate: null }, { merge: true });
    return { newStreak: 0, lastActivityDate: null };
  }

  // Get unique dates sorted descending
  const dates = [
    ...new Set(snap.docs.map((d) => d.data().date as string)),
  ].sort().reverse();

  // Calculate streak — a streak whose most recent day is yesterday is still alive
  let streak = 0;
  const start = new Date();
  if (dates[0] === getYesterdayString()) {
    start.setDate(start.getDate() - 1);
  }

  for (let i = 0; i < dates.length; i++) {
    const expected = new Date(start);
    expected.setDate(expected.getDate() - i);
    if (dates[i] === toLocalDateString(expected)) {
      streak++;
    } else {
      break;
    }
  }

  const lastActivityDate = dates[0] || null;

  const userRef = doc(db, 'users', userId);
  await setDoc(
    userRef,
    {
      currentStreak: streak,
      lastActivityDate,
    },
    { merge: true }
  );

  return { newStreak: streak, lastActivityDate };
};
