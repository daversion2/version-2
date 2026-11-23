import React from 'react';
import { ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import { WorkoutsStackParamList } from '../../../../types/workouts';
import { PhaseRow } from './components/PhaseRow';
import { WORKOUTS_ACCENT, ws } from './components/workoutsStyle';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutCreate'>;

/** Home's Create: one workout, or a phase of them. */
export const WorkoutCreateScreen: React.FC<Props> = ({ navigation }) => (
  <ScrollView style={ws.screen} contentContainerStyle={ws.scroll}>
    <ListGroup>
      <ListRow
        title="Build a workout"
        subtitle="Build and save a routine"
        icon={{ name: 'list', color: WORKOUTS_ACCENT }}
        // Replaced, so finishing or backing out lands on home rather than here.
        onPress={() => navigation.replace('WorkoutBuilder', {})}
      />
      <PhaseRow />
    </ListGroup>
  </ScrollView>
);
