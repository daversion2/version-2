import { HomeLayoutItem } from '../types';

export const SECTION_IDS = [
  // Zone 1: Welcome & Status
  'greeting',
  'goals',
  'willpower_summary',
  // Zone 2: Today's Focus
  'daily_challenges',
  'sprints',
  'habits',
  // Zone 3: Ongoing Progress
  'programs',
  'extended_challenges',
  // Zone 4: Social & Extras
  'buddy_invites',
  'team_activity',
  'reflection_banner',
  'fun_fact',
] as const;

export type HomeSectionId = (typeof SECTION_IDS)[number];

export const DEFAULT_HOME_LAYOUT: HomeLayoutItem[] = SECTION_IDS.map(id => ({
  id,
  visible: true,
}));

export interface ZoneDefinition {
  id: string;
  label: string;
  icon: string;
  sectionIds: HomeSectionId[];
}

export const ZONE_CONFIG: ZoneDefinition[] = [
  {
    id: 'welcome_status',
    label: 'Welcome & Status',
    icon: 'sunny-outline',
    sectionIds: ['greeting', 'goals', 'willpower_summary'],
  },
  {
    id: 'todays_focus',
    label: "Today's Focus",
    icon: 'flame-outline',
    sectionIds: ['daily_challenges', 'sprints', 'habits'],
  },
  {
    id: 'ongoing_progress',
    label: 'Ongoing Progress',
    icon: 'trending-up-outline',
    sectionIds: ['programs', 'extended_challenges'],
  },
  {
    id: 'social_extras',
    label: 'Social & Extras',
    icon: 'people-outline',
    sectionIds: ['buddy_invites', 'team_activity', 'reflection_banner', 'fun_fact'],
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
  goals: 'Goals',
  willpower_summary: 'Willpower Summary',
  daily_challenges: "Today's Challenges",
  sprints: "Today's Sprints",
  habits: 'Habits',
  programs: 'Programs',
  extended_challenges: 'Extended Challenges',
  buddy_invites: 'Buddy Invites',
  team_activity: 'Team Activity',
  reflection_banner: 'Nightly Reflection',
  fun_fact: 'Fun Fact',
};

export const SECTION_ICONS: Record<HomeSectionId, string> = {
  greeting: 'sunny-outline',
  goals: 'flag-outline',
  willpower_summary: 'shield-outline',
  daily_challenges: 'flash-outline',
  sprints: 'timer-outline',
  habits: 'repeat-outline',
  programs: 'rocket-outline',
  extended_challenges: 'trending-up-outline',
  buddy_invites: 'person-add-outline',
  team_activity: 'people-outline',
  reflection_banner: 'moon-outline',
  fun_fact: 'bulb-outline',
};
