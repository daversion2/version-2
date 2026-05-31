import { GoalStatus, MeasurementType } from '../types';

export const GOAL_CONSTANTS = {
  MAX_ACTIVE: 3,
  NAME_MAX_LENGTH: 80,
  DESCRIPTION_MAX_LENGTH: 300,
  WHY_MAX_LENGTH: 500,
  IDENTITY_MAX_LENGTH: 200,
  OBSTACLE_MAX_LENGTH: 300,
  PLAN_MAX_LENGTH: 300,
  DEFAULT_GOAL_DURATION_DAYS: 90,
};

// ============================================================================
// GOAL CREATION FLOW v2
// ============================================================================

export interface MeasurementTypeMeta {
  type: MeasurementType;
  label: string;
  description: string;
  icon: string;       // Ionicons name
}

export const MEASUREMENT_TYPES: MeasurementTypeMeta[] = [
  {
    type: 'done_by_date',
    label: 'Done by a date',
    description: 'A one-time finish line',
    icon: 'checkmark-circle-outline',
  },
  {
    type: 'reach_number',
    label: 'Reach a number',
    description: 'A metric you\'ll hit over time',
    icon: 'trending-up-outline',
  },
  {
    type: 'hit_total',
    label: 'Hit a total',
    description: 'Accumulate X instances',
    icon: 'calculator-outline',
  },
  {
    type: 'rate_yourself',
    label: 'Rate yourself',
    description: 'Weekly reflection, no hard metric',
    icon: 'star-outline',
  },
];

export const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Mon' },
  { value: 'tuesday', label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday', label: 'Thu' },
  { value: 'friday', label: 'Fri' },
  { value: 'saturday', label: 'Sat' },
  { value: 'sunday', label: 'Sun' },
] as const;

export const CREATION_FLOW_STEPS = [
  { id: 1, label: 'Goal' },
  { id: 2, label: 'Why' },
  { id: 3, label: 'Measure' },
  { id: 4, label: 'Obstacles', optional: true },
  { id: 5, label: 'Commit' },
] as const;

export const NEUROSCIENCE_BLURBS = {
  goal: {
    title: 'Why this works',
    content: 'Specific goals create a well-defined gap between your current state and desired state. Your brain\'s dopaminergic system fires in response to closing that gap — but only if it\'s concrete enough to perceive. Vague goals produce no gap signal, and therefore no motivational pull.',
  },
  why: {
    title: 'Why this works',
    content: 'Goals anchored to intrinsic values — identity, growth, meaning — activate the limbic system\'s motivational circuitry far more durably than surface-level reasons. Extrinsic reasons produce motivation that fades; values-based reasons self-renew.',
  },
  measurement: {
    title: 'Why this works',
    content: 'Measurable goals allow the brain to continuously calculate progress. This activates a feedback loop in the striatum — the closer you get, the more motivating the goal becomes. Without measurement, there\'s no feedback loop and motivation stays flat.',
  },
  obstacles: {
    title: 'Why this works',
    content: 'Implementation intentions — "if X, then Y" plans — have been shown in meta-analyses to roughly double goal follow-through rates. By pre-deciding the response, you offload the decision from willpower to procedural memory. When the obstacle arrives, the brain doesn\'t deliberate — it executes.',
  },
} as const;

export const SMART_GUIDANCE = 'Being specific and realistic is proven to increase the probability of achieving goals. Include what you want to achieve, how you\'ll measure it, and by when.';

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  active: 'Active',
  completed: 'Completed',
  not_completed: 'Not Completed',
  archived: 'Archived',
};

// ============================================================================
// GOAL ONBOARDING FLOW (Phase 1.1)
// ============================================================================

export interface OnboardingPrompt {
  id: string;
  stage: number;
  question: string;
  placeholder: string;
  required: boolean;
  fieldKey: string;
  type: 'text' | 'multiline' | 'slider' | 'inner_voice_pair' | 'yes_no' | 'challenge_input';
}

export const ONBOARDING_STAGES = [
  { id: 1, label: 'Define the Goal', subtitle: 'What matters to you' },
  { id: 2, label: 'Thought Patterns', subtitle: 'What\'s been stopping you' },
] as const;

export const ONBOARDING_PROMPTS: OnboardingPrompt[] = [
  // Stage 1: Define the Goal
  {
    id: 'goal_name',
    stage: 1,
    question: "What's your goal?",
    placeholder: 'e.g., Run a half marathon',
    required: true,
    fieldKey: 'name',
    type: 'text',
  },
  {
    id: 'deeper_why',
    stage: 1,
    question: "Why does this matter to you — what's the deeper reason?",
    placeholder: 'Beyond the surface goal, what does achieving this really mean to you?',
    required: true,
    fieldKey: 'deeper_why',
    type: 'multiline',
  },
  {
    id: 'confidence',
    stage: 1,
    question: "On a scale of 1-10, how confident are you that you'll achieve this?",
    placeholder: '',
    required: true,
    fieldKey: 'confidence_baseline',
    type: 'slider',
  },

  // Stage 2: Thought Patterns
  {
    id: 'past_attempt',
    stage: 2,
    question: 'Have you tried to achieve this before?',
    placeholder: '',
    required: false,
    fieldKey: 'past_attempt_tried',
    type: 'yes_no',
  },
  {
    id: 'negative_story',
    stage: 2,
    question: "What did you tell yourself when it fell apart last time?",
    placeholder: 'e.g., "I\'m lazy" or "I always quit after a week"',
    required: false,
    fieldKey: 'negative_story',
    type: 'multiline',
  },
  {
    id: 'inner_voice',
    stage: 2,
    question: 'What will your inner voice say when it gets hard? What will you say back?',
    placeholder: '',
    required: false,
    fieldKey: 'inner_voice_pair',
    type: 'inner_voice_pair',
  },

];
