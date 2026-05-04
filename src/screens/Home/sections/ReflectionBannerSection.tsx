import React, { useMemo } from 'react';
import { NightlyReflectionBanner } from '../../../components/home/NightlyReflectionBanner';
import { HomeSectionProps } from './types';

export const ReflectionBannerSection: React.FC<HomeSectionProps> = ({ data, callbacks }) => {
  if (!data.showReflectionBanner) return null;

  // Compute today's action count for the recap
  const todaysActionCount = useMemo(() => {
    let count = 0;
    // Challenges completed today
    count += data.activeChallenges.filter(
      (c) => c.status === 'completed' && c.completed_at?.startsWith(new Date().toISOString().slice(0, 10))
    ).length;
    // Habits have weekly counts but not daily — approximate with total weekly actions
    // Programs checked in today
    if (data.programCheckedIn) count += 1;
    return count;
  }, [data.activeChallenges, data.programCheckedIn]);

  return (
    <NightlyReflectionBanner
      hasReflected={data.reflectedToday}
      todaysGrade={data.todaysGrade}
      todaysActionCount={todaysActionCount}
      goalCount={data.goals.length}
      onPress={() => callbacks.onNavigate('NightlyReflection')}
    />
  );
};
