import React, { useLayoutEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import { WorkoutsStackParamList } from '../../../../types/workouts';
import { blockTitle, repeatsInBlock } from '../../../../services/workoutSession';
import {
  formatSeconds,
  formatSetValues,
  formatTarget,
  lastSetsFor,
  lastSlotSetsFor,
} from '../../../../services/workoutMath';
import { showChoice } from '../../../../utils/alert';
import { useWorkouts } from './WorkoutsContext';
import { lastDoneLabel } from './WorkoutsHomeScreen';
import { WORKOUTS_ACCENT, WORKOUTS_TINT, ws } from './components/workoutsStyle';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutPreview'>;

export const WorkoutPreviewScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { workouts, exercise, exercisesById, prefs, sessions, session, beginSession, discardSession } = useWorkouts();
  const workout = workouts.find((w) => w.id === route.params.workoutId);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: workout?.name ?? '',
      headerRight: () =>
        workout ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('WorkoutBuilder', { workoutId: workout.id })}
            style={ws.headerIconBtn}
          >
            <Text style={styles.edit}>Edit</Text>
          </TouchableOpacity>
        ) : null,
    });
  }, [navigation, workout]);

  if (!workout) {
    return (
      <View style={[ws.screen, styles.center]}>
        <Text style={ws.muted}>This workout no longer exists.</Text>
      </View>
    );
  }

  const start = () => {
    const go = () => {
      beginSession(workout);
      navigation.navigate('WorkoutSession');
    };
    if (!session) return go();
    showChoice(`${session.workoutName} is still in progress`, 'Resume it, or discard it and start this one?', [
      { label: 'Resume it', onPress: () => navigation.navigate(session.phase === 'summary' ? 'WorkoutSummary' : 'WorkoutSession') },
      {
        label: 'Discard and start',
        onPress: async () => {
          await discardSession();
          go();
        },
      },
    ]);
  };

  return (
    <View style={ws.screen}>
      <ScrollView contentContainerStyle={[ws.scroll, { paddingBottom: 120 + insets.bottom }]}>
        <Text style={ws.muted}>{lastDoneLabel(workout.last_done_at)}</Text>
        {workout.blocks.length === 0 && (
          <Text style={ws.muted}>Nothing in this workout yet. Tap Edit to add exercises.</Text>
        )}
        {workout.blocks.map((block, i) => {
          const isCircuit = block.items.length > 1;
          return (
            <View key={block.id} style={ws.card}>
              <View style={styles.blockHead}>
                <Text style={styles.index}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={ws.title}>{blockTitle(block, exercisesById)}</Text>
                  <Text style={ws.muted}>
                    {isCircuit
                      ? `Circuit · ${block.rounds} rounds`
                      : `${block.rounds} ${block.rounds === 1 ? 'set' : 'sets'}`}
                    {block.restSec > 0 ? ` · rest ${formatSeconds(block.restSec)}` : ' · no rest'}
                  </Text>
                </View>
              </View>
              <View style={styles.items}>
                {block.items.map((item, j) => {
                  const ex = exercise(item.exerciseId);
                  // In twice? Each slot shows its own last time, not the first one's.
                  const last = repeatsInBlock(block, j)
                    ? lastSlotSetsFor(sessions, { blockId: block.id, itemIndex: j, exerciseId: item.exerciseId })
                    : lastSetsFor(sessions, item.exerciseId);
                  return (
                    <View key={`${item.exerciseId}_${j}`} style={styles.itemRow}>
                      <Text style={[ws.body, { flex: 1 }]}>
                        {isCircuit ? `${ex.name} · ` : ''}
                        {formatTarget(item.target, ex.kind, prefs.unit)}
                      </Text>
                      {last.length > 0 && (
                        <Text style={ws.muted}>Last: {formatSetValues(last[0], ex.kind, prefs.unit)}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
        <TouchableOpacity
          style={[ws.primaryBtn, workout.blocks.length === 0 && ws.disabled]}
          onPress={start}
          disabled={workout.blocks.length === 0}
        >
          <Text style={ws.primaryBtnText}>Start workout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  edit: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: WORKOUTS_ACCENT },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  index: {
    width: 26,
    height: 26,
    borderRadius: 13,
    textAlign: 'center',
    lineHeight: 26,
    overflow: 'hidden',
    backgroundColor: WORKOUTS_TINT,
    color: WORKOUTS_ACCENT,
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
  },
  items: { marginTop: Spacing.sm, gap: 6, paddingLeft: 34 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.lightGray,
  },
});
