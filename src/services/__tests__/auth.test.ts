const mockGoogle = {
  hasPlayServices: jest.fn(async () => true),
  signIn: jest.fn(),
  signOut: jest.fn(),
};
jest.mock('@react-native-google-signin/google-signin', () => ({ GoogleSignin: mockGoogle }));
jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

import { signInWithCredential } from 'firebase/auth';
import { baseProfilePatch, ensureBaseProfile, signInWithGoogle } from '../auth';
import { addMockDocument, getMockDB } from '../__mocks__/firestore';

const NOW = '2026-11-02T10:00:00.000Z';
const profile = (uid: string) => getMockDB().users?.[uid]?.data;

describe('baseProfilePatch', () => {
  it('gives a missing doc every base field, onboarding not done', () => {
    expect(baseProfilePatch(null, 'u1', 'a@b.co', NOW)).toEqual({
      id: 'u1',
      email: 'a@b.co',
      created_at: NOW,
      has_completed_onboarding: false,
    });
  });

  it('fills in a doc a stray merge write created (app_open_count) and sends it to onboarding', () => {
    // The bug: Home's app_open_count write made the doc first, so an
    // exists() check skipped the base fields and onboarding for good.
    expect(baseProfilePatch({ app_open_count: 3 }, 'u1', 'a@b.co', NOW)).toEqual({
      id: 'u1',
      email: 'a@b.co',
      created_at: NOW,
      has_completed_onboarding: false,
    });
  });

  it('never undoes a finished onboarding', () => {
    const patch = baseProfilePatch({ has_completed_onboarding: true }, 'u1', 'a@b.co', NOW);
    expect(patch).not.toHaveProperty('has_completed_onboarding');
    expect(patch).toMatchObject({ created_at: NOW });
  });

  it('leaves an account that has its base fields alone, flag or not', () => {
    expect(baseProfilePatch({ created_at: 'x', has_completed_onboarding: true }, 'u1', 'a', NOW)).toBeNull();
    // An account from before the flag: not touched, not sent back to onboarding.
    expect(baseProfilePatch({ created_at: 'x' }, 'u1', 'a', NOW)).toBeNull();
  });

  it('keeps an email already on the doc', () => {
    expect(baseProfilePatch({ email: 'old@b.co' }, 'u1', 'new@b.co', NOW)).not.toHaveProperty('email');
  });
});

describe('ensureBaseProfile', () => {
  it('merges the base fields into an existing doc without losing what is there', async () => {
    addMockDocument('users', 'u1', { app_open_count: 2, timezone: 'Europe/London' });
    expect(await ensureBaseProfile('u1', 'a@b.co')).toBe(true);
    expect(profile('u1')).toMatchObject({
      app_open_count: 2,
      timezone: 'Europe/London',
      id: 'u1',
      email: 'a@b.co',
      has_completed_onboarding: false,
    });
    expect(profile('u1').created_at).toEqual(expect.any(String));
  });

  it('writes nothing to a complete profile', async () => {
    addMockDocument('users', 'u1', { id: 'u1', created_at: 'x', has_completed_onboarding: true });
    expect(await ensureBaseProfile('u1', 'a@b.co')).toBe(false);
    expect(profile('u1')).toEqual({ id: 'u1', created_at: 'x', has_completed_onboarding: true });
  });
});

describe('signInWithGoogle', () => {
  beforeEach(() => {
    (signInWithCredential as jest.Mock).mockResolvedValue({ user: { uid: 'g1', email: 'g@b.co' } });
  });

  it('resolves null, quietly, when the person backs out of Google’s sheet', async () => {
    mockGoogle.signIn.mockResolvedValue({ type: 'cancelled', data: null });
    await expect(signInWithGoogle()).resolves.toBeNull();
    expect(signInWithCredential).not.toHaveBeenCalled();
    expect(getMockDB().users).toBeUndefined();
  });

  it('treats the older cancel error code as a cancel too', async () => {
    mockGoogle.signIn.mockRejectedValue(Object.assign(new Error('cancelled'), { code: 'SIGN_IN_CANCELLED' }));
    await expect(signInWithGoogle()).resolves.toBeNull();
  });

  it('still throws a real failure', async () => {
    mockGoogle.signIn.mockRejectedValue(Object.assign(new Error('boom'), { code: 'auth/network-request-failed' }));
    await expect(signInWithGoogle()).rejects.toThrow('boom');
  });

  it('creates the profile of a new Google user', async () => {
    mockGoogle.signIn.mockResolvedValue({ type: 'success', data: { idToken: 'tok' } });
    const user = await signInWithGoogle();
    expect(user?.uid).toBe('g1');
    expect(profile('g1')).toMatchObject({ id: 'g1', email: 'g@b.co', has_completed_onboarding: false });
  });

  it('repairs a doc that was created before sign-in finished', async () => {
    addMockDocument('users', 'g1', { app_open_count: 1 });
    mockGoogle.signIn.mockResolvedValue({ type: 'success', data: { idToken: 'tok' } });
    await signInWithGoogle();
    expect(profile('g1')).toMatchObject({ app_open_count: 1, has_completed_onboarding: false });
    expect(profile('g1').created_at).toEqual(expect.any(String));
  });

  it('leaves a returning user’s profile alone', async () => {
    const existing = { id: 'g1', email: 'g@b.co', created_at: 'x', has_completed_onboarding: true };
    addMockDocument('users', 'g1', existing);
    mockGoogle.signIn.mockResolvedValue({ type: 'success', data: { idToken: 'tok' } });
    await signInWithGoogle();
    expect(profile('g1')).toEqual(existing);
  });
});
