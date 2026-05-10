import React from 'react';
import { TodaysPlanCard } from '../../../components/home/TodaysPlanCard';
import { HomeSectionProps } from './types';

export const TodaysPlanSection: React.FC<HomeSectionProps> = ({ data, callbacks }) => {
  return <TodaysPlanCard data={data} callbacks={callbacks} />;
};
