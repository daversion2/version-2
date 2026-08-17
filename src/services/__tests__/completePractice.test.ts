import { completePractice } from '../practices';
import { addMockDocument, getMockDB, resetMockDB } from '../__mocks__/firestore';
import { toLocalDateString, getTodayString, getYesterdayString } from '../../utils/date';

/**
 * completePractice is the single write path for a rep, whether it happened just
 * now or earlier in the week. The behaviour these tests pin down is the reason
 * the two cases can't just share one code path blindly: updateWillpowerStats()
 * stamps lastActivityDate as TODAY, so using it for a backdated rep would
 * credit today's streak for something the user did on Saturday.
 */
describe('completePractice', () => {
  const userId = 'test-user-123';
  const practice = { id: 'habit-1', name: 'Cold exposure' };

  const daysAgo = (n: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return toLocalDateString(d);
  };

  const seedUser = (data: Record<string, any> = {}) =>
    addMockDocument('users', userId, {
      totalWillpowerPoints: 0,
      totalHabitsCompleted: 0,
      practices_tried: 0,
      currentStreak: 0,
      lastActivityDate: null,
      ...data,
    });

  const seedRep = (logId: string, habitId: string, date: string) =>
    addMockDocument(`users/${userId}/completionLogs`, logId, {
      user_id: userId,
      type: 'nudge',
      reference_id: habitId,
      points: 1,
      difficulty: 1,
      date,
    });

  const userDoc = () => getMockDB().users?.[userId]?.data;

  const logs = () => Object.values(getMockDB()[`users/${userId}/completionLogs`] || {});

  beforeEach(() => {
    resetMockDB();
    jest.clearAllMocks();
  });

  describe('logging today', () => {
    it('files the rep under today and stamps activity as today', async () => {
      seedUser();

      const result = await completePractice(userId, practice, { difficulty: 'easy' });

      expect(result.backdated).toBe(false);
      expect(result.date).toBe(getTodayString());
      expect(logs()[0].data.date).toBe(getTodayString());
      expect(userDoc().lastActivityDate).toBe(getTodayString());
    });

    it('reports a newly reached streak tier so the caller can celebrate it', async () => {
      // Day 2 → day 3 crosses out of the 1.0x tier.
      seedUser({ currentStreak: 2, lastActivityDate: getYesterdayString() });

      const result = await completePractice(userId, practice, { difficulty: 'easy' });

      expect(result.willpower.newStreak).toBe(3);
      expect(result.willpower.newTierReached).toBe(true);
    });
  });

  describe('backdating', () => {
    it('files the rep under the given day, not today', async () => {
      seedUser();
      const when = daysAgo(3);

      const result = await completePractice(userId, practice, {
        difficulty: 'easy',
        date: when,
      });

      expect(result.backdated).toBe(true);
      expect(result.date).toBe(when);
      expect(logs()[0].data.date).toBe(when);
    });

    it('does not mark today as active for a rep done days ago', async () => {
      // The core streak-safety guarantee. With updateWillpowerStats this would
      // set lastActivityDate to today and hand the user a streak they didn't earn.
      seedUser();
      const when = daysAgo(3);

      await completePractice(userId, practice, { difficulty: 'easy', date: when });

      expect(userDoc().lastActivityDate).toBe(when);
      expect(userDoc().currentStreak).toBe(0); // 3 days ago is not a live streak
    });

    it('extends the streak when the backfill closes yesterday\'s gap', async () => {
      seedUser();
      seedRep('log-today', 'habit-2', getTodayString());

      await completePractice(userId, practice, {
        difficulty: 'easy',
        date: getYesterdayString(),
      });

      // today + yesterday, derived from the logs rather than a stamp.
      expect(userDoc().currentStreak).toBe(2);
      expect(userDoc().lastActivityDate).toBe(getTodayString());
    });

    it('never reports a new tier, so no milestone alert fires on a backfill', async () => {
      seedUser({ currentStreak: 2, lastActivityDate: getYesterdayString() });
      seedRep('log-y', 'habit-2', getYesterdayString());

      const result = await completePractice(userId, practice, {
        difficulty: 'easy',
        date: getYesterdayString(),
      });

      expect(result.willpower.newTierReached).toBe(false);
      expect(result.willpower.tierInfo).toBeNull();
    });

    it('still awards XP', async () => {
      seedUser({ totalWillpowerPoints: 10 });

      const result = await completePractice(userId, practice, {
        difficulty: 'challenging',
        date: daysAgo(2),
      });

      expect(result.pointsEarned).toBeGreaterThan(0);
      expect(userDoc().totalWillpowerPoints).toBe(10 + result.pointsEarned);
    });
  });

  describe('parity between a backdated rep and a live one', () => {
    it('pays the first-try bonus and counts the practice as tried', async () => {
      seedUser();

      const result = await completePractice(userId, practice, {
        difficulty: 'easy',
        date: daysAgo(2),
      });

      expect(result.firstTry).toBe(true);
      // Easy = 1 base point at a 1.0x multiplier, doubled for the first try.
      expect(result.pointsEarned).toBe(2);
      expect(userDoc().practices_tried).toBe(1);
    });

    it('does not pay the first-try bonus twice for the same practice', async () => {
      seedUser();
      seedRep('log-old', practice.id, daysAgo(5));

      const result = await completePractice(userId, practice, {
        difficulty: 'easy',
        date: daysAgo(2),
      });

      expect(result.firstTry).toBe(false);
      expect(result.pointsEarned).toBe(1);
      expect(userDoc().practices_tried).toBe(0);
    });

    it('applies the streak multiplier, same as a live rep', async () => {
      // 7-day streak sits in a >1.0x tier; a backfill must not be flattened to
      // the raw 1/2 points the old backdate path awarded.
      seedUser({ currentStreak: 7, lastActivityDate: getTodayString() });
      seedRep('log-prior', practice.id, daysAgo(5)); // not a first try

      const result = await completePractice(userId, practice, {
        difficulty: 'challenging',
        date: daysAgo(2),
      });

      expect(result.pointsEarned).toBeGreaterThan(2);
    });

    it('persists tracking metrics captured for a past day', async () => {
      seedUser();

      await completePractice(userId, practice, {
        difficulty: 'challenging',
        date: daysAgo(1),
        metrics: { duration_min: 12 },
      });

      expect(logs()[0].data.metrics).toEqual({ duration_min: 12 });
    });

    it('counts toward totalHabitsCompleted', async () => {
      seedUser({ totalHabitsCompleted: 2 });

      await completePractice(userId, practice, { difficulty: 'easy', date: daysAgo(1) });

      expect(userDoc().totalHabitsCompleted).toBe(3);
    });
  });
});
