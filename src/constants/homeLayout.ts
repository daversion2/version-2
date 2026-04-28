import { HomeLayoutItem } from '../types';

export const SECTION_IDS = [
  'greeting',
  'fun_fact',
  'reflection_banner',
  'team_activity',
  'buddy_invites',
  'programs',
  'goals',
  'daily_challenges',
  'sprints',
  'extended_challenges',
  'habits',
] as const;

export type HomeSectionId = (typeof SECTION_IDS)[number];

export const DEFAULT_HOME_LAYOUT: HomeLayoutItem[] = SECTION_IDS.map(id => ({
  id,
  visible: true,
}));

export const SECTION_LABELS: Record<HomeSectionId, string> = {
  greeting: 'Greeting',
  fun_fact: 'Fun Fact',
  reflection_banner: 'Nightly Reflection',
  team_activity: 'Team Activity',
  buddy_invites: 'Buddy Invites',
  programs: 'Programs',
  goals: 'Goals',
  daily_challenges: "Today's Challenges",
  sprints: "Today's Sprints",
  extended_challenges: 'Extended Challenges',
  habits: 'Habits',
};

export const SECTION_ICONS: Record<HomeSectionId, string> = {
  greeting: 'sunny-outline',
  fun_fact: 'bulb-outline',
  reflection_banner: 'moon-outline',
  team_activity: 'people-outline',
  buddy_invites: 'person-add-outline',
  programs: 'rocket-outline',
  goals: 'flag-outline',
  daily_challenges: 'flash-outline',
  sprints: 'timer-outline',
  extended_challenges: 'trending-up-outline',
  habits: 'repeat-outline',
};
