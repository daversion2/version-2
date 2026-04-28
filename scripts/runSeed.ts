/**
 * Standalone script to seed the challenge library in Firestore.
 *
 * Run with: npx tsx scripts/runSeed.ts
 *
 * Adds new challenges only — skips any that already exist (matched by name).
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';
import { CHALLENGE_LIBRARY_SEED_DATA } from '../src/data/challengeSeedData';

// Firebase config (from src/services/firebase.ts)
const firebaseConfig = {
  apiKey: 'AIzaSyC1sBTTVM5V-ZNBm9KG0iFdFQCLp2WPlvI',
  authDomain: 'version-2-4afa1.firebaseapp.com',
  projectId: 'version-2-4afa1',
  storageBucket: 'version-2-4afa1.firebasestorage.app',
  messagingSenderId: '439501865821',
  appId: '1:439501865821:web:c904ff38577d2fce861eb4',
  measurementId: 'G-DVCHWDFRQ9',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const libraryRef = () => collection(db, 'challengeLibrary');

async function run() {
  console.log('=== Neuro Nudge Challenge Library Seeder ===\n');
  console.log(`Total challenges in seed data: ${CHALLENGE_LIBRARY_SEED_DATA.length}`);

  // Fetch existing challenge names to avoid duplicates
  const existingSnap = await getDocs(libraryRef());
  const existingNames = new Set(
    existingSnap.docs.map((d) => (d.data().name as string)?.toLowerCase())
  );
  console.log(`Existing challenges in Firestore: ${existingNames.size}\n`);

  const toAdd = CHALLENGE_LIBRARY_SEED_DATA.filter(
    (c) => !existingNames.has(c.name.toLowerCase())
  );
  const skipped = CHALLENGE_LIBRARY_SEED_DATA.length - toAdd.length;

  if (skipped > 0) {
    console.log(`Skipping ${skipped} challenges that already exist.`);
  }
  console.log(`Adding ${toAdd.length} new challenges...\n`);

  if (toAdd.length === 0) {
    console.log('Nothing to add — all challenges already exist in Firestore.');
    process.exit(0);
  }

  let addedCount = 0;

  for (const challenge of toAdd) {
    try {
      const docRef = await addDoc(libraryRef(), challenge);
      console.log(`  ✓ Added: ${challenge.name} (${docRef.id})`);
      addedCount++;
    } catch (error) {
      console.error(`  ✗ Failed to add ${challenge.name}:`, error);
    }
  }

  // Verify final count
  const finalSnap = await getDocs(libraryRef());
  console.log(`\n=== Done! Added ${addedCount}/${toAdd.length} new challenges (${skipped} skipped as duplicates). ===`);
  console.log(`Library now has ${finalSnap.size} challenges total.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
