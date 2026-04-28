/**
 * Utility to seed the challenge library in Firestore
 *
 * Usage from the app:
 *   import { seedChallengeLibrary, reseedChallengeLibrary } from '../utils/seedChallengeLibrary';
 *   await seedChallengeLibrary(); // Adds new challenges (skips duplicates)
 *   await reseedChallengeLibrary(); // Clears and re-seeds with all 57 challenges
 */

import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { CHALLENGE_LIBRARY_SEED_DATA } from '../data/challengeSeedData';

export { SeedChallenge } from '../data/challengeSeedData';

// ============================================================================
// SEEDING FUNCTIONS
// ============================================================================

const libraryRef = () => collection(db, 'challengeLibrary');

/**
 * Seed the challenge library — skips challenges that already exist (by name)
 * Returns the number of challenges added
 */
export async function seedChallengeLibrary(): Promise<number> {
  console.log('Starting to seed challenge library...');

  // Fetch existing challenge names to avoid duplicates
  const existingSnap = await getDocs(libraryRef());
  const existingNames = new Set(
    existingSnap.docs.map((d) => (d.data().name as string)?.toLowerCase())
  );
  console.log(`Found ${existingNames.size} existing challenges in Firestore.`);

  const toAdd = CHALLENGE_LIBRARY_SEED_DATA.filter(
    (c) => !existingNames.has(c.name.toLowerCase())
  );
  const skipped = CHALLENGE_LIBRARY_SEED_DATA.length - toAdd.length;

  if (skipped > 0) {
    console.log(`Skipping ${skipped} challenges that already exist.`);
  }
  console.log(`Adding ${toAdd.length} new challenges...`);

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

  console.log(`\nSeeding complete! Added ${addedCount}/${toAdd.length} new challenges (${skipped} skipped as duplicates).`);
  return addedCount;
}

/**
 * Clear all challenges from the library
 * Returns the number of challenges deleted
 */
export async function clearChallengeLibrary(): Promise<number> {
  console.log('Clearing challenge library...');

  const snap = await getDocs(libraryRef());
  let deletedCount = 0;

  for (const document of snap.docs) {
    await deleteDoc(doc(db, 'challengeLibrary', document.id));
    console.log(`  Deleted: ${document.id}`);
    deletedCount++;
  }

  console.log(`Library cleared! Deleted ${deletedCount} challenges.`);
  return deletedCount;
}

/**
 * Get the count of challenges currently in the library
 */
export async function getChallengeLibraryCount(): Promise<number> {
  const snap = await getDocs(libraryRef());
  return snap.size;
}

/**
 * Re-seed the library (clear then add)
 */
export async function reseedChallengeLibrary(): Promise<{ deleted: number; added: number }> {
  const deleted = await clearChallengeLibrary();
  const added = await seedChallengeLibrary();
  return { deleted, added };
}
