import {
  getStreakMultiplier,
  calculateChallengePoints,
  calculateFailedChallengePoints,
  calculateHabitPoints,
  getStreakTierInfo,
  getSuckFactorTier,
  subtractWillpowerPoints,
  adjustWillpowerPoints,
  recalculateUserStats,
} from '../willpower';
import {
  addMockDocument,
  getMockDB,
  resetMockDB,
} from '../__mocks__/firestore';
// These streak tests build expected dates by hand. They must use the SAME
// local-time formatter the service does — deriving them from toISOString()
// (UTC) made every one of them fail during the evening in any timezone behind
// Greenwich, which read as a broken streak calculation rather than a broken test.
import { toLocalDateString } from '../../utils/date';

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

  describe('calculateChallengePoints', () => {
    it('returns base difficulty when no streak', () => {
      expect(calculateChallengePoints(3, 1)).toBe(3);
      expect(calculateChallengePoints(5, 1)).toBe(5);
    });

    it('applies streak multiplier correctly', () => {
      // 3-day streak = 1.2x multiplier
      // difficulty 5 * 1.2 = 6
      expect(calculateChallengePoints(5, 3)).toBe(6);
    });

    it('rounds points correctly', () => {
      // difficulty 3 * 1.2 = 3.6, rounds to 4
      expect(calculateChallengePoints(3, 3)).toBe(4);
    });
  });

  describe('calculateFailedChallengePoints', () => {
    it('returns 1 point for failed challenge with no streak', () => {
      expect(calculateFailedChallengePoints(1)).toBe(1);
    });

    it('applies streak multiplier', () => {
      // 1 * 1.2 = 1.2, rounds to 1
      expect(calculateFailedChallengePoints(3)).toBe(1);
      // 1 * 1.5 = 1.5, rounds to 2
      expect(calculateFailedChallengePoints(7)).toBe(2);
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

      const todayStr = toLocalDateString(today);
      const yesterdayStr = toLocalDateString(yesterday);
      const twoDaysAgoStr = toLocalDateString(twoDaysAgo);

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

      const todayStr = toLocalDateString(today);
      const threeDaysAgoStr = toLocalDateString(threeDaysAgo);

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
      const today = toLocalDateString(new Date());

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
      const today = toLocalDateString(new Date());

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
