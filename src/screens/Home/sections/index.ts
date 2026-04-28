import React from 'react';
import { HomeSectionProps } from './types';
import { GreetingSection } from './GreetingSection';
import { FunFactSection } from './FunFactSection';
import { ReflectionBannerSection } from './ReflectionBannerSection';
import { TeamActivitySection } from './TeamActivitySection';
import { BuddyInvitesSection } from './BuddyInvitesSection';
import { ProgramSection } from './ProgramSection';
import { DailyChallengesSection } from './DailyChallengesSection';
import { SprintsSection } from './SprintsSection';
import { ExtendedChallengesSection } from './ExtendedChallengesSection';
import { HabitsSection } from './HabitsSection';
import { GoalsSection } from './GoalsSection';

export const SECTION_REGISTRY: Record<string, React.FC<HomeSectionProps>> = {
  greeting: GreetingSection,
  fun_fact: FunFactSection,
  reflection_banner: ReflectionBannerSection,
  team_activity: TeamActivitySection,
  buddy_invites: BuddyInvitesSection,
  programs: ProgramSection,
  goals: GoalsSection,
  daily_challenges: DailyChallengesSection,
  sprints: SprintsSection,
  extended_challenges: ExtendedChallengesSection,
  habits: HabitsSection,
};

export { HomeSectionProps } from './types';
