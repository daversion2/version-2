import { purgeRemovedHabits, selectHabitsToPurge } from '../habitCleanup';
import { addMockDocument, getMockDB, resetMockDB } from '../__mocks__/firestore';
import { getHabitDefinition, getBrowsableHabits, BUNDLED_HABIT_DEFINITIONS } from '../../data/practices';
import { MEALS_REPLACED_HABIT_IDS } from '../../data/removedHabits';
import { PracticeInstance } from '../../types';

const habit = (id: string, extra: Partial<PracticeInstance> = {}): PracticeInstance =>
  ({
    id,
    user_id: 'u1',
    name: id,
    is_active: true,
    created_by_user: false,
    target_count_per_week: 3,
    ...extra,
  }) as PracticeInstance;

describe('removed habits in the catalog', () => {
  it('keeps every removed habit resolvable but inactive', () => {
    for (const id of MEALS_REPLACED_HABIT_IDS) {
      expect(getHabitDefinition(id)?.active).toBe(false);
    }
    const money = BUNDLED_HABIT_DEFINITIONS.filter((d) => d.category_id === 'Money');
    expect(money.length).toBeGreaterThan(0);
    for (const d of money) expect(d.active).toBe(false);
  });

  it('shows none of them in the library', () => {
    const browsable = getBrowsableHabits();
    expect(browsable.some((d) => d.category_id === 'Money')).toBe(false);
    expect(browsable.some((d) => MEALS_REPLACED_HABIT_IDS.includes(d.id))).toBe(false);
    // What stays: the Meals habit and the food habits it didn't replace.
    for (const kept of ['meals', 'alcohol-free-day', 'water-only']) {
      expect(browsable.some((d) => d.id === kept)).toBe(true);
    }
  });
});

describe('selectHabitsToPurge', () => {
  it('picks Money habits, replaced food habits and custom Money habits', () => {
    const picked = selectHabitsToPurge([
      habit('a', { practice_id: 'no-spend-day' }),
      habit('b', { practice_id: 'protein-target' }),
      habit('c', { category_id: 'Money', created_by_user: true }),
      // Superseded id that now resolves to a Money habit.
      habit('d', { practice_id: 'trad-budget' }),
      habit('e', { practice_id: 'alcohol-free-day' }),
      habit('f', { category_id: 'Move', created_by_user: true }),
      habit('g', { practice_id: 'workout' }),
    ]).map((h) => h.id);
    expect(picked).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('purgeRemovedHabits', () => {
  const uid = 'u1';
  beforeEach(() => resetMockDB());

  it('deletes removed habits with their check-ins and leaves everything else', async () => {
    addMockDocument(`users/${uid}/habits`, 'money', { name: 'No-spend day', practice_id: 'no-spend-day', is_active: true });
    addMockDocument(`users/${uid}/habits`, 'veg', { name: 'Veg', practice_id: 'trad-eat-vegetables', is_active: false });
    addMockDocument(`users/${uid}/habits`, 'keep', { name: 'Workout', practice_id: 'workout', is_active: true });
    addMockDocument(`users/${uid}/completionLogs`, 'l1', { reference_id: 'money', type: 'nudge', points: 2 });
    addMockDocument(`users/${uid}/completionLogs`, 'l2', { reference_id: 'veg', type: 'nudge', points: 1 });
    addMockDocument(`users/${uid}/completionLogs`, 'l3', { reference_id: 'keep', type: 'nudge', points: 3 });
    addMockDocument('users', uid, { totalWillpowerPoints: 6 });

    const purged = await purgeRemovedHabits(uid);

    expect(purged.map((h) => h.id).sort()).toEqual(['money', 'veg']);
    const db = getMockDB();
    expect(Object.keys(db[`users/${uid}/habits`])).toEqual(['keep']);
    expect(Object.keys(db[`users/${uid}/completionLogs`])).toEqual(['l3']);
    // XP is a running total on the user doc and never goes down.
    expect(db.users[uid].data.totalWillpowerPoints).toBe(6);
  });

  it('does nothing on an account with no removed habits', async () => {
    addMockDocument(`users/${uid}/habits`, 'keep', { name: 'Workout', practice_id: 'workout', is_active: true });
    expect(await purgeRemovedHabits(uid)).toEqual([]);
    expect(Object.keys(getMockDB()[`users/${uid}/habits`])).toEqual(['keep']);
  });
});
