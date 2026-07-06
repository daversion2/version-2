/**
 * Admin-configurable onboarding — Tier 2: the flow is an ordered array of
 * STEPS stored in the config/onboarding Firestore document, editable from
 * Admin > Onboarding Content. Each step has a type (from the fixed registry
 * below — the renderers stay in code), an enabled flag, a next-button
 * label, and per-type content. Admins can reorder/disable middle steps and
 * add "Info page" (text_page) steps or any absent singleton step; Welcome is
 * always first and Reveal (the send-off) always last.
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
  | 'practice_picker'
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
  practice_picker: 'Practice picker',
  reveal: 'Send-off',
};

/** Types that may appear at most once. text_page is freely addable. */
const SINGLETON_TYPES: OnboardingStepType[] = [
  'welcome', 'settle', 'timer', 'bridge', 'mantra_picker', 'habit_picker',
  'practice_picker', 'reveal',
];

/**
 * Singleton types the admin can add back into the flow when absent (e.g. after
 * the default flow dropped a step type they still want). Welcome/reveal are
 * structural and never absent.
 */
export const ADDABLE_SINGLETON_TYPES: OnboardingStepType[] = [
  'settle', 'timer', 'bridge', 'mantra_picker', 'habit_picker', 'practice_picker',
];

/**
 * Default content per step type. NOTE: stored configs materialize every field
 * on save (mergeContent fills from these defaults), so changing an existing
 * field's default only affects flows that were never saved. NEW fields must
 * default to a no-op ('' = hidden) so previously saved flows don't change —
 * the default flow below opts into them per step.
 */
export const STEP_CONTENT_DEFAULTS: Record<OnboardingStepType, Record<string, any>> = {
  welcome: {
    title: "Your brain didn't get weak on its own.",
    subtitle: "Something changed. And it wasn't you.",
    science: '',
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
    pre_label: "Don't take our word for it. Try this.",
    pre_subtext:
      "Close your eyes. Don't check anything. Don't do anything. Just breathe for 60 seconds.\n\nNotice what happens.",
    active_label: 'Eyes closed. Just breathe.',
    done_label:
      "That urge to grab your phone? That restlessness? That's not weakness. That's your nervous system showing you exactly what we're talking about.",
    // Second paragraph shown under done_label ('' = hidden)
    done_body: '',
    start_button: 'Start 60 seconds',
    // Low-prominence skip link under the start button ('' = no skip)
    skip_label: '',
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
    subtext: "A short phrase you'll repeat when your mind drifts. Fill in a template below, or write your own.",
    // Fill-in-the-blank templates; each run of underscores is an editable blank.
    templates: [
      'I will ___ by ___ if I ___ every day.',
      'If I ___ consistently, I will ___ by ___.',
      "I want ___ bad enough to ___ even when I don't feel like it.",
      "I have until ___ to ___, and I'm not wasting another day.",
      '___ by ___. That’s the goal. ___ is how I get there.',
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
  practice_picker: {
    headline:
      'Every practice here trains the same thing: your ability to act when your brain says stop.',
    subtext: 'Pick one to start with.',
    // Practice catalog ids offered as cards (empty = all active practices)
    offered_practice_ids: [],
    styles: {},
  },
  reveal: {
    title: "You've already done more than most people will today.",
    // Body copy above the summary cards ('' = hidden)
    body: '',
    styles: {},
  },
};

const STEP_NEXT_DEFAULTS: Record<OnboardingStepType, string> = {
  welcome: "Let's talk about it →",
  settle: "I'm ready",
  timer: "There's a way out →",
  bridge: 'Give me a mantra →',
  text_page: 'Continue →',
  mantra_picker: 'This is my redirect →',
  habit_picker: 'This is my starting point →',
  practice_picker: 'This is my starting point →',
  reveal: "Let's go →",
};

const defaultStep = (
  type: OnboardingStepType,
  id?: string,
  overrides?: Record<string, any>
): OnboardingStep => ({
  id: id ?? type,
  type,
  enabled: true,
  next_button: STEP_NEXT_DEFAULTS[type],
  content: { ...STEP_CONTENT_DEFAULTS[type], ...(overrides ?? {}) },
});

/** A fresh step of any type with its default content (admin "add step"). */
export const newDefaultStep = (type: OnboardingStepType): OnboardingStep => defaultStep(type);

const infoPage = (
  id: string,
  next: string,
  headline: string,
  body: string,
  styles?: FieldStyles
): OnboardingStep => ({
  ...defaultStep('text_page', id, { headline, body, ...(styles ? { styles } : {}) }),
  next_button: next,
});

/**
 * The built-in flow — the 10-screen "Training Your Override" onboarding
 * (docs/neuro-nudge-onboarding.md): hook → villain → mechanism → cost →
 * 60-second felt experience → recovery → science → the override → pick a
 * practice → send them in.
 */
export const DEFAULT_ONBOARDING_CONFIG: OnboardingConfig = {
  steps: [
    defaultStep('welcome'),
    infoPage(
      'name-the-enemy',
      'Keep going →',
      '',
      'Every app, every feed, every notification was engineered with one goal: keep you coming back.\n\nNot to help you. Not to make you better. To hold your attention as long as possible — because your attention is worth money.',
      // Body-only page — bump the copy so it carries the screen
      { body: { size: 'lg' } }
    ),
    infoPage(
      'the-mechanism',
      'What does that mean? →',
      "Here's what that does to your brain.",
      'Your brain runs on dopamine — the chemical behind motivation, focus, and reward. It evolved to fire when you did something hard or meaningful. Hunt, build, connect, create.\n\nModern technology hijacks that system. Every scroll, every like, every notification delivers a small dopamine hit — fast, easy, and endless. Over time, your brain adapts. It downregulates. It produces fewer receptors. The same stimulation that used to feel rewarding starts to feel flat.'
    ),
    infoPage(
      'the-real-cost',
      'Feel it for yourself →',
      'It means sitting still starts to feel unbearable.',
      "Hard tasks feel impossible. Boredom feels like a crisis. The things that actually matter — the work, the relationships, the goals — start losing to whatever's easiest and most stimulating right now.\n\nThis isn't laziness. It's not a character flaw. Your brain was optimized for the environment it was given. The problem is that environment was designed to make you dependent — not capable."
    ),
    defaultStep('timer', undefined, {
      done_body: "Now here's the good news.",
      skip_label: 'Skip',
      styles: { pre_label: { size: 'xl' } },
    }),
    infoPage(
      'recovery',
      'This is what the research shows →',
      'Your prefrontal cortex is the part of your brain responsible for decisions, focus, and self-control.',
      "Overstimulation weakens it — shifting control toward the reactive, impulsive part of your brain. But it's not permanent. The prefrontal cortex responds to training.\n\nThe tool is deliberate discomfort. When you voluntarily do something hard — sit in silence, hold a cold plunge, go for a walk without your phone — and you don't quit, your brain registers that. The prefrontal cortex strengthens its grip. Distress tolerance builds. Over time, your baseline shifts."
    ),
    infoPage(
      'the-science',
      'So what do you actually do? →',
      "This isn't a productivity hack. It's neuroscience.",
      "Cold exposure increases dopamine by up to 250% — without dependence or crash.\n\nMeditation and cold exposure produce overlapping changes in brain activity. Both strengthen prefrontal control over the reactive brain. Different routes, same destination.\n\nPeople who regularly practice distress tolerance show measurably greater connectivity between the brain's decision-making and emotional regulation centers. That connectivity is trainable.\n\nWithin two to four weeks of consistent practice, most people report improvements in mood stability, focus, and baseline motivation."
    ),
    infoPage(
      'the-override',
      'Pick your starting point →',
      'This app is built around one idea: the override.',
      "The moment your brain says stop — and you don't.\n\nNot because you forced it. Because you've trained for it. Practices grounded in neuroscience, designed to rebuild what overstimulation eroded. You don't have to do all of them. You just have to start with one."
    ),
    defaultStep('practice_picker'),
    defaultStep('reveal', undefined, {
      body: "You sat still for 60 seconds. You learned what's actually happening in your brain. You picked a direction.\n\nNow go do the thing.",
    }),
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

/**
 * Migrate a Tier 1 flat-field document into the steps shape. Tier 1 docs
 * predate the 10-screen override flow, so they migrate onto the original
 * 7-step sequence (welcome → settle → timer → bridge → mantra → habit →
 * reveal), not today's default flow.
 */
const migrateLegacyFlat = (data: Record<string, any>): OnboardingStep[] => {
  const pick = (key: string, fallback: any) =>
    data[key] !== undefined && data[key] !== null ? data[key] : fallback;
  const legacyTypes: OnboardingStepType[] = [
    'welcome', 'settle', 'timer', 'bridge', 'mantra_picker', 'habit_picker', 'reveal',
  ];
  const steps = legacyTypes.map((t) => defaultStep(t));
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
