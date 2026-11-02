// =============================================================================
// AUTH ERRORS — Firebase's error codes, said plainly.
//
// Firebase's own messages read "Firebase: Error (auth/invalid-credential)."
// Sign-in and sign-up show this text instead. Anything not listed falls back
// to the caller's line, never to Firebase's raw message.
// =============================================================================

const WRONG_DETAILS = 'That email and password don’t match. Check them and try again.';

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': WRONG_DETAILS,
  'auth/invalid-login-credentials': WRONG_DETAILS,
  'auth/wrong-password': WRONG_DETAILS,
  'auth/user-not-found': WRONG_DETAILS,
  'auth/email-already-in-use': 'There’s already an account with that email. Sign in instead.',
  'auth/weak-password': 'Pick a longer password: at least 6 characters.',
  'auth/invalid-email': 'That email address doesn’t look right.',
  'auth/missing-email': 'Enter your email address first.',
  'auth/too-many-requests': 'Too many tries. Wait a few minutes, then try again.',
  'auth/network-request-failed': 'Can’t reach the internet. Check your connection and try again.',
  'auth/user-disabled': 'This account has been switched off.',
  'auth/account-exists-with-different-credential':
    'That email already signs in another way. Try email and password, or the other button.',
};

/** Friendly text for an auth error; `fallback` when the code isn't one we know. */
export const authErrorMessage = (error: unknown, fallback: string): string => {
  const code = (error as { code?: unknown } | null)?.code;
  return (typeof code === 'string' && MESSAGES[code]) || fallback;
};
