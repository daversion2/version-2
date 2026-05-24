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
