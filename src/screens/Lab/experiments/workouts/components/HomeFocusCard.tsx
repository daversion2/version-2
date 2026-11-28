import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, TextStyles } from '../../../../../constants/theme';
import { estimateWorkoutMinutes } from '../../../../../services/workoutSession';
import type { HomeFocus } from '../../../../../services/workoutUpNext';
import { Copy } from '../../../../../components/common/Copy';
import { useCopy } from '../../../../../context/CopyContext';
import { useWorkouts } from '../WorkoutsContext';
import { ws } from './workoutsStyle';

/**
 * The top of Workouts' home: the one thing to do now (services/workoutUpNext.ts,
 * workoutHomeFocus). A workout gets Do it and Done it right here; a due phase
 * test or an empty account gets its one button. A workout left open has its
 * own Resume card on the home instead.
 */
export const HomeFocusCard: React.FC<{
  focus: Exclude<HomeFocus, { kind: 'resume' }>;
  onOpen: () => void;
  onDo: () => void;
  onDone: () => void;
  onTest: () => void;
  onCreate: () => void;
  /** Shown while in a phase: its details are one tap from here. */
  onPhase?: () => void;
}> = ({ focus, onOpen, onDo, onDone, onTest, onCreate, onPhase }) => {
  const { exercisesById } = useWorkouts();
  const t = useCopy();

  const phaseLink = onPhase ? (
    <TouchableOpacity onPress={onPhase} style={ws.textBtn} accessibilityRole="button">
      <Copy id="workouts.focus.phaseDetails" style={ws.link}>
        Phase details
      </Copy>
    </TouchableOpacity>
  ) : null;

  if (focus.kind === 'create') {
    return (
      <View style={[ws.card, styles.card]}>
        <Copy id="workouts.focus.buildFirst" style={styles.title}>
          Build your first workout
        </Copy>
        <Copy id="workouts.focus.buildFirstSub" style={ws.muted}>
          Pick your exercises once, then start it in a tap.
        </Copy>
        <TouchableOpacity style={[ws.primaryBtn, styles.action]} onPress={onCreate} accessibilityRole="button">
          <Copy id="workouts.focus.build" style={ws.primaryBtnText}>
            Build a workout
          </Copy>
        </TouchableOpacity>
      </View>
    );
  }

  if (focus.kind === 'test') {
    return (
      <View style={[ws.card, styles.card]}>
        <Text style={ws.eyebrow}>{focus.meta}</Text>
        <Text style={styles.title}>
          {focus.mode === 'baseline' ? t('workouts.focus.testDay', 'Test day') : t('workouts.focus.retest', 'Time to retest')}
        </Text>
        <TouchableOpacity style={[ws.primaryBtn, styles.action]} onPress={onTest} accessibilityRole="button">
          <Text style={ws.primaryBtnText}>{focus.label}</Text>
        </TouchableOpacity>
        {phaseLink}
      </View>
    );
  }

  const count = focus.workout.blocks.reduce((n, b) => n + b.items.length, 0);
  return (
    <View style={[ws.card, styles.card]}>
      <TouchableOpacity onPress={onOpen} accessibilityRole="button" accessibilityHint="Shows this workout's exercises">
        <View style={styles.head}>
          <Text style={ws.eyebrow}>{focus.why}</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
        </View>
        <Text style={styles.title}>{focus.workout.name}</Text>
        <Copy
          id={count === 1 ? 'workouts.focus.metaOne' : 'workouts.focus.metaMany'}
          style={ws.muted}
          vars={{ n: count, minutes: estimateWorkoutMinutes(focus.workout, exercisesById) }}
        >
          {count === 1 ? '{n} exercise · about {minutes} min' : '{n} exercises · about {minutes} min'}
        </Copy>
      </TouchableOpacity>
      <View style={[styles.buttons, styles.action]}>
        <TouchableOpacity style={[ws.primaryBtn, styles.doIt]} onPress={onDo} accessibilityRole="button" accessibilityHint="Start this workout now">
          <Copy id="workouts.focus.doIt" style={ws.primaryBtnText}>
            Do it
          </Copy>
        </TouchableOpacity>
        <TouchableOpacity style={styles.doneIt} onPress={onDone} accessibilityRole="button" accessibilityHint="Log this workout as already done">
          <Copy id="workouts.focus.doneIt" style={ws.secondaryBtnText}>
            Done it
          </Copy>
        </TouchableOpacity>
      </View>
      {phaseLink}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { gap: 4, paddingVertical: 18, paddingHorizontal: 20 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...TextStyles.title2, color: Colors.dark },
  action: { marginTop: Spacing.sm + 4 },
  buttons: { flexDirection: 'row', gap: Spacing.sm },
  doIt: { flex: 2, paddingHorizontal: Spacing.sm },
  doneIt: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.fill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
