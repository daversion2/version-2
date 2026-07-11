import React from 'react';
import { HomeSectionProps } from './types';
import { HomeHero } from './HomeHero';
import { PracticesSection } from './PracticesSection';
import { ReflectionBannerSection } from './ReflectionBannerSection';
import { TodayActionsSection } from './TodayActionsSection';
import { MantraSection } from './MantraSection';

export const SECTION_REGISTRY: Record<string, React.FC<HomeSectionProps>> = {
  hero: HomeHero,
  mantra: MantraSection,
  practices: PracticesSection,
  goal_actions: TodayActionsSection,
  reflection_banner: ReflectionBannerSection,
};

export { HomeSectionProps } from './types';
