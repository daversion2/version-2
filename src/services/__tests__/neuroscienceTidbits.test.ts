import { addMockDocument, resetMockDB } from '../__mocks__/firestore';
import {
  clearTidbitCache,
  deriveHabitType,
  getAllActiveTidbits,
  getAllTidbits,
  selectHabitTidbit,
  setAllTidbitsActive,
} from '../neuroscienceTidbits';
import { TIDBIT_SEED_DATA } from '../../data/tidbitSeedData';

const USER = 'u1';

/**
 * Seed the pool with one identifiable tidbit per bucket, so a returned id names
 * the branch that produced it.
 */
const seedPool = (
  entries: { id: string; context_type: string; context_value: string }[]
) => {
  entries.forEach((e) =>
    addMockDocument('neuroscienceTidbits', e.id, {
      text: e.id,
      extended_text: '',
      context_type: e.context_type,
      context_value: e.context_value,
      active: true,
      tags: [],
    })
  );
};

const FULL_POOL = [
  { id: 'hardest', context_type: 'habit', context_value: 'hardest' },
  { id: 'struggle', context_type: 'habit', context_value: 'struggle' },
  { id: 'easing', context_type: 'habit', context_value: 'easing' },
  { id: 'established', context_type: 'habit', context_value: 'established' },
  { id: 'streak', context_type: 'habit', context_value: 'streak' },
  { id: 'new_habit', context_type: 'habit', context_value: 'new_habit' },
  { id: 'generic', context_type: 'habit', context_value: 'generic' },
  { id: 'type_cold', context_type: 'habit_type', context_value: 'cold' },
];

beforeEach(() => {
  resetMockDB();
  clearTidbitCache();
});

describe('deriveHabitType', () => {
  it('matches the library habits it is written for', () => {
    expect(deriveHabitType('Cold shower')).toBe('cold');
    expect(deriveHabitType('5-minute meditation')).toBe('meditation');
    expect(deriveHabitType('20 minutes of movement')).toBe('workout');
    expect(deriveHabitType('Hit 10,000 steps')).toBe('workout');
    expect(deriveHabitType('Eat your vegetables')).toBe('diet');
    expect(deriveHabitType('One deep focus block')).toBe('deep_work');
    expect(deriveHabitType('Journal')).toBe('journaling');
    expect(deriveHabitType('Protect my bedtime')).toBe('sleep');
  });

  // Pattern order is load-bearing — these are the collisions it exists to
  // resolve, so a reorder that breaks them should fail here.
  it('resolves overlapping names by pattern precedence', () => {
    expect(deriveHabitType('Screen-free wind-down')).toBe('sleep');
    expect(deriveHabitType('No phone for the first 30 minutes')).toBe('screen_limit');
    expect(deriveHabitType('No social media before noon')).toBe('screen_limit');
    expect(deriveHabitType('Get up at the first alarm')).toBe('sleep');
  });

  it('returns undefined for a habit with no type tidbit', () => {
    expect(deriveHabitType('Floss')).toBeUndefined();
    expect(deriveHabitType('Make your bed')).toBeUndefined();
  });
});

describe('selectHabitTidbit — bucketing', () => {
  it('sends a level-3 check-in to hardest', async () => {
    seedPool(FULL_POOL);
    const pick = await selectHabitTidbit(USER, { streakDays: 3, resistance: 3 });
    expect(pick?.id).toBe('hardest');
  });

  // The regression this rework exists to fix: under the old binary, resistance
  // >= 2 meant "challenging" and routed two of the three levels into struggle,
  // so most check-ins drew from the same two tidbits.
  it('does NOT send an ordinary level-2 check-in to struggle', async () => {
    seedPool(FULL_POOL);
    const pick = await selectHabitTidbit(USER, { streakDays: 3, resistance: 2 });
    expect(pick?.id).not.toBe('struggle');
    expect(pick?.id).not.toBe('hardest');
  });

  it('sends a return after a miss to struggle, ahead of hardest', async () => {
    seedPool(FULL_POOL);
    const pick = await selectHabitTidbit(USER, {
      streakDays: 0,
      resistance: 3,
      isReturn: true,
    });
    expect(pick?.id).toBe('struggle');
  });

  it('only reaches easing once there is a streak behind the easy day', async () => {
    seedPool(FULL_POOL);
    const early = await selectHabitTidbit(USER, { streakDays: 2, resistance: 1 });
    expect(early?.id).not.toBe('easing');

    clearTidbitCache();
    const later = await selectHabitTidbit(USER, { streakDays: 9, resistance: 1 });
    expect(later?.id).toBe('easing');
  });

  it('prefers established over streak at 30+ days', async () => {
    seedPool(FULL_POOL);
    const pick = await selectHabitTidbit(USER, { streakDays: 40, resistance: 2 });
    expect(pick?.id).toBe('established');
  });

  it('falls back to generic when no bucket matches', async () => {
    seedPool([
      { id: 'generic', context_type: 'habit', context_value: 'generic' },
      { id: 'hardest', context_type: 'habit', context_value: 'hardest' },
    ]);
    const pick = await selectHabitTidbit(USER, { streakDays: 20, resistance: 2 });
    expect(pick?.id).toBe('generic');
  });
});

describe('selectHabitTidbit — habit type', () => {
  it('shows the science of this kind of habit ahead of the streak buckets', async () => {
    seedPool(FULL_POOL);
    const pick = await selectHabitTidbit(USER, {
      streakDays: 3,
      resistance: 2,
      habitName: 'Cold shower',
    });
    expect(pick?.id).toBe('type_cold');
  });

  it('yields to a comeback — the moment beats the lecture', async () => {
    seedPool(FULL_POOL);
    const pick = await selectHabitTidbit(USER, {
      streakDays: 0,
      resistance: 2,
      habitName: 'Cold shower',
      isReturn: true,
    });
    expect(pick?.id).toBe('struggle');
  });

  it('is skipped when the habit name matches no type', async () => {
    seedPool(FULL_POOL);
    const pick = await selectHabitTidbit(USER, {
      streakDays: 3,
      resistance: 2,
      habitName: 'Floss',
    });
    expect(pick?.id).toBe('new_habit');
  });
});

describe('selectHabitTidbit — legacy and edges', () => {
  it('never reaches hardest from the legacy binary field', async () => {
    seedPool(FULL_POOL);
    const pick = await selectHabitTidbit(USER, {
      streakDays: 3,
      difficulty: 'challenging',
    });
    expect(pick?.id).not.toBe('hardest');
  });

  it('folds a legacy 1-10 rating onto the current scale', async () => {
    seedPool(FULL_POOL);
    const pick = await selectHabitTidbit(USER, {
      streakDays: 3,
      resistance: 9,
      resistanceScale: 10,
    });
    expect(pick?.id).toBe('hardest');
  });

  it('skips a tidbit shown in the last 14 days', async () => {
    seedPool(FULL_POOL);
    addMockDocument('users/u1/shownTidbits', 'hardest', {
      tidbit_id: 'hardest',
      shown_at: new Date().toISOString(),
      tapped_learn_more: false,
    });
    const pick = await selectHabitTidbit(USER, { streakDays: 3, resistance: 3 });
    expect(pick?.id).not.toBe('hardest');
  });

  it('recycles rather than returning nothing when everything is recent', async () => {
    seedPool([{ id: 'generic', context_type: 'habit', context_value: 'generic' }]);
    addMockDocument('users/u1/shownTidbits', 'generic', {
      tidbit_id: 'generic',
      shown_at: new Date().toISOString(),
      tapped_learn_more: false,
    });
    const pick = await selectHabitTidbit(USER, { streakDays: 3, resistance: 2 });
    expect(pick?.id).toBe('generic');
  });

  it('returns null on an empty pool', async () => {
    const pick = await selectHabitTidbit(USER, { streakDays: 3, resistance: 2 });
    expect(pick).toBeNull();
  });
});

describe('setAllTidbitsActive', () => {
  const seedMixed = () => {
    addMockDocument('neuroscienceTidbits', 'a', {
      text: 'a',
      context_type: 'habit',
      context_value: 'generic',
      active: true,
      tags: [],
    });
    addMockDocument('neuroscienceTidbits', 'b', {
      text: 'b',
      context_type: 'habit',
      context_value: 'generic',
      active: true,
      tags: [],
    });
    addMockDocument('neuroscienceTidbits', 'c', {
      text: 'c',
      context_type: 'habit',
      context_value: 'generic',
      active: false,
      tags: [],
    });
  };

  it('retires the whole pool so nothing is selectable', async () => {
    seedMixed();
    const changed = await setAllTidbitsActive(false);
    expect(changed).toBe(2); // 'c' was already inactive

    const pick = await selectHabitTidbit(USER, { streakDays: 3, resistance: 2 });
    expect(pick).toBeNull();
  });

  it('is reversible', async () => {
    seedMixed();
    await setAllTidbitsActive(false);
    const restored = await setAllTidbitsActive(true);
    expect(restored).toBe(3);
    expect(await getAllActiveTidbits()).toHaveLength(3);
  });

  it('deletes nothing', async () => {
    seedMixed();
    await setAllTidbitsActive(false);
    expect(await getAllTidbits()).toHaveLength(3);
  });

  it('is a no-op the second time', async () => {
    seedMixed();
    await setAllTidbitsActive(false);
    expect(await setAllTidbitsActive(false)).toBe(0);
  });

  // The cache is why a stale pool would survive the bulk flip within a session.
  it('clears the session cache', async () => {
    seedMixed();
    expect(await getAllActiveTidbits()).toHaveLength(2);
    await setAllTidbitsActive(false);
    expect(await getAllActiveTidbits()).toHaveLength(0);
  });
});

// The seed file is content, but these are the properties that decide whether it
// is reachable and whether it still sounds like the app. Cheap to assert, and
// they are exactly the things that drifted last time.
describe('TIDBIT_SEED_DATA', () => {
  const HABIT_BUCKETS = [
    'hardest',
    'struggle',
    'easing',
    'established',
    'streak',
    'new_habit',
    'generic',
  ];

  it('only seeds the two live context types', () => {
    const types = new Set(TIDBIT_SEED_DATA.map((t) => t.context_type));
    expect([...types].sort()).toEqual(['habit', 'habit_type']);
  });

  it('fills every habit bucket the selector can ask for', () => {
    HABIT_BUCKETS.forEach((bucket) => {
      const count = TIDBIT_SEED_DATA.filter(
        (t) => t.context_type === 'habit' && t.context_value === bucket
      ).length;
      expect({ bucket, count }).toEqual({ bucket, count: expect.any(Number) });
      expect(count).toBeGreaterThan(0);
    });
  });

  it('uses no habit bucket the selector never asks for', () => {
    const used = TIDBIT_SEED_DATA.filter((t) => t.context_type === 'habit').map(
      (t) => t.context_value
    );
    used.forEach((bucket) => expect(HABIT_BUCKETS).toContain(bucket));
  });

  it('keeps every habit_type value reachable from a habit name', () => {
    // A type tidbit whose key no patterns produce can never be selected.
    const producible = new Set(
      [
        'Cold shower',
        '5-minute meditation',
        'Breathing break',
        'Protect my bedtime',
        'Journal',
        'Limit screen time',
        '20 minutes of movement',
        'Eat your vegetables',
        'One deep focus block',
      ].map((n) => deriveHabitType(n))
    );
    TIDBIT_SEED_DATA.filter((t) => t.context_type === 'habit_type').forEach((t) => {
      expect(producible).toContain(t.context_value);
    });
  });

  it('holds the copy voice rules', () => {
    TIDBIT_SEED_DATA.forEach((t) => {
      const copy = `${t.text} ${t.extended_text}`;
      // "rep" / "reps" as a standalone word — the banned gym shorthand.
      expect(copy).not.toMatch(/\breps?\b/i);
      // "practice" as a noun for the tracked thing; practices are habits now.
      expect(copy).not.toMatch(/\bthe practice\b|\byour practice\b|\bpractices\b/i);
    });
  });

  it('has no duplicate text — the seeder dedupes on it', () => {
    const texts = TIDBIT_SEED_DATA.map((t) => t.text.toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
  });
});
