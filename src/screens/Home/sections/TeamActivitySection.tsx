import React from 'react';
import { TeamActivityCard } from '../../../components/community/TeamActivityCard';
import { HomeSectionProps } from './types';

export const TeamActivitySection: React.FC<HomeSectionProps> = ({ data }) => {
  if (!data.team) return null;
  return <TeamActivityCard team={data.team} summary={data.teamSummary} />;
};
