import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import { PastSessionSheet } from '../../../../components/miniapps/PastSessionSheet';
import { WorkoutsStackParamList } from '../../../../types/workouts';
import { phaseWeek } from '../../../../services/trainingPhases';
import { checkinPending, describeWeekTotals, weekSummary } from '../../../../services/weeklyVolume';
import { toLocalDateString } from '../../../../utils/date';
import { useWorkouts } from './WorkoutsContext';
import { WORKOUTS_ACCENT, ws } from './components/workoutsStyle';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutMore'>;

/**
 * Everything in Workouts that isn't starting a workout: phases, tests, the
 * week's volume and logging one done without the app. Home keeps to starting
 * one; History and records stay on its clock icon, exercises in Settings.
 */
export const WorkoutMoreScreen: React.FC<Props> = ({ navigation }) => {
  const { phases, currentPhase, sessions, exercisesById, prefs, closeAndCheckOff } = useWorkouts();
  const [loggingPast, setLoggingPast] = useState(false);
  const today = toLocalDateString(new Date());
  const latestPhase = phases[0];
  const week = weekSummary({ sessions, exercisesById, targets: prefs.weekly_targets, now: new Date() });
  const weekToRate = checkinPending(sessions, new Date());

  const phaseRow = currentPhase
    ? {
        subtitle:
          currentPhase.status === 'baseline'
            ? `Phase ${currentPhase.number} · test day`
            : `Phase ${currentPhase.number} · week ${phaseWeek(currentPhase, today)} of ${currentPhase.weeks}`,
        onPress: () => navigation.navigate('Phase', { phaseId: currentPhase.id }),
      }
    : latestPhase?.status === 'complete'
      ? {
          subtitle: `Phase ${latestPhase.number} done · see results`,
          onPress: () => navigation.navigate('PhaseResults', { phaseId: latestPhase.id }),
        }
      : {
          subtitle: 'Test yourself, follow a program, then retest',
          onPress: () => navigation.navigate('PhaseSetup'),
        };

  return (
    <ScrollView style={ws.screen} contentContainerStyle={ws.scroll}>
      <ListGroup title="Train">
        <ListRow
          title="Phases"
          subtitle={phaseRow.subtitle}
          icon={{ name: 'stats-chart', color: WORKOUTS_ACCENT }}
          onPress={phaseRow.onPress}
        />
        <ListRow
          title="Test an exercise"
          subtitle="See if you’re getting better — no program needed"
          icon={{ name: 'speedometer', color: WORKOUTS_ACCENT }}
          onPress={() => navigation.navigate('ExerciseTest')}
        />
      </ListGroup>

      <ListGroup title="Track">
        <ListRow
          title="This week"
          subtitle={
            weekToRate
              ? 'Today’s sets are waiting to be rated'
              : week.totalSets > 0
                ? describeWeekTotals(week, prefs.unit)
                : 'Track volume per exercise — add sets any time'
          }
          icon={{ name: 'barbell', color: WORKOUTS_ACCENT }}
          onPress={() => navigation.navigate('WeeklyVolume')}
        />
        <ListRow
          title="Log a past workout"
          subtitle="Done without the app, or forgotten"
          icon={{ name: 'calendar', color: WORKOUTS_ACCENT }}
          onPress={() => setLoggingPast(true)}
        />
      </ListGroup>

      <PastSessionSheet
        visible={loggingPast}
        accent={WORKOUTS_ACCENT}
        title="Log a past workout"
        minutes={{ min: 5, max: 180, step: 5, initial: 45 }}
        onCancel={() => setLoggingPast(false)}
        onSave={({ date, minutes }) => {
          setLoggingPast(false);
          closeAndCheckOff(minutes * 60, date);
        }}
      />
    </ScrollView>
  );
};
