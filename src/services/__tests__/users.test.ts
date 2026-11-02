const mockCallable = jest.fn(async () => ({ data: { success: true } }));
const mockHttpsCallable = jest.fn((..._args: unknown[]) => mockCallable);
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: (...args: unknown[]) => mockHttpsCallable(...args),
}));
jest.mock('../auth', () => ({ logOut: jest.fn(async () => {}) }));

import {
  USER_SUBCOLLECTIONS,
  clearUserAccount,
  clearedProfilePatch,
  deleteAccountPermanently,
} from '../users';
import { addMockDocument, getMockDB } from '../__mocks__/firestore';

describe('clearUserAccount', () => {
  it('leaves the profile looking like a new account’s', async () => {
    addMockDocument('users', 'u1', {
      id: 'u1',
      email: 'a@b.co',
      created_at: '2026-01-01',
      is_admin: true,
      lab_flags: { classicLook: true },
      has_completed_onboarding: true,
      hidden_apps: ['meals'],
      start_app: 'workouts',
      app_goals_set: true,
      seen_intros: { today: true },
      closeout_reminder_time: '21:00',
      totalWillpowerPoints: 120,
      some_future_field: 'x',
    });
    await clearUserAccount('u1');
    expect(getMockDB().users.u1.data).toEqual({
      id: 'u1',
      email: 'a@b.co',
      created_at: '2026-01-01',
      is_admin: true,
      lab_flags: { classicLook: true },
      has_completed_onboarding: false,
    });
  });

  it('empties the micro-apps’ collections as well as the old ones', async () => {
    addMockDocument('users', 'u1', { id: 'u1', created_at: 'x' });
    addMockDocument('users/u1/lab_meditate_sessions', 's1', { minutes: 10 });
    addMockDocument('users/u1/lab_workout_sessions', 'w1', {});
    addMockDocument('users/u1/lab_meals_days', 'd1', {});
    addMockDocument('users/u1/completionLogs', 'c1', {});
    const { deletedDocs } = await clearUserAccount('u1');
    expect(deletedDocs).toBe(4);
    const db = getMockDB();
    expect(Object.keys(db['users/u1/lab_meditate_sessions'] ?? {})).toHaveLength(0);
    expect(Object.keys(db['users/u1/lab_meals_days'] ?? {})).toHaveLength(0);
  });

  it('lists every lab_ collection the services write', () => {
    // A new micro-app collection has to be added here, or Clear leaves it behind.
    const fs = require('fs');
    const path = require('path');
    const dir = path.join(__dirname, '..');
    const used = new Set<string>();
    for (const file of fs.readdirSync(dir)) {
      if (!/^lab.*\.ts$/.test(file)) continue;
      const src: string = fs.readFileSync(path.join(dir, file), 'utf8');
      for (const m of src.matchAll(/'(lab_[a-z_]+)'/g)) if (m[1] !== 'lab_flags') used.add(m[1]);
    }
    expect(used.size).toBeGreaterThan(0);
    used.forEach((name) => expect(USER_SUBCOLLECTIONS).toContain(name));
  });
});

describe('clearedProfilePatch', () => {
  it('always ends with onboarding to do, even on a doc without the flag', () => {
    expect(clearedProfilePatch({})).toEqual({ has_completed_onboarding: false });
  });
});

describe('deleteAccountPermanently', () => {
  it('waits as long as the function may run, not the client’s 70s default', async () => {
    await deleteAccountPermanently();
    expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'deleteAccount', { timeout: 300_000 });
  });
});
