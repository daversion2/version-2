import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { TIDBIT_SEED_DATA, SeedTidbit } from '../data/tidbitSeedData';
import { clearTidbitCache } from '../services/neuroscienceTidbits';

const tidbitsRef = () => collection(db, 'neuroscienceTidbits');

// Firestore batches cap at 500 ops; stay well under.
const BATCH_LIMIT = 400;

export interface TidbitSyncResult {
  /** Active after the sync — always equals the number of tidbits in code. */
  active: number;
  /** New docs written for tidbits not yet in Firestore. */
  added: number;
  /** Existing docs switched on or refreshed (Learn more text, bucket, tags). */
  updated: number;
  /** Docs switched off because the code no longer has them. */
  deactivated: number;
}

const normalise = (text: string): string => text.trim().toLowerCase();

const fieldsDiffer = (data: Record<string, any>, seed: SeedTidbit): boolean =>
  data.active !== true ||
  data.extended_text !== seed.extended_text ||
  data.context_type !== seed.context_type ||
  data.context_value !== seed.context_value ||
  JSON.stringify(data.tags ?? []) !== JSON.stringify(seed.tags);

/**
 * Make Firestore's active tidbits match TIDBIT_SEED_DATA exactly.
 *
 * Matching is by card text. A tidbit in code that's already in Firestore is
 * switched on and its other fields refreshed; one that isn't is added; anything
 * in Firestore the code no longer has is switched OFF, never deleted — so
 * Admin → Tidbits → "Reactivate all" stays a one-tap rollback.
 *
 * The code is the source of truth: a tidbit whose text was edited in Admin →
 * Tidbits and not copied into tidbitSeedData.ts will be switched off.
 */
export async function syncNeuroscienceTidbits(): Promise<TidbitSyncResult> {
  const snap = await getDocs(tidbitsRef());
  const seedByText = new Map(TIDBIT_SEED_DATA.map((t) => [normalise(t.text), t]));
  const matched = new Set<string>();
  const now = new Date().toISOString();
  const ops: ((batch: ReturnType<typeof writeBatch>) => void)[] = [];
  let updated = 0;
  let deactivated = 0;

  snap.docs.forEach((d) => {
    const data = d.data();
    const key = normalise(String(data.text ?? ''));
    const seed = seedByText.get(key);
    // A duplicate of an already-matched text is switched off like any extra.
    if (seed && !matched.has(key)) {
      matched.add(key);
      if (fieldsDiffer(data, seed)) {
        ops.push((batch) =>
          batch.update(d.ref, {
            active: true,
            extended_text: seed.extended_text,
            context_type: seed.context_type,
            context_value: seed.context_value,
            tags: seed.tags,
            updated_at: now,
          })
        );
        updated++;
      }
    } else if (data.active === true) {
      ops.push((batch) => batch.update(d.ref, { active: false, updated_at: now }));
      deactivated++;
    }
  });

  const toAdd = TIDBIT_SEED_DATA.filter((t) => !matched.has(normalise(t.text)));
  for (const tidbit of toAdd) {
    ops.push((batch) =>
      batch.set(doc(tidbitsRef()), { ...tidbit, active: true, created_at: now, updated_at: now })
    );
  }

  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    ops.slice(i, i + BATCH_LIMIT).forEach((apply) => apply(batch));
    await batch.commit();
  }

  clearTidbitCache();
  return { active: TIDBIT_SEED_DATA.length, added: toAdd.length, updated, deactivated };
}
