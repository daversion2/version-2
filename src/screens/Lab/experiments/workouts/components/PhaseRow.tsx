import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ListRow } from '../../../../../components/common/ListGroup';
import type { WorkoutsStackParamList } from '../../../../../types/workouts';
import { phaseEntry } from '../../../../../services/workoutUpNext';
import { toLocalDateString } from '../../../../../utils/date';
import { useWorkouts } from '../WorkoutsContext';
import { WORKOUTS_ACCENT } from './workoutsStyle';

/** The one row for phases: the current one, the last one's results, or setting one up. */
export const PhaseRow: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<WorkoutsStackParamList>>();
  const { phases, currentPhase } = useWorkouts();
  const entry = phaseEntry(currentPhase ?? undefined, phases[0], toLocalDateString(new Date()));
  const { target } = entry;

  return (
    <ListRow
      title={entry.title}
      subtitle={entry.subtitle}
      icon={{ name: 'stats-chart', color: WORKOUTS_ACCENT }}
      onPress={() => {
        if (target.screen === 'PhaseSetup') navigation.navigate('PhaseSetup');
        else if (target.screen === 'Phase') navigation.navigate('Phase', { phaseId: target.phaseId });
        else navigation.navigate('PhaseResults', { phaseId: target.phaseId });
      }}
    />
  );
};
