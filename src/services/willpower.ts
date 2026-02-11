import { doc, getDoc, setDoc, collection, getDocs, query } from 'firebase/firestore';
import { db } from './firebase';
import { WILLPOWER_LEVELS, STREAK_MULTIPLIERS, POINTS } from '../constants/willpower';

// Get the streak multiplier based on current streak days
export const getStreakMultiplier = (streakDays: number): number => {
  const tier = STREAK_MULTIPLIERS.find(
    (t) => streakDays >= t.minDays && streakDays <= t.maxDays
  );
  return tier?.multiplier || 1.0;
};

// Get level info from total points
export const getLevelInfo = (totalPoints: number): {
  level: number;
  title: string;
  pointsForCurrentLevel: number;
  pointsForNextLevel: number | null;
  progressToNextLevel: number;
} => {
  let currentLevel = WILLPOWER_LEVELS[0];

  for (const level of WILLPOWER_LEVELS) {
    if (totalPoints >= level.pointsRequired) {
      currentLevel = level;
    } else {
      break;
    }
  }

  const nextLevel = WILLPOWER_LEVELS.find((l) => l.level === currentLevel.level + 1);

  const pointsForCurrentLevel = currentLevel.pointsRequired;
  const pointsForNextLevel = nextLevel?.pointsRequired || null;

  let progressToNextLevel = 1; // 100% if max level
  if (pointsForNextLevel !== null) {
    const pointsInCurrentLevel = totalPoints - pointsForCurrentLevel;
    const pointsNeededForNext = pointsForNextLevel - pointsForCurrentLevel;
    progressToNextLevel = pointsInCurrentLevel / pointsNeededForNext;
  }

  return {
    level: currentLevel.level,
    title: currentLevel.title,
    pointsForCurrentLevel,
    pointsForNextLevel,
    progressToNextLevel: Math.min(progressToNextLevel, 1),
  };
};

// Calculate points for a completed challenge
export const calculateChallengePoints = (
  difficultyActual: number,
  streakDays: number,
  hasReflection: boolean
): number => {
  const multiplier = getStreakMultiplier(streakDays);
  const basePoints = difficultyActual;
  const reflectionBonus = hasReflection ? POINTS.REFLECTION_BONUS : 0;

  return Math.round(basePoints * multiplier) + reflectionBonus;
};

// Calculate points for a failed challenge
export const calculateFailedChallengePoints = (
  streakDays: number,
  hasReflection: boolean
): number => {
  const multiplier = getStreakMultiplier(streakDays);
  const basePoints = POINTS.FAILED_CHALLENGE;
  const reflectionBonus = hasReflection ? POINTS.REFLECTION_BONUS : 0;

  return Math.round(basePoints * multiplier) + reflectionBonus;
};

// Calculate points for a completed habit
export const calculateHabitPoints = (
  difficulty: number,
  streakDays: number
): number => {
  const multiplier = getStreakMultiplier(streakDays);
  return Math.round(difficulty * multiplier);
};

// Get streak tier info for display
export const getStreakTierInfo = (streakDays: number): {
  multiplier: number;
  tierName: string;
  minDays: number;
} => {
  const tier = STREAK_MULTIPLIERS.find(
    (t) => streakDays >= t.minDays && streakDays <= t.maxDays
  );

  if (!tier) return { multiplier: 1.0, tierName: 'Starting', minDays: 1 };

  const tierNames: Record<number, string> = {
    1.0: 'Starting',
    1.2: 'Building Momentum',
    1.5: 'On Fire',
    1.75: 'Unstoppable',
    2.0: 'Legendary',
  };

  return {
    multiplier: tier.multiplier,
    tierName: tierNames[tier.multiplier] || 'Active',
    minDays: tier.minDays,
  };
};

// Update user's willpower stats (points and streak)
export const updateWillpowerStats = async (
  userId: string,
  pointsToAdd: number
): Promise<{
  newTotal: number;
  newStreak: number;
  multiplier: number;
  newTierReached: boolean;
  tierInfo: { multiplier: number; tierName: string; minDays: number } | null;
  newLevelReached: boolean;
  levelInfo: { level: number; title: string } | null;
}> => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : {};

  const today = new Date().toISOString().split('T')[0];
  const lastActivityDate = userData.lastActivityDate || null;
  const currentStreak = userData.currentStreak || 0;
  const totalPoints = userData.totalWillpowerPoints || 0;

  // Get the old multiplier before any streak changes
  const oldMultiplier = getStreakMultiplier(currentStreak);

  // Calculate new streak
  let newStreak = currentStreak;

  if (lastActivityDate === null) {
    // First activity ever
    newStreak = 1;
  } else if (lastActivityDate === today) {
    // Already logged activity today, streak stays the same
    newStreak = currentStreak;
  } else {
    // Check if yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastActivityDate === yesterdayStr) {
      // Consecutive day, increment streak
      newStreak = currentStreak + 1;
    } else {
      // Streak broken, start fresh
      newStreak = 1;
    }
  }

  const newMultiplier = getStreakMultiplier(newStreak);
  const newTierReached = newMultiplier > oldMultiplier;
  const tierInfo = newTierReached ? getStreakTierInfo(newStreak) : null;

  // Check for level up
  const oldLevelInfo = getLevelInfo(totalPoints);
  const newTotal = totalPoints + pointsToAdd;
  const newLevelInfo = getLevelInfo(newTotal);
  const newLevelReached = newLevelInfo.level > oldLevelInfo.level;
  const levelInfo = newLevelReached ? { level: newLevelInfo.level, title: newLevelInfo.title } : null;

  await setDoc(
    userRef,
    {
      totalWillpowerPoints: newTotal,
      currentStreak: newStreak,
      lastActivityDate: today,
    },
    { merge: true }
  );

  return { newTotal, newStreak, multiplier: newMultiplier, newTierReached, tierInfo, newLevelReached, levelInfo };
};

// Get user's willpower stats
export const getWillpowerStats = async (
  userId: string
): Promise<{
  totalPoints: number;
  currentStreak: number;
  multiplier: number;
  level: number;
  title: string;
  progressToNextLevel: number;
  pointsToNextLevel: number | null;
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
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastActivityDate !== today && lastActivityDate !== yesterdayStr) {
      // Streak has expired
      validStreak = 0;
    }
  }

  const multiplier = getStreakMultiplier(validStreak);
  const levelInfo = getLevelInfo(totalPoints);

  return {
    totalPoints,
    currentStreak: validStreak,
    multiplier,
    level: levelInfo.level,
    title: levelInfo.title,
    progressToNextLevel: levelInfo.progressToNextLevel,
    pointsToNextLevel: levelInfo.pointsForNextLevel
      ? levelInfo.pointsForNextLevel - totalPoints
      : null,
  };
};

// Check if a challenge has any reflection filled
export const hasReflection = (challenge: {
  reflection_hardest_moment?: string;
  reflection_push_through?: string;
  reflection_next_time?: string;
}): boolean => {
  return !!(
    challenge.reflection_hardest_moment ||
    challenge.reflection_push_through ||
    challenge.reflection_next_time
  );
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
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : {};

  const currentTotal = userData.totalWillpowerPoints || 0;
  const newTotal = Math.max(0, currentTotal - pointsToSubtract);

  await setDoc(userRef, { totalWillpowerPoints: newTotal }, { merge: true });
  return newTotal;
};

// Adjust willpower points by a delta (positive or negative)
export const adjustWillpowerPoints = async (
  userId: string,
  delta: number
): Promise<number> => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : {};

  const currentTotal = userData.totalWillpowerPoints || 0;
  const newTotal = Math.max(0, currentTotal + delta);

  await setDoc(userRef, { totalWillpowerPoints: newTotal }, { merge: true });
  return newTotal;
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

  // Calculate streak
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < dates.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().split('T')[0];
    if (dates[i] === expectedStr) {
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
