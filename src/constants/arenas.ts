// =============================================================================
// ARENAS — the override-training domains ("Training Your Override" direction)
//
// Single source of truth for arena metadata. The ArenaId union itself lives in
// src/types/index.ts so types can reference it without importing constants.
//
// Six arenas train overriding a "stop / avoid" signal (push through discomfort).
// impulse_control trains overriding a "go / grab" (craving) signal — the same
// PFC-over-limbic mechanism, run in the opposite direction.
//
// Design note: this is intentionally a typed constant (not a Firestore doc) for
// v1 — the set is small and rarely-changing. It is shaped so it COULD graduate to
// a config/arenas document later without scattering arena_id literals across the
// codebase. See docs/phase-0-arena-taxonomy.md and docs/arenas-vs-goals-decision.md
// =============================================================================

import { ArenaId } from '../types';

export type BaselineUnit = 'duration' | 'rating' | 'completion';

export interface Arena {
  id: ArenaId;
  name: string;          // user-facing display name
  subtitle?: string;     // optional secondary label
  stopSignal: string;    // the thought/urge this arena trains you to override
  neuroscience: string;  // short "insider knowledge" hook (2–3 sentences)
  baselineMetric: string; // human description of how a baseline is measured
  baselineUnit: BaselineUnit; // machine hint for the baseline-test UI
  color: string;         // hex (drawn from the brand + goal palettes)
  icon: string;          // Ionicons name
  order: number;
}

export const ARENAS: Arena[] = [
  {
    id: 'mental_stillness',
    name: 'Mental Stillness',
    stopSignal: "I can't just sit here — I need to do something.",
    neuroscience:
      "Sitting with no input forces your prefrontal cortex to regulate the brain's default mode network instead of escaping into stimulation. Each minute you stay strengthens the anterior cingulate cortex — the same circuit you use to push through any discomfort.",
    baselineMetric: 'Duration of uninterrupted stillness',
    baselineUnit: 'duration',
    color: '#217180', // brand teal
    icon: 'flower-outline',
    order: 1,
  },
  {
    id: 'physical_discomfort',
    name: 'Physical Discomfort',
    stopSignal: 'This hurts. I want to stop.',
    neuroscience:
      "Cold, heat, and hard effort spike norepinephrine and — only if you stay — dopamine afterward. Choosing the discomfort on purpose trains your prefrontal cortex to override the amygdala's retreat signal, and repeated exposure resets what your nervous system counts as a threat (stress inoculation).",
    baselineMetric: 'Duration held in cold, heat, or effort',
    baselineUnit: 'duration',
    color: '#FF5B02', // brand orange
    icon: 'barbell-outline',
    order: 2,
  },
  {
    id: 'deliberate_boredom',
    name: 'Deliberate Boredom',
    stopSignal: "I'm bored. Let me grab my phone.",
    neuroscience:
      'Constant stimulation downregulates your dopamine baseline — which is what makes everything else feel boring and willpower feel impossible. Deliberate boredom (no phone, no input) lets dopamine receptors upregulate back toward baseline. You are repairing the reward system, not wasting time.',
    baselineMetric: 'Duration without reaching for stimulation',
    baselineUnit: 'duration',
    color: '#64748B', // slate
    icon: 'hourglass-outline',
    order: 3,
  },
  {
    id: 'breathwork',
    name: 'Breathwork',
    stopSignal: "I'll act once I feel calm.",
    neuroscience:
      'Slow, deliberate breathing is the one autonomic system you can drive on command. Extending the exhale activates the vagus nerve and shifts you from fight-or-flight to rest-and-recover — proof you can change your physiological state instead of waiting for it to change.',
    baselineMetric: 'Subjective stress rating, before → after',
    baselineUnit: 'rating',
    color: '#4A90D9', // sky
    icon: 'pulse-outline',
    order: 4,
  },
  {
    id: 'social_discomfort',
    name: 'Social Discomfort',
    stopSignal: "They'll judge me. This will be awkward.",
    neuroscience:
      'Saying the uncomfortable thing fires the same amygdala threat response as physical danger. Doing it anyway recalibrates that response — the brain learns rejection is not lethal — and the social fear that ran the show gets quieter every rep.',
    baselineMetric: 'Completion, plus a difficulty rating',
    baselineUnit: 'completion',
    color: '#E85D75', // coral
    icon: 'people-outline',
    order: 5,
  },
  {
    id: 'cognitive_resistance',
    name: 'Cognitive Resistance',
    stopSignal: 'This is too hard to think about right now.',
    neuroscience:
      'Your brain avoids effortful thinking the same way it avoids cold water. Choosing hard mental work engages the prefrontal cortex and working memory and builds tolerance for cognitive fatigue — the exact muscle that lets you stay with a hard problem instead of reaching for something easy.',
    baselineMetric: 'Duration of focused effort',
    baselineUnit: 'duration',
    color: '#7B61FF', // purple
    icon: 'school-outline',
    order: 6,
  },
  {
    id: 'impulse_control',
    name: 'Impulse Control',
    subtitle: 'Delayed Gratification',
    stopSignal: 'I want this now.',
    neuroscience:
      "Resisting a craving is the override run in reverse: your prefrontal cortex inhibiting the limbic reward-seeking that says 'now.' Each time you wait, you weaken the grip of immediate gratification and steepen your tolerance for delay — the foundation of every long-term goal.",
    baselineMetric: 'Completion, plus an urge-intensity rating',
    baselineUnit: 'completion',
    color: '#2ECC71', // emerald
    icon: 'hand-left-outline',
    order: 7,
  },
];

/** Color used for items that have no arena assigned yet (untagged / in transition). */
export const UNASSIGNED_ARENA_COLOR = '#94A3B8';

const ARENA_BY_ID: Record<ArenaId, Arena> = ARENAS.reduce((acc, a) => {
  acc[a.id] = a;
  return acc;
}, {} as Record<ArenaId, Arena>);

export const ARENA_IDS: ArenaId[] = ARENAS.map((a) => a.id);

/** Look up an arena by id. Returns undefined for unknown/missing ids. */
export function getArena(id?: ArenaId | null): Arena | undefined {
  return id ? ARENA_BY_ID[id] : undefined;
}

/** Resolve an item's display color from its arena, falling back to the neutral color. */
export function getArenaColor(id?: ArenaId | null): string {
  return getArena(id)?.color ?? UNASSIGNED_ARENA_COLOR;
}

// -----------------------------------------------------------------------------
// Coarse category → arena fallback.
//
// IMPORTANT: this is a LAST-RESORT fallback for legacy items that have no
// explicit arena_id. It is deliberately insufficient on its own — the existing
// "Mind" life-domain splits across THREE arenas (mental_stillness,
// deliberate_boredom, cognitive_resistance), so this cannot disambiguate them.
// New content must set arena_id explicitly; never rely on this for tagging.
// See docs/phase-0-arena-taxonomy.md ("the heuristic can't work").
// -----------------------------------------------------------------------------
export const CATEGORY_FALLBACK_ARENA: Record<string, ArenaId> = {
  Physical: 'physical_discomfort',
  Social: 'social_discomfort',
  Mind: 'mental_stillness',
};
