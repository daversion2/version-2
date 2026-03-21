/**
 * Utility to seed program templates in Firestore
 *
 * Usage from the app:
 *   import { seedPrograms, reseedPrograms } from '../utils/seedPrograms';
 *   await seedPrograms(); // Adds new programs (skips duplicates)
 *   await reseedPrograms(); // Clears and re-seeds all programs
 */

import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { PROGRAM_SEED_DATA } from '../data/programSeedData';

const programsRef = () => collection(db, 'programs');

/**
 * Generate a stable program ID from the program name.
 * e.g. "Phone Detox" -> "phone_detox"
 */
function generateProgramId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

/**
 * Seed programs — skips programs that already exist (by ID).
 * Uses setDoc with the program ID as the document ID for stable references.
 * Returns the number of programs added.
 */
export async function seedPrograms(): Promise<number> {
  console.log('Starting to seed programs...');

  const existingSnap = await getDocs(programsRef());
  const existingIds = new Set(existingSnap.docs.map(d => d.id));
  console.log(`Found ${existingIds.size} existing programs in Firestore.`);

  let addedCount = 0;

  for (const programData of PROGRAM_SEED_DATA) {
    const programId = generateProgramId(programData.name);

    if (existingIds.has(programId)) {
      console.log(`  - Skipped: ${programData.name} (already exists)`);
      continue;
    }

    try {
      const now = new Date().toISOString();
      await setDoc(doc(db, 'programs', programId), {
        ...programData,
        created_at: now,
        updated_at: now,
      });
      console.log(`  + Added: ${programData.name} (${programId})`);
      addedCount++;
    } catch (error) {
      console.error(`  x Failed to add ${programData.name}:`, error);
    }
  }

  console.log(`\nSeeding complete! Added ${addedCount} programs.`);
  return addedCount;
}

/**
 * Clear all programs from Firestore.
 * Returns the number deleted.
 */
export async function clearPrograms(): Promise<number> {
  console.log('Clearing programs...');

  const snap = await getDocs(programsRef());
  let deletedCount = 0;

  for (const document of snap.docs) {
    await deleteDoc(doc(db, 'programs', document.id));
    console.log(`  Deleted: ${document.id}`);
    deletedCount++;
  }

  console.log(`Programs cleared! Deleted ${deletedCount}.`);
  return deletedCount;
}

/**
 * Re-seed programs (clear then add).
 */
export async function reseedPrograms(): Promise<{ deleted: number; added: number }> {
  const deleted = await clearPrograms();
  const added = await seedPrograms();
  return { deleted, added };
}

/**
 * Get count of programs currently in Firestore.
 */
export async function getProgramCount(): Promise<number> {
  const snap = await getDocs(programsRef());
  return snap.size;
}
