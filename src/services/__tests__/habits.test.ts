import {
  logHabitCompletion,
  getUnloggedHabitsForDate,
  getActiveHabits,
  getCurrentWeekBounds,
} from '../habits';
import {
  addMockDocument,
  getMockDB,
  resetMockDB,
} from '../__mocks__/firestore';

describe('Habits Service - Backdating and Unlogged Habits', () => {
  const userId = 'test-user-123';

  beforeEach(() => {
    resetMockDB();
    jest.clearAllMocks();
  });

  describe('logHabitCompletion', () => {
    it('logs habit with default date (today) when no date provided', async () => {
      const habitId = 'habit-123';
      const today = new Date().toISOString().split('T')[0];

      await logHabitCompletion(userId, habitId, 'easy');

      const db = getMockDB();
      const logs = db[`users/${userId}/completionLogs`] || {};
      const logEntries = Object.values(logs);

      expect(logEntries.length).toBe(1);
      expect(logEntries[0].data.type).toBe('nudge');
      expect(logEntries[0].data.reference_id).toBe(habitId);
      expect(logEntries[0].data.points).toBe(1);
      expect(logEntries[0].data.date).toBe(today);
    });

    it('logs habit with specified backdated date', async () => {
      const habitId = 'habit-123';
      const backdateDate = '2024-01-15';

      await logHabitCompletion(userId, habitId, 'challenging', backdateDate);

      const db = getMockDB();
      const logs = db[`users/${userId}/completionLogs`] || {};
      const logEntries = Object.values(logs);

      expect(logEntries.length).toBe(1);
      expect(logEntries[0].data.date).toBe(backdateDate);
      expect(logEntries[0].data.points).toBe(2); // Challenging = 2 points
    });

    it('assigns 1 point for easy difficulty', async () => {
      await logHabitCompletion(userId, 'habit-1', 'easy');

      const db = getMockDB();
      const logs = Object.values(db[`users/${userId}/completionLogs`] || {});

      expect(logs[0].data.points).toBe(1);
      expect(logs[0].data.difficulty).toBe(1);
    });

    it('assigns 2 points for challenging difficulty', async () => {
      await logHabitCompletion(userId, 'habit-1', 'challenging');

      const db = getMockDB();
      const logs = Object.values(db[`users/${userId}/completionLogs`] || {});

      expect(logs[0].data.points).toBe(2);
      expect(logs[0].data.difficulty).toBe(2);
    });

    it('includes completed_at timestamp', async () => {
      await logHabitCompletion(userId, 'habit-1', 'easy');

      const db = getMockDB();
      const logs = Object.values(db[`users/${userId}/completionLogs`] || {});

      expect(logs[0].data.completed_at).toBeDefined();
      expect(typeof logs[0].data.completed_at).toBe('string');
    });

    it('can backdate multiple habits to same date', async () => {
      const backdateDate = '2024-01-15';

      await logHabitCompletion(userId, 'habit-1', 'easy', backdateDate);
      await logHabitCompletion(userId, 'habit-2', 'challenging', backdateDate);

      const db = getMockDB();
      const logs = Object.values(db[`users/${userId}/completionLogs`] || {});

      expect(logs.length).toBe(2);
      expect(logs[0].data.date).toBe(backdateDate);
      expect(logs[1].data.date).toBe(backdateDate);
    });
  });

  describe('getUnloggedHabitsForDate', () => {
    it('returns all active habits when none are logged for date', async () => {
      // Setup: Add active habits
      addMockDocument(`users/${userId}/habits`, 'habit-1', {
        user_id: userId,
        name: 'Exercise',
        category_id: 'cat-1',
        is_active: true,
        created_by_user: true,
      });

      addMockDocument(`users/${userId}/habits`, 'habit-2', {
        user_id: userId,
        name: 'Meditation',
        category_id: 'cat-2',
        is_active: true,
        created_by_user: true,
      });

      const result = await getUnloggedHabitsForDate(userId, '2024-01-15');

      expect(result.length).toBe(2);
      expect(result.map((h) => h.name)).toContain('Exercise');
      expect(result.map((h) => h.name)).toContain('Meditation');
    });

    it('excludes habits that are already logged for the date', async () => {
      // Setup: Add active habits
      addMockDocument(`users/${userId}/habits`, 'habit-1', {
        user_id: userId,
        name: 'Exercise',
        category_id: 'cat-1',
        is_active: true,
        created_by_user: true,
      });

      addMockDocument(`users/${userId}/habits`, 'habit-2', {
        user_id: userId,
        name: 'Meditation',
        category_id: 'cat-2',
        is_active: true,
        created_by_user: true,
      });

      // Setup: Log habit-1 for the date
      addMockDocument(`users/${userId}/completionLogs`, 'log-1', {
        user_id: userId,
        type: 'nudge',
        reference_id: 'habit-1',
        points: 1,
        date: '2024-01-15',
      });

      const result = await getUnloggedHabitsForDate(userId, '2024-01-15');

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('habit-2');
      expect(result[0].name).toBe('Meditation');
    });

    it('returns empty array when all habits are logged', async () => {
      addMockDocument(`users/${userId}/habits`, 'habit-1', {
        user_id: userId,
        name: 'Exercise',
        category_id: 'cat-1',
        is_active: true,
        created_by_user: true,
      });

      addMockDocument(`users/${userId}/completionLogs`, 'log-1', {
        user_id: userId,
        type: 'nudge',
        reference_id: 'habit-1',
        points: 1,
        date: '2024-01-15',
      });

      const result = await getUnloggedHabitsForDate(userId, '2024-01-15');

      expect(result.length).toBe(0);
    });

    it('excludes inactive habits', async () => {
      addMockDocument(`users/${userId}/habits`, 'habit-1', {
        user_id: userId,
        name: 'Active Habit',
        category_id: 'cat-1',
        is_active: true,
        created_by_user: true,
      });

      addMockDocument(`users/${userId}/habits`, 'habit-2', {
        user_id: userId,
        name: 'Inactive Habit',
        category_id: 'cat-2',
        is_active: false,
        created_by_user: true,
      });

      const result = await getUnloggedHabitsForDate(userId, '2024-01-15');

      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Active Habit');
    });

    it('only considers logs for the specific date', async () => {
      addMockDocument(`users/${userId}/habits`, 'habit-1', {
        user_id: userId,
        name: 'Exercise',
        category_id: 'cat-1',
        is_active: true,
        created_by_user: true,
      });

      // Log for different date
      addMockDocument(`users/${userId}/completionLogs`, 'log-1', {
        user_id: userId,
        type: 'nudge',
        reference_id: 'habit-1',
        points: 1,
        date: '2024-01-14', // Different date
      });

      const result = await getUnloggedHabitsForDate(userId, '2024-01-15');

      // Habit should be available since it wasn't logged on 2024-01-15
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('habit-1');
    });

    it('ignores challenge logs (only checks nudge type)', async () => {
      addMockDocument(`users/${userId}/habits`, 'habit-1', {
        user_id: userId,
        name: 'Exercise',
        category_id: 'cat-1',
        is_active: true,
        created_by_user: true,
      });

      // Challenge log (not a habit)
      addMockDocument(`users/${userId}/completionLogs`, 'log-1', {
        user_id: userId,
        type: 'challenge',
        reference_id: 'challenge-1',
        points: 5,
        date: '2024-01-15',
      });

      const result = await getUnloggedHabitsForDate(userId, '2024-01-15');

      // Habit should still be available
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Exercise');
    });

    it('returns empty when no active habits exist', async () => {
      const result = await getUnloggedHabitsForDate(userId, '2024-01-15');
      expect(result).toEqual([]);
    });
  });

  describe('getActiveHabits', () => {
    it('returns only active habits', async () => {
      addMockDocument(`users/${userId}/habits`, 'habit-1', {
        user_id: userId,
        name: 'Active 1',
        is_active: true,
      });

      addMockDocument(`users/${userId}/habits`, 'habit-2', {
        user_id: userId,
        name: 'Inactive',
        is_active: false,
      });

      addMockDocument(`users/${userId}/habits`, 'habit-3', {
        user_id: userId,
        name: 'Active 2',
        is_active: true,
      });

      const result = await getActiveHabits(userId);

      expect(result.length).toBe(2);
      expect(result.every((h) => h.is_active)).toBe(true);
    });

    it('defaults target_count_per_week to 3 if not set', async () => {
      addMockDocument(`users/${userId}/habits`, 'habit-1', {
        user_id: userId,
        name: 'Old Habit',
        is_active: true,
        // No target_count_per_week
      });

      const result = await getActiveHabits(userId);

      expect(result[0].target_count_per_week).toBe(3);
    });

    it('preserves existing target_count_per_week', async () => {
      addMockDocument(`users/${userId}/habits`, 'habit-1', {
        user_id: userId,
        name: 'Habit',
        is_active: true,
        target_count_per_week: 5,
      });

      const result = await getActiveHabits(userId);

      expect(result[0].target_count_per_week).toBe(5);
    });
  });

  describe('getCurrentWeekBounds', () => {
    it('returns valid date strings in YYYY-MM-DD format', () => {
      const { mondayStr, sundayStr } = getCurrentWeekBounds();

      expect(mondayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(sundayStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('monday is before or equal to sunday', () => {
      const { mondayStr, sundayStr } = getCurrentWeekBounds();

      expect(mondayStr <= sundayStr).toBe(true);
    });

    it('week span is exactly 6 days', () => {
      const { mondayStr, sundayStr } = getCurrentWeekBounds();

      const monday = new Date(mondayStr);
      const sunday = new Date(sundayStr);
      const diffMs = sunday.getTime() - monday.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      expect(diffDays).toBe(6);
    });
  });
});
