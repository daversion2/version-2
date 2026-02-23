// Challenge Library Configuration
// ================================
// This file contains ALL configurable labels, descriptions, and settings
// for the Challenge Library. Edit this file to change copy without touching components.

// =============================================================================
// ACTION CATEGORIES (Primary Browse)
// =============================================================================
// These are the two primary ways to browse challenges: Start (do) or Stop (resist).
// This replaces the previous barrier types system.

export interface ActionCategoryConfig {
  id: string;
  name: string; // Display name
  shortName: string; // For compact displays
  icon: string; // Emoji icon
  shortDescription: string; // One-line description shown on cards
  longDescription: string; // Extended description for info modals
  color: string; // Background color for cards
  accentColor: string; // Darker accent for text/borders
}

export const ACTION_CATEGORIES: Record<string, ActionCategoryConfig> = {
  start: {
    id: 'start',
    name: 'Start',
    shortName: 'Start',
    icon: '⚡',
    shortDescription: 'Things I need to do but don\'t want to',
    longDescription:
      'Challenges that push you to take action on things you\'ve been avoiding. These build your ability to do hard things even when you don\'t feel like it.',
    color: '#E8F5E9', // Light green
    accentColor: '#2E7D32',
  },
  stop: {
    id: 'stop',
    name: 'Stop',
    shortName: 'Stop',
    icon: '✋',
    shortDescription: 'Activities I want to abstain from',
    longDescription:
      'Challenges that help you resist temptations and break unwanted habits. These strengthen your ability to say no and exercise self-control.',
    color: '#FFF3E0', // Light orange
    accentColor: '#E65100',
  },
};

// Helper to get action categories as an array (for mapping in components)
export const ACTION_CATEGORIES_LIST = Object.values(ACTION_CATEGORIES);

// =============================================================================
// BARRIER TYPES (DEPRECATED - kept for backward compatibility)
// =============================================================================
// These are no longer used for browsing but kept for existing data.

export interface BarrierTypeConfig {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  shortDescription: string;
  longDescription: string;
  color: string;
  accentColor: string;
}

// @deprecated - Use ACTION_CATEGORIES instead
export const BARRIER_TYPES: Record<string, BarrierTypeConfig> = {
  'comfort-zone': {
    id: 'comfort-zone',
    name: 'Comfort Zone Stretchers',
    shortName: 'Comfort Zone',
    icon: '🎯',
    shortDescription: 'Things that feel scary or uncomfortable',
    longDescription:
      'Challenges that push you outside your comfort zone. These train your nervous system to handle discomfort and reduce anxiety over time.',
    color: '#E8F5E9',
    accentColor: '#2E7D32',
  },
  'delayed-gratification': {
    id: 'delayed-gratification',
    name: 'Delayed Gratification',
    shortName: 'Delayed Grat.',
    icon: '⏳',
    shortDescription: 'Resisting immediate pleasure for long-term benefit',
    longDescription:
      'Challenges that require you to say "no" to instant rewards. These strengthen your ability to prioritize future outcomes over present temptations.',
    color: '#FFF3E0',
    accentColor: '#E65100',
  },
  discipline: {
    id: 'discipline',
    name: 'Discipline Builders',
    shortName: 'Discipline',
    icon: '💪',
    shortDescription: 'Repetitive tasks requiring consistency',
    longDescription:
      'Challenges that build habits through consistent action. These train your ability to follow through even when motivation is low.',
    color: '#E3F2FD',
    accentColor: '#1565C0',
  },
  ego: {
    id: 'ego',
    name: 'Ego Challenges',
    shortName: 'Ego',
    icon: '🪞',
    shortDescription: 'Things that humble you or risk embarrassment',
    longDescription:
      'Challenges that confront your fear of judgment or failure. These reduce the power of ego and increase resilience to criticism.',
    color: '#F3E5F5',
    accentColor: '#7B1FA2',
  },
  'energy-drainer': {
    id: 'energy-drainer',
    name: 'Energy Drainers',
    shortName: 'Energy',
    icon: '😮‍💨',
    shortDescription: 'Boring or tedious things you avoid',
    longDescription:
      'Challenges that are mundane but important. These train you to do necessary work even when it\'s not exciting or stimulating.',
    color: '#ECEFF1',
    accentColor: '#455A64',
  },
};

// @deprecated - Use ACTION_CATEGORIES_LIST instead
export const BARRIER_TYPES_LIST = Object.values(BARRIER_TYPES);

// =============================================================================
// TIME CATEGORIES
// =============================================================================
// How challenges are grouped by time commitment.

export interface TimeCategoryConfig {
  id: string;
  label: string; // Display label
  shortLabel: string; // For compact displays
  icon: string;
  minMinutes: number; // Inclusive
  maxMinutes: number; // Inclusive (use Infinity for no upper limit)
  description: string;
}

export const TIME_CATEGORIES: Record<string, TimeCategoryConfig> = {
  'quick-win': {
    id: 'quick-win',
    label: 'Quick Win',
    shortLabel: 'Quick',
    icon: '⚡',
    minMinutes: 1,
    maxMinutes: 15,
    description: '5-15 minutes',
  },
  ritual: {
    id: 'ritual',
    label: '30 Min Ritual',
    shortLabel: '30min',
    icon: '🌅',
    minMinutes: 16,
    maxMinutes: 45,
    description: '15-45 minutes',
  },
  'deep-work': {
    id: 'deep-work',
    label: 'Deep Work',
    shortLabel: '1hr+',
    icon: '🎯',
    minMinutes: 46,
    maxMinutes: 180,
    description: '1-3 hours',
  },
  'all-day': {
    id: 'all-day',
    label: 'All Day',
    shortLabel: 'All Day',
    icon: '📅',
    minMinutes: 181,
    maxMinutes: Infinity,
    description: 'Full day commitment',
  },
};

export const TIME_CATEGORIES_LIST = Object.values(TIME_CATEGORIES);

// Helper function to determine time category from minutes
export const getTimeCategoryFromMinutes = (minutes: number): string => {
  for (const category of TIME_CATEGORIES_LIST) {
    if (minutes >= category.minMinutes && minutes <= category.maxMinutes) {
      return category.id;
    }
  }
  return 'quick-win'; // Default fallback
};

// =============================================================================
// LIFE DOMAINS (CATEGORIES)
// =============================================================================
// The three core domains of discipline training.
// Physical = Body, movement, physical discomfort
// Social = Relationships, communication, visibility
// Mind = Inner work - emotional regulation, cognitive discipline, attention

export interface LifeDomainConfig {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  color: string;
}

export const LIFE_DOMAINS: Record<string, LifeDomainConfig> = {
  Physical: {
    id: 'Physical',
    name: 'Physical',
    shortName: 'Physical',
    description: 'Body, movement, physical discomfort',
    icon: 'fitness',
    color: '#217180',
  },
  Social: {
    id: 'Social',
    name: 'Social',
    shortName: 'Social',
    description: 'Relationships, communication, visibility',
    icon: 'chatbubbles',
    color: '#FF5B02',
  },
  Mind: {
    id: 'Mind',
    name: 'Mind',
    shortName: 'Mind',
    description: 'Inner work - emotional regulation, cognitive discipline, attention',
    icon: 'bulb-outline',
    color: '#7B1FA2',
  },
};

export const LIFE_DOMAINS_LIST = Object.values(LIFE_DOMAINS);

// =============================================================================
// ACTION TYPES
// =============================================================================
// Whether a challenge is about doing something or resisting something.

export interface ActionTypeConfig {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export const ACTION_TYPES: Record<string, ActionTypeConfig> = {
  complete: {
    id: 'complete',
    label: 'Start',
    icon: '⚡',
    description: 'Things I need to do but don\'t want to',
  },
  resist: {
    id: 'resist',
    label: 'Stop',
    icon: '✋',
    description: 'Activities I want to abstain from',
  },
};

// =============================================================================
// DIFFICULTY LEVELS
// =============================================================================
// Labels for difficulty ratings.

export interface DifficultyLevelConfig {
  level: number;
  label: string;
  description: string;
}

export const DIFFICULTY_LEVELS: DifficultyLevelConfig[] = [
  { level: 1, label: 'Easy', description: 'Minimal discomfort' },
  { level: 2, label: 'Moderate', description: 'Some discomfort' },
  { level: 3, label: 'Challenging', description: 'Significant effort required' },
  { level: 4, label: 'Hard', description: 'Major willpower needed' },
  { level: 5, label: 'Extreme', description: 'Maximum difficulty' },
];

// =============================================================================
// UI TEXT & LABELS
// =============================================================================
// All text displayed in the Challenge Library UI.
// Edit these to change copy without touching component code.

export const LIBRARY_UI_TEXT = {
  // Main screen
  screenTitle: 'Challenge Library',
  screenSubtitle: 'Find challenges that resonate with you',

  // Filter section
  quickFiltersLabel: 'Quick Filters',
  allTimeLabel: 'All',
  allCategoryLabel: 'All',

  // Action category section (Start/Stop)
  actionSectionTitle: 'What do you want to work on?',
  actionCardChallengesLabel: 'challenges',

  // Challenge list sections
  beginnerSectionTitle: '🌱 Beginner Friendly',
  beginnerSectionSubtitle: 'Great places to start',
  allChallengesTitle: '💪 All Challenges',
  browseAllLink: 'Or browse all challenges ↓',

  // Challenge detail
  detailWhyItWorksTitle: 'Why This Works 🧠',
  detailWhatYoullLearnTitle: "What You'll Learn",
  detailCommonResistanceTitle: 'Common Resistance',
  detailTheChallengeTitle: 'The Challenge',
  detailSuccessCriteriaLabel: 'Success Criteria:',
  detailExamplesButton: 'Examples',
  detailCommunityStatsButton: 'Community Stats',
  detailUseThisChallengeButton: 'Use This Challenge',

  // Modals
  examplesModalTitle: 'Real Examples',
  communityStatsModalTitle: 'Community Stats',
  communityStatsCompletedLabel: 'people completed this challenge',
  communityStatsDifficultyLabel: 'Average difficulty rating:',
  closeButton: 'Close',

  // Empty states
  emptyStateTitle: 'No Challenges Found',
  emptyStateMessage: 'Try adjusting your filters or check back soon for new challenges.',
  libraryEmptyTitle: 'Coming Soon',
  libraryEmptyMessage:
    'The challenge library is being curated. Check back soon for example challenges to help inspire your willpower journey.',

  // Difficulty section headers (for barrier-filtered view)
  difficultyBeginnerHeader: '🌱 Start Here (For Beginners)',
  difficultyModerateHeader: '💪 Moderate Difficulty',
  difficultyAdvancedHeader: '🔥 Advanced',
};

// =============================================================================
// SAMPLE CHALLENGES (for development/testing)
// =============================================================================
// These demonstrate the full data structure. Replace with real data in Firestore.

export interface SampleChallengeVariation {
  label: string; // e.g., "Easier", "Harder", "Advanced"
  description: string; // e.g., "15 seconds instead of 30"
}

export interface SampleChallenge {
  id: string;
  name: string;
  category: string;
  difficulty: number;
  description: string;
  success_criteria: string;
  why: string;
  barrier_type: string;
  time_required_minutes: number;
  time_category: string;
  beginner_friendly: boolean;
  action_type: string;
  neuroscience_explanation: string;
  psychological_benefit: string;
  what_youll_learn: string;
  common_resistance: string[];
  real_world_examples: string[];
  completion_count: number;
  average_actual_difficulty: number;
  variations?: SampleChallengeVariation[];
}

export const SAMPLE_CHALLENGES: SampleChallenge[] = [
  {
    id: 'sample-cold-shower',
    name: 'Cold Shower (Face Only)',
    category: 'Physical',
    difficulty: 2,
    description: 'Splash cold water on your face for 30 seconds.',
    success_criteria: 'Face is wet with cold water for 30 continuous seconds',
    why: 'Builds tolerance for discomfort in a safe, controlled way',
    barrier_type: 'comfort-zone',
    time_required_minutes: 5,
    time_category: 'quick-win',
    beginner_friendly: true,
    action_type: 'complete',
    neuroscience_explanation:
      "When you choose discomfort, you're training your prefrontal cortex to override your amygdala's fear response. This strengthens your ability to do hard things in all areas of life.",
    psychological_benefit:
      'Builds tolerance for discomfort, trains delayed gratification, reduces fear of physical sensation',
    what_youll_learn:
      "That discomfort is temporary and you're stronger than you think. Your brain will try to convince you it's \"too cold\" but you can choose to do it anyway.",
    common_resistance: [
      "It's too cold",
      "I'll do it tomorrow",
      'This is pointless/uncomfortable',
    ],
    real_world_examples: [
      'At the sink after brushing teeth',
      'In the shower before warming up',
      'Fill a bowl with ice water',
      'During lunch break to reset focus',
    ],
    completion_count: 127,
    average_actual_difficulty: 2.1,
    variations: [
      { label: 'Easier', description: '15 seconds' },
      { label: 'Harder', description: '60 seconds' },
      { label: 'Advanced', description: 'See "Cold Shower (Full Body)"' },
    ],
  },
  {
    id: 'sample-no-phone-meal',
    name: 'No Phone During Meal',
    category: 'Mind',
    difficulty: 2,
    description: 'Eat one meal without looking at your phone or any screens.',
    success_criteria: 'Complete meal from start to finish with no screen usage',
    why: 'Trains presence and resisting the urge to distract',
    barrier_type: 'delayed-gratification',
    time_required_minutes: 15,
    time_category: 'quick-win',
    beginner_friendly: true,
    action_type: 'resist',
    neuroscience_explanation:
      'Your brain craves constant stimulation. By sitting with boredom, you strengthen your prefrontal cortex and reduce dopamine dependency on devices.',
    psychological_benefit:
      'Improves attention span, reduces phone addiction, increases mindfulness',
    what_youll_learn:
      'That meals can be enjoyable without distraction, and boredom is not an emergency.',
    common_resistance: [
      'I need to check something important',
      "It's boring without my phone",
      "I'll just look at it for a second",
    ],
    real_world_examples: [
      'Breakfast before work',
      'Lunch at your desk (phone in drawer)',
      'Dinner with family',
    ],
    completion_count: 89,
    average_actual_difficulty: 1.8,
    variations: [
      { label: 'Easier', description: 'Phone face-down on table (but present)' },
      { label: 'Harder', description: 'Phone in another room entirely' },
      { label: 'Advanced', description: 'All meals for a full day' },
    ],
  },
  {
    id: 'sample-take-stairs',
    name: 'Take the Stairs',
    category: 'Physical',
    difficulty: 2,
    description: 'Choose stairs over elevator/escalator for the entire day.',
    success_criteria: 'Used stairs instead of elevator/escalator every opportunity today',
    why: 'Choosing discomfort when the easy option is available',
    barrier_type: 'discipline',
    time_required_minutes: 1440,
    time_category: 'all-day',
    beginner_friendly: true,
    action_type: 'complete',
    neuroscience_explanation:
      'Each small choice to take the hard path builds neural pathways for discipline. Over time, choosing discomfort becomes automatic.',
    psychological_benefit:
      'Builds habit of choosing effort over ease, improves physical health, creates momentum',
    what_youll_learn:
      "That small choices compound. The discomfort of stairs is brief, but the discipline carries into other areas.",
    common_resistance: [
      "I'm tired",
      "It's just one elevator ride",
      'No one will know if I take the easy way',
    ],
    real_world_examples: [
      'Office building stairs',
      'Parking garage',
      'Shopping mall',
      'Apartment complex',
    ],
    completion_count: 156,
    average_actual_difficulty: 2.3,
    variations: [
      { label: 'Easier', description: 'Do once' },
      { label: 'Harder', description: 'Do a few times' },
      { label: 'Advanced', description: 'Do this all day' },
    ],
  },
];
