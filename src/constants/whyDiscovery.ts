// ============================================================================
// WHY / PURPOSE DISCOVERY CONSTANTS
// ============================================================================

export interface WhyDiscoveryStage {
  id: number;
  label: string;
  subtitle: string;
  skippable: boolean;
}

export const WHY_DISCOVERY_STAGES: WhyDiscoveryStage[] = [
  { id: 1, label: 'Welcome', subtitle: "Let's get you set up", skippable: false },
  { id: 2, label: 'Pause', subtitle: 'One minute of awareness', skippable: false },
  { id: 3, label: 'Reflect', subtitle: 'What did you notice?', skippable: false },
  { id: 4, label: 'Your Goal', subtitle: 'What do you want to work on?', skippable: false },
  { id: 5, label: 'Your Action', subtitle: 'How will you start?', skippable: false },
  { id: 6, label: 'Set It Up', subtitle: 'Name your first step', skippable: false },
  { id: 7, label: 'Motivation', subtitle: 'Pick what drives you', skippable: false },
];

// ============================================================================
// STAGE 2: MINDFULNESS CONTEXT
// ============================================================================

export const MINDFULNESS_CONTEXT = `Most behavior change fails not because of willpower — but because of the story running in your head.

This app is built around that insight. Before we set anything up, we want to show you something.

Take 60 seconds. Sit quietly. No scrolling — just notice what thoughts come up.`;

export const MINDFULNESS_TIMER_SECONDS = 60;

// ============================================================================
// STAGE 2: OPENING QUESTION
// Single, approachable question that seeds the 5 Whys drilling
// ============================================================================

export const OPENING_QUESTION_INTRO = `Before we set any goals or build any habits, we're going to do something most apps skip entirely — we're going to find out what actually drives you.

This isn't a personality quiz. It's one simple question, asked a few times, that will get you to the real reason you're here. Research shows that people who are connected to their core "why" are dramatically more likely to follow through — even when motivation fades.

Don't overthink it. There are no wrong answers, and this will evolve as you do.`;

export const OPENING_QUESTION = 'What made you download this app today?';

export const OPENING_QUESTION_EXAMPLES = [
  'I want to get healthier and have more energy',
  'I feel stuck and I\'m tired of not making progress on my goals',
  'I want to show up better for my family',
  'I\'ve been struggling with consistency and I don\'t know why',
  'I want to build confidence in myself',
  'I feel like I\'m living below my potential',
];

// ============================================================================
// STAGE 3: 5 WHYS DRILLING PROMPTS
// Iterative deepening from surface motivation to root purpose
// ============================================================================

export interface WhyDrillingPrompt {
  depth: number;
  template: string;
  placeholder: string;
}

export const WHY_DRILLING_PROMPTS: WhyDrillingPrompt[] = [
  {
    depth: 1,
    template: 'You said \u201c{previousAnswer}\u201d \u2014 why does that matter to you?',
    placeholder: 'What\u2019s underneath that reason...',
  },
  {
    depth: 2,
    template: 'You said \u201c{previousAnswer}\u201d \u2014 why does that matter to you specifically?',
    placeholder: "Go deeper. What's underneath that...",
  },
  {
    depth: 3,
    template: "And why is that important? What would be missing from your life without it?",
    placeholder: "What would you lose if this wasn't part of your life...",
  },
  {
    depth: 4,
    template: 'Keep going \u2014 why does this feel so fundamental to who you are?',
    placeholder: "You're getting close to the root...",
  },
  {
    depth: 5,
    template: 'One more layer \u2014 what is the deepest reason this matters?',
    placeholder: 'The thing that, if you lost it, nothing else would matter...',
  },
  {
    depth: 6,
    template: 'Is there something even deeper? Why does this feel true for you?',
    placeholder: 'Sometimes the root goes one level further...',
  },
  {
    depth: 7,
    template: 'Final layer \u2014 what is this really about at its core?',
    placeholder: 'The irreducible truth...',
  },
];

export const MIN_WHY_DEPTH = 1;
export const MAX_WHY_DEPTH = 7;

// ============================================================================
// STAGE 4: WHY STATEMENT CRAFTING
// Follows Simon Sinek's "To [contribution] so that [impact]" format
// ============================================================================

export const WHY_STATEMENT_GUIDE = {
  format: 'To [contribution/action] so that [impact/result]',
  examples: [
    'To push past comfort so that I prove I can handle anything life throws at me',
    'To show up consistently so that my family sees what discipline really looks like',
    'To build mental toughness so that I never feel powerless over my own choices',
    'To do hard things daily so that I become someone I deeply respect',
  ],
  tips: [
    'Your Why is about contribution and impact \u2014 what you give and what happens because of it.',
    'It should feel bigger than any single goal.',
    'A good test: does this Why apply to ALL your goals, not just one?',
    "Don't overthink it. You can refine it over time.",
  ],
};

export const WHY_STATEMENT_MIN_LENGTH = 10;

// ============================================================================
// WHY REFLECTION PROMPTS (for periodic check-ins on the Why Screen)
// ============================================================================

export const WHY_REFLECTION_PROMPTS = [
  'Does your Why still feel true? Has anything shifted?',
  'Think about your actions this week. Which ones were aligned with your Why?',
  'If you told a stranger your Why, would they understand what drives you?',
  'What would it look like to live your Why more fully next week?',
  'What\u2019s one thing you did this week that you\u2019re proud of? How does it connect?',
];

// ============================================================================
// STAGE 5: GOAL CREATION INTRO
// ============================================================================

export const GOAL_INTRO_TEXT = `Now let\u2019s put your Why into action.\n\nA goal is the big thing you\u2019re working toward \u2014 everything else (challenges and habits) exists to serve it. We\u2019ll walk you through a few questions to build a real system around it.`;

export const GOAL_END_DATE_PRESETS = [30, 60, 90]; // days from today

export interface GoalCategoryOption {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export const GOAL_CATEGORIES: GoalCategoryOption[] = [
  { id: 'Physical', name: 'Physical', color: '#217180', icon: 'fitness' },
  { id: 'Social', name: 'Social', color: '#FF5B02', icon: 'chatbubbles' },
  { id: 'Mind', name: 'Mind', color: '#7B1FA2', icon: 'bulb-outline' },
];
