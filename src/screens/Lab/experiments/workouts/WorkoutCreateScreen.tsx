import React from 'react';
import { ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import { WorkoutsStackParamList } from '../../../../types/workouts';
import { useAuth } from '../../../../context/AuthContext';
import { useCopy } from '../../../../context/CopyContext';
import { canSeeWorkoutLibrary } from '../../../../services/workoutLibrary';
import { PhaseRow } from './components/PhaseRow';
import { WORKOUTS_ACCENT, ws } from './components/workoutsStyle';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutCreate'>;

/** Home's Create: one workout, or a phase of them — or one from the library. */
export const WorkoutCreateScreen: React.FC<Props> = ({ navigation }) => {
  const { userProfile } = useAuth();
  const t = useCopy();
  return (
    <ScrollView style={ws.screen} contentContainerStyle={ws.scroll}>
      <ListGroup>
        {canSeeWorkoutLibrary(userProfile) ? (
          <ListRow
            title={t('workouts.create.library', 'Workout library')}
            subtitle={t('workouts.create.librarySub', 'Premade workouts that fit your equipment')}
            icon={{ name: 'library', color: WORKOUTS_ACCENT }}
            onPress={() => navigation.navigate('WorkoutLibrary')}
          />
        ) : null}
        <ListRow
          title={t('workouts.create.build', 'Build a workout')}
          subtitle={t('workouts.create.buildSub', 'Build and save a routine')}
          icon={{ name: 'list', color: WORKOUTS_ACCENT }}
          // Replaced, so finishing or backing out lands on home rather than here.
          onPress={() => navigation.replace('WorkoutBuilder', {})}
        />
        <PhaseRow />
      </ListGroup>
    </ScrollView>
  );
};
