import React from 'react';
import { HomeSectionProps } from './types';
import { HomeHero } from './HomeHero';
import { PracticesSection } from './PracticesSection';
import { AlsoTodaySection } from './AlsoTodaySection';
import { MantraSection } from './MantraSection';
import { CravingCrusherSection } from './CravingCrusherSection';

export const SECTION_REGISTRY: Record<string, React.FC<HomeSectionProps>> = {
  hero: HomeHero,
  mantra: MantraSection,
  also_today: AlsoTodaySection,
  practices: PracticesSection,
  craving_crusher: CravingCrusherSection,
};

export { HomeSectionProps } from './types';
