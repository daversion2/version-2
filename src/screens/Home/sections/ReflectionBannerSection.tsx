import React from 'react';
import { NightlyReflectionBanner } from '../../../components/home/NightlyReflectionBanner';
import { HomeSectionProps } from './types';

export const ReflectionBannerSection: React.FC<HomeSectionProps> = ({ data, callbacks }) => {
  if (!data.showReflectionBanner) return null;
  return (
    <NightlyReflectionBanner
      hasReflected={data.reflectedToday}
      todaysGrade={data.todaysGrade}
      onPress={() => callbacks.onNavigate('NightlyReflection')}
    />
  );
};
