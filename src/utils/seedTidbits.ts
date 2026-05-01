import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { TIDBIT_SEED_DATA } from '../data/tidbitSeedData';
import { clearTidbitCache } from '../services/neuroscienceTidbits';

const tidbitsRef = () => collection(db, 'neuroscienceTidbits');

export async function seedNeuroscienceTidbits(): Promise<number> {
  console.log('Starting to seed neuroscience tidbits...');

  const existingSnap = await getDocs(tidbitsRef());
  const existingTexts = new Set(
    existingSnap.docs.map((d) => (d.data().text as string)?.toLowerCase())
  );

  const toAdd = TIDBIT_SEED_DATA.filter(
    (t) => !existingTexts.has(t.text.toLowerCase())
  );
  const skipped = TIDBIT_SEED_DATA.length - toAdd.length;

  if (skipped > 0) {
    console.log(`Skipping ${skipped} tidbits that already exist.`);
  }

  let addedCount = 0;
  const now = new Date().toISOString();

  for (const tidbit of toAdd) {
    try {
      await addDoc(tidbitsRef(), {
        ...tidbit,
        active: true,
        created_at: now,
        updated_at: now,
      });
      addedCount++;
    } catch (error) {
      console.error(`Failed to add tidbit "${tidbit.text.slice(0, 50)}...":`, error);
    }
  }

  clearTidbitCache();
  console.log(`Seeding complete! Added ${addedCount}/${toAdd.length} tidbits.`);
  return addedCount;
}
