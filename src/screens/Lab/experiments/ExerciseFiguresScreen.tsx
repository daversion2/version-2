import React from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { BorderRadius, Colors, Fonts, Spacing } from '../../../constants/theme';
import { EXERCISE_FIGURES } from '../../../data/exerciseFigures';
import { EXERCISE_DEMOS } from '../../../data/exerciseDemos';
import { BUILT_IN_EXERCISES } from '../../../data/workoutExercises';
import { ExerciseFigure } from './workouts/components/ExerciseFigure';
import { WORKOUTS_ACCENT, ws } from './workouts/components/workoutsStyle';

/**
 * Lab prototype (2026-11-01): exercise demos as a drawn, animated figure
 * instead of generated photos. Push-up only, to judge the look before posing
 * the rest. Poses: data/exerciseFigures.ts.
 */
export const ExerciseFiguresScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const id = 'push-up';
  const demo = EXERCISE_FIGURES[id];
  const name = BUILT_IN_EXERCISES.find((e) => e.id === id)?.name ?? id;
  const cues = EXERCISE_DEMOS[id]?.cues ?? [];
  const inner = width - Spacing.lg * 2 - Spacing.md * 2;
  const half = (inner - Spacing.sm) / 2;

  return (
    <ScrollView style={ws.screen} contentContainerStyle={ws.scroll}>
      <Text style={ws.title}>{name}</Text>

      <Text style={ws.sectionLabel}>Moving</Text>
      <View style={ws.card}>
        <ExerciseFigure demo={demo} width={inner} />
      </View>

      <Text style={ws.sectionLabel}>Start and end</Text>
      <View style={[ws.card, styles.gapped]}>
        <View style={styles.row}>
          {(['start', 'end'] as const).map((frame) => (
            <View key={frame} style={styles.cell}>
              <ExerciseFigure demo={demo} width={half - Spacing.sm * 2} show={frame} background={Colors.surfaceSubtle} />
              <View style={styles.tag}>
                <Text style={styles.tagText}>{frame === 'start' ? 'Start' : 'End'}</Text>
              </View>
            </View>
          ))}
        </View>
        {cues.map((c) => (
          <View key={c} style={styles.cueRow}>
            <View style={styles.dot} />
            <Text style={ws.body}>{c}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  gapped: { gap: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xs },
  cell: {
    flex: 1,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    paddingTop: Spacing.xl,
  },
  tag: {
    position: 'absolute',
    left: Spacing.sm,
    top: Spacing.sm,
    backgroundColor: Colors.overlay,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  tagText: { fontFamily: Fonts.secondaryBold, fontSize: 11, letterSpacing: 0.4, color: Colors.white },
  cueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: WORKOUTS_ACCENT },
});
