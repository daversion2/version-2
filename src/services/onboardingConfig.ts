/**
 * Admin-configurable onboarding content — Tier 1 of making onboarding
 * data-driven (copy, timer length, mantra examples, habit choices), in the
 * same spirit as the rules engine: content lives in a Firestore document
 * (config/onboarding), editable from Admin > Onboarding, no deploy needed.
 *
 * FAIL-SAFE: onboarding is a brand-new user's first experience, so every
 * read falls back to DEFAULT_ONBOARDING_CONFIG (the original hardcoded
 * copy) field-by-field if the doc is missing, malformed, or unreachable.
 * The flow structure itself (7 steps) stays in code.
 */
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface OnboardingConfig {
  // Screen 1 — Welcome
  welcome_title: string;
  welcome_subtitle: string;
  welcome_science: string;
  welcome_button: string;
  // Screen 2 — Settle
  settle_title: string;
  settle_body: string;
  settle_science: string;
  // Screen 3 — Timer
  timer_seconds: number;
  timer_pre_label: string;
  timer_pre_subtext: string;
  timer_active_label: string;
  timer_done_label: string;
  // Screen 4 — Validation bridge
  bridge_headline: string;
  bridge_body: string;
  bridge_kicker_headline: string;
  bridge_kicker: string;
  // Screen 5 — Mantra
  mantra_intro: string;
  mantra_subtext: string;
  mantra_examples: string[];
  mantra_howto: string;
  mantra_science: string;
  // Screen 6 — Habits
  habit_intro: string;
  habit_section_body: string;
  foundation_habit_id: string;
  foundation_habit_name: string;
  foundation_target_per_week: number;
  /** Habit-library ids offered as the "+ one more habit" choices. Empty = all except the foundation habit. */
  offered_habit_ids: string[];
  // Screen 7 — Reveal
  reveal_title: string;
}

/** The original hardcoded onboarding content — the permanent fallback. */
export const DEFAULT_ONBOARDING_CONFIG: OnboardingConfig = {
  welcome_title: 'Welcome to\nNeuro Nudge',
  welcome_subtitle:
    "We're going to start with a short, 60-second exercise. You'll sit quietly and observe your thoughts — that's it.",
  welcome_science:
    "Your brain doesn't need long to shift. A 2026 Harvard study found measurable brainwave changes in beginners within 2–3 minutes of their first meditation. The trick isn't emptying your mind — it's watching it.",
  welcome_button: "Let's go →",
  settle_title: 'Your only job',
  settle_body:
    "Sit still. Notice what comes up.\nDon't try to fix, control, or quiet anything.\nJust observe.",
  settle_science:
    "When you stop doing, your brain's default mode network kicks in — surfacing the thought patterns that run on autopilot all day. This 60 seconds makes them visible.",
  timer_seconds: 60,
  timer_pre_label: 'When you tap the button, a 60-second timer will begin.',
  timer_pre_subtext:
    'Put the phone down. Close your eyes if you like.\nThe app will wait for you.',
  timer_active_label: 'Sit quietly. Notice your thoughts.',
  timer_done_label: "Time's up. Take a breath.",
  bridge_headline: "There's a lot going on in there, right?",
  bridge_body:
    "That's normal — your brain generates thousands of thoughts a day, and many of them are negative. Left unchecked, they quietly shape your decisions, motivation, and habits.",
  bridge_kicker_headline: "That's why we use a redirect mantra",
  bridge_kicker:
    'A short phrase you repeat when negativity shows up. Your brain can only hold one thought at a time. Give it the mantra, and the negative thought has nowhere to go.',
  mantra_intro: 'Pick your redirect mantra',
  mantra_subtext:
    "A short phrase you'll repeat when your mind drifts. Write your own or tap one below.",
  mantra_examples: [
    'I am not my thoughts',
    'Progress, not perfection',
    'One step at a time',
    'I choose calm over chaos',
    'I am enough, right now',
    'Breathe in strength, breathe out doubt',
    'I trust the process',
    'Small steps, big changes',
    'I am building something real',
    'This moment is mine',
  ],
  mantra_howto:
    'Catch a negative thought, repeat your mantra silently — over and over — until it passes.',
  mantra_science:
    'Self-directed speech activates your prefrontal cortex — the brain region responsible for focus and self-control. A personal mantra interrupts autopilot thinking and gives your brain a clear instruction.',
  habit_intro:
    "You've already completed your first meditation. It's now locked in as your foundation habit.",
  habit_section_body: 'Start with just one. You can always add more later.',
  foundation_habit_id: 'morning-meditation',
  foundation_habit_name: 'Meditation',
  foundation_target_per_week: 5,
  offered_habit_ids: [],
  reveal_title: 'Your starting point',
};

const configDocRef = () => doc(db, 'config', 'onboarding');

/** Overlay stored values on the defaults, field by field, type-checked. */
const mergeConfig = (data: Record<string, any>): OnboardingConfig => {
  const merged: Record<string, any> = { ...DEFAULT_ONBOARDING_CONFIG };
  for (const key of Object.keys(DEFAULT_ONBOARDING_CONFIG) as (keyof OnboardingConfig)[]) {
    const defaultValue = DEFAULT_ONBOARDING_CONFIG[key];
    const stored = data[key];
    if (stored === undefined || stored === null) continue;
    if (Array.isArray(defaultValue)) {
      if (Array.isArray(stored)) merged[key] = stored.map(String).filter((s) => s.trim() !== '');
    } else if (typeof defaultValue === 'number') {
      if (typeof stored === 'number' && Number.isFinite(stored) && stored > 0) merged[key] = stored;
    } else if (typeof stored === 'string') {
      merged[key] = stored;
    }
  }
  return merged as OnboardingConfig;
};

export const getOnboardingConfig = async (): Promise<OnboardingConfig> => {
  try {
    const snap = await getDoc(configDocRef());
    if (!snap.exists()) return DEFAULT_ONBOARDING_CONFIG;
    return mergeConfig(snap.data());
  } catch (err) {
    console.warn('Onboarding config fetch failed — using defaults:', err);
    return DEFAULT_ONBOARDING_CONFIG;
  }
};

/**
 * Fetch with a hard timeout so a slow connection never stalls a new user's
 * first screen — after `ms` we proceed with the defaults.
 */
export const getOnboardingConfigWithTimeout = (ms = 3000): Promise<OnboardingConfig> =>
  Promise.race([
    getOnboardingConfig(),
    new Promise<OnboardingConfig>((resolve) =>
      setTimeout(() => resolve(DEFAULT_ONBOARDING_CONFIG), ms)
    ),
  ]);

// ---------- Admin ----------

export const saveOnboardingConfig = async (config: OnboardingConfig): Promise<void> => {
  await setDoc(configDocRef(), { ...config, updated_at: new Date().toISOString() });
};

/** Delete the override doc — onboarding reverts to the hardcoded defaults. */
export const resetOnboardingConfig = async (): Promise<void> => {
  await deleteDoc(configDocRef());
};
