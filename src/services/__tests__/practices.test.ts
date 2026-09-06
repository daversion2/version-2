import {
  logHabitCompletion,
  getHabitsForDate,
  getActiveHabits,
  getArchivedHabits,
  getCurrentWeekBounds,
  createHabit,
  ensureCuratedPractices,
  archiveHabit,
  unarchiveHabit,
  habitSchedule,
  isRetiredCurated,
  setHabitSchedule,
} from '../practices';
import {
  addMockDocument,
  getMockDB,
  resetMockDB,
} from '../__mocks__/firestore';
import { toLocalDateString } from '../../utils/date';
import { getHabitDefinition } from '../../data/practices';

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

describe('custom habits — template wiring', () => {
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

  // The end-to-end path for a custom habit's template. Each link failed
  // silently before this: you would create a habit with a "time" template, log
  // it, and simply never be asked how long.
  it('persists the chosen template so the completion flow can resolve it', async () => {
    await createHabit(userId, {
      name: 'Practice guitar',
      target_count_per_week: 3,
      category_id: 'Focus',
      template_id: 'time',
      created_by_user: true,
    });
    expect(written().template_id).toBe('time');
  });

  it('omits the template entirely when none was chosen', async () => {
    // 'none' must not be stored — it would be a value the completion flow then
    // has to interpret rather than simply an absent template.
    await createHabit(userId, {
      name: 'Call mum',
      target_count_per_week: 1,
      template_id: undefined,
    });
    expect('template_id' in written()).toBe(false);
  });

  it('marks a custom habit as user-authored', async () => {
    await createHabit(userId, {
      name: 'Practice guitar',
      target_count_per_week: 3,
      created_by_user: true,
    });
    const data = written();
    expect(data.created_by_user).toBe(true);
    expect('practice_id' in data).toBe(false);
  });
});

describe('ensureCuratedPractices — weekly goals', () => {
  const userId = 'test-user-123';

  beforeEach(() => {
    resetMockDB();
    jest.clearAllMocks();
  });

  const habitsWritten = () => {
    const db = getMockDB();
    return Object.entries(db[`users/${userId}/habits`] || {}).map(([id, v]: [string, any]) => ({
      id,
      ...v.data,
    }));
  };

  it('seeds each curated practice with the catalog’s suggested target, not 0', async () => {
    // A tracker that shows nothing until configured is one people abandon: with
    // no goal there is no pace, so Today could say nothing about a new account.
    await ensureCuratedPractices(userId);
    const seeded = habitsWritten();
    expect(seeded.length).toBeGreaterThan(0);
    for (const habit of seeded) {
      const definition = getHabitDefinition(habit.practice_id);
      expect(habit.target_count_per_week).toBe(definition!.suggested_target_per_week);
      expect(habit.target_count_per_week).toBeGreaterThan(0);
    }
  });

  it('backfills a goal onto an instance seeded before this change', async () => {
    addMockDocument('users/' + userId + '/habits', 'old', {
      user_id: userId,
      name: 'Meditation',
      practice_id: 'meditation',
      is_active: true,
      created_by_user: false,
      target_count_per_week: 0,
    });

    await ensureCuratedPractices(userId);

    const updated = habitsWritten().find((h) => h.id === 'old');
    expect(updated!.target_count_per_week).toBe(
      getHabitDefinition('meditation')!.suggested_target_per_week
    );
  });

  it('never overwrites a target the user actually chose', async () => {
    // Including a deliberately low one — 1 is a real answer, not an unset field.
    addMockDocument('users/' + userId + '/habits', 'mine', {
      user_id: userId,
      name: 'Meditation',
      practice_id: 'meditation',
      is_active: true,
      created_by_user: false,
      target_count_per_week: 1,
    });

    await ensureCuratedPractices(userId);

    const untouched = habitsWritten().find((h) => h.id === 'mine');
    expect(untouched!.target_count_per_week).toBe(1);
  });
});

describe('archive', () => {
  const userId = 'test-user-123';

  beforeEach(() => {
    resetMockDB();
    jest.clearAllMocks();
  });

  const addHabit = (id: string, over: Record<string, any> = {}) =>
    addMockDocument(`users/${userId}/habits`, id, {
      user_id: userId,
      name: id,
      is_active: true,
      created_by_user: true,
      target_count_per_week: 3,
      ...over,
    });

  const read = (id: string) =>
    (getMockDB()[`users/${userId}/habits`] || {})[id]?.data as Record<string, any>;

  it('takes the habit off Home without touching its history', () => {
    // The logs live in a different collection entirely — archiving must not so
    // much as read them, let alone remove them.
    addHabit('h1');
    addMockDocument(`users/${userId}/completionLogs`, 'l1', {
      user_id: userId,
      type: 'nudge',
      reference_id: 'h1',
      date: '2026-08-24',
      points: 1,
    });

    return archiveHabit(userId, 'h1').then(() => {
      expect(read('h1').is_active).toBe(false);
      expect(read('h1').archived_at).toEqual(expect.any(String));
      expect(Object.keys(getMockDB()[`users/${userId}/completionLogs`])).toEqual(['l1']);
    });
  });

  it('hides an archived habit from every active-habit read', async () => {
    addHabit('h1');
    addHabit('h2');
    await archiveHabit(userId, 'h1');

    const active = await getActiveHabits(userId);
    expect(active.map((h) => h.id)).toEqual(['h2']);
  });

  it('lists archived habits, newest first', async () => {
    addHabit('older', { is_active: false, archived_at: '2026-08-01T10:00:00.000Z' });
    addHabit('newer', { is_active: false, archived_at: '2026-08-20T10:00:00.000Z' });

    const archived = await getArchivedHabits(userId);
    expect(archived.map((h) => h.id)).toEqual(['newer', 'older']);
  });

  it('brings a habit back with its schedule and plan intact', async () => {
    addHabit('h1', { scheduled_days: [1, 3, 5], action_plan: { anchor: 'have my coffee' } });
    await archiveHabit(userId, 'h1');
    await unarchiveHabit(userId, 'h1');

    const restored = read('h1');
    expect(restored.is_active).toBe(true);
    // The marker has to GO, or the habit reads as archived while sitting on Home.
    expect('archived_at' in restored).toBe(false);
    expect(restored.scheduled_days).toEqual([1, 3, 5]);
    expect(restored.action_plan).toEqual({ anchor: 'have my coffee' });
  });

  // The bug that made archiving a curated practice impossible: every app load
  // reactivates any inactive curated instance, so a practice you put away came
  // straight back the next time you opened Home.
  it('does not resurrect a curated practice the user archived', async () => {
    await ensureCuratedPractices(userId);
    const seeded = Object.entries(getMockDB()[`users/${userId}/habits`])[0] as [string, any];
    const [seededId] = seeded;

    await archiveHabit(userId, seededId);
    await ensureCuratedPractices(userId);

    expect(read(seededId).is_active).toBe(false);
  });

  it('still reactivates a practice deactivated by the catalog, not the user', async () => {
    // No archived_at — this one was switched off by a catalog change, and the
    // reconciler is exactly what is supposed to bring it back.
    await ensureCuratedPractices(userId);
    const [seededId] = Object.entries(getMockDB()[`users/${userId}/habits`])[0] as [string, any];
    addMockDocument(`users/${userId}/habits`, seededId, {
      ...read(seededId),
      is_active: false,
    });

    await ensureCuratedPractices(userId);

    expect(read(seededId).is_active).toBe(true);
  });
});

describe('setHabitSchedule', () => {
  const userId = 'test-user-123';

  beforeEach(() => {
    resetMockDB();
    jest.clearAllMocks();
    addMockDocument(`users/${userId}/habits`, 'h1', {
      user_id: userId,
      name: 'Run',
      is_active: true,
      created_by_user: true,
      target_count_per_week: 3,
    });
  });

  const read = () => getMockDB()[`users/${userId}/habits`]['h1'].data as Record<string, any>;

  it('keeps the weekly target equal to the number of days chosen', async () => {
    // Everything that only knows about counts — pace, the pips, the trend
    // chart's ceiling — reads target_count_per_week. If the two disagree, the
    // row shows a different week from the one the habit is being judged on.
    await setHabitSchedule(userId, 'h1', { kind: 'days', days: [1, 3, 5] });

    expect(read().scheduled_days).toEqual([1, 3, 5]);
    expect(read().target_count_per_week).toBe(3);
  });

  it('sorts and dedupes the days it stores', async () => {
    await setHabitSchedule(userId, 'h1', { kind: 'days', days: [5, 1, 1, 3] as any });
    expect(read().scheduled_days).toEqual([1, 3, 5]);
  });

  it('DELETES the days when switching back to a count', async () => {
    // Leaving them behind would keep the habit pinned to weekdays it no longer
    // claims to have: isDayScheduled would still win over the new target.
    await setHabitSchedule(userId, 'h1', { kind: 'days', days: [1, 3, 5] });
    await setHabitSchedule(userId, 'h1', { kind: 'count', target: 5 });

    expect('scheduled_days' in read()).toBe(false);
    expect(read().target_count_per_week).toBe(5);
  });

  it('round-trips through the shape the picker edits', async () => {
    await setHabitSchedule(userId, 'h1', { kind: 'days', days: [2, 4] });
    expect(habitSchedule(read() as any)).toEqual({ kind: 'days', days: [2, 4] });

    await setHabitSchedule(userId, 'h1', { kind: 'count', target: 4 });
    expect(habitSchedule(read() as any)).toEqual({ kind: 'count', target: 4 });
  });
});

describe('retired curated practices', () => {
  const userId = 'test-user-123';

  beforeEach(() => {
    resetMockDB();
    jest.clearAllMocks();
  });

  const read = (id: string) =>
    (getMockDB()[`users/${userId}/habits`] || {})[id]?.data as Record<string, any>;

  // 'fasting' is retired in the catalog (active: false) — kept so instances
  // adopted before the cut still resolve.
  const addRetired = (id = 'old') =>
    addMockDocument(`users/${userId}/habits`, id, {
      user_id: userId,
      name: 'Fasting',
      practice_id: 'fasting',
      is_active: false,
      created_by_user: false,
      target_count_per_week: 3,
    });

  it('recognises an instance of a practice the catalog retired', () => {
    expect(
      isRetiredCurated({ name: 'Fasting', practice_id: 'fasting', created_by_user: false })
    ).toBe(true);
  });

  it('matches a legacy instance by name when it carries no practice_id', () => {
    expect(isRetiredCurated({ name: 'fasting  ', created_by_user: false })).toBe(true);
  });

  it('never claims a habit the user wrote themselves', () => {
    // Someone's own "Fasting" is theirs; the catalog has no say over it.
    expect(
      isRetiredCurated({ name: 'Fasting', practice_id: 'fasting', created_by_user: true })
    ).toBe(false);
  });

  it('leaves a live curated practice alone', () => {
    expect(
      isRetiredCurated({ name: 'Meditation', practice_id: 'meditation', created_by_user: false })
    ).toBe(false);
  });

  // The bug: a retired practice showed a Restore button in Archived, and the
  // curated reconciler deactivated it again on the next app load — restore it,
  // and it vanished on relaunch. The UI now reads this flag instead of offering
  // a button that silently undoes itself.
  it('is exactly what the reconciler undoes, so the UI and the sweep agree', async () => {
    addRetired();

    // Simulate the restore the old UI allowed, then a normal app load.
    await unarchiveHabit(userId, 'old');
    expect(read('old').is_active).toBe(true);
    await ensureCuratedPractices(userId);

    expect(read('old').is_active).toBe(false);
    expect(isRetiredCurated(read('old') as any)).toBe(true);
  });

  it('still lists it, so the reps logged against it stay reachable', async () => {
    addRetired();
    const archived = await getArchivedHabits(userId);
    expect(archived.map((h) => h.id)).toContain('old');
  });
});

describe('ensureCuratedPractices — what a new account is opted into', () => {
  const userId = 'test-user-123';

  beforeEach(() => {
    resetMockDB();
    jest.clearAllMocks();
  });

  const seededIds = (): string[] =>
    Object.values(getMockDB()[`users/${userId}/habits`] || {}).map(
      (v: any) => v.data.practice_id
    );

  // The regression this guards: seeding the whole protocol set a brand-new
  // account 26 reps a week it never agreed to, so by midweek Home reported
  // failure at a commitment nobody had made.
  it('seeds only the core practices, not the whole protocol', async () => {
    await ensureCuratedPractices(userId);

    const ids = seededIds();
    expect(ids).toContain('meditation');
    expect(ids).toContain('breathwork');
    expect(ids).toContain('unplugged_cardio');
    expect(ids).not.toContain('cold_exposure');
    expect(ids).not.toContain('heat_exposure');
    expect(ids).not.toContain('eat_healthy_unenjoyable');
  });

  it('every seeded practice is one the catalog marks core', async () => {
    await ensureCuratedPractices(userId);
    for (const id of seededIds()) {
      expect(getHabitDefinition(id)!.core).toBe(true);
    }
  });

  it('also seeds the practice chosen during onboarding, core or not', async () => {
    // Onboarding says "Pick one. Just one." — that one has to appear on Home.
    await ensureCuratedPractices(userId, 'cold_exposure');
    expect(seededIds()).toContain('cold_exposure');
  });

  it('does not duplicate the onboarding pick when it is already core', async () => {
    await ensureCuratedPractices(userId, 'meditation');
    const meditations = seededIds().filter((id) => id === 'meditation');
    expect(meditations).toHaveLength(1);
  });

  it('still carries a real weekly goal, so pace has something to measure', async () => {
    await ensureCuratedPractices(userId);
    const habits = Object.values(getMockDB()[`users/${userId}/habits`]).map((v: any) => v.data);
    for (const h of habits) {
      expect(h.target_count_per_week).toBe(
        getHabitDefinition(h.practice_id)!.suggested_target_per_week
      );
    }
  });

  // Narrowing what gets CREATED must not disturb accounts that already hold the
  // full set — those instances are still matched, reactivated and backfilled.
  it('leaves a non-core practice an existing user already has alone', async () => {
    addMockDocument(`users/${userId}/habits`, 'existing', {
      user_id: userId,
      name: 'Cold Exposure',
      practice_id: 'cold_exposure',
      is_active: true,
      created_by_user: false,
      target_count_per_week: 3,
    });

    await ensureCuratedPractices(userId);

    const kept = (getMockDB()[`users/${userId}/habits`] as any)['existing'].data;
    expect(kept.is_active).toBe(true);
    expect(kept.target_count_per_week).toBe(3);
  });

  it('still reactivates a non-core practice the catalog switched off and back on', async () => {
    // No archived_at: deactivated by a catalog change, not by the user.
    addMockDocument(`users/${userId}/habits`, 'existing', {
      user_id: userId,
      name: 'Heat Exposure',
      practice_id: 'heat_exposure',
      is_active: false,
      created_by_user: false,
      target_count_per_week: 2,
    });

    await ensureCuratedPractices(userId);

    expect((getMockDB()[`users/${userId}/habits`] as any)['existing'].data.is_active).toBe(true);
  });
});
