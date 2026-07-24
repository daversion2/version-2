import { HomeLayoutItem } from '../types';

export const SECTION_IDS = [
  // Zone 1: Welcome
  'hero',
  'mantra',
  // "Also today" — active challenge check-in + evening reflection, pinned
  // above the practices so time-sensitive items aren't buried below the fold.
  'also_today',
  // Zone 2: Your Practices
  'practices',
  // craving_crusher removed from here — it lives in its own Home tab now
  // reflection_banner retired — the evening reflect prompt now lives inside
  // the "also_today" section (gated to 5pm+).
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
    id: 'welcome',
    // No ZoneHeader is rendered for the welcome zone — the hero and the
    // PracticesSection's own "Your practices" header stand in for it.
    label: 'Welcome',
    icon: 'sunny-outline',
    sectionIds: ['hero', 'mantra', 'also_today', 'practices'],
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
  also_today: 'Also Today',
  practices: 'Your Practices',
};

export const SECTION_ICONS: Record<HomeSectionId, string> = {
  hero: 'sunny-outline',
  mantra: 'megaphone-outline',
  also_today: 'today-outline',
  practices: 'flame-outline',
};
