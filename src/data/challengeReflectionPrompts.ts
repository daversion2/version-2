/**
 * Default post-challenge reflection prompts (success path).
 *
 * These are the canonical defaults + "Reset to defaults" source for the
 * admin-configurable reflection flow. They live in the
 * config/challengeReflectionPrompts Firestore document once an admin edits
 * them; until then (and on fetch failure) this bundled set is used.
 *
 * Mirrors src/data/microExercises.ts feeding microExercisesConfig.ts.
 */

export interface ReflectionPromptDefinition {
  id: string;
  /** The question shown in the chat-style prompt bubble. */
  prompt: string;
  /** Placeholder shown inside the answer textarea. */
  placeholder?: string;
  /** Optional supporting line under the prompt. */
  helper_text?: string;
  /** Optional character cap on the answer. */
  max_length?: number;
}

export const DEFAULT_REFLECTION_PROMPTS: ReflectionPromptDefinition[] = [
  {
    id: 'hardest-moment',
    prompt: 'What was the hardest moment — and what were you telling yourself then?',
    placeholder: 'The hardest part was…',
  },
  {
    id: 'what-helped',
    prompt: 'What helped you push through — or what would have helped?',
    placeholder: 'What got me through was…',
  },
  {
    id: 'next-time-rule',
    prompt: "What's one rule or adjustment you'll apply next time?",
    placeholder: 'Next time I will…',
  },
  {
    id: 'how-you-feel',
    prompt: 'How do you feel now compared to before?',
    placeholder: 'Right now I feel…',
  },
];
