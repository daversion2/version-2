import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, browserLocalPersistence, GoogleAuthProvider } from '@firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

export const googleProvider = new GoogleAuthProvider();

// Replace with your Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyC1sBTTVM5V-ZNBm9KG0iFdFQCLp2WPlvI",
  authDomain: "version-2-4afa1.firebaseapp.com",
  projectId: "version-2-4afa1",
  storageBucket: "version-2-4afa1.firebasestorage.app",
  messagingSenderId: "439501865821",
  appId: "1:439501865821:web:c904ff38577d2fce861eb4",
  measurementId: "G-DVCHWDFRQ9"
};

const app = initializeApp(firebaseConfig);

let persistence;
if (Platform.OS === 'web') {
  persistence = browserLocalPersistence;
} else {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  persistence = getReactNativePersistence(AsyncStorage);
}

export const auth = initializeAuth(app, { persistence });
export const db = getFirestore(app);
export default app;

