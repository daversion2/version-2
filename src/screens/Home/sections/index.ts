import React from 'react';
import { HomeSectionProps } from './types';
import { GreetingSection } from './GreetingSection';
import { ReflectionBannerSection } from './ReflectionBannerSection';
import { TeamActivitySection } from './TeamActivitySection';
import { BuddyInvitesSection } from './BuddyInvitesSection';
import { GoalActionsSection } from './GoalActionsSection';
import { MantraSection } from './MantraSection';

export const SECTION_REGISTRY: Record<string, React.FC<HomeSectionProps>> = {
  greeting: GreetingSection,
  mantra: MantraSection,
  goal_actions: GoalActionsSection,
  // Legacy sections (kept for backward compat with custom layouts)
  buddy_invites: BuddyInvitesSection,
  team_activity: TeamActivitySection,
  reflection_banner: ReflectionBannerSection,
};

export { HomeSectionProps } from './types';
