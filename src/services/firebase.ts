import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, browserLocalPersistence, GoogleAuthProvider } from '@firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
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

// On React Native the default Firestore WebChannel transport stalls
// intermittently, causing reads and writes to hang indefinitely (goals never
// loading, "Saving..." never finishing). Force long-polling, which is the
// reliable transport in RN. Web keeps the default (auto-detected) transport.
export const db =
  Platform.OS === 'web'
    ? getFirestore(app)
    : initializeFirestore(app, { experimentalForceLongPolling: true });
export default app;

