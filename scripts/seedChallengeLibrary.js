/**
 * Script to seed the challenge library in Firestore.
 *
 * Usage: node scripts/seedChallengeLibrary.js
 *
 * Note: This uses the Firebase Web SDK directly, so it requires
 * Firestore security rules that allow writes to the challengeLibrary collection.
 * For production, you may want to use Firebase Admin SDK instead.
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs } = require('firebase/firestore');

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
const db = getFirestore(app);

const challenges = [
  {
    name: "Meditation Personal Record Attempt",
    category: "Mental",
    difficulty: 3,
    description: "Set a timer and sit in silence and meditate for as long as you can",
  },
];

async function seed() {
  const libraryRef = collection(db, 'challengeLibrary');

  // Check existing challenges
  const existing = await getDocs(libraryRef);
  console.log(`Found ${existing.size} existing challenges in library`);

  for (const challenge of challenges) {
    // Check if challenge already exists by name
    const exists = existing.docs.some(doc => doc.data().name === challenge.name);
    if (exists) {
      console.log(`Skipping "${challenge.name}" - already exists`);
      continue;
    }

    const docRef = await addDoc(libraryRef, challenge);
    console.log(`Added "${challenge.name}" with ID: ${docRef.id}`);
  }

  console.log('Done!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Error seeding challenges:', err);
  process.exit(1);
});
