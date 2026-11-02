// Mock for firebase/auth module
export const getAuth = jest.fn(() => ({
  currentUser: null,
  onAuthStateChanged: jest.fn(),
}));

export const createUserWithEmailAndPassword = jest.fn();
export const signInWithEmailAndPassword = jest.fn();
export const signOut = jest.fn();
export const onAuthStateChanged = jest.fn();
export const sendPasswordResetEmail = jest.fn();
export const signInWithCredential = jest.fn();
export const signInWithPopup = jest.fn();
export const GoogleAuthProvider = { credential: jest.fn((idToken: string) => ({ idToken })) };
