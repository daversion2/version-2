/**
 * Standalone script to seed the neuroscienceTidbits collection in Firestore.
 *
 * Run with: npx tsx scripts/runSeedTidbits.ts
 *
 * Adds new tidbits only — skips any that already exist (matched by exact text).
 * Mirrors src/utils/seedTidbits.ts but runs outside the app (own Firebase app).
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';
import { TIDBIT_SEED_DATA } from '../src/data/tidbitSeedData';

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
const tidbitsRef = () => collection(db, 'neuroscienceTidbits');

async function run() {
  console.log('=== Neuro Nudge Tidbit Seeder ===\n');
  console.log(`Total tidbits in seed data: ${TIDBIT_SEED_DATA.length}`);

  const existingSnap = await getDocs(tidbitsRef());
  const existingTexts = new Set(
    existingSnap.docs.map((d) => (d.data().text as string)?.toLowerCase())
  );
  console.log(`Existing tidbits in Firestore: ${existingSnap.size}\n`);

  const toAdd = TIDBIT_SEED_DATA.filter(
    (t) => !existingTexts.has(t.text.toLowerCase())
  );
  const skipped = TIDBIT_SEED_DATA.length - toAdd.length;

  if (skipped > 0) console.log(`Skipping ${skipped} tidbits that already exist.`);
  console.log(`Adding ${toAdd.length} new tidbits...\n`);

  if (toAdd.length === 0) {
    console.log('Nothing to add — all tidbits already exist in Firestore.');
    process.exit(0);
  }

  let addedCount = 0;
  const now = new Date().toISOString();

  for (const tidbit of toAdd) {
    try {
      const docRef = await addDoc(tidbitsRef(), {
        ...tidbit,
        active: true,
        created_at: now,
        updated_at: now,
      });
      console.log(`  ✓ [${tidbit.context_type}/${tidbit.context_value}] ${tidbit.text.slice(0, 55)}… (${docRef.id})`);
      addedCount++;
    } catch (error) {
      console.error(`  ✗ Failed: ${tidbit.text.slice(0, 50)}…`, error);
    }
  }

  const finalSnap = await getDocs(tidbitsRef());
  const habitCount = finalSnap.docs.filter((d) => d.data().context_type === 'habit').length;
  console.log(`\n=== Done! Added ${addedCount}/${toAdd.length} new tidbits (${skipped} skipped). ===`);
  console.log(`Collection now has ${finalSnap.size} tidbits total (${habitCount} habit/practice).`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
