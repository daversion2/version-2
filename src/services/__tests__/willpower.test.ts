import {
  getStreakMultiplier,
  getLevelInfo,
  calculateChallengePoints,
  calculateFailedChallengePoints,
  calculateHabitPoints,
  getStreakTierInfo,
  getSuckFactorTier,
  hasReflection,
  subtractWillpowerPoints,
  adjustWillpowerPoints,
  recalculateUserStats,
} from '../willpower';
import {
  addMockDocument,
  getMockDB,
  resetMockDB,
} from '../__mocks__/firestore';

describe('Willpower Service', () => {
  describe('getStreakMultiplier', () => {
    it('returns 1.0x for days 1-2', () => {
      expect(getStreakMultiplier(1)).toBe(1.0);
      expect(getStreakMultiplier(2)).toBe(1.0);
    });

    it('returns 1.2x for days 3-6', () => {
      expect(getStreakMultiplier(3)).toBe(1.2);
      expect(getStreakMultiplier(6)).toBe(1.2);
    });

    it('returns 1.5x for days 7-13', () => {
      expect(getStreakMultiplier(7)).toBe(1.5);
      expect(getStreakMultiplier(13)).toBe(1.5);
    });

    it('returns 1.75x for days 14-29', () => {
      expect(getStreakMultiplier(14)).toBe(1.75);
      expect(getStreakMultiplier(29)).toBe(1.75);
    });

    it('returns 2.0x for days 30+', () => {
      expect(getStreakMultiplier(30)).toBe(2.0);
      expect(getStreakMultiplier(100)).toBe(2.0);
    });

    it('returns 1.0 for 0 days (edge case)', () => {
      expect(getStreakMultiplier(0)).toBe(1.0);
    });
  });

  describe('getLevelInfo', () => {
    it('returns level 1 for 0 points', () => {
      const info = getLevelInfo(0);
      expect(info.level).toBe(1);
      expect(info.title).toBe('Beginner Mind');
      expect(info.pointsForCurrentLevel).toBe(0);
      expect(info.pointsForNextLevel).toBe(50);
    });

    it('returns level 2 for 50 points', () => {
      const info = getLevelInfo(50);
      expect(info.level).toBe(2);
      expect(info.title).toBe('Apprentice');
    });

    it('returns level 3 for 150 points', () => {
      const info = getLevelInfo(150);
      expect(info.level).toBe(3);
      expect(info.title).toBe('Challenger');
    });

    it('returns level 10 for 4000+ points', () => {
      const info = getLevelInfo(4000);
      expect(info.level).toBe(10);
      expect(info.title).toBe('Willpower Legend');
      expect(info.pointsForNextLevel).toBeNull();
      expect(info.progressToNextLevel).toBe(1);
    });

    it('calculates progress correctly', () => {
      // At 25 points, should be halfway between level 1 (0) and level 2 (50)
      const info = getLevelInfo(25);
      expect(info.level).toBe(1);
      expect(info.progressToNextLevel).toBe(0.5);
    });

    it('caps progress at 1', () => {
      const info = getLevelInfo(4500);
      expect(info.progressToNextLevel).toBe(1);
    });
  });

  describe('calculateChallengePoints', () => {
    it('returns base difficulty when no streak and no reflection', () => {
      expect(calculateChallengePoints(3, 1, false)).toBe(3);
      expect(calculateChallengePoints(5, 1, false)).toBe(5);
    });

    it('adds reflection bonus of 1 point', () => {
      expect(calculateChallengePoints(3, 1, true)).toBe(4);
      expect(calculateChallengePoints(5, 1, true)).toBe(6);
    });

    it('applies streak multiplier correctly', () => {
      // 3-day streak = 1.2x multiplier
      // difficulty 5 * 1.2 = 6
      expect(calculateChallengePoints(5, 3, false)).toBe(6);
    });

    it('applies both streak multiplier and reflection bonus', () => {
      // difficulty 5 * 1.2 = 6, + 1 reflection = 7
      expect(calculateChallengePoints(5, 3, true)).toBe(7);
    });

    it('rounds points correctly', () => {
      // difficulty 3 * 1.2 = 3.6, rounds to 4
      expect(calculateChallengePoints(3, 3, false)).toBe(4);
    });
  });

  describe('calculateFailedChallengePoints', () => {
    it('returns 1 point for failed challenge with no streak', () => {
      expect(calculateFailedChallengePoints(1, false)).toBe(1);
    });

    it('adds reflection bonus of 1 point', () => {
      expect(calculateFailedChallengePoints(1, true)).toBe(2);
    });

    it('applies streak multiplier', () => {
      // 1 * 1.2 = 1.2, rounds to 1
      expect(calculateFailedChallengePoints(3, false)).toBe(1);
      // 1 * 1.5 = 1.5, rounds to 2
      expect(calculateFailedChallengePoints(7, false)).toBe(2);
    });

    it('applies both streak multiplier and reflection bonus', () => {
      // 1 * 1.5 = 1.5 rounds to 2, + 1 reflection = 3
      expect(calculateFailedChallengePoints(7, true)).toBe(3);
    });
  });

  describe('calculateHabitPoints', () => {
    it('returns difficulty for easy habit (1 point)', () => {
      expect(calculateHabitPoints(1, 1)).toBe(1);
    });

    it('returns difficulty for challenging habit (2 points)', () => {
      expect(calculateHabitPoints(2, 1)).toBe(2);
    });

    it('applies streak multiplier', () => {
      // easy (1) * 1.2 = 1.2, rounds to 1
      expect(calculateHabitPoints(1, 3)).toBe(1);
      // challenging (2) * 1.2 = 2.4, rounds to 2
      expect(calculateHabitPoints(2, 3)).toBe(2);
      // challenging (2) * 1.5 = 3
      expect(calculateHabitPoints(2, 7)).toBe(3);
    });
  });

  describe('getStreakTierInfo', () => {
    it('returns Starting tier for days 1-2', () => {
      const info = getStreakTierInfo(1);
      expect(info.tierName).toBe('Starting');
      expect(info.multiplier).toBe(1.0);
    });

    it('returns Building Momentum tier for days 3-6', () => {
      const info = getStreakTierInfo(3);
      expect(info.tierName).toBe('Building Momentum');
      expect(info.multiplier).toBe(1.2);
    });

    it('returns On Fire tier for days 7-13', () => {
      const info = getStreakTierInfo(7);
      expect(info.tierName).toBe('On Fire');
      expect(info.multiplier).toBe(1.5);
    });

    it('returns Unstoppable tier for days 14-29', () => {
      const info = getStreakTierInfo(14);
      expect(info.tierName).toBe('Unstoppable');
      expect(info.multiplier).toBe(1.75);
    });

    it('returns Legendary tier for days 30+', () => {
      const info = getStreakTierInfo(30);
      expect(info.tierName).toBe('Legendary');
      expect(info.multiplier).toBe(2.0);
    });
  });

  describe('getSuckFactorTier', () => {
    it('returns Comfort Zone for WPQ 0-2.0', () => {
      expect(getSuckFactorTier(0).tier).toBe('Comfort Zone');
      expect(getSuckFactorTier(1.5).tier).toBe('Comfort Zone');
      expect(getSuckFactorTier(2.0).tier).toBe('Comfort Zone');
    });

    it('returns Steady Builder for WPQ 2.1-3.0', () => {
      expect(getSuckFactorTier(2.1).tier).toBe('Steady Builder');
      expect(getSuckFactorTier(2.5).tier).toBe('Steady Builder');
      expect(getSuckFactorTier(3.0).tier).toBe('Steady Builder');
    });

    it('returns Challenge Seeker for WPQ 3.1-4.0', () => {
      expect(getSuckFactorTier(3.1).tier).toBe('Challenge Seeker');
      expect(getSuckFactorTier(3.5).tier).toBe('Challenge Seeker');
      expect(getSuckFactorTier(4.0).tier).toBe('Challenge Seeker');
    });

    it('returns Limit Pusher for WPQ 4.1-5.0', () => {
      expect(getSuckFactorTier(4.1).tier).toBe('Limit Pusher');
      expect(getSuckFactorTier(4.5).tier).toBe('Limit Pusher');
      expect(getSuckFactorTier(5.0).tier).toBe('Limit Pusher');
    });

    it('includes description for each tier', () => {
      expect(getSuckFactorTier(1.0).description).toBe('Starting with manageable challenges');
      expect(getSuckFactorTier(2.5).description).toBe('Building strength with balanced challenges');
      expect(getSuckFactorTier(3.5).description).toBe('Pushing beyond your comfort zone');
      expect(getSuckFactorTier(4.5).description).toBe('Consistently tackling the hardest challenges');
    });
  });

  describe('hasReflection', () => {
    it('returns false when no reflection fields are filled', () => {
      expect(hasReflection({})).toBe(false);
      expect(hasReflection({ reflection_hardest_moment: '' })).toBe(false);
    });

    it('returns true when reflection_hardest_moment is filled', () => {
      expect(hasReflection({ reflection_hardest_moment: 'Some thought' })).toBe(true);
    });

    it('returns true when reflection_push_through is filled', () => {
      expect(hasReflection({ reflection_push_through: 'Some thought' })).toBe(true);
    });

    it('returns true when reflection_next_time is filled', () => {
      expect(hasReflection({ reflection_next_time: 'Some thought' })).toBe(true);
    });

    it('returns true when multiple reflection fields are filled', () => {
      expect(hasReflection({
        reflection_hardest_moment: 'Thought 1',
        reflection_push_through: 'Thought 2',
        reflection_next_time: 'Thought 3',
      })).toBe(true);
    });
  });

  describe('subtractWillpowerPoints', () => {
    const userId = 'test-user-123';

    beforeEach(() => {
      resetMockDB();
    });

    it('subtracts points from user total', async () => {
      addMockDocument('users', userId, {
        totalWillpowerPoints: 100,
      });

      const result = await subtractWillpowerPoints(userId, 25);

      expect(result).toBe(75);
      const db = getMockDB();
      expect(db.users?.[userId]?.data.totalWillpowerPoints).toBe(75);
    });

    it('does not allow negative points (floors at 0)', async () => {
      addMockDocument('users', userId, {
        totalWillpowerPoints: 10,
      });

      const result = await subtractWillpowerPoints(userId, 25);

      expect(result).toBe(0);
      const db = getMockDB();
      expect(db.users?.[userId]?.data.totalWillpowerPoints).toBe(0);
    });

    it('handles user with no existing points', async () => {
      addMockDocument('users', userId, {});

      const result = await subtractWillpowerPoints(userId, 10);

      expect(result).toBe(0);
    });

    it('handles new user (no document)', async () => {
      const result = await subtractWillpowerPoints(userId, 10);

      expect(result).toBe(0);
    });

    it('subtracts exact amount when sufficient points', async () => {
      addMockDocument('users', userId, {
        totalWillpowerPoints: 50,
      });

      const result = await subtractWillpowerPoints(userId, 50);

      expect(result).toBe(0);
    });
  });

  describe('adjustWillpowerPoints', () => {
    const userId = 'test-user-123';

    beforeEach(() => {
      resetMockDB();
    });

    it('adds positive delta to points', async () => {
      addMockDocument('users', userId, {
        totalWillpowerPoints: 100,
      });

      const result = await adjustWillpowerPoints(userId, 15);

      expect(result).toBe(115);
      const db = getMockDB();
      expect(db.users?.[userId]?.data.totalWillpowerPoints).toBe(115);
    });

    it('subtracts negative delta from points', async () => {
      addMockDocument('users', userId, {
        totalWillpowerPoints: 100,
      });

      const result = await adjustWillpowerPoints(userId, -20);

      expect(result).toBe(80);
    });

    it('does not go below 0 with negative delta', async () => {
      addMockDocument('users', userId, {
        totalWillpowerPoints: 10,
      });

      const result = await adjustWillpowerPoints(userId, -25);

      expect(result).toBe(0);
    });

    it('handles 0 delta (no change)', async () => {
      addMockDocument('users', userId, {
        totalWillpowerPoints: 100,
      });

      const result = await adjustWillpowerPoints(userId, 0);

      expect(result).toBe(100);
    });

    it('handles new user with positive delta', async () => {
      const result = await adjustWillpowerPoints(userId, 10);

      expect(result).toBe(10);
    });
  });

  describe('recalculateUserStats', () => {
    const userId = 'test-user-123';

    beforeEach(() => {
      resetMockDB();
    });

    it('returns 0 streak when no completion logs exist', async () => {
      const result = await recalculateUserStats(userId);

      expect(result.newStreak).toBe(0);
      expect(result.lastActivityDate).toBeNull();
    });

    it('calculates streak from consecutive days', async () => {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const todayStr = today.toISOString().split('T')[0];
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

      addMockDocument(`users/${userId}/completionLogs`, 'log-1', {
        date: todayStr,
        points: 1,
      });

      addMockDocument(`users/${userId}/completionLogs`, 'log-2', {
        date: yesterdayStr,
        points: 2,
      });

      addMockDocument(`users/${userId}/completionLogs`, 'log-3', {
        date: twoDaysAgoStr,
        points: 1,
      });

      const result = await recalculateUserStats(userId);

      expect(result.newStreak).toBe(3);
      expect(result.lastActivityDate).toBe(todayStr);
    });

    it('breaks streak when there is a gap', async () => {
      const today = new Date();
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const todayStr = today.toISOString().split('T')[0];
      const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

      addMockDocument(`users/${userId}/completionLogs`, 'log-1', {
        date: todayStr,
        points: 1,
      });

      // Gap of 2 days
      addMockDocument(`users/${userId}/completionLogs`, 'log-2', {
        date: threeDaysAgoStr,
        points: 1,
      });

      const result = await recalculateUserStats(userId);

      expect(result.newStreak).toBe(1); // Only today counts
    });

    it('updates user document with new streak', async () => {
      const today = new Date().toISOString().split('T')[0];

      addMockDocument(`users/${userId}/completionLogs`, 'log-1', {
        date: today,
        points: 1,
      });

      await recalculateUserStats(userId);

      const db = getMockDB();
      expect(db.users?.[userId]?.data.currentStreak).toBe(1);
      expect(db.users?.[userId]?.data.lastActivityDate).toBe(today);
    });

    it('handles multiple logs on same day as single day', async () => {
      const today = new Date().toISOString().split('T')[0];

      addMockDocument(`users/${userId}/completionLogs`, 'log-1', {
        date: today,
        points: 1,
      });

      addMockDocument(`users/${userId}/completionLogs`, 'log-2', {
        date: today,
        points: 2,
      });

      addMockDocument(`users/${userId}/completionLogs`, 'log-3', {
        date: today,
        points: 1,
      });

      const result = await recalculateUserStats(userId);

      expect(result.newStreak).toBe(1); // Still just 1 day
    });
  });
});
