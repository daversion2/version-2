import React, { useMemo } from 'react';
import { NightlyReflectionBanner } from '../../../components/home/NightlyReflectionBanner';
import { HomeSectionProps } from './types';

export const ReflectionBannerSection: React.FC<HomeSectionProps> = React.memo(({ data, callbacks }) => {
  if (!data.showReflectionBanner) return null;

  // Compute today's action count for the recap
  const todaysActionCount = useMemo(() => {
    // Challenges completed today (program check-ins now live on the Challenges tab)
    return data.activeChallenges.filter(
      (c) => c.status === 'completed' && c.completed_at?.startsWith(new Date().toISOString().slice(0, 10))
    ).length;
  }, [data.activeChallenges]);

  return (
    <NightlyReflectionBanner
      hasReflected={data.reflectedToday}
      todaysGrade={data.todaysGrade}
      todaysActionCount={todaysActionCount}
      onPress={() => callbacks.onNavigate('NightlyReflection')}
    />
  );
});
