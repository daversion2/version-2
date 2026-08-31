import {
  logHabitCompletion,
  getHabitsForDate,
  getActiveHabits,
  getCurrentWeekBounds,
  createHabit,
} from '../practices';
import {
  addMockDocument,
  getMockDB,
  resetMockDB,
} from '../__mocks__/firestore';
import { toLocalDateString } from '../../utils/date';

describe('Habits Service - Backdating and Unlogged Habits', () => {
  const userId = 'test-user-123';

  beforeEach(() => {
    resetMockDB();
    jest.clearAllMocks();
    // logHabitCompletion bumps totalHabitsCompleted on the user doc, so the doc
    // has to exist — updateDoc rejects writes to a missing document, same as
    // Firestore does.
    addMockDocument('users', userId, { totalHabitsCompleted: 0 });
  });

  describe('logHabitCompletion', () => {
    it('logs habit with default date (today) when no date provided', async () => {
      const habitId = 'habit-123';
      // Local time — logHabitCompletion files reps by local calendar day, so a
      // UTC expectation fails every evening west of Greenwich.
      const today = toLocalDateString(new Date());

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

  describe('getHabitsForDate', () => {
    const addHabit = (id: string, name: string, isActive = true) =>
      addMockDocument(`users/${userId}/habits`, id, {
        user_id: userId,
        name,
        is_active: isActive,
        created_by_user: true,
      });

    const addLog = (id: string, referenceId: string, date: string, type = 'nudge') =>
      addMockDocument(`users/${userId}/completionLogs`, id, {
        user_id: userId,
        type,
        reference_id: referenceId,
        points: 1,
        date,
      });

    it('returns every active habit with a zero count when nothing is logged', async () => {
      addHabit('habit-1', 'Exercise');
      addHabit('habit-2', 'Meditation');

      const result = await getHabitsForDate(userId, '2024-01-15');

      expect(result.length).toBe(2);
      expect(result.map((r) => r.habit.name).sort()).toEqual(['Exercise', 'Meditation']);
      expect(result.every((r) => r.loggedCount === 0)).toBe(true);
    });

    it('keeps already-logged habits in the list and reports their count', async () => {
      addHabit('habit-1', 'Exercise');
      addHabit('habit-2', 'Meditation');
      addLog('log-1', 'habit-1', '2024-01-15');

      const result = await getHabitsForDate(userId, '2024-01-15');

      // Both are returned — logging a second rep of the same practice on a past
      // day has to stay possible.
      expect(result.length).toBe(2);
      expect(result.find((r) => r.habit.id === 'habit-1')!.loggedCount).toBe(1);
      expect(result.find((r) => r.habit.id === 'habit-2')!.loggedCount).toBe(0);
    });

    it('counts multiple reps of the same habit on that day', async () => {
      addHabit('habit-1', 'Exercise');
      addLog('log-1', 'habit-1', '2024-01-15');
      addLog('log-2', 'habit-1', '2024-01-15');

      const result = await getHabitsForDate(userId, '2024-01-15');

      expect(result[0].loggedCount).toBe(2);
    });

    it('excludes inactive habits', async () => {
      addHabit('habit-1', 'Active Habit');
      addHabit('habit-2', 'Inactive Habit', false);

      const result = await getHabitsForDate(userId, '2024-01-15');

      expect(result.length).toBe(1);
      expect(result[0].habit.name).toBe('Active Habit');
    });

    it('only counts logs from the requested date', async () => {
      addHabit('habit-1', 'Exercise');
      addLog('log-1', 'habit-1', '2024-01-14');

      const result = await getHabitsForDate(userId, '2024-01-15');

      expect(result.length).toBe(1);
      expect(result[0].loggedCount).toBe(0);
    });

    it('ignores challenge logs (only counts nudge type)', async () => {
      addHabit('habit-1', 'Exercise');
      addLog('log-1', 'challenge-1', '2024-01-15', 'challenge');

      const result = await getHabitsForDate(userId, '2024-01-15');

      expect(result.length).toBe(1);
      expect(result[0].loggedCount).toBe(0);
    });

    it('returns empty when no active habits exist', async () => {
      const result = await getHabitsForDate(userId, '2024-01-15');
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

describe('createHabit — undefined stripping', () => {
  const userId = 'test-user-123';

  beforeEach(() => {
    resetMockDB();
    jest.clearAllMocks();
  });

  const written = () => {
    const db = getMockDB();
    const habits = db[`users/${userId}/habits`] || {};
    return Object.values(habits)[0].data as Record<string, unknown>;
  };

  // The bug this guards: Firestore REJECTS undefined field values, and this app
  // does not enable ignoreUndefinedProperties. Adopting a library habit passed
  // `arena_id: habit.arena_id` straight through, and 17 of the 42 library habits
  // have no arena_id — so adopting any of them threw "Unsupported field value:
  // undefined" and the habit was never created.
  it('omits an optional field passed through as undefined', async () => {
    await createHabit(userId, {
      name: 'Floss',
      target_count_per_week: 7,
      arena_id: undefined,
      practice_id: 'trad-floss',
    });

    const data = written();
    expect('arena_id' in data).toBe(false);
    expect(data.practice_id).toBe('trad-floss');
  });

  it('never writes an undefined value under any key', async () => {
    await createHabit(userId, {
      name: 'Floss',
      target_count_per_week: 7,
      arena_id: undefined,
      category_id: undefined,
      group: undefined,
      action_plan: undefined,
    });

    for (const [key, value] of Object.entries(written())) {
      expect([key, value]).not.toEqual([key, undefined]);
    }
  });

  it('still writes the fields that are actually set', async () => {
    await createHabit(userId, {
      name: 'Cold Exposure',
      target_count_per_week: 3,
      practice_id: 'cold_exposure',
      category_id: 'Body',
      created_by_user: false,
    });

    const data = written();
    expect(data.name).toBe('Cold Exposure');
    expect(data.category_id).toBe('Body');
    expect(data.practice_id).toBe('cold_exposure');
    expect(data.created_by_user).toBe(false);
    expect(data.is_active).toBe(true);
  });

  it('preserves a legitimately falsy value rather than stripping it', async () => {
    // Only `undefined` is dropped — false, 0 and '' are real values.
    await createHabit(userId, {
      name: 'Test',
      target_count_per_week: 0,
      supports_pairing: false,
    });

    const data = written();
    expect(data.target_count_per_week).toBe(0);
    expect(data.supports_pairing).toBe(false);
  });
});
