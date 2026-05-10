import { HomeLayoutItem } from '../types';

export const SECTION_IDS = [
  // Zone 1: Welcome
  'greeting',
  'why_summary',
  // Zone 2: Your Goals + Today's Actions
  'todays_plan',
  'goal_actions',
  'sprints',
  // Zone 3: Reflect
  'reflection_banner',
  'fun_fact',
  // Legacy (kept for backward compat with custom layouts)
  'identity_summary',
  'goals',
  'willpower_summary',
  'daily_challenges',
  'habits',
  'programs',
  'extended_challenges',
  'buddy_invites',
  'team_activity',
] as const;

export type HomeSectionId = (typeof SECTION_IDS)[number];

const HIDDEN_SECTIONS: Set<HomeSectionId> = new Set([
  // Legacy sections hidden from default layout
  'identity_summary',
  'goals',
  'willpower_summary',
  'daily_challenges',
  'habits',
  'programs',
  'extended_challenges',
  'buddy_invites',
  'team_activity',
]);

export const DEFAULT_HOME_LAYOUT: HomeLayoutItem[] = SECTION_IDS.map(id => ({
  id,
  visible: !HIDDEN_SECTIONS.has(id),
}));

export interface ZoneDefinition {
  id: string;
  label: string;
  icon: string;
  sectionIds: HomeSectionId[];
}

export const ZONE_CONFIG: ZoneDefinition[] = [
  {
    id: 'welcome',
    label: 'Welcome',
    icon: 'sunny-outline',
    sectionIds: ['greeting', 'why_summary'],
  },
  {
    id: 'goals_actions',
    label: "Today's Actions",
    icon: 'flag-outline',
    sectionIds: ['todays_plan', 'goal_actions', 'sprints'],
  },
  {
    id: 'reflect',
    label: 'Reflect',
    icon: 'moon-outline',
    sectionIds: ['reflection_banner', 'fun_fact'],
  },
  // Legacy zone for backward compat with custom layouts
  {
    id: 'legacy',
    label: 'More',
    icon: 'grid-outline',
    sectionIds: ['identity_summary', 'goals', 'willpower_summary', 'daily_challenges', 'habits', 'programs', 'extended_challenges', 'buddy_invites', 'team_activity'],
  },
];

export const SECTION_TO_ZONE: Record<HomeSectionId, string> = {} as Record<HomeSectionId, string>;
for (const zone of ZONE_CONFIG) {
  for (const sectionId of zone.sectionIds) {
    (SECTION_TO_ZONE as Record<string, string>)[sectionId] = zone.id;
  }
}

export const SECTION_LABELS: Record<HomeSectionId, string> = {
  greeting: 'Greeting',
  why_summary: 'Your Why',
  todays_plan: "Today's Plan",
  goal_actions: 'Goals & Actions',
  sprints: "Today's Sprints",
  identity_summary: 'Identity Summary',
  reflection_banner: 'Nightly Reflection',
  fun_fact: 'Fun Fact',
  // Legacy
  goals: 'Goals',
  willpower_summary: 'Willpower Summary',
  daily_challenges: "Today's Challenges",
  habits: 'Habits',
  programs: 'Programs',
  extended_challenges: 'Extended Challenges',
  buddy_invites: 'Buddy Invites',
  team_activity: 'Team Activity',
};

export const SECTION_ICONS: Record<HomeSectionId, string> = {
  greeting: 'sunny-outline',
  why_summary: 'compass-outline',
  todays_plan: 'today-outline',
  goal_actions: 'flag-outline',
  sprints: 'timer-outline',
  identity_summary: 'sparkles-outline',
  reflection_banner: 'moon-outline',
  fun_fact: 'bulb-outline',
  // Legacy
  goals: 'flag-outline',
  willpower_summary: 'shield-outline',
  daily_challenges: 'flash-outline',
  habits: 'repeat-outline',
  programs: 'rocket-outline',
  extended_challenges: 'trending-up-outline',
  buddy_invites: 'person-add-outline',
  team_activity: 'people-outline',
};
