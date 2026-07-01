import React from 'react';
import { HomeSectionProps } from './types';
import { HomeHero } from './HomeHero';
import { GreetingSection } from './GreetingSection';
import { PracticesSection } from './PracticesSection';
import { ReflectionBannerSection } from './ReflectionBannerSection';
import { TeamActivitySection } from './TeamActivitySection';
import { BuddyInvitesSection } from './BuddyInvitesSection';
import { TodayActionsSection } from './TodayActionsSection';
import { MantraSection } from './MantraSection';

export const SECTION_REGISTRY: Record<string, React.FC<HomeSectionProps>> = {
  hero: HomeHero,
  mantra: MantraSection,
  practices: PracticesSection,
  goal_actions: TodayActionsSection,
  // Legacy sections (kept for backward compat with custom layouts)
  greeting: GreetingSection,
  buddy_invites: BuddyInvitesSection,
  team_activity: TeamActivitySection,
  reflection_banner: ReflectionBannerSection,
};

export { HomeSectionProps } from './types';
