import { HomeLayoutItem } from '../types';

export const SECTION_IDS = [
  // Zone 1: Welcome
  'greeting',
  'mantra',
  // Zone 2: Your Goals + Today's Actions
  'goal_actions',
  // Zone 3: Reflect
  'reflection_banner',
  'fun_fact',
  // Legacy (kept for backward compat with custom layouts)
  'buddy_invites',
  'team_activity',
] as const;

export type HomeSectionId = (typeof SECTION_IDS)[number];

const HIDDEN_SECTIONS: Set<HomeSectionId> = new Set([
  // Legacy sections hidden from default layout
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
    sectionIds: ['greeting', 'mantra'],
  },
  {
    id: 'goals_actions',
    label: "Today's Actions",
    icon: 'flag-outline',
    sectionIds: ['goal_actions'],
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
    sectionIds: ['buddy_invites', 'team_activity'],
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
  mantra: 'Redirect Mantra',
  goal_actions: 'Goals & Actions',
  reflection_banner: 'Nightly Reflection',
  fun_fact: 'Fun Fact',
  // Legacy
  buddy_invites: 'Buddy Invites',
  team_activity: 'Team Activity',
};

export const SECTION_ICONS: Record<HomeSectionId, string> = {
  greeting: 'sunny-outline',
  mantra: 'megaphone-outline',
  goal_actions: 'flag-outline',
  reflection_banner: 'moon-outline',
  fun_fact: 'bulb-outline',
  // Legacy
  buddy_invites: 'person-add-outline',
  team_activity: 'people-outline',
};
