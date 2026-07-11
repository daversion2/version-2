import { HomeLayoutItem } from '../types';

export const SECTION_IDS = [
  // Zone 1: Welcome
  'hero',
  'mantra',
  // Zone 2: Your Practices
  'practices',
  // Zone 3: Today's Actions (challenges, program, plan)
  'goal_actions',
  // Zone 4: Reflect
  'reflection_banner',
  // Legacy (kept for backward compat with custom layouts)
  'greeting',
] as const;

export type HomeSectionId = (typeof SECTION_IDS)[number];

const HIDDEN_SECTIONS: Set<HomeSectionId> = new Set([
  // Legacy sections hidden from default layout
  'greeting', // replaced by the hero
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
    // No ZoneHeader is rendered for the welcome zone — the hero and the
    // PracticesSection's own "Your practices" header stand in for it.
    label: 'Welcome',
    icon: 'sunny-outline',
    sectionIds: ['hero', 'mantra', 'practices'],
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
    sectionIds: ['reflection_banner'],
  },
  // Legacy zone for backward compat with custom layouts
  {
    id: 'legacy',
    label: 'More',
    icon: 'grid-outline',
    sectionIds: ['greeting'],
  },
];

export const SECTION_TO_ZONE: Record<HomeSectionId, string> = {} as Record<HomeSectionId, string>;
for (const zone of ZONE_CONFIG) {
  for (const sectionId of zone.sectionIds) {
    (SECTION_TO_ZONE as Record<string, string>)[sectionId] = zone.id;
  }
}

export const SECTION_LABELS: Record<HomeSectionId, string> = {
  hero: 'Welcome',
  mantra: 'Redirect Mantra',
  practices: 'Your Practices',
  goal_actions: 'Challenges & Programs',
  reflection_banner: 'Nightly Reflection',
  // Legacy
  greeting: 'Greeting',
};

export const SECTION_ICONS: Record<HomeSectionId, string> = {
  hero: 'sunny-outline',
  mantra: 'megaphone-outline',
  practices: 'flame-outline',
  goal_actions: 'flag-outline',
  reflection_banner: 'moon-outline',
  // Legacy
  greeting: 'sunny-outline',
};
