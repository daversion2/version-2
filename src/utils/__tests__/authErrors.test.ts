import { authErrorMessage } from '../authErrors';

describe('authErrorMessage', () => {
  it('says the same thing for every flavour of wrong email or password', () => {
    // Firebase now reports invalid-credential where it used to say which half
    // was wrong; all of them read the same, so the screen gives nothing away.
    const codes = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'];
    const messages = codes.map((code) => authErrorMessage({ code }, 'x'));
    expect(new Set(messages).size).toBe(1);
    expect(messages[0]).toMatch(/don’t match/);
  });

  it.each([
    ['auth/email-already-in-use', /already an account/],
    ['auth/weak-password', /at least 6/],
    ['auth/invalid-email', /email address/],
    ['auth/too-many-requests', /Too many tries/],
    ['auth/network-request-failed', /connection/],
  ])('maps %s to plain text', (code, text) => {
    expect(authErrorMessage({ code }, 'fallback')).toMatch(text);
  });

  it('never shows Firebase’s raw message', () => {
    const raw = { code: 'auth/internal-error', message: 'Firebase: Error (auth/internal-error).' };
    expect(authErrorMessage(raw, "Couldn't sign in. Please try again.")).toBe(
      "Couldn't sign in. Please try again."
    );
  });

  it('falls back on anything that isn’t a coded error', () => {
    expect(authErrorMessage(new Error('boom'), 'fallback')).toBe('fallback');
    expect(authErrorMessage(null, 'fallback')).toBe('fallback');
    expect(authErrorMessage(undefined, 'fallback')).toBe('fallback');
    expect(authErrorMessage({ code: 42 }, 'fallback')).toBe('fallback');
  });
});
