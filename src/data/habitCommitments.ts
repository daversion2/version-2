import type { HabitDefinition, TrackingField } from './practices';

// =============================================================================
// HABIT COMMITMENTS — the per-occasion amount a user promises.
//
// "Drink more water" is vague because it has no threshold: there is no such
// thing as failing it, so there is no such thing as doing it. "Drink 80 oz" is
// a promise. Same habit, completely different weight.
//
// This overlay adds a commitment metric to the generic habits that need one.
// Habits with no natural amount (make your bed, floss, no-snooze) are absent
// on purpose — inventing a number for them would be noise, and adopting them
// stays one tap.
//
// The `default` on each field is the STARTING POINT shown when adopting. The
// user's actual choice lives on their habit instance in `metric_goals`.
//
// Falling short still counts as done. These are recorded, never enforced.
// =============================================================================

export interface HabitCommitment {
  /** The tracking field capturing the amount. */
  field: TrackingField;
  /** Shown above the picker when adopting: "How much are you committing to?" */
  prompt: string;
}

export const HABIT_COMMITMENTS: Record<string, HabitCommitment> = {
  // ─── Body ─────────────────────────────────────────────────────────────────
  'trad-drink-water': {
    prompt: 'How much water a day?',
    field: {
      key: 'water_oz', label: 'How much?', type: 'number', unit: 'oz',
      min: 20, max: 160, step: 10, default: 80,
      record: { label: 'Most in a day', icon: 'water-outline' },
    },
  },
  'trad-eat-vegetables': {
    prompt: 'How many servings a day?',
    field: {
      key: 'servings', label: 'How many servings?', type: 'number', unit: 'servings',
      min: 1, max: 10, step: 1, default: 5,
      record: { label: 'Most servings', icon: 'nutrition-outline' },
    },
  },
  'trad-10k-steps': {
    prompt: 'How many steps a day?',
    field: {
      key: 'steps', label: 'How many steps?', type: 'number', unit: 'steps',
      min: 2000, max: 20000, step: 1000, default: 8000,
      record: { label: 'Most steps', icon: 'walk-outline' },
    },
  },
  'trad-stretch': {
    prompt: 'How long each time?',
    field: {
      key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min',
      min: 2, max: 60, step: 1, default: 10,
      record: { label: 'Longest stretch', icon: 'body-outline' },
    },
  },
  'trad-exercise': {
    prompt: 'How long each session?',
    field: {
      key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min',
      min: 10, max: 120, step: 5, default: 45,
      record: { label: 'Longest session', icon: 'barbell-outline' },
    },
  },
  'cook-real-meal': {
    prompt: 'How many meals a day?',
    field: {
      key: 'meals', label: 'How many meals?', type: 'number', unit: 'meals',
      min: 1, max: 3, step: 1, default: 1,
    },
  },
  'trad-no-sugar': {
    prompt: 'How well did you hold to it?',
    field: {
      key: 'adherence', label: 'How well did you hold to it?', type: 'scale',
      min: 1, max: 5, step: 1, default: 5,
      labels: { low: 'Fell off it', high: 'Completely' },
      record: { label: 'Best day', icon: 'ribbon-outline' },
    },
  },
  'water-only': {
    prompt: 'How well did you hold to it?',
    field: {
      key: 'adherence', label: 'How well did you hold to it?', type: 'scale',
      min: 1, max: 5, step: 1, default: 5,
      labels: { low: 'Fell off it', high: 'Completely' },
    },
  },
  'morning-daylight': {
    prompt: 'How long outside?',
    field: {
      key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min',
      min: 5, max: 60, step: 5, default: 10,
      record: { label: 'Longest', icon: 'sunny-outline' },
    },
  },

  // ─── Mind ─────────────────────────────────────────────────────────────────
  'trad-journal': {
    prompt: 'How long each time?',
    field: {
      key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min',
      min: 2, max: 60, step: 1, default: 10,
      record: { label: 'Longest entry', icon: 'create-outline' },
    },
  },
  'trad-gratitude': {
    prompt: 'How many things each time?',
    field: {
      key: 'count', label: 'How many?', type: 'number', unit: 'things',
      min: 1, max: 10, step: 1, default: 3,
    },
  },

  // ─── Focus & Craft ────────────────────────────────────────────────────────
  'deep-focus-session': {
    prompt: 'How long is a block?',
    field: {
      key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min',
      min: 15, max: 180, step: 15, default: 60,
      record: { label: 'Longest block', icon: 'flash-outline' },
    },
  },
  'trad-read': {
    prompt: 'How long each day?',
    field: {
      key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min',
      min: 5, max: 120, step: 5, default: 20,
      record: { label: 'Longest read', icon: 'book-outline' },
    },
  },
  'trad-learn-language': {
    prompt: 'How long each day?',
    field: {
      key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min',
      min: 5, max: 90, step: 5, default: 15,
      record: { label: 'Longest session', icon: 'language-outline' },
    },
  },
  'trad-learn-skill': {
    prompt: 'How long each session?',
    field: {
      key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min',
      min: 10, max: 180, step: 10, default: 30,
      record: { label: 'Longest session', icon: 'construct-outline' },
    },
  },
  'trad-limit-screens': {
    prompt: 'What is your daily cap?',
    field: {
      key: 'screen_hrs', label: 'Hours on screens', type: 'number', unit: 'hrs',
      min: 1, max: 12, step: 1, default: 3,
      // Less is the achievement here.
      record: { label: 'Lowest day', icon: 'phone-portrait-outline', pick: 'min' },
    },
  },
  'phone-free-first-hour': {
    prompt: 'How long phone-free?',
    field: {
      key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min',
      min: 10, max: 120, step: 10, default: 30,
      record: { label: 'Longest', icon: 'phone-portrait-outline' },
    },
  },
  'trad-tidy': {
    prompt: 'How long each time?',
    field: {
      key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min',
      min: 5, max: 60, step: 5, default: 10,
    },
  },

  // ─── Money ────────────────────────────────────────────────────────────────
  'pay-myself-first': {
    prompt: 'How much each time?',
    field: {
      key: 'amount', label: 'How much?', type: 'number', unit: '$',
      min: 10, max: 2000, step: 10, default: 100,
      record: { label: 'Largest transfer', icon: 'wallet-outline' },
    },
  },
};

/**
 * Merge a commitment onto a definition: the field joins `tracking`, and
 * `commitmentKey` names it. Applied when the catalog is built.
 */
export const withCommitment = (def: HabitDefinition): HabitDefinition => {
  const commitment = HABIT_COMMITMENTS[def.id];
  if (!commitment) return def;
  const existing = def.tracking ?? [];
  // Never duplicate a key the definition already tracks — the authored version
  // wins, since it may carry dose config or record labels this doesn't know about.
  const alreadyTracked = existing.some((f) => f.key === commitment.field.key);
  return {
    ...def,
    commitmentKey: commitment.field.key,
    tracking: alreadyTracked ? existing : [commitment.field, ...existing],
  };
};

/** The prompt shown when adopting, if this habit asks for an amount. */
export const getCommitmentPrompt = (habitId?: string): string | undefined =>
  habitId ? HABIT_COMMITMENTS[habitId]?.prompt : undefined;
