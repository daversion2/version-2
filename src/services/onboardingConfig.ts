/**
 * Admin-configurable onboarding — Tier 2: the flow is an ordered array of
 * STEPS stored in the config/onboarding Firestore document, editable from
 * Admin > Onboarding Content. Each step has a type (from the fixed registry
 * below — the renderers stay in code), an enabled flag, a next-button
 * label, and per-type content. Admins can reorder/disable middle steps and
 * add generic "Info page" (text_page) steps; Welcome is always first and
 * Reveal always last.
 *
 * FAIL-SAFE: onboarding is a brand-new user's first experience, so reads
 * sanitize aggressively — unknown step types are dropped, missing content
 * falls back field-by-field to the built-in defaults, Welcome/Reveal are
 * injected if absent, and a fetch failure or timeout yields the default
 * flow. Documents saved in the older Tier 1 flat shape are migrated on
 * read.
 */
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export type OnboardingStepType =
  | 'welcome'
  | 'settle'
  | 'timer'
  | 'bridge'
  | 'text_page'
  | 'mantra_picker'
  | 'habit_picker'
  | 'reveal';

/**
 * Per-field display overrides set from the admin formatting toolbar.
 * Inline emphasis (bold/italic/underline) lives in the copy string itself as
 * markdown-lite; these are the whole-field properties that don't.
 */
export type TextSizeToken = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'hero';
export interface TextStyleOverride {
  size?: TextSizeToken;
  align?: 'left' | 'center' | 'right';
}
/** Map of content field name → its style override (stored under content.styles). */
export type FieldStyles = Record<string, TextStyleOverride>;

export interface OnboardingStep {
  /** Stable identifier (admin list key). */
  id: string;
  type: OnboardingStepType;
  enabled: boolean;
  /** Label of this step's Next button (unused on welcome/reveal/timer, which have their own). */
  next_button: string;
  content: Record<string, any>;
}

export interface OnboardingConfig {
  steps: OnboardingStep[];
}

export const STEP_TYPE_LABELS: Record<OnboardingStepType, string> = {
  welcome: 'Welcome',
  settle: 'Settle',
  timer: 'Timer exercise',
  bridge: 'Bridge',
  text_page: 'Info page',
  mantra_picker: 'Mantra picker',
  habit_picker: 'Habit picker',
  reveal: 'Reveal',
};

/** Types that may appear at most once. text_page is freely addable. */
const SINGLETON_TYPES: OnboardingStepType[] = [
  'welcome', 'settle', 'timer', 'bridge', 'mantra_picker', 'habit_picker', 'reveal',
];

/** Default content per step type — the original hardcoded copy. */
export const STEP_CONTENT_DEFAULTS: Record<OnboardingStepType, Record<string, any>> = {
  welcome: {
    title: 'Welcome to\nNeuro Nudge',
    subtitle:
      "We're going to start with a short, 60-second exercise. You'll sit quietly and observe your thoughts — that's it.",
    science:
      "Your brain doesn't need long to shift. A 2026 Harvard study found measurable brainwave changes in beginners within 2–3 minutes of their first meditation. The trick isn't emptying your mind — it's watching it.",
    styles: {},
  },
  settle: {
    box_title: 'Your only job',
    box_body:
      "Sit still. Notice what comes up.\nDon't try to fix, control, or quiet anything.\nJust observe.",
    science:
      "When you stop doing, your brain's default mode network kicks in — surfacing the thought patterns that run on autopilot all day. This 60 seconds makes them visible.",
    styles: {},
  },
  timer: {
    seconds: 60,
    pre_label: 'When you tap the button, a 60-second timer will begin.',
    pre_subtext: 'Put the phone down. Close your eyes if you like.\nThe app will wait for you.',
    active_label: 'Sit quietly. Notice your thoughts.',
    done_label: "Time's up. Take a breath.",
    start_button: 'Start the minute',
    styles: {},
  },
  bridge: {
    headline: "There's a lot going on in there, right?",
    body:
      "That's normal — your brain generates thousands of thoughts a day, and many of them are negative. Left unchecked, they quietly shape your decisions, motivation, and habits.",
    kicker_headline: "That's why we use a redirect mantra",
    kicker_body:
      'A short phrase you repeat when negativity shows up. Your brain can only hold one thought at a time. Give it the mantra, and the negative thought has nowhere to go.',
    styles: {},
  },
  text_page: {
    headline: 'New page',
    body: 'Write your content here.',
    science: '',
    styles: {},
  },
  mantra_picker: {
    intro: 'Pick your redirect mantra',
    subtext: "A short phrase you'll repeat when your mind drifts. Write your own or tap one below.",
    examples: [
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
    howto: 'Catch a negative thought, repeat your mantra silently — over and over — until it passes.',
    science:
      'Self-directed speech activates your prefrontal cortex — the brain region responsible for focus and self-control. A personal mantra interrupts autopilot thinking and gives your brain a clear instruction.',
    styles: {},
  },
  habit_picker: {
    intro: "You've already completed your first meditation. It's now locked in as your foundation habit.",
    section_body: 'Start with just one. You can always add more later.',
    foundation_habit_id: 'morning-meditation',
    foundation_habit_name: 'Meditation',
    foundation_target_per_week: 5,
    offered_habit_ids: [],
    styles: {},
  },
  reveal: {
    title: 'Your starting point',
    styles: {},
  },
};

const STEP_NEXT_DEFAULTS: Record<OnboardingStepType, string> = {
  welcome: "Let's go →",
  settle: "I'm ready",
  timer: 'Continue →',
  bridge: 'Give me a mantra →',
  text_page: 'Continue →',
  mantra_picker: 'This is my redirect →',
  habit_picker: 'This is my starting point →',
  reveal: 'Keep moving forward →',
};

const defaultStep = (type: OnboardingStepType, id?: string): OnboardingStep => ({
  id: id ?? type,
  type,
  enabled: true,
  next_button: STEP_NEXT_DEFAULTS[type],
  content: { ...STEP_CONTENT_DEFAULTS[type] },
});

export const DEFAULT_ONBOARDING_CONFIG: OnboardingConfig = {
  steps: [
    defaultStep('welcome'),
    defaultStep('settle'),
    defaultStep('timer'),
    defaultStep('bridge'),
    defaultStep('mantra_picker'),
    defaultStep('habit_picker'),
    defaultStep('reveal'),
  ],
};

export const newTextPageStep = (suffix: string): OnboardingStep =>
  defaultStep('text_page', `text-page-${suffix}`);

const configDocRef = () => doc(db, 'config', 'onboarding');

const VALID_SIZES: TextSizeToken[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'hero'];
const VALID_ALIGNS = ['left', 'center', 'right'];

/**
 * Sanitize the per-field style map: keep only object entries with a recognized
 * size and/or align, drop everything else. Anything malformed yields {}.
 */
const sanitizeStyles = (value: any): FieldStyles => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const clean: FieldStyles = {};
  for (const field of Object.keys(value)) {
    const o = value[field];
    if (!o || typeof o !== 'object' || Array.isArray(o)) continue;
    const override: TextStyleOverride = {};
    if (VALID_SIZES.includes(o.size)) override.size = o.size;
    if (VALID_ALIGNS.includes(o.align)) override.align = o.align;
    if (override.size || override.align) clean[field] = override;
  }
  return clean;
};

/** Field-level overlay of stored content on a type's defaults, type-checked. */
const mergeContent = (
  type: OnboardingStepType,
  stored: Record<string, any> | undefined
): Record<string, any> => {
  const defaults = STEP_CONTENT_DEFAULTS[type];
  const merged: Record<string, any> = { ...defaults };
  if (!stored || typeof stored !== 'object') return merged;
  for (const key of Object.keys(defaults)) {
    const defaultValue = defaults[key];
    const value = stored[key];
    if (value === undefined || value === null) continue;
    if (key === 'styles') {
      merged[key] = sanitizeStyles(value);
    } else if (Array.isArray(defaultValue)) {
      if (Array.isArray(value)) merged[key] = value.map(String).filter((s) => s.trim() !== '');
    } else if (typeof defaultValue === 'number') {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) merged[key] = value;
    } else if (typeof value === 'string') {
      merged[key] = value;
    }
  }
  return merged;
};

/**
 * Sanitize a stored steps array into a guaranteed-renderable flow:
 * known types only, singletons deduped, Welcome forced first and Reveal
 * forced last (always enabled), content merged over defaults.
 * Exported for tests.
 */
export const sanitizeSteps = (raw: any[]): OnboardingStep[] => {
  const seenSingletons = new Set<string>();
  const middle: OnboardingStep[] = [];
  let welcome: OnboardingStep | null = null;
  let reveal: OnboardingStep | null = null;
  let counter = 0;

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const type = entry.type as OnboardingStepType;
    if (!(type in STEP_CONTENT_DEFAULTS)) continue;
    if (SINGLETON_TYPES.includes(type)) {
      if (seenSingletons.has(type)) continue;
      seenSingletons.add(type);
    }
    counter++;
    const step: OnboardingStep = {
      id: typeof entry.id === 'string' && entry.id ? entry.id : `${type}-${counter}`,
      type,
      enabled: entry.enabled !== false,
      next_button:
        typeof entry.next_button === 'string' && entry.next_button.trim()
          ? entry.next_button
          : STEP_NEXT_DEFAULTS[type],
      content: mergeContent(type, entry.content),
    };
    if (type === 'welcome') welcome = { ...step, enabled: true };
    else if (type === 'reveal') reveal = { ...step, enabled: true };
    else middle.push(step);
  }

  return [welcome ?? defaultStep('welcome'), ...middle, reveal ?? defaultStep('reveal')];
};

/** Migrate a Tier 1 flat-field document into the steps shape. */
const migrateLegacyFlat = (data: Record<string, any>): OnboardingStep[] => {
  const pick = (key: string, fallback: any) =>
    data[key] !== undefined && data[key] !== null ? data[key] : fallback;
  const steps = DEFAULT_ONBOARDING_CONFIG.steps.map((s) => ({
    ...s,
    content: { ...s.content },
  }));
  const byType = (t: OnboardingStepType) => steps.find((s) => s.type === t)!;

  const w = byType('welcome');
  w.content.title = pick('welcome_title', w.content.title);
  w.content.subtitle = pick('welcome_subtitle', w.content.subtitle);
  w.content.science = pick('welcome_science', w.content.science);
  w.next_button = pick('welcome_button', w.next_button);

  const s = byType('settle');
  s.content.box_title = pick('settle_title', s.content.box_title);
  s.content.box_body = pick('settle_body', s.content.box_body);
  s.content.science = pick('settle_science', s.content.science);

  const t = byType('timer');
  t.content.seconds = pick('timer_seconds', t.content.seconds);
  t.content.pre_label = pick('timer_pre_label', t.content.pre_label);
  t.content.pre_subtext = pick('timer_pre_subtext', t.content.pre_subtext);
  t.content.active_label = pick('timer_active_label', t.content.active_label);
  t.content.done_label = pick('timer_done_label', t.content.done_label);

  const b = byType('bridge');
  b.content.headline = pick('bridge_headline', b.content.headline);
  b.content.body = pick('bridge_body', b.content.body);
  b.content.kicker_headline = pick('bridge_kicker_headline', b.content.kicker_headline);
  b.content.kicker_body = pick('bridge_kicker', b.content.kicker_body);

  const m = byType('mantra_picker');
  m.content.intro = pick('mantra_intro', m.content.intro);
  m.content.subtext = pick('mantra_subtext', m.content.subtext);
  m.content.examples = pick('mantra_examples', m.content.examples);
  m.content.howto = pick('mantra_howto', m.content.howto);
  m.content.science = pick('mantra_science', m.content.science);

  const h = byType('habit_picker');
  h.content.intro = pick('habit_intro', h.content.intro);
  h.content.section_body = pick('habit_section_body', h.content.section_body);
  h.content.foundation_habit_id = pick('foundation_habit_id', h.content.foundation_habit_id);
  h.content.foundation_habit_name = pick('foundation_habit_name', h.content.foundation_habit_name);
  h.content.foundation_target_per_week = pick(
    'foundation_target_per_week',
    h.content.foundation_target_per_week
  );
  h.content.offered_habit_ids = pick('offered_habit_ids', h.content.offered_habit_ids);

  const r = byType('reveal');
  r.content.title = pick('reveal_title', r.content.title);

  // Re-run the sanitizer so legacy values get the same type checks
  return sanitizeSteps(steps);
};

export const getOnboardingConfig = async (): Promise<OnboardingConfig> => {
  try {
    const snap = await getDoc(configDocRef());
    if (!snap.exists()) return DEFAULT_ONBOARDING_CONFIG;
    const data = snap.data();
    if (Array.isArray(data.steps)) return { steps: sanitizeSteps(data.steps) };
    return { steps: migrateLegacyFlat(data) }; // Tier 1 flat doc
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
  await setDoc(configDocRef(), {
    steps: sanitizeSteps(config.steps),
    updated_at: new Date().toISOString(),
  });
};

/** Delete the override doc — onboarding reverts to the hardcoded defaults. */
export const resetOnboardingConfig = async (): Promise<void> => {
  await deleteDoc(configDocRef());
};
