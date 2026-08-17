import {
  deleteCompletionLog,
  updateCompletionLog,
  getCompletionLogById,
  getCompletionLogs,
} from '../progress';
import {
  addMockDocument,
  getMockDB,
  resetMockDB,
} from '../__mocks__/firestore';

// Mock the willpower module
jest.mock('../willpower', () => ({
  subtractWillpowerPoints: jest.fn().mockResolvedValue(100),
  recalculateUserStats: jest.fn().mockResolvedValue({ newStreak: 5, lastActivityDate: '2024-01-15' }),
}));

const { subtractWillpowerPoints, recalculateUserStats } = require('../willpower');

describe('Progress Service - Delete and Update Logs', () => {
  const userId = 'test-user-123';

  beforeEach(() => {
    resetMockDB();
    jest.clearAllMocks();
    // deleteCompletionLog rolls back lifetime counters on the user doc. The
    // rollback is best-effort, so a missing doc only logs a warning — seed one
    // so these tests exercise the real path instead of the fallback.
    addMockDocument('users', userId, { totalHabitsCompleted: 10, practices_tried: 5 });
  });

  describe('deleteCompletionLog', () => {
    it('deletes a habit completion log and subtracts points', async () => {
      const logId = 'log-456';

      addMockDocument(`users/${userId}/completionLogs`, logId, {
        user_id: userId,
        type: 'nudge',
        reference_id: 'habit-123',
        points: 2,
        difficulty: 2,
        date: '2024-01-15',
      });

      const result = await deleteCompletionLog(userId, logId);

      // Verify result
      expect(result.pointsRemoved).toBe(2);

      // Verify log was deleted
      const db = getMockDB();
      expect(db[`users/${userId}/completionLogs`]?.[logId]).toBeUndefined();

      // Verify subtractWillpowerPoints was called
      expect(subtractWillpowerPoints).toHaveBeenCalledWith(userId, 2);

      // Verify recalculateUserStats was called
      expect(recalculateUserStats).toHaveBeenCalledWith(userId);
    });

    it('handles log with 1 point (easy habit)', async () => {
      const logId = 'log-easy';

      addMockDocument(`users/${userId}/completionLogs`, logId, {
        user_id: userId,
        type: 'nudge',
        reference_id: 'habit-123',
        points: 1,
        difficulty: 1,
        date: '2024-01-15',
      });

      const result = await deleteCompletionLog(userId, logId);

      expect(result.pointsRemoved).toBe(1);
      expect(subtractWillpowerPoints).toHaveBeenCalledWith(userId, 1);
    });

    it('throws error when log does not exist', async () => {
      await expect(deleteCompletionLog(userId, 'non-existent')).rejects.toThrow(
        'Completion log not found'
      );
    });

    it('handles log with no points (edge case)', async () => {
      const logId = 'log-no-points';

      addMockDocument(`users/${userId}/completionLogs`, logId, {
        user_id: userId,
        type: 'nudge',
        reference_id: 'habit-123',
        // No points field
        date: '2024-01-15',
      });

      const result = await deleteCompletionLog(userId, logId);

      expect(result.pointsRemoved).toBe(0);
      // subtractWillpowerPoints should not be called for 0 points
      expect(subtractWillpowerPoints).not.toHaveBeenCalled();
    });

    it('deletes challenge completion logs', async () => {
      const logId = 'log-challenge';

      addMockDocument(`users/${userId}/completionLogs`, logId, {
        user_id: userId,
        type: 'challenge',
        reference_id: 'challenge-123',
        points: 5,
        difficulty: 5,
        date: '2024-01-15',
      });

      const result = await deleteCompletionLog(userId, logId);

      expect(result.pointsRemoved).toBe(5);
      const db = getMockDB();
      expect(db[`users/${userId}/completionLogs`]?.[logId]).toBeUndefined();
    });

    // Logging a practice increments lifetime counters that gate real behavior
    // (the Training unlock at 3, the {habits_completed}/{practices_tried}
    // notification placeholders). Deleting has to reverse them or they ratchet
    // upward forever.
    describe('lifetime counter rollback', () => {
      const seedUser = (data: Record<string, any>) =>
        addMockDocument('users', userId, data);

      const seedRep = (logId: string, habitId: string, date = '2024-01-15') =>
        addMockDocument(`users/${userId}/completionLogs`, logId, {
          user_id: userId,
          type: 'nudge',
          reference_id: habitId,
          points: 1,
          difficulty: 1,
          date,
        });

      it('decrements totalHabitsCompleted when a rep is deleted', async () => {
        seedUser({ totalHabitsCompleted: 4, practices_tried: 2 });
        seedRep('log-1', 'habit-1');
        seedRep('log-2', 'habit-1'); // another rep of the same practice remains

        await deleteCompletionLog(userId, 'log-1');

        const db = getMockDB();
        expect(db.users?.[userId]?.data.totalHabitsCompleted).toBe(3);
      });

      it('leaves practices_tried alone while other reps of that practice remain', async () => {
        seedUser({ totalHabitsCompleted: 4, practices_tried: 2 });
        seedRep('log-1', 'habit-1');
        seedRep('log-2', 'habit-1');

        await deleteCompletionLog(userId, 'log-1');

        const db = getMockDB();
        // The practice is still "tried" — one rep of it survives.
        expect(db.users?.[userId]?.data.practices_tried).toBe(2);
      });

      it('decrements practices_tried when deleting the practice\'s last rep', async () => {
        seedUser({ totalHabitsCompleted: 4, practices_tried: 2 });
        seedRep('log-1', 'habit-1');
        seedRep('log-2', 'habit-2'); // a different practice

        await deleteCompletionLog(userId, 'log-1');

        const db = getMockDB();
        expect(db.users?.[userId]?.data.practices_tried).toBe(1);
        expect(db.users?.[userId]?.data.totalHabitsCompleted).toBe(3);
      });

      it('does not touch practice counters when deleting a challenge log', async () => {
        seedUser({ totalHabitsCompleted: 4, practices_tried: 2 });
        addMockDocument(`users/${userId}/completionLogs`, 'log-c', {
          user_id: userId,
          type: 'challenge',
          reference_id: 'challenge-1',
          points: 5,
          date: '2024-01-15',
        });

        await deleteCompletionLog(userId, 'log-c');

        const db = getMockDB();
        expect(db.users?.[userId]?.data.totalHabitsCompleted).toBe(4);
        expect(db.users?.[userId]?.data.practices_tried).toBe(2);
      });
    });
  });

  describe('updateCompletionLog', () => {
    it('updates log points', async () => {
      const logId = 'log-update';

      addMockDocument(`users/${userId}/completionLogs`, logId, {
        user_id: userId,
        type: 'nudge',
        reference_id: 'habit-123',
        points: 1,
        difficulty: 1,
        date: '2024-01-15',
      });

      await updateCompletionLog(userId, logId, { points: 2, difficulty: 2 });

      const db = getMockDB();
      const updatedLog = db[`users/${userId}/completionLogs`]?.[logId];
      expect(updatedLog?.data.points).toBe(2);
      expect(updatedLog?.data.difficulty).toBe(2);
    });

    it('updates only specified fields', async () => {
      const logId = 'log-partial';

      addMockDocument(`users/${userId}/completionLogs`, logId, {
        user_id: userId,
        type: 'nudge',
        reference_id: 'habit-123',
        points: 1,
        difficulty: 1,
        date: '2024-01-15',
        completed_at: '2024-01-15T10:00:00Z',
      });

      await updateCompletionLog(userId, logId, { points: 2 });

      const db = getMockDB();
      const updatedLog = db[`users/${userId}/completionLogs`]?.[logId];
      expect(updatedLog?.data.points).toBe(2);
      expect(updatedLog?.data.difficulty).toBe(1); // Unchanged
      expect(updatedLog?.data.completed_at).toBe('2024-01-15T10:00:00Z'); // Unchanged
    });

    it('throws error when log does not exist', async () => {
      await expect(
        updateCompletionLog(userId, 'non-existent', { points: 5 })
      ).rejects.toThrow();
    });
  });

  describe('getCompletionLogById', () => {
    it('returns log when it exists', async () => {
      const logId = 'log-get';

      addMockDocument(`users/${userId}/completionLogs`, logId, {
        user_id: userId,
        type: 'nudge',
        reference_id: 'habit-123',
        points: 2,
        difficulty: 2,
        date: '2024-01-15',
      });

      const result = await getCompletionLogById(userId, logId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(logId);
      expect(result?.type).toBe('nudge');
      expect(result?.points).toBe(2);
    });

    it('returns null when log does not exist', async () => {
      const result = await getCompletionLogById(userId, 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getCompletionLogs', () => {
    it('returns all logs for user', async () => {
      addMockDocument(`users/${userId}/completionLogs`, 'log-1', {
        user_id: userId,
        type: 'nudge',
        reference_id: 'habit-1',
        points: 1,
        date: '2024-01-15',
      });

      addMockDocument(`users/${userId}/completionLogs`, 'log-2', {
        user_id: userId,
        type: 'challenge',
        reference_id: 'challenge-1',
        points: 5,
        date: '2024-01-14',
      });

      const result = await getCompletionLogs(userId);

      expect(result.length).toBe(2);
    });

    it('filters logs by startDate', async () => {
      addMockDocument(`users/${userId}/completionLogs`, 'log-1', {
        user_id: userId,
        type: 'nudge',
        reference_id: 'habit-1',
        points: 1,
        date: '2024-01-15',
      });

      addMockDocument(`users/${userId}/completionLogs`, 'log-2', {
        user_id: userId,
        type: 'challenge',
        reference_id: 'challenge-1',
        points: 5,
        date: '2024-01-10',
      });

      const result = await getCompletionLogs(userId, '2024-01-12');

      expect(result.length).toBe(1);
      expect(result[0].date).toBe('2024-01-15');
    });

    it('filters logs by endDate', async () => {
      addMockDocument(`users/${userId}/completionLogs`, 'log-1', {
        user_id: userId,
        type: 'nudge',
        reference_id: 'habit-1',
        points: 1,
        date: '2024-01-15',
      });

      addMockDocument(`users/${userId}/completionLogs`, 'log-2', {
        user_id: userId,
        type: 'challenge',
        reference_id: 'challenge-1',
        points: 5,
        date: '2024-01-10',
      });

      const result = await getCompletionLogs(userId, undefined, '2024-01-12');

      expect(result.length).toBe(1);
      expect(result[0].date).toBe('2024-01-10');
    });

    it('filters logs by date range', async () => {
      addMockDocument(`users/${userId}/completionLogs`, 'log-1', {
        user_id: userId,
        type: 'nudge',
        reference_id: 'habit-1',
        points: 1,
        date: '2024-01-20',
      });

      addMockDocument(`users/${userId}/completionLogs`, 'log-2', {
        user_id: userId,
        type: 'challenge',
        reference_id: 'challenge-1',
        points: 5,
        date: '2024-01-15',
      });

      addMockDocument(`users/${userId}/completionLogs`, 'log-3', {
        user_id: userId,
        type: 'nudge',
        reference_id: 'habit-2',
        points: 2,
        date: '2024-01-10',
      });

      const result = await getCompletionLogs(userId, '2024-01-12', '2024-01-18');

      expect(result.length).toBe(1);
      expect(result[0].date).toBe('2024-01-15');
    });

    it('returns empty array when no logs exist', async () => {
      const result = await getCompletionLogs(userId);
      expect(result).toEqual([]);
    });
  });
});
