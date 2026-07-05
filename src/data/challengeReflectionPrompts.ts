/**
 * Default reflection prompts — shared by the post-challenge reflection and the
 * practice Capture flow, so both walk the user through the identical questions.
 *
 * These are the canonical defaults + "Reset to defaults" source for the
 * admin-configurable reflection flow. They live in the
 * config/challengeReflectionPrompts Firestore document once an admin edits
 * them; until then (and on fetch failure) this bundled set is used.
 *
 * Mirrors src/data/microExercises.ts feeding microExercisesConfig.ts.
 */

/** How a prompt collects its answer. */
export type ReflectionInputStyle =
  | 'text'      // multiline textarea (default)
  | 'oneliner'  // single line, meant for one concrete takeaway
  | 'choice';   // yes/no tap, with an optional follow-up line on "no"

export interface ReflectionPromptDefinition {
  id: string;
  /** The question shown in the chat-style prompt bubble. */
  prompt: string;
  /** Placeholder shown inside the answer input. */
  placeholder?: string;
  /** Optional supporting line under the prompt. */
  helper_text?: string;
  /** Optional character cap on the answer. */
  max_length?: number;
  /** Input style — defaults to 'text'. */
  input?: ReflectionInputStyle;
  /** 'choice' only: label on the affirmative button. */
  yes_label?: string;
  /** 'choice' only: label on the negative button. */
  no_label?: string;
  /** 'choice' only: optional follow-up question revealed when "no" is tapped. */
  followup_prompt?: string;
  /** 'choice' only: placeholder for the follow-up line. */
  followup_placeholder?: string;
}

/**
 * The five-question CBT sequence: episodic anchoring → automatic thought
 * surfacing → thought challenging → identity integration → implementation
 * intention (a single concrete takeaway).
 */
export const DEFAULT_REFLECTION_PROMPTS: ReflectionPromptDefinition[] = [
  {
    id: 'hardest-moment',
    prompt: 'What was the hardest moment?',
    helper_text: 'Put yourself back there for a second.',
    placeholder: 'The hardest part was…',
  },
  {
    id: 'telling-yourself',
    prompt: 'What were you telling yourself?',
    helper_text: 'The exact words, if you can catch them.',
    placeholder: '“I was thinking…”',
  },
  {
    id: 'reality-check',
    prompt: 'Was that thought grounded in reality?',
    helper_text:
      'Or was it just talking you out of it — like “one won’t hurt” or “you’ve done enough for today.”',
    input: 'choice',
    yes_label: 'Yes, it was real',
    no_label: 'No, not really',
    followup_prompt: "What's the truer thought?",
    followup_placeholder: 'The truth is…',
  },
  {
    id: 'identity',
    prompt: 'What does pushing through tell you about yourself?',
    helper_text: 'Finish the sentence honestly — no false modesty.',
    placeholder: 'I’m the kind of person who…',
  },
  {
    id: 'takeaway',
    prompt: 'What’s one thing to remember for next time?',
    helper_text: 'One line. Keep it concrete.',
    input: 'oneliner',
    max_length: 80,
    placeholder: 'Next time: …',
  },
];
