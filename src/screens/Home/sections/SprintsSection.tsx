import React from 'react';
import { MicroGoalSection } from '../../../components/home/MicroGoalSection';
import { HomeSectionProps } from './types';

export const SprintsSection: React.FC<HomeSectionProps> = ({ data, callbacks }) => {
  return (
    <MicroGoalSection
      microGoals={data.microGoals}
      onComplete={callbacks.onMicroGoalComplete}
      onDelete={callbacks.onMicroGoalDelete}
      onAdd={callbacks.onMicroGoalAdd}
      onPressMore={callbacks.onMicroGoalPressMore}
    />
  );
};
