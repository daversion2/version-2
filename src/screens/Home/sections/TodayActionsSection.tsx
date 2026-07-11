import React, { useState } from 'react';
import { HomeSectionProps } from './types';
import { AddActivityMenu } from '../../../components/home/AddActivityMenu';
import { ProgramRow, AddActivityButton } from './GoalActionsSection';

/**
 * "Today's Actions" — the active program and the add button. Practices live
 * in PracticesSection; challenges now live in their own Challenges tab, so
 * they're no longer rendered or created from Home.
 */
export const TodayActionsSection: React.FC<HomeSectionProps> = React.memo(({ data, callbacks }) => {
  const { activeProgram, todaysProgramDay, programDayNumber, programCheckedIn } = data;

  const [addMenuVisible, setAddMenuVisible] = useState(false);
  const handleAddHabit = () => {
    setAddMenuVisible(false);
    callbacks.onNavigate('ManageHabits');
  };
  const handleAddProgram = () => {
    setAddMenuVisible(false);
    callbacks.onNavigate('ProgramDiscovery');
  };

  return (
    <>
      {activeProgram && (
        <ProgramRow
          program={activeProgram}
          todaysProgramDay={todaysProgramDay}
          programDayNumber={programDayNumber}
          programCheckedIn={programCheckedIn}
          callbacks={callbacks}
        />
      )}

      <AddActivityButton onPress={() => setAddMenuVisible(true)} />

      <AddActivityMenu
        visible={addMenuVisible}
        showChallenge={false}
        onSelectHabit={handleAddHabit}
        onSelectProgram={handleAddProgram}
        onClose={() => setAddMenuVisible(false)}
      />
    </>
  );
});
