/**
 * Journey check-ins — the 3-question self-assessment that pays off the
 * onboarding promise ("within two to four weeks, most people report
 * improvements in mood stability, focus, and baseline motivation").
 *
 * Baseline is captured during onboarding (the `checkin` step); day-14 and
 * day-28 retakes happen on the JourneyCheckin screen (reached via the seeded
 * journey rules). Answers live on the user doc under `journey_checkins` so
 * the results view can show the before/after deltas.
 */
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { daysBetween } from './rulesEngine';

export type CheckinSlot = 'baseline' | 'day14' | 'day28';

export interface JourneyCheckin {
  mood: number; // 1–5
  focus: number; // 1–5
  motivation: number; // 1–5
  /** YYYY-MM-DD (local) when answered. */
  date: string;
}

export type CheckinAnswers = Pick<JourneyCheckin, 'mood' | 'focus' | 'motivation'>;

/** The three metrics, phrased exactly as onboarding screen 7 promises them. */
export const CHECKIN_METRICS: { key: keyof CheckinAnswers; label: string }[] = [
  { key: 'mood', label: 'Mood stability' },
  { key: 'focus', label: 'Focus' },
  { key: 'motivation', label: 'Baseline motivation' },
];

export const CHECKIN_SCALE_LOW = 'Rough';
export const CHECKIN_SCALE_HIGH = 'Solid';

export const CHECKIN_SLOT_LABELS: Record<CheckinSlot, string> = {
  baseline: 'Day 0',
  day14: 'Two weeks',
  day28: 'Four weeks',
};

const localToday = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
};

/** Which retake slot a visit maps to, by journey day (day 21+ counts as the day-28 take). */
export const slotForJourneyDay = (daysSinceSignup: number): Exclude<CheckinSlot, 'baseline'> =>
  daysSinceSignup >= 21 ? 'day28' : 'day14';

export const journeyDayFor = (createdAt?: string): number =>
  createdAt ? daysBetween(localToday(), String(createdAt).slice(0, 10)) : 0;

export const saveJourneyCheckin = async (
  userId: string,
  slot: CheckinSlot,
  answers: CheckinAnswers
): Promise<JourneyCheckin> => {
  const record: JourneyCheckin = { ...answers, date: localToday() };
  // merge is recursive for maps, so writing one slot preserves the others
  await setDoc(doc(db, 'users', userId), { journey_checkins: { [slot]: record } }, { merge: true });
  return record;
};
