import React, { useLayoutEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import { WorkoutsStackParamList } from '../../../../types/workouts';
import { blockTitle, repeatsInBlock } from '../../../../services/workoutSession';
import {
  formatClock,
  formatSeconds,
  formatSetValues,
  formatTarget,
  lastSetsFor,
  lastSlotSetsFor,
} from '../../../../services/workoutMath';
import { showChoice } from '../../../../utils/alert';
import { Copy } from '../../../../components/common/Copy';
import { useCopy } from '../../../../context/CopyContext';
import { useWorkouts } from './WorkoutsContext';
import { lastDoneLabel } from './WorkoutsHomeScreen';
import { WORKOUTS_ACCENT, WORKOUTS_TINT, ws } from './components/workoutsStyle';
import { useOverrideStart } from '../../../../components/checkin/OverrideStartSheet';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutPreview'>;

export const WorkoutPreviewScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const t = useCopy();
  const { loading, workouts, exercise, exercisesById, prefs, sessions, session, beginSession, discardSession } = useWorkouts();
  const workout = workouts.find((w) => w.id === route.params.workoutId);
  // Start asks the override; its answer is what starts the workout.
  const overrideStart = useOverrideStart('Workouts', WORKOUTS_ACCENT);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: workout?.name ?? '',
      headerRight: () =>
        workout ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('WorkoutBuilder', { workoutId: workout.id })}
            style={ws.headerIconBtn}
          >
            <Copy id="workouts.preview.edit" style={styles.edit}>
              Edit
            </Copy>
          </TouchableOpacity>
        ) : null,
    });
  }, [navigation, workout]);

  if (!workout) {
    // Opened straight from the Workouts page's Start, before the list has loaded.
    if (loading) {
      return (
        <View style={[ws.screen, styles.center]}>
          <ActivityIndicator color={WORKOUTS_ACCENT} />
        </View>
      );
    }
    return (
      <View style={[ws.screen, styles.center]}>
        <Copy id="workouts.preview.gone" style={ws.muted}>
          This workout no longer exists.
        </Copy>
      </View>
    );
  }

  const empty = workout.blocks.length === 0;

  const start = () => {
    const go = () =>
      overrideStart.ask((override) => {
        beginSession(workout, override);
        navigation.navigate('WorkoutSession');
      });
    if (!session) return go();
    showChoice(
      t('workouts.preview.inProgressTitle', '{name} is still in progress', { name: session.workoutName }),
      t('workouts.preview.inProgressMsg', 'Resume it, or discard it and start this one?'),
      [
        {
          label: t('workouts.preview.resume', 'Resume it'),
          onPress: () => navigation.navigate(session.phase === 'summary' ? 'WorkoutSummary' : 'WorkoutSession'),
        },
        {
          label: t('workouts.preview.discardStart', 'Discard and start'),
          onPress: async () => {
            await discardSession();
            go();
          },
        },
      ]
    );
  };

  return (
    <View style={ws.screen}>
      <ScrollView contentContainerStyle={[ws.scroll, { paddingBottom: 120 + insets.bottom }]}>
        <Text style={ws.muted}>{lastDoneLabel(workout.last_done_at)}</Text>
        {workout.blocks.length === 0 && (
          <Copy id="workouts.preview.empty" style={ws.muted}>
            Nothing in this workout yet. Tap Edit to add exercises.
          </Copy>
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
                      ? t('workouts.preview.circuitRounds', 'Circuit · {n} rounds', { n: block.rounds })
                      : block.rounds === 1
                        ? t('workouts.preview.oneSet', '{n} set', { n: block.rounds })
                        : t('workouts.preview.nSets', '{n} sets', { n: block.rounds })}
                    {block.intervalSec
                      ? t('workouts.preview.every', ' · every {time}', { time: formatClock(block.intervalSec) })
                      : block.restSec > 0
                        ? t('workouts.preview.rest', ' · rest {time}', { time: formatSeconds(block.restSec) })
                        : t('workouts.preview.noRest', ' · no rest')}
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
                        <Copy
                          id="workouts.preview.last"
                          style={ws.muted}
                          vars={{ values: formatSetValues(last[0], ex.kind, prefs.unit) }}
                        >
                          {'Last: {values}'}
                        </Copy>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
      {/* Do it runs the workout live; Done it logs one already done, as prescribed. */}
      <View style={[styles.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
        <TouchableOpacity
          style={[ws.primaryBtn, styles.footerBtn, styles.doIt, empty && ws.disabled]}
          onPress={start}
          disabled={empty}
          accessibilityHint="Start this workout now"
        >
          <Copy id="workouts.preview.doIt" style={ws.primaryBtnText}>
            Do it
          </Copy>
        </TouchableOpacity>
        <TouchableOpacity
          style={[ws.secondaryBtn, styles.footerBtn, styles.doneIt, empty && ws.disabled]}
          onPress={() => navigation.navigate('WorkoutDoneIt', { workoutId: workout.id })}
          disabled={empty}
          accessibilityHint="Log this workout as already done"
        >
          <Copy id="workouts.preview.doneIt" style={ws.secondaryBtnText}>
            Done it
          </Copy>
        </TouchableOpacity>
      </View>
      {overrideStart.sheet}
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
    flexDirection: 'row',
    gap: Spacing.sm,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.lightGray,
  },
  footerBtn: { flex: 1 },
  doIt: { flex: 2, paddingHorizontal: Spacing.sm },
  doneIt: { paddingHorizontal: Spacing.sm },
});
