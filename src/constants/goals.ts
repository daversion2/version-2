import { GoalStatus } from '../types';

export const GOAL_CONSTANTS = {
  MAX_ACTIVE: 3,
  NAME_MAX_LENGTH: 80,
  DESCRIPTION_MAX_LENGTH: 300,
};

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
  type: 'text' | 'multiline' | 'slider' | 'list' | 'habit_list' | 'inner_voice_pair' | 'yes_no' | 'challenge_input';
}

export const ONBOARDING_STAGES = [
  { id: 1, label: 'Define the Goal', subtitle: 'What matters to you' },
  { id: 2, label: 'Thought Patterns', subtitle: 'What\'s been stopping you' },
  { id: 3, label: 'Action Plan', subtitle: 'Build your system' },
  { id: 4, label: 'Anticipate', subtitle: 'Prepare for setbacks' },
  { id: 5, label: 'Identity', subtitle: 'Who you\'re becoming' },
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
    id: 'why_connection',
    stage: 1,
    question: 'How does this goal serve your personal Why?',
    placeholder: 'Think about how achieving this goal connects to your core purpose...',
    required: false,
    fieldKey: 'why_connection',
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

  // Stage 3: Action Plan
  {
    id: 'habits',
    stage: 3,
    question: 'What habits do you need to build to make this a reality?',
    placeholder: 'e.g., Go to gym',
    required: true,
    fieldKey: 'habits_input',
    type: 'habit_list',
  },
  {
    id: 'first_challenge',
    stage: 3,
    question: "What's one challenge you can do this week to push yourself for this goal?",
    placeholder: 'e.g., Run a mile without stopping, take a cold shower',
    required: true,
    fieldKey: 'first_challenge_input',
    type: 'challenge_input',
  },
  {
    id: 'minimum_action',
    stage: 3,
    question: "What's the smallest possible action on your worst day?",
    placeholder: 'On a terrible day, the win is...',
    required: true,
    fieldKey: 'minimum_action',
    type: 'text',
  },
  {
    id: 'bonus_actions',
    stage: 3,
    question: 'What are 2-3 things you could do when you have free time for this goal?',
    placeholder: 'e.g., Go for an extra walk',
    required: false,
    fieldKey: 'bonus_actions',
    type: 'list',
  },

  // Stage 4: Anticipate
  {
    id: 'triggers',
    stage: 4,
    question: 'What situations or feelings trigger you to fall off?',
    placeholder: 'e.g., Stress at work, boredom, feeling tired',
    required: false,
    fieldKey: 'triggers',
    type: 'list',
  },
  {
    id: 'trigger_substitutes',
    stage: 4,
    question: 'When that trigger hits, what will you do instead?',
    placeholder: 'e.g., Take a 5-minute walk instead of snacking',
    required: false,
    fieldKey: 'trigger_substitutes',
    type: 'list',
  },
  {
    id: 'recovery_plan',
    stage: 4,
    question: 'If you miss a day, what will you do to get back on track?',
    placeholder: "e.g., I'll do a shorter version, or pick it back up the next morning",
    required: true,
    fieldKey: 'recovery_plan',
    type: 'multiline',
  },

  // Stage 5: Identity
  {
    id: 'identity',
    stage: 5,
    question: 'Who are you becoming through this goal?',
    placeholder: "e.g., I'm becoming someone who keeps promises to himself",
    required: true,
    fieldKey: 'identity_statement',
    type: 'text',
  },
];
