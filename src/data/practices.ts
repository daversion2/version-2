// =============================================================================
// HABIT DEFINITIONS — the single curated catalog behind every habit.
//
// A HabitDefinition is a curated, habit-shaped definition (adopt one → it becomes
// a normal habit with a weekly target + completion + streak). Everything past
// id/name/description/category_id is OPTIONAL, which is what lets one type cover
// both ends of the range:
//
//   "Drink more water"  → no template, flow: 'tap', one-tap check-in.
//   "Cold Exposure"     → tracking template, flow: 'away', Ready→Go→Capture,
//                         science + cited research on its detail page.
//
// Practices are no longer a separate concept — they are simply habits that
// populate more of these fields. See docs/habit-template-unification.md.
//
// Taxonomy (D1): HabitCategory (Body/Focus/Mind/Money/Connection) is the only
// axis. The former PracticeGroup (activate/calm/restrain) is retired; the type
// is kept below purely so legacy call sites compile until Phase 5 removes them.
// =============================================================================

// Type-only import — types/index.ts imports PracticeGroup back from here the same
// way, so both sides are erased at compile time and there is no runtime cycle.
import type { ArenaId, HabitActionPlan } from '../types';
// Value import. habitLibrary → traditionalHabits → types is type-only, so this
// edge does not create a runtime cycle.
import { HABIT_LIBRARY } from './habitLibrary';
import { TRADITIONAL_HABIT_LIBRARY } from './traditionalHabits';

/** @deprecated Retired by D1 in favor of HabitCategory. Kept for legacy call sites. */
export type PracticeGroup = 'activate' | 'calm' | 'restrain' | 'custom';

export interface PracticeGroupDef {
  id: PracticeGroup;
  name: string;
  description: string;
  color: string;
  order: number;
}

/**
 * How extreme a practice is — the home page orders practices by this (gentle →
 * extreme) and badges each card with a 1–3 flame meter. Orthogonal to `group`:
 * intensity is "how hard," group is "what kind of training." See the home
 * "Your Practices" list.
 */
export type IntensityLevel = 'foundational' | 'challenging' | 'extreme';

export interface IntensityTierDef {
  id: IntensityLevel;
  /** Display label, e.g. "Foundational". */
  label: string;
  /** Sort + flame count (1 = gentlest, 3 = most extreme). */
  flames: 1 | 2 | 3;
  /** One-line description of the tier. */
  description: string;
}

/** Foundational → Challenging → Extreme, in display order. */
export const INTENSITY_TIERS: IntensityTierDef[] = [
  { id: 'foundational', label: 'Foundational', flames: 1, description: 'Stillness & attention — anyone can start today.' },
  { id: 'challenging', label: 'Challenging', flames: 2, description: 'Real effort or willpower, but low risk.' },
  { id: 'extreme', label: 'Extreme', flames: 3, description: 'The most intense — work up to these.' },
];

/** Sort weight for each tier (lower = gentler/higher on the list). */
export const INTENSITY_ORDER: Record<IntensityLevel, number> = {
  foundational: 0,
  challenging: 1,
  extreme: 2,
};

const INTENSITY_TIER_BY_ID: Record<IntensityLevel, IntensityTierDef> = INTENSITY_TIERS.reduce(
  (acc, t) => {
    acc[t.id] = t;
    return acc;
  },
  {} as Record<IntensityLevel, IntensityTierDef>
);

export const getIntensityTier = (level?: IntensityLevel): IntensityTierDef | undefined =>
  level ? INTENSITY_TIER_BY_ID[level] : undefined;

/** Neutral fallback color for practices with no `color` set (e.g. custom habits). */
export const DEFAULT_PRACTICE_COLOR = '#217180';

export interface PracticeVariation {
  label: string;
  description: string;
}

/**
 * An expandable step-by-step technique guide rendered as a collapsible row
 * inside the how-to section of the detail screen (e.g. the three meditation
 * styles). When a practice has techniques, they replace the "Ways to do it"
 * variations section.
 */
export interface PracticeTechnique {
  label: string;
  steps: string[];
}

/**
 * One study backing a practice, shown in the "The research" section of the
 * detail screen: a plain-English takeaway, a citation line (institution / year /
 * journal), and an optional link opened in the browser.
 */
export interface PracticeResearchEntry {
  /** The finding in plain English — what the study showed. */
  finding: string;
  /** Citation line, e.g. "Stanford, 2023 — Cell Reports Medicine". */
  source: string;
  /** Link to the study; renders a tappable "View study" when present. */
  url?: string;
}

/**
 * One field of a habit's TEMPLATE — an optional metric the user logs on completion.
 * Rendered by a generic input in the completion sheet and stored in
 * CompletionLog.metrics under `key`.
 *
 * Numeric field types ('duration' | 'number' | 'scale') feed trend lines;
 * 'choice' feeds distributions. That distinction is why a grade must be 'scale'
 * and not 'choice' — a grade wants a line over time, not a pie chart.
 */
export interface TrackingField {
  /** Stable storage key, written to CompletionLog.metrics. */
  key: string;
  /** Short prompt, e.g. "How long?". */
  label: string;
  type: 'duration' | 'number' | 'choice' | 'scale';
  /** Display unit for number/duration, e.g. 'min', '°F', 'rounds', 'hrs'. */
  unit?: string;
  /** Options for type: 'choice'. */
  options?: { value: string; label: string }[];
  /** Slider bounds + increment for number/duration/scale fields. */
  min?: number;
  max?: number;
  step?: number;
  /** Sensible starting value shown before the user touches the slider. */
  default?: number;
  /**
   * Endpoint labels for type: 'scale' — e.g. { low: 'Fell off it', high: 'Nailed it' }.
   * Stored as a NUMBER so it trends like any other metric.
   */
  labels?: { low: string; high: string };
  /**
   * Personal-record display for this metric (Phase 3 — replaces the hardcoded
   * RECORD_OVERRIDES map that used to key off practice id).
   */
  record?: {
    label?: string;
    icon?: string;
    /** Which extreme counts as the record. Defaults to 'max'. */
    pick?: 'max' | 'min';
  };
}

/**
 * Two-factor "dose" scoring for habits where intensity is duration × magnitude
 * (cold: minutes × degrees below baseline; heat: minutes × degrees above).
 * Phase 3 — replaces the hardcoded DOSE_CONFIGS map keyed by practice id, so a
 * new two-factor habit needs no code change.
 */
/** The middle beat a habit runs. See HabitDefinition.flow. */
export type HabitFlow = 'tap' | 'timer' | 'away' | 'moment';

export interface HabitDoseConfig {
  durationKey: string;
  magnitudeKey: string;
  baseline: number;
  direction: 'below' | 'above';
  title: string;
  description: string;
}

export interface HabitDefinition {
  id: string;
  name: string;
  /** One-line overview of what it is. */
  description: string;
  /**
   * The only taxonomy (D1) — references HabitCategory.id in data/habitLibrary.ts
   * (Body / Focus / Mind / Money / Connection).
   */
  category_id: string;
  /** Default weekly target (a "process goal"); user-adjustable when adopted. */
  suggested_target_per_week: number;

  /** @deprecated Retired by D1. Read-only fallback while Phase 5 migrates screens. */
  group?: PracticeGroup;
  /** Default core/optional designation. Admin-overridable. */
  core?: boolean;
  /** Short "insider knowledge" hook. */
  whyItWorks?: string;
  /** Ionicons name. */
  icon?: string;
  /** For optional habits: why it isn't part of the core set. */
  optional_reason?: string;
  order?: number;

  // ---- Habit-library fields (absorbed from LibraryHabit) ----
  /** The implementation-intention plan: anchor, environment, obstacle, minimum. */
  action_plan?: HabitActionPlan;
  /** "Each time I do this, I'm someone who ___" — identity-based framing. */
  identity?: string;
  /** true = off the core thesis (prune / soft-hide candidate). */
  off_thesis?: boolean;
  /** @deprecated Legacy override-training domain tag from the arena phase. */
  arena_id?: ArenaId;

  /**
   * How extreme this practice is. Drives the home list ordering (gentle →
   * extreme) and the 1–3 flame meter on the card. Optional so remote/legacy
   * catalog docs without it still validate; falls back to 'foundational' for
   * sorting via getPracticeIntensity().
   */
  intensity?: IntensityLevel;
  /** Accent color for the practice card banner. Falls back to DEFAULT_PRACTICE_COLOR. */
  color?: string;

  // ---- "Learn" content (shown on the practice detail screen) ----
  /** Overrides the how-to section title (default "How to do it"), e.g. "How To Meditate". */
  howToTitle?: string;
  /** Concrete steps to do a session. */
  howTo?: string[];
  /** The smallest version for a hard day. */
  minimumVersion?: string;
  /** Deeper neuroscience explainer (1–2 short paragraphs). */
  science?: string;
  /** Practical pointers + safety cautions. */
  tips?: string[];
  /** Named ways to do it. Hidden when `techniques` is set. */
  variations?: PracticeVariation[];
  /** Collapsible technique guides shown inside the how-to section; replaces `variations`. */
  techniques?: PracticeTechnique[];
  /** Key studies behind the practice — the "The research" section. Hidden when empty. */
  research?: PracticeResearchEntry[];

  // ---- Post-completion: tracking + override reflection ----
  /**
   * The characteristic resistance moment — the predictable "get-out" urge this
   * practice provokes. Anchors the reflection gate ("Did you hit the moment when
   * ___?"). Omit for practices with no sharp resistance point.
   */
  resistanceMoment?: string;
  /** This habit's TEMPLATE — the metrics logged on completion. Absent = resistance only. */
  tracking?: TrackingField[];
  /** Two-factor dose scoring, when duration × magnitude is the real measure (Phase 3). */
  dose?: HabitDoseConfig;
  /**
   * Offer an in-app countdown timer (1–30 min) for timing a session in the app.
   * On finish, the measured minutes prefill the `duration_min` field when logging.
   * For time-in-stillness practices (meditation, breathwork).
   */
  timer?: boolean;

  /**
   * Whether this practice is shown to users for adoption. Retired practices set
   * `active: false` — hidden from browse but still resolvable so already-adopted
   * instances keep working. Absent = active (the bundled defaults). Managed via the
   * Firestore catalog + admin editor. See services/practiceCatalog.ts.
   */
  active?: boolean;

  // ---- Practice-session flow (Ready → Go → Capture) ----
  // See docs/practice-experience-build-plan.md
  /**
   * Which "middle beat" the forward session runs:
   * - 'tap'    — DEFAULT. No session at all; a plain check-in straight to Capture.
   *              This is what lets an ordinary habit ("drink water") and a cold
   *              plunge share one code path.
   * - 'timer'  — phone-present, an in-app timer guides it (see `timerDisplay`).
   * - 'away'   — phone-down handoff; they do it offline and log after.
   * - 'moment' — a single decision (pre-commit → confirm), no session.
   *
   * Absent means 'tap'. Use getHabitFlow() rather than reading this directly.
   */
  flow?: HabitFlow;
  /** How the timer renders, when flow === 'timer'. */
  timerDisplay?: 'countdown' | 'pacer' | 'hidden';
  /**
   * Pre-practice briefing copy shown on the Ready screen, in narrative order:
   * the task → what will try to stop you → the anchor to hold onto.
   */
  ready?: {
    /** The concrete procedure — what they're physically about to do (setup + duration). */
    whatYouDo?: string;
    /**
     * The urge to override: when it arrives, and that not obeying it is the exercise.
     * Replaces the former `expect` + `overrideUrge` pair (they always restated
     * the same fact). Omit for practices with no difficulty spike (e.g. breathwork).
     */
    override?: string;
    /**
     * @deprecated Legacy mirror of `override`, written on catalog save so
     * production bundles from before the Ready rework (which read this field)
     * keep their override block. Remove once that OTA is fully rolled out.
     */
    overrideUrge?: string;
    /** The single anchor or technique to hold onto when the urge hits. */
    focus: string;
    /** The handoff button label, e.g. "Begin" / "Put your phone down". */
    handoffCta?: string;
  };
}

/**
 * @deprecated Practices are now just habits. Kept as an alias so the ~12 existing
 * call sites compile unchanged while Phase 5 migrates them to HabitDefinition.
 */
export type Practice = HabitDefinition;

/** @deprecated Retired by D1 along with PracticeGroup. */
export const PRACTICE_GROUPS: PracticeGroupDef[] = [
  {
    id: 'activate',
    name: 'Activate',
    description: 'Deliberately stress the body — and stay in it.',
    color: '#FF5B02',
    order: 1,
  },
  {
    id: 'calm',
    name: 'Calm',
    description: 'Regulate your state and your attention on command.',
    color: '#217180',
    order: 2,
  },
  {
    id: 'restrain',
    name: 'Restrain',
    description: 'Resist the urge — for stimulation, for the reward, for more.',
    color: '#7B61FF',
    order: 3,
  },
  {
    // User-authored practices (no catalog entry). Visually neutral to signal
    // "your own / not part of the curated protocol."
    id: 'custom',
    name: 'Custom',
    description: 'Practices you create yourself.',
    color: '#8A8F98',
    order: 4,
  },
];

/**
 * The practices shipped inside the binary — the default/fallback catalog. The
 * live catalog (see the cache below) is seeded from these and then replaced at
 * runtime by the validated Firestore catalog, so the app always works offline,
 * on first launch, or if a remote fetch fails.
 */
export const BUNDLED_PRACTICES: Practice[] = [
  // ---- Calm ----
  {
    id: 'meditation',
    category_id: 'Mind',
    name: 'Meditation',
    group: 'calm',
    intensity: 'foundational',
    color: '#217180',
    core: true,
    suggested_target_per_week: 5,
    description: 'Sit quietly and observe your mind without acting on every urge to move or escape.',
    whyItWorks:
      "Sitting with no input trains the prefrontal cortex to regulate the brain's default-mode network. The foundational override rep — staying when everything says get up.",
    icon: 'flower-outline',
    order: 1,
    howToTitle: 'How To Meditate',
    howTo: [
      'Sit upright somewhere quiet — chair or floor, eyes closed.',
      'Pick an anchor: the feeling of your breath, or a word you repeat.',
      'When your mind wanders (it will), notice it and return to the anchor — that return is the exercise.',
      'Let the timer run without checking it.',
    ],
    minimumVersion: 'Two minutes watching a single breath in and out.',
    science:
      "Sitting with no input shifts activity away from the default-mode network — the wandering, self-referential chatter — toward the prefrontal and anterior cingulate cortex, the circuits of effortful attention. Every time you notice you've drifted and come back, you do one rep of the same control you use to override any urge.",
    tips: [
      "Wandering isn't failure — noticing it and returning is the entire exercise.",
      'Same time, same spot each day makes it automatic.',
      "Don't chase a 'blank mind'; aim for 'I noticed, and I came back.'",
    ],
    techniques: [
      {
        label: 'Focused Attention',
        steps: [
          'Sit or lie somewhere still. Close your eyes or soften your gaze.',
          'Pick one anchor — your breath, or a fixed point in front of you.',
          'Rest your attention there. Nothing to control, just watch it.',
          "When you notice your mind has wandered (it will, repeatedly), don't judge it — just notice, and bring attention back to the anchor.",
          "That moment of noticing and returning is the actual rep. The wandering isn't failure — it's the setup for it.",
          "Repeat for the full duration. Some sessions you'll return dozens of times; that's not a bad session, that's a full one.",
        ],
      },
      {
        label: 'Open Awareness / Noting Practice',
        steps: [
          'Sit still, eyes closed or gaze soft, no single anchor this time.',
          'Let your attention rest open — ready to notice whatever shows up: a sound, an itch, a thought, boredom, an urge to shift position.',
          'When something arises, notice it and, if it helps, label it in a word or two ("thinking," "itching," "restless") — then let it pass without following it further.',
          "You're not trying to stop thoughts or feelings from coming. You're practicing seeing them clearly and letting them move through instead of getting pulled into them.",
          "If you get lost in a thought for a while, that's fine — the moment you notice you got lost is itself the practice. Just come back to open noticing.",
          'There\'s no "right" thing to notice. Whatever shows up is the material.',
        ],
      },
      {
        label: 'Body Scan',
        steps: [
          'Lie down or sit comfortably. Close your eyes.',
          'Bring attention to one part of your body — often the feet or the top of the head is easiest to start.',
          "Just notice what's actually there: temperature, pressure, tingling, tightness, or nothing at all. Don't try to relax it or change it.",
          'After a few breaths, move attention slowly to the next part of the body, working through in order (feet → legs → torso → arms → head, or reverse).',
          "If you hit a spot that's uncomfortable or tense, stay there a little longer instead of rushing past it. The goal is to sit with the sensation, not fix it.",
          'If your mind wanders off the body entirely, just notice that and bring attention back to wherever you left off.',
        ],
      },
    ],
    research: [
      {
        finding: 'Just 4 days of 20-minute mindfulness training measurably improved attention, working memory, and executive function.',
        source: 'UNC Charlotte, 2010 — Consciousness and Cognition',
        url: 'https://pubmed.ncbi.nlm.nih.gov/20363650/',
      },
      {
        finding: 'A review of 47 clinical trials found meditation programs reliably reduce anxiety, depression, and stress.',
        source: 'Johns Hopkins, 2014 — JAMA Internal Medicine',
        url: 'https://jamanetwork.com/journals/jamainternalmedicine/fullarticle/1809754',
      },
      {
        finding: '5 days of meditation training improved attention and self-control more than relaxation training in a randomized trial.',
        source: 'Univ. of Oregon, 2007 — PNAS',
        url: 'https://www.pnas.org/doi/10.1073/pnas.0707678104',
      },
    ],
    resistanceMoment: 'you noticed you’d drifted and wanted to get up or check the time',
    timer: true,
    flow: 'timer',
    timerDisplay: 'countdown',
    ready: {
      whatYouDo: 'Sit upright somewhere quiet, eyes closed, and stay with your breath until the timer ends.',
      override: "Urges to move, fidget, or stop will come in waves. Not acting on them is the exercise.",
      focus: 'When your mind wanders, notice — and return to the breath. Every return counts.',
      handoffCta: 'Begin',
    },
    tracking: [
      { key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min', min: 1, max: 60, step: 1, default: 10 },
      {
        key: 'technique',
        label: 'Technique',
        type: 'choice',
        options: [
          { value: 'breath', label: 'Breath focus' },
          { value: 'body_scan', label: 'Body scan' },
          { value: 'open', label: 'Open awareness' },
        ],
      },
    ],
  },
  {
    id: 'breathwork',
    category_id: 'Mind',
    name: 'Breathwork',
    group: 'calm',
    intensity: 'foundational',
    color: '#2BB7C4',
    core: true,
    suggested_target_per_week: 7,
    description: 'A few minutes of slow, deliberate breathing — longer exhale than inhale.',
    whyItWorks:
      'Breathing is the one autonomic system you can drive on command. Extending the exhale activates the vagus nerve and shifts you toward rest-and-recover.',
    icon: 'pulse-outline',
    order: 2,
    howTo: [
      'Sit or lie comfortably.',
      'Breathe through the nose; make the exhale longer than the inhale.',
      'Run your chosen pattern for the set time.',
      'Notice how your state changes from start to finish.',
    ],
    minimumVersion: 'Five slow breaths with a long exhale.',
    science:
      "You can't consciously lower your heart rate — but you can lengthen your exhale, which stimulates the vagus nerve and the parasympathetic 'rest and recover' branch. It's the fastest manual lever you have on your own physiology, and proof you can change your state instead of waiting for it to pass.",
    tips: [
      'A longer exhale than inhale is the active ingredient.',
      'Nasal breathing beats mouth breathing for most patterns.',
      'Lightheaded? Return to normal breathing — never force it.',
    ],
    variations: [
      { label: 'Box (4-4-4-4)', description: 'Inhale 4, hold 4, exhale 4, hold 4. Steady and calming.' },
      { label: '4-7-8', description: 'Inhale 4, hold 7, exhale 8. Strong downshift for sleep or anxiety.' },
      { label: 'Physiological sigh', description: 'Two inhales through the nose, one long exhale. Fastest reset.' },
      { label: 'Coherent (6-6)', description: 'Inhale 6, exhale 6. No holds — ~5.5 breaths/min, the sweet spot for HRV. Best for longer sessions.' },
      { label: 'Extended exhale (4-8)', description: 'Inhale 4, exhale 8. No holds — the gentlest pattern and the purest long-exhale downshift.' },
    ],
    research: [
      {
        finding: '5 minutes a day of cyclic sighing boosted mood and lowered anxiety more than mindfulness meditation in a randomized trial.',
        source: 'Stanford, 2023 — Cell Reports Medicine',
        url: 'https://pubmed.ncbi.nlm.nih.gov/36630953/',
      },
      {
        finding: "A systematic review found slow breathing activates the body's calming system — raising heart rate variability and easing anxiety.",
        source: 'Univ. of Pisa, 2018 — Frontiers in Human Neuroscience',
        url: 'https://www.frontiersin.org/journals/human-neuroscience/articles/10.3389/fnhum.2018.00353/full',
      },
    ],
    timer: true,
    flow: 'timer',
    timerDisplay: 'pacer',
    ready: {
      whatYouDo: 'A few minutes of slow nasal breathing — the pacer sets the rhythm, you follow it.',
      // No `override` block — breathwork has no difficulty spike.
      focus: "Make the exhale longer than the inhale. Let the pace do the work — don't rush back to normal.",
      handoffCta: 'Begin',
    },
    tracking: [
      { key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min', min: 1, max: 20, step: 1, default: 5 },
      {
        key: 'technique',
        label: 'Pattern',
        type: 'choice',
        options: [
          { value: 'box', label: 'Box' },
          { value: '478', label: '4-7-8' },
          { value: 'sigh', label: 'Physiological sigh' },
          { value: 'coherent', label: 'Coherent' },
          { value: 'extended', label: 'Extended exhale' },
        ],
      },
    ],
  },
  // ---- Activate ----
  {
    id: 'movement',
    category_id: 'Body',
    name: 'Movement',
    group: 'activate',
    intensity: 'challenging',
    color: '#FF5B02',
    // Retired — merged with Deliberate Boredom into 'unplugged_cardio'. Kept
    // (active: false) so already-adopted instances still resolve.
    core: false,
    active: false,
    suggested_target_per_week: 4,
    description: 'Intentional physical effort — a workout, a hard walk, anything that makes the body work.',
    whyItWorks:
      'Choosing effort over ease trains the PFC-over-limbic pathway directly, and the post-effort dopamine and mood lift reinforce the choice.',
    icon: 'barbell-outline',
    order: 4,
    howTo: [
      'Pick something that makes the body work — lift, run, ruck, hard walk.',
      'Warm up briefly.',
      'Push to a point that is genuinely effortful, not just comfortable.',
      'Finish even when the urge to stop shows up early.',
    ],
    minimumVersion: 'Ten minutes of brisk movement, or one hard set.',
    science:
      'Choosing exertion engages the prefrontal-cortex-over-limbic pathway and raises norepinephrine and BDNF — which support focus, mood, and learning. The accomplishment and dopamine afterward reinforce the decision to do hard things.',
    tips: [
      'Consistency over intensity — four solid sessions beat one heroic one.',
      'The urge to stop usually peaks early; ride past it.',
      'Any modality counts; the override is choosing effort.',
    ],
    variations: [
      { label: 'Strength', description: 'Resistance training to real effort.' },
      { label: 'Cardio', description: 'Run, row, bike, or swim.' },
      { label: 'Ruck / hard walk', description: 'Weighted or brisk, ideally outdoors.' },
    ],
    resistanceMoment: 'the effort bit and you wanted to stop',
    // Parked: scope undecided (too broad). No briefing yet — see build plan.
    flow: 'away',
    tracking: [
      { key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min', min: 5, max: 120, step: 5, default: 30 },
      {
        key: 'type',
        label: 'Type',
        type: 'choice',
        options: [
          { value: 'strength', label: 'Strength' },
          { value: 'cardio', label: 'Cardio' },
          { value: 'ruck', label: 'Ruck / walk' },
        ],
      },
    ],
  },
  {
    id: 'unplugged_cardio',
    category_id: 'Body',
    name: 'Unplugged Cardio',
    group: 'activate',
    intensity: 'challenging',
    color: '#FF5B02',
    core: true,
    suggested_target_per_week: 4,
    description:
      'Run or walk with no phone, music, or screens — physical effort and mental stillness at the same time.',
    whyItWorks:
      'You train two overrides at once: pushing through effort and resisting the pull for input. The body works while the mind learns to sit with boredom.',
    icon: 'walk-outline',
    order: 4,
    howTo: [
      'Put your phone fully away — no music, podcast, or screen.',
      'Get on the treadmill (or head outside) at a pace that takes real effort.',
      'When the urge to grab your phone or ease off shows up, notice it and keep going.',
      'Finish your set time, then log it.',
    ],
    minimumVersion: 'Ten minutes walking with no phone and no audio.',
    science:
      'Choosing exertion engages the prefrontal-cortex-over-limbic pathway and raises norepinephrine and BDNF — which support focus and mood. Removing all input at the same time lets your dopamine baseline recover instead of chasing novelty. Doing both together is a double rep: the body works while the mind practices staying with discomfort.',
    tips: [
      'Phone in a bag or locker beats willpower — remove the option entirely.',
      'Boredom and the urge to stop both peak early; ride past them.',
      'A treadmill makes it easy to hold effort and stay put, but any steady, screen-free cardio counts.',
    ],
    variations: [
      { label: 'Treadmill walk', description: 'A steady incline walk, no screen.' },
      { label: 'Treadmill run', description: 'A run at genuine effort, no audio.' },
      { label: 'Outdoors, unplugged', description: 'Walk or run outside with no phone or earbuds.' },
    ],
    research: [
      {
        finding: "One year of regular aerobic walking grew older adults' hippocampus ~2%, reversing 1–2 years of age-related shrinkage and boosting memory.",
        source: 'RCT, 120 adults, 2011 — PNAS',
        url: 'https://www.pnas.org/doi/10.1073/pnas.1015950108',
      },
      {
        finding: 'Pooling 25 trials, exercise produced a large antidepressant effect — bigger than earlier estimates once publication bias was corrected.',
        source: 'Meta-analysis of 25 RCTs, 2016 — Journal of Psychiatric Research',
        url: 'https://www.sciencedirect.com/science/article/abs/pii/S0022395616300383',
      },
    ],
    resistanceMoment: 'the effort bit, or you wanted to reach for your phone or music',
    flow: 'away',
    ready: {
      whatYouDo:
        'Walk or run at real effort — treadmill or outside — with no phone, music, or screens, for your set time.',
      override:
        'A few minutes in, the pull for your phone or a podcast will show up — and the effort will bite. Not reaching, not stopping early: that’s the exercise.',
      focus: 'Just move. Let your mind wander and stay with the effort.',
      handoffCta: 'Begin',
    },
    tracking: [
      { key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min', min: 5, max: 120, step: 5, default: 30 },
      {
        key: 'pace',
        label: 'Pace',
        type: 'choice',
        options: [
          { value: 'walk', label: 'Walk' },
          { value: 'run', label: 'Run' },
          { value: 'mixed', label: 'Mixed' },
        ],
      },
    ],
  },
  {
    id: 'cold_exposure',
    category_id: 'Body',
    name: 'Cold Exposure',
    group: 'activate',
    intensity: 'extreme',
    color: '#2F8FD9',
    core: false,
    suggested_target_per_week: 3,
    description: 'A cold shower or plunge — get in, and stay past the urge to get out.',
    whyItWorks:
      'Cold spikes norepinephrine and (afterward) dopamine. Staying in trains you to act through an acute stress response instead of fleeing it.',
    icon: 'snow-outline',
    optional_reason: 'Needs access to a cold shower or plunge.',
    order: 5,
    howTo: [
      'Start the water cold (or fill the plunge).',
      'Get in deliberately — don’t ease in forever.',
      'Slow your breathing; resist the gasp and the urge to bolt.',
      'Stay for your set time, then warm up naturally.',
    ],
    minimumVersion: '30 seconds of cold at the end of your shower.',
    science:
      "Cold triggers a sharp norepinephrine spike — focus and alertness — and an extended dopamine rise afterward, without the crash other sources cause. Choosing to stay while your body screams 'get out' is a pure rep of acting through stress, and repeated exposure recalibrates what your nervous system counts as a threat (stress inoculation).",
    tips: [
      'Control the breath first — long, slow exhales kill the panic.',
      "It should be cold, not dangerous: warm up after, don't push numbness.",
      'CAUTION: skip or consult a doctor with heart conditions, pregnancy, or Raynaud’s.',
    ],
    variations: [
      { label: 'Cold shower', description: 'End your shower on full cold.' },
      { label: 'Cold plunge / ice bath', description: 'Submerge to the neck.' },
      { label: 'Face dunk', description: 'Bowl of ice water — triggers the dive reflex fast.' },
    ],
    research: [
      {
        finding: 'An hour in 14°C water raised noradrenaline ~530% and dopamine ~250% — a huge natural surge in focus-and-drive chemistry.',
        source: 'Human immersion study, 2000 — European Journal of Applied Physiology',
        url: 'https://link.springer.com/article/10.1007/s004210050065',
      },
      {
        finding: 'A 30-day daily cold-shower habit cut self-reported sickness absence from work by 29% in a 3,000-person trial.',
        source: 'RCT, 3,018 adults, 2016 — PLOS ONE',
        url: 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0161749',
      },
    ],
    resistanceMoment: 'the cold hit and everything said get out',
    flow: 'away',
    ready: {
      whatYouDo: 'Get into a cold shower or plunge — deliberately, not inch by inch — and stay for your set time.',
      override:
        'The first 30 seconds are the worst — your body will scream to get out, then it quiets. Not obeying that scream is the exercise.',
      focus: 'Long, slow exhales. Control the gasp. That’s the whole job.',
      handoffCta: 'Begin',
    },
    tracking: [
      { key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min', min: 1, max: 12, step: 1, default: 2 },
      { key: 'water_temp_f', label: 'Water temp', type: 'number', unit: '°F', min: 33, max: 70, step: 1, default: 50 },
    ],
  },
  {
    id: 'heat_exposure',
    category_id: 'Body',
    name: 'Heat Exposure',
    group: 'activate',
    intensity: 'extreme',
    color: '#E0461F',
    core: false,
    suggested_target_per_week: 2,
    description: 'Sauna or sustained heat — sit with the discomfort and stay calm in it.',
    whyItWorks:
      'Heat stress drives cardiovascular and resilience adaptations; staying composed while your body wants out is the exercise.',
    icon: 'flame-outline',
    optional_reason: 'Needs access to a sauna or hot bath.',
    order: 6,
    howTo: [
      'Enter a sauna or hot bath.',
      'Settle in and let the heat build.',
      'Keep your breathing slow; sit with the discomfort instead of fleeing it.',
      'Stay for your set time; hydrate after.',
    ],
    minimumVersion: 'A few minutes of sustained heat, building over time.',
    science:
      'Heat stress raises heart rate and core temperature, driving cardiovascular adaptations similar to light exercise, plus heat-shock proteins and a post-session endorphin lift. The override is staying composed while every instinct says leave.',
    tips: [
      'Hydrate before and after.',
      'Build duration gradually; dizziness means get out.',
      'CAUTION: avoid with heart conditions or pregnancy unless cleared by a doctor.',
    ],
    variations: [
      { label: 'Sauna', description: 'Dry or infrared, ~10–20 min.' },
      { label: 'Hot bath', description: 'A hot soak when no sauna is available.' },
      { label: 'Contrast', description: 'Alternate heat and cold.' },
    ],
    research: [
      {
        finding: 'Men who used a sauna 4–7 times a week had a 63% lower risk of sudden cardiac death than once-a-week users over 20 years.',
        source: 'Cohort of 2,315 Finnish men, 2015 — JAMA Internal Medicine',
        url: 'https://jamanetwork.com/journals/jamainternalmedicine/fullarticle/2130724',
      },
      {
        finding: 'Frequent sauna use (4–7×/week) was linked to a 66% lower risk of dementia and 65% lower Alzheimer’s risk over ~20 years.',
        source: 'Cohort of 2,315 Finnish men, 2017 — Age and Ageing',
        url: 'https://academic.oup.com/ageing/article/46/2/245/2654230',
      },
    ],
    resistanceMoment: 'the heat got intense and you wanted to leave',
    flow: 'away',
    ready: {
      whatYouDo: 'Sit in a sauna or hot bath and let the heat build for your set time. Hydrate after.',
      override:
        'The first minutes are easy — the urge to leave builds slowly and peaks near the end. Staying through the peak is the exercise.',
      focus: 'Stay loose. Slow, steady breathing. Don’t fight the heat — settle into it.',
      handoffCta: 'Begin',
    },
    tracking: [
      { key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min', min: 5, max: 45, step: 5, default: 15 },
      { key: 'temp_f', label: 'Temp', type: 'number', unit: '°F', min: 120, max: 220, step: 5, default: 170 },
    ],
  },
  // ---- Restrain ----
  {
    id: 'deliberate_boredom',
    category_id: 'Focus',
    name: 'Deliberate Boredom',
    group: 'restrain',
    intensity: 'challenging',
    color: '#7B61FF',
    // Retired — merged with Movement into 'unplugged_cardio'. Kept
    // (active: false) so already-adopted instances still resolve.
    core: false,
    active: false,
    suggested_target_per_week: 3,
    description: 'No phone, no input — sit with nothing and let the boredom be there.',
    whyItWorks:
      'Constant stimulation downregulates your dopamine baseline. Resisting the urge for input lets it recover — which is what makes willpower feel possible again.',
    icon: 'phone-portrait-outline',
    order: 7,
    howTo: [
      'Put the phone in another room — not just face-down.',
      'Sit with nothing: no screen, no music, no task.',
      'Let the boredom and the urge to grab something just be there.',
      'Stay for your set time.',
    ],
    minimumVersion: 'Five minutes sitting with no phone and no input.',
    science:
      'A constant stream of novelty keeps dopamine elevated and downregulates your baseline — which is why everything else starts to feel boring and willpower feels impossible. Deliberate boredom lets dopamine receptors recover toward baseline. You’re not wasting time; you’re repairing the reward system that makes hard things doable.',
    tips: [
      'Phone in another room beats willpower every time.',
      "Restlessness is the point — that's the urge you're training against.",
      'Looking out a window counts; a second screen does not.',
    ],
    variations: [
      { label: 'Just sit', description: 'Nothing at all — stare out a window.' },
      { label: 'Single-task', description: 'Do one thing slowly, with no second screen.' },
      { label: 'Phone-free walk', description: 'Walk with no phone or earbuds.' },
    ],
    research: [
      {
        finding: 'People found sitting alone with their thoughts so hard that many chose to give themselves electric shocks instead.',
        source: 'Univ. of Virginia & Harvard, 2014 — Science',
        url: 'https://www.science.org/doi/10.1126/science.1250830',
      },
      {
        finding: 'People who did a boring task first came up with more creative ideas afterward — boredom sparks the daydreaming that fuels creativity.',
        source: 'Univ. of Central Lancashire, 2014 — Creativity Research Journal',
        url: 'https://www.tandfonline.com/doi/full/10.1080/10400419.2014.901073',
      },
    ],
    resistanceMoment: 'you reached for your phone or something to fill the space',
    flow: 'timer',
    timerDisplay: 'hidden',
    ready: {
      whatYouDo: 'Sit with nothing — no screen, no music, no task — for your set time.',
      override:
        "A few minutes in, you'll feel restless and reach for your phone. That pull is the whole point — leaving it face-down is the exercise.",
      focus: 'Do nothing. Let your mind wander. No input, no scrolling, no escape.',
      handoffCta: 'Phone face-down',
    },
    tracking: [
      { key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min', min: 5, max: 60, step: 5, default: 10 },
    ],
  },
  {
    id: 'fasting',
    category_id: 'Body',
    name: 'Fasting',
    group: 'restrain',
    intensity: 'extreme',
    color: '#5B3FE0',
    // Retired — cut from the protocol. Kept (active: false) so already-adopted
    // instances still resolve; ensureCuratedPractices deactivates them on Home.
    core: false,
    active: false,
    suggested_target_per_week: 1,
    description: 'A deliberate fasting window — sit with hunger without acting on it.',
    whyItWorks:
      'Hunger is a clean, recurring urge. Choosing to wait strengthens prefrontal control over immediate reward — the foundation of delayed gratification.',
    icon: 'time-outline',
    optional_reason: 'Skip if you have any medical reason not to fast.',
    order: 8,
    howTo: [
      'Pick a window (e.g. 16 hours) or skip one meal.',
      'When hunger hits, notice it without acting.',
      'Hydrate — water, black coffee, tea.',
      'Break the fast calmly when your window ends.',
    ],
    minimumVersion: 'Push your first meal back by two hours.',
    science:
      "Hunger arrives in waves and passes — it isn't an emergency. Choosing to wait strengthens prefrontal control over immediate reward and builds delay tolerance, the same circuit behind every long-term goal. (Metabolic effects are a bonus; the override is the point.)",
    tips: [
      'Hunger comes in waves — ride one out and it fades.',
      'Hydrate; black coffee blunts appetite.',
      'CAUTION: not for those with a history of disordered eating, diabetes, pregnancy, or who are underweight — check with a doctor.',
    ],
    variations: [
      { label: '16:8', description: '16-hour fast, 8-hour eating window.' },
      { label: 'Skip a meal', description: 'Drop one meal deliberately.' },
      { label: '24-hour', description: 'Advanced: one full day, occasionally.' },
    ],
    research: [
      {
        finding: 'Fasting 18+ hours flips your body from burning sugar to burning fat (ketones), boosting stress resistance and cellular repair.',
        source: 'Review, 2019 — New England Journal of Medicine',
        url: 'https://www.nejm.org/doi/full/10.1056/NEJMra1905136',
      },
      {
        finding: 'Eating only within a 6-hour early window improved insulin sensitivity and blood pressure in prediabetic men — even without weight loss.',
        source: 'RCT, 2018 — Cell Metabolism',
        url: 'https://www.cell.com/cell-metabolism/fulltext/S1550-4131(18)30253-5',
      },
    ],
    resistanceMoment: 'a craving spiked and you wanted to eat',
    // Parked: needs its own background-state model (12–36 hr, hunger waves). No
    // session briefing yet — see build plan.
    flow: 'away',
    tracking: [
      { key: 'duration_hrs', label: 'Fasting window', type: 'duration', unit: 'hrs', min: 12, max: 36, step: 1, default: 16 },
    ],
  },
  {
    id: 'eat_healthy_unenjoyable',
    category_id: 'Body',
    name: 'Eat Healthy Food I Don’t Enjoy',
    group: 'restrain',
    intensity: 'challenging',
    color: '#4C9A4C',
    core: false,
    suggested_target_per_week: 5,
    description: 'Choose the nutritious option over the one you crave — and eat it without doctoring it up.',
    whyItWorks:
      'Every meal is a fork between what’s rewarding and what’s good for you. Picking the plain, healthy option is a rep of overriding the reward circuit in real time.',
    icon: 'nutrition-outline',
    optional_reason: 'A discipline rep — adopt it if food is one of your battlegrounds.',
    order: 9,
    howTo: [
      'Pick a genuinely healthy option you don’t love — not a tasty “healthy” treat.',
      'Decide before you’re hungry, so the choice is made before the craving hits.',
      'Eat it deliberately, without sauces or extras that turn it into something you enjoy.',
      'When the urge to swap it for something tastier shows up, notice it and let it pass.',
    ],
    minimumVersion: 'Swap the most craving-driven item in one meal for something plain and healthy.',
    science:
      'Hyper-palatable food is engineered to hijack the same dopamine reward pathway as any other craving. Deliberately choosing food you don’t enjoy — and eating it anyway — is a direct rep of prefrontal control over the reward system. Done often, the pull of the tastiest option loses some of its grip, because you’ve trained the choice instead of feeding the craving.',
    tips: [
      'Decide before you’re hungry — willpower is weakest at the moment of craving.',
      'Don’t disguise it. The point is to sit with “not enjoyable,” not to make it enjoyable.',
      'Bland and nutritious beats tasty and “healthy” for this rep.',
      'CAUTION: this is discipline, not deprivation — eat enough, and skip it if you have any history of disordered eating.',
    ],
    variations: [
      { label: 'Plain protein + veg', description: 'A simple whole-food meal, minimally seasoned.' },
      { label: 'Swap one item', description: 'Replace the most craving-driven part of a meal with a healthy plain option.' },
      { label: 'No-extras meal', description: 'Eat it without the condiments and add-ons that make it enjoyable.' },
    ],
    research: [
      {
        finding: 'Adults with major depression who switched to a healthy diet for 12 weeks were 4× more likely to reach remission than controls.',
        source: 'RCT (SMILES trial), 2017 — BMC Medicine',
        url: 'https://link.springer.com/article/10.1186/s12916-017-0791-y',
      },
      {
        finding: 'On an ultra-processed diet people ate ~500 extra calories a day and gained weight — versus losing it on whole foods matched for nutrients.',
        source: 'Inpatient RCT, 2019 — Cell Metabolism',
        url: 'https://www.cell.com/cell-metabolism/fulltext/S1550-4131(19)30248-7',
      },
    ],
    resistanceMoment: 'you wanted to swap it for something tastier or reach for what you were craving',
    // 'moment' flow (pre-commit → confirm) is built in Phase 5; briefing copy is
    // ready now so the data is complete.
    flow: 'moment',
    ready: {
      whatYouDo:
        'Choose a plain, genuinely healthy option for your next meal — decided now, before the craving hits — and eat it as-is.',
      override: 'The pull to swap it for something you’d enjoy more. Eating it plainly anyway is the exercise.',
      focus: 'Don’t doctor it up. No sauces, no extras — sit with “not enjoyable.”',
      handoffCta: 'Begin',
    },
    tracking: [
      {
        key: 'meal',
        label: 'Which meal?',
        type: 'choice',
        options: [
          { value: 'breakfast', label: 'Breakfast' },
          { value: 'lunch', label: 'Lunch' },
          { value: 'dinner', label: 'Dinner' },
          { value: 'snack', label: 'Snack' },
        ],
      },
    ],
  },
];

// ============================================================================
// Live catalog cache
//
// `getPractice` & friends are called synchronously all over the app, so the
// catalog lives in a module-level cache seeded with the bundled defaults. At
// startup the app fetches the Firestore catalog, validates it, and swaps it in
// via setPracticeCatalog() — no call site changes. See services/practiceCatalog.ts.
// ============================================================================

/**
 * Duplicate library habits retired in favor of the richer definition that covers
 * the same behavior (the survivor already carries science, a template and a flow).
 *
 * These ids are NOT deleted — getHabitDefinition() follows this map, so a habit
 * someone already adopted under the old id keeps resolving and keeps its history.
 * They are simply hidden from browsing.
 */
export const SUPERSEDED_HABIT_IDS: Record<string, string> = {
  'move-20min': 'movement',
  'trad-exercise': 'movement',
  'morning-meditation': 'meditation',
  'trad-meditate': 'meditation',
  'breathing-break': 'breathwork',
  'trad-budget': 'log-the-spend',
};

/**
 * Every bundled habit definition: the 9 rich ones above plus the 42-habit library,
 * minus the superseded duplicates. This is the single catalog — there is no longer
 * a separate "practices" list and "habits" list.
 */
export const BUNDLED_HABIT_DEFINITIONS: HabitDefinition[] = [
  ...BUNDLED_PRACTICES,
  ...[...HABIT_LIBRARY, ...TRADITIONAL_HABIT_LIBRARY].filter(
    (h) => !SUPERSEDED_HABIT_IDS[h.id]
  ),
];

const indexById = (list: HabitDefinition[]): Record<string, HabitDefinition> =>
  list.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {} as Record<string, HabitDefinition>);

let catalog: HabitDefinition[] = BUNDLED_HABIT_DEFINITIONS;
let catalogById: Record<string, HabitDefinition> = indexById(BUNDLED_HABIT_DEFINITIONS);

/**
 * Replace the live catalog (e.g. with the validated Firestore catalog). Falls
 * back to the bundled defaults if given an empty list, so the app never ends up
 * with zero practices.
 */
export const setPracticeCatalog = (list: HabitDefinition[]): void => {
  catalog = list.length ? list : BUNDLED_HABIT_DEFINITIONS;
  catalogById = indexById(catalog);
};

/** @deprecated Use setHabitCatalog. */
export const setHabitCatalog = setPracticeCatalog;

/** Every habit definition in the live catalog, including retired (`active === false`) ones. */
export const getAllPractices = (): HabitDefinition[] => catalog;
export const getAllHabitDefinitions = (): HabitDefinition[] => catalog;

/**
 * Resolve any habit definition by id — including retired ones, so adopted habits
 * still work. Follows SUPERSEDED_HABIT_IDS so a habit adopted under a deduped id
 * resolves to its survivor rather than disappearing.
 */
export const getHabitDefinition = (id?: string | null): HabitDefinition | undefined => {
  if (!id) return undefined;
  const direct = catalogById[id];
  if (direct) return direct;
  const survivor = SUPERSEDED_HABIT_IDS[id];
  return survivor ? catalogById[survivor] : undefined;
};

/** @deprecated Practices are habits now — use getHabitDefinition. */
export const getPractice = getHabitDefinition;

/**
 * The middle beat a habit runs. Absent `flow` means 'tap' — a plain check-in —
 * which is what the great majority of library habits use.
 */
export const getHabitFlow = (
  def?: HabitDefinition | null
): 'tap' | 'timer' | 'away' | 'moment' => def?.flow ?? 'tap';

/** True when this habit carries a tracking template (metrics beyond resistance). */
export const hasTemplate = (def?: HabitDefinition | null): boolean =>
  !!def?.tracking && def.tracking.length > 0;

/** Active habits in a category, for browsing/adoption (retired + superseded hidden). */
export const getHabitDefinitionsByCategory = (categoryId: string): HabitDefinition[] =>
  catalog
    .filter((h) => h.category_id === categoryId && h.active !== false)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));

/** Everything browsable in the library, richest-first within each category. */
export const getBrowsableHabits = (): HabitDefinition[] =>
  catalog.filter((h) => h.active !== false);

/** Active practices in a group, for browsing/adoption (retired ones are hidden). */
/** @deprecated Retired by D1 — use getHabitDefinitionsByCategory. */
export const getPracticesByGroup = (group: PracticeGroup): HabitDefinition[] =>
  catalog
    .filter((p) => p.group === group && p.active !== false)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

/**
 * The curated, session-bearing habits — what used to be "the practices". These
 * are the definitions that carry a real session flow (timer/away/moment) rather
 * than being a plain check-in. Used to scope seeding and the old Practices UI so
 * that merging the 42-habit library into the catalog did not change either.
 */
export const getCuratedPractices = (): HabitDefinition[] =>
  catalog.filter((p) => p.flow && p.flow !== 'tap' && p.active !== false);

export const getCorePractices = (): HabitDefinition[] =>
  catalog.filter((p) => p.core && p.active !== false);

/**
 * The practices auto-provisioned onto every user's home — the full curated
 * protocol (core + optional), ordered gentle → extreme to match the home list.
 * Practices are the app's focus, so all of them live on Home with no add step.
 */
export const getDefaultSeedPractices = (): HabitDefinition[] => {
  // Scoped to the curated session-bearing habits ONLY. The catalog now also holds
  // the 42-habit browsable library; auto-provisioning all of it would drop ~45
  // habits onto a new user's home screen. Library habits are opted into, not seeded.
  const active = getCuratedPractices();
  const list = active.length > 0 ? active : BUNDLED_PRACTICES;
  return [...list].sort((a, b) => {
    const ai = INTENSITY_ORDER[a.intensity ?? 'foundational'];
    const bi = INTENSITY_ORDER[b.intensity ?? 'foundational'];
    if (ai !== bi) return ai - bi;
    return (a.order ?? 999) - (b.order ?? 999);
  });
};

export const getOptionalPractices = (): HabitDefinition[] =>
  getCuratedPractices().filter((p) => !p.core);

/**
 * Resolve the display group for an adopted practice instance.
 * - Curated practices derive their group from the catalog (via practice_id).
 * - Custom (user-authored) practices carry their own `group`; anything missing
 *   one — including legacy custom habits created before this field existed —
 *   falls back to 'custom'. Computed at read time, so no data migration.
 */
export const resolvePracticeGroup = (instance: {
  practice_id?: string;
  group?: PracticeGroup;
}): PracticeGroup => {
  const catalog = getHabitDefinition(instance.practice_id);
  // `group` is optional now that D1 retired it — library habits never had one.
  return catalog?.group ?? instance.group ?? 'custom';
};

/**
 * Resolve the intensity tier for an adopted practice instance. Curated practices
 * read it from the catalog; custom/legacy ones (no catalog match, or a catalog
 * doc without the field) fall back to 'foundational' so they sort to the top of
 * the gentle → extreme list rather than disappearing.
 */
export const getPracticeIntensity = (instance: {
  practice_id?: string;
}): IntensityLevel => getPractice(instance.practice_id)?.intensity ?? 'foundational';

/** Resolve the accent color for an adopted practice instance (banner color). */
export const getPracticeColor = (instance: {
  practice_id?: string;
}): string => getPractice(instance.practice_id)?.color ?? DEFAULT_PRACTICE_COLOR;

/**
 * Comparator that orders adopted practice instances gentle → extreme for the
 * home list: by intensity tier first, then the catalog's own `order`, then name.
 */
export const compareByIntensity = (
  a: { practice_id?: string; name: string },
  b: { practice_id?: string; name: string }
): number => {
  const ai = INTENSITY_ORDER[getPracticeIntensity(a)];
  const bi = INTENSITY_ORDER[getPracticeIntensity(b)];
  if (ai !== bi) return ai - bi;
  const ao = getPractice(a.practice_id)?.order ?? 999;
  const bo = getPractice(b.practice_id)?.order ?? 999;
  if (ao !== bo) return ao - bo;
  return a.name.localeCompare(b.name);
};
