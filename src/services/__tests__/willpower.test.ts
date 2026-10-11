import {
  getStreakTierInfo,
  updateWillpowerStats,
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
  describe('getStreakTierInfo', () => {
    it('names each tier by its streak length', () => {
      expect(getStreakTierInfo(1).tierName).toBe('Starting');
      expect(getStreakTierInfo(3).tierName).toBe('Building Momentum');
      expect(getStreakTierInfo(7).tierName).toBe('On Fire');
      expect(getStreakTierInfo(14).tierName).toBe('Unstoppable');
      expect(getStreakTierInfo(30).tierName).toBe('Legendary');
      expect(getStreakTierInfo(100).tierName).toBe('Legendary');
    });

    it('treats a zero streak as Starting', () => {
      expect(getStreakTierInfo(0).tierName).toBe('Starting');
    });
  });

  describe('updateWillpowerStats', () => {
    const userId = 'u1';
    const seedUser = (data: Record<string, any>) => addMockDocument('users', userId, data);
    const yesterday = () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return toLocalDateString(d);
    };

    beforeEach(() => resetMockDB());

    it('adds points as given, however long the streak', () => {
      // XP is friction overcome: a 40-day streak must not inflate it.
      seedUser({ totalWillpowerPoints: 100, currentStreak: 40, lastActivityDate: yesterday() });
      return updateWillpowerStats(userId, 2).then((result) => {
        expect(result.newTotal).toBe(102);
        expect(result.newStreak).toBe(41);
        expect(getMockDB().users[userId].data.totalWillpowerPoints).toBe(102);
      });
    });

    it('reports crossing into a new tier', async () => {
      seedUser({ totalWillpowerPoints: 0, currentStreak: 2, lastActivityDate: yesterday() });
      const result = await updateWillpowerStats(userId, 1);
      expect(result.newTierReached).toBe(true);
      expect(result.tierInfo).toEqual({ tierName: 'Building Momentum', minDays: 3 });
    });

    it('does not call a first-ever day a new tier', async () => {
      const result = await updateWillpowerStats(userId, 1);
      expect(result.newStreak).toBe(1);
      expect(result.newTierReached).toBe(false);
      expect(result.tierInfo).toBeNull();
    });

    it('stays quiet inside a tier', async () => {
      seedUser({ currentStreak: 4, lastActivityDate: yesterday() });
      const result = await updateWillpowerStats(userId, 1);
      expect(result.newTierReached).toBe(false);
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
