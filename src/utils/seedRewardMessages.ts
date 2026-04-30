import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { REWARD_MESSAGES_SEED_DATA } from '../data/seedRewardMessages';
import { clearRewardMessageCache } from '../services/rewardMessages';

const messagesRef = () => collection(db, 'rewardMessages');

export async function seedRewardMessages(): Promise<number> {
  console.log('Starting to seed reward messages...');

  const existingSnap = await getDocs(messagesRef());
  const existingTexts = new Set(
    existingSnap.docs.map((d) => (d.data().text as string)?.toLowerCase())
  );

  const toAdd = REWARD_MESSAGES_SEED_DATA.filter(
    (m) => !existingTexts.has(m.text.toLowerCase())
  );
  const skipped = REWARD_MESSAGES_SEED_DATA.length - toAdd.length;

  if (skipped > 0) {
    console.log(`Skipping ${skipped} messages that already exist.`);
  }

  let addedCount = 0;
  const now = new Date().toISOString();

  for (const message of toAdd) {
    try {
      await addDoc(messagesRef(), {
        ...message,
        active: true,
        created_at: now,
        updated_at: now,
      });
      addedCount++;
    } catch (error) {
      console.error(`Failed to add message "${message.text}":`, error);
    }
  }

  clearRewardMessageCache();
  console.log(`Seeding complete! Added ${addedCount}/${toAdd.length} messages.`);
  return addedCount;
}

export async function reseedRewardMessages(): Promise<{ deleted: number; added: number }> {
  const { deleteDoc, doc } = await import('firebase/firestore');
  const snap = await getDocs(messagesRef());
  let deleted = 0;
  for (const document of snap.docs) {
    await deleteDoc(doc(db, 'rewardMessages', document.id));
    deleted++;
  }
  const added = await seedRewardMessages();
  return { deleted, added };
}
