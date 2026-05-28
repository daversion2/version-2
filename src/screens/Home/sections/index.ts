import React from 'react';
import { HomeSectionProps } from './types';
import { GreetingSection } from './GreetingSection';
import { FunFactSection } from './FunFactSection';
import { ReflectionBannerSection } from './ReflectionBannerSection';
import { TeamActivitySection } from './TeamActivitySection';
import { BuddyInvitesSection } from './BuddyInvitesSection';
import { ProgramSection } from './ProgramSection';
import { DailyChallengesSection } from './DailyChallengesSection';
import { ExtendedChallengesSection } from './ExtendedChallengesSection';
import { HabitsSection } from './HabitsSection';
import { GoalsSection } from './GoalsSection';
import { WillpowerSummarySection } from './WillpowerSummarySection';
import { GoalActionsSection } from './GoalActionsSection';
import { IdentitySummarySection } from './IdentitySummarySection';
import { WhySummarySection } from './WhySummarySection';
import { MantraSection } from './MantraSection';
import { TodaysPlanSection } from './TodaysPlanSection';

export const SECTION_REGISTRY: Record<string, React.FC<HomeSectionProps>> = {
  greeting: GreetingSection,
  mantra: MantraSection,
  why_summary: WhySummarySection,
  todays_plan: TodaysPlanSection,
  goal_actions: GoalActionsSection,
  identity_summary: IdentitySummarySection,
  // Legacy sections (kept for backward compat with custom layouts)
  goals: GoalsSection,
  willpower_summary: WillpowerSummarySection,
  daily_challenges: DailyChallengesSection,
  habits: HabitsSection,
  programs: ProgramSection,
  extended_challenges: ExtendedChallengesSection,
  buddy_invites: BuddyInvitesSection,
  team_activity: TeamActivitySection,
  reflection_banner: ReflectionBannerSection,
  fun_fact: FunFactSection,
};

export { HomeSectionProps } from './types';
