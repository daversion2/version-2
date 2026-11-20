import type { PainItemId, PainOnset, PainPrefs, PlanWeeks } from '../types/pain';

// Back Pain's static content: the menu of things to do, the red flags, the
// activity suggestions, and the defaults. See docs/micro-apps/pain.md.
// Claims here are kept to what the cited evidence supports — review with a
// clinician before the app graduates.

export type EvidenceTier = 'strong' | 'some';

export interface PainItem {
  id: PainItemId;
  title: string;
  /** The daily dose, in the user's words. */
  dose: string;
  /** One line on the evidence. */
  why: string;
  tier: EvidenceTier;
  /** Tagged "Good for recent pain" when the pain is under 6 weeks old. */
  forRecent?: boolean;
}

export const PAIN_ITEMS: PainItem[] = [
  {
    id: 'walk',
    title: 'Walk',
    dose: '20–30 minutes at a pace you could talk at. Start with 10 if that’s a lot.',
    why: 'In a 2024 trial, a walking programme nearly doubled the time before back pain came back.',
    tier: 'strong',
  },
  {
    id: 'core',
    title: 'Core strength',
    dose: '10 minutes: bird dogs, dead bugs and side planks. Stop short of pain.',
    why: 'Exercise is the best-supported treatment for long-standing back pain, and core work does as well as any.',
    tier: 'strong',
  },
  {
    id: 'yoga',
    title: 'Yoga or pilates',
    dose: '15–20 minutes of a beginner routine for backs.',
    why: 'Both did better than usual care for long-standing back pain in trials.',
    tier: 'strong',
  },
  {
    id: 'mindful',
    title: 'Mindfulness',
    dose: '10 minutes of meditation. Meditate works.',
    why: 'Mindfulness training eased long-standing back pain about as much as CBT in a 2016 trial.',
    tier: 'some',
  },
  {
    id: 'extension',
    title: 'Back extensions',
    dose: '10 press-ups lying on your front, hips down, 2–3 times a day. Stop if pain spreads down your leg.',
    why: 'Repeated movements help many people, especially when the pain eases or moves toward the spine.',
    tier: 'some',
  },
  {
    id: 'mobility',
    title: 'Gentle mobility',
    dose: '5 minutes: cat-cow, knee rocks, child’s pose, hip flexor stretch.',
    why: 'Moving keeps a sore back from stiffening. The evidence is for movement in general, not these stretches.',
    tier: 'some',
  },
  {
    id: 'heat',
    title: 'Heat',
    dose: 'A heat wrap or hot-water bottle for 20 minutes.',
    why: 'Heat eases pain in the first weeks of an episode. There’s little evidence for it after that.',
    tier: 'some',
    forRecent: true,
  },
  {
    id: 'breaks',
    title: 'Sitting breaks',
    dose: 'Stand up and move for a minute every 30–45 minutes you sit.',
    why: 'Long, unbroken sitting is a common trigger. The evidence is modest, but it costs nothing.',
    tier: 'some',
  },
];

export const PAIN_ITEM: Record<PainItemId, PainItem> = Object.fromEntries(PAIN_ITEMS.map((i) => [i.id, i])) as Record<
  PainItemId,
  PainItem
>;

export const TIER_LABEL: Record<EvidenceTier, string> = {
  strong: 'Strong evidence',
  some: 'Some evidence',
};

export const MAX_PLAN_ITEMS = 3;
export const MAX_ACTIVITIES = 3;
export const PLAN_LENGTHS: PlanWeeks[] = [2, 3, 4];
export const DEFAULT_PLAN_WEEKS: PlanWeeks = 3;

export const DEFAULT_PAIN_PREFS: PainPrefs = { weekly_goal: 5 };

export const ONSET_OPTIONS: { value: PainOnset; label: string; sub: string }[] = [
  { value: 'recent', label: 'Less than 6 weeks', sub: 'A new episode or a recent flare' },
  { value: 'months', label: '6 to 12 weeks', sub: 'It’s hanging around' },
  { value: 'long', label: 'More than 12 weeks', sub: 'Long-standing' },
];

/** One tap each, so the starting test needs no typing. */
export const ACTIVITY_SUGGESTIONS = [
  'Sitting for 30 minutes',
  'Bending to tie my shoes',
  'Lifting something off the floor',
  'Getting out of bed',
  'Sleeping through the night',
  'Standing for an hour',
  'Driving',
  'Running',
  'Picking up my child',
];

/** Any yes stops a plan. The first two are emergencies. */
export const RED_FLAGS = [
  'Numbness or tingling around your groin, genitals or bottom',
  'New trouble controlling your bladder or bowels',
  'Weakness in a leg that’s getting worse, or a foot that drags',
  'Fever, or feeling generally unwell along with the pain',
  'Weight loss you can’t explain',
  'A history of cancer',
  'It started after a fall or injury, or you have weak bones (osteoporosis)',
  'Pain at night that rest and changing position don’t ease',
];

export const RED_FLAG_STOP =
  'Please talk to a doctor before starting a plan. These can be signs of something that needs checking first.';
export const RED_FLAG_URGENT =
  'If you have numbness around your groin or bottom, or new bladder or bowel trouble, get urgent care today.';

export const SELF_EXPERIMENT_LINE =
  'A self-experiment, not medical advice. See a doctor if your pain is severe, spreading down a leg, or not getting better.';

export const PAIN_SCALE_HINT = '0 is no pain, 10 is the worst you can imagine';
export const ACTIVITY_SCALE_HINT = '0 is can’t do it at all, 10 is as well as before the pain';
