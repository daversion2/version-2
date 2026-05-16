import { MicroExerciseDefinition } from '../types/microExercise';
import { MicroExerciseTrigger } from '../types/worksheets';

export const MICRO_EXERCISES: MicroExerciseDefinition[] = [
  {
    feeling_key: 'hard_on_self',
    feeling_label: "I'm being hard on myself",
    source_template_id: 'cognitive_distortions',
    default_for_triggers: ['reflection'],
    questions: [
      {
        id: 'q1',
        prompt: "What's the harshest thing you've been saying to yourself today?",
        placeholder: 'e.g. "I always fail at this, I can\'t do anything right..."',
      },
      {
        id: 'q2',
        prompt:
          "What is that voice actually assuming about you — that you always fail, that you're not capable, something else?",
        placeholder: "e.g. \"That I'll never be consistent, that everyone else handles this better...\"",
      },
      {
        id: 'q3',
        prompt:
          "Is that assumption correct, or can you find some evidence to the contrary?",
        placeholder: "e.g. \"I keep thinking I always fail, but I've succeeded at plenty in my life...\"",
      },
    ],
    completion_affirmation:
      "You just surfaced a BS story you were telling yourself and challenged it with evidence. A small part of your brain is currently rewiring itself to get you closer to who you're becoming.",
  },
  {
    feeling_key: 'avoiding',
    feeling_label: 'I keep avoiding this',
    source_template_id: 'smart_action_plan',
    default_for_triggers: ['challenge_failure'],
    questions: [
      {
        id: 'q1',
        prompt: "What have you been putting off — and don't say 'nothing.'",
        placeholder: 'e.g. "Starting my workout routine, having that difficult conversation..."',
      },
      {
        id: 'q2',
        prompt:
          "What's the story or reason you keep telling yourself about why you can't start yet?",
        placeholder:
          "e.g. \"I tell myself I'll start when I feel more motivated, or tomorrow, or when things calm down...\"",
      },
      {
        id: 'q3',
        prompt:
          "What's the smallest version of this you could do today — small enough that your brain can't talk you out of it?",
        placeholder: "e.g. \"Just five minutes with no pressure to continue...\"",
      },
    ],
    completion_affirmation:
      "Avoidance isn't laziness. It's your brain running a protection program it wrote a long time ago. You just identified the loop — and naming it is the first step to breaking it.",
  },
  {
    feeling_key: 'giving_up',
    feeling_label: 'I feel like giving up',
    source_template_id: 'thought_record',
    default_for_triggers: ['comeback', 'inactivity'],
    questions: [
      {
        id: 'q1',
        prompt:
          "What's the thought making giving up feel like the reasonable option right now?",
        placeholder: "e.g. \"I'll never be consistent enough, why bother trying again...\"",
      },
      {
        id: 'q2',
        prompt:
          "Find one piece of evidence — even a small one — that that thought isn't the whole story.",
        placeholder: 'e.g. "I did stick with it for three weeks last month before things fell apart..."',
      },
      {
        id: 'q3',
        prompt:
          "What does 'not giving up' look like just for today? Not forever. Just today.",
        placeholder:
          "e.g. \"Doing the smallest version of my commitment, even just 10 minutes...\"",
      },
    ],
    completion_affirmation:
      "That urge to quit isn't weakness — it's your nervous system trying to conserve energy. You just gave it a reason not to. That's your brain updating its model of you.",
  },
  {
    feeling_key: 'dont_know_why',
    feeling_label: "I don't know why I can't just do it",
    source_template_id: 'behavioral_experiment',
    default_for_triggers: [],
    questions: [
      {
        id: 'q1',
        prompt:
          "Think about the last time you actually followed through on something like this. What was different about that day?",
        placeholder:
          "e.g. \"I had more energy, fewer distractions, I'd already started the night before...\"",
      },
      {
        id: 'q2',
        prompt:
          "What's the belief that keeps you stuck before you even start — and where did it actually come from?",
        placeholder:
          "e.g. \"I tell myself I'm just not disciplined, but I'm not sure that's actually true...\"",
      },
      {
        id: 'q3',
        prompt:
          "What's the smallest test you could run today to see if that belief holds up?",
        placeholder:
          "e.g. \"Just showing up for five minutes and...\"",
      },
    ],
    completion_affirmation:
      "You can't think your way out of a belief. Your brain updates through action and evidence — not reflection alone. You just designed the experiment. Now run it.",
  },
  {
    feeling_key: 'overwhelmed',
    feeling_label: 'Everything feels like too much',
    source_template_id: 'core_belief_arrow',
    default_for_triggers: [],
    questions: [
      {
        id: 'q1',
        prompt:
          "Out of everything piling up right now — what's the one thing sitting heaviest?",
        placeholder: "e.g. \"The feeling that I'm falling behind and can't catch up...\"",
      },
      {
        id: 'q2',
        prompt:
          "Is it the thing itself that feels heavy, or what you're afraid it says about you?",
        placeholder: "e.g. \"Honestly it's more about feeling like everyone else is handling this better...\"",
      },
      {
        id: 'q3',
        prompt:
          "What's one move so small it almost doesn't count — but would prove to yourself you're not stuck?",
        placeholder:
          "e.g. \"Just opening the document, or putting my shoes on, or...\"",
      },
    ],
    completion_affirmation:
      "Being overwhelmed is what happens when your brain treats everything as equally urgent. You just forced it to prioritize. That's your prefrontal cortex doing exactly what it's built for — you just had to make it work.",
  },
];

/**
 * Returns the 3 feelings to show by default for a given trigger,
 * with the trigger's primary feeling first.
 */
export const getOrderedFeelingsForTrigger = (
  trigger: MicroExerciseTrigger
): MicroExerciseDefinition[] => {
  const primary = MICRO_EXERCISES.find((ex) => ex.default_for_triggers.includes(trigger));
  const rest = MICRO_EXERCISES.filter((ex) => ex !== primary);
  return primary ? [primary, ...rest] : MICRO_EXERCISES;
};

/**
 * Returns the default feeling for a trigger (first in ordered list).
 */
export const getDefaultFeelingForTrigger = (
  trigger: MicroExerciseTrigger
): MicroExerciseDefinition => {
  return getOrderedFeelingsForTrigger(trigger)[0];
};
