import React, { useLayoutEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import { WorkoutsStackParamList } from '../../../../types/workouts';
import { describeBlock, durationSec, totalSetsLogged } from '../../../../services/workoutSession';
import { formatSeconds } from '../../../../services/workoutMath';
import { formatRelativeDay, toLocalDateString } from '../../../../utils/date';
import { showChoice, showConfirm } from '../../../../utils/alert';
import { useWorkouts } from './WorkoutsContext';
import { WORKOUTS_ACCENT, WORKOUTS_TINT, ws } from './components/workoutsStyle';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutsHome'>;

/** "Last done today", "Last done Sat", "Last done Mon, May 5". */
export const lastDoneLabel = (iso?: string): string => {
  if (!iso) return 'Not done yet';
  const day = formatRelativeDay(toLocalDateString(new Date(iso)));
  return `Last done ${day === 'Today' || day === 'Yesterday' ? day.toLowerCase() : day}`;
};

export const WorkoutsHomeScreen: React.FC<Props> = ({ navigation }) => {
  const {
    loading,
    loadError,
    reload,
    workouts,
    exercisesById,
    prefs,
    session,
    beginSession,
    discardSession,
    closeApp,
    habits,
    launchHabitId,
    updatePrefs,
  } = useWorkouts();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={closeApp} style={ws.headerIconBtn} accessibilityLabel="Close Workouts">
          <Ionicons name="close" size={24} color={Colors.dark} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => navigation.navigate('WorkoutHistory')}
            style={ws.headerIconBtn}
            accessibilityLabel="History, stats and records"
          >
            <Ionicons name="time-outline" size={22} color={Colors.dark} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('WorkoutSettings')}
            style={ws.headerIconBtn}
            accessibilityLabel="Workouts settings"
          >
            <Ionicons name="settings-outline" size={22} color={Colors.dark} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, closeApp]);

  const resume = () => navigation.navigate(session?.phase === 'summary' ? 'WorkoutSummary' : 'WorkoutSession');

  /** Starting anything while a session is saved asks first — never silently throws it away. */
  const guardStart = (start: () => void) => {
    if (!session) return start();
    showChoice(`${session.workoutName} is still in progress`, 'Pick up where you left off, or throw it away and start this one?', [
      { label: 'Resume it', onPress: resume },
      {
        label: 'Discard and start',
        onPress: async () => {
          await discardSession();
          start();
        },
      },
    ]);
  };

  const startEmpty = () =>
    guardStart(() => {
      beginSession();
      navigation.navigate('WorkoutSession');
    });

  const launchHabit = habits.find((h) => h.id === launchHabitId);

  return (
    <ScrollView
      style={ws.screen}
      contentContainerStyle={ws.scroll}
      refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={WORKOUTS_ACCENT} />}
    >
      {!prefs.intro_seen && !loading && (
        <View style={[ws.card, styles.intro]}>
          <Text style={ws.title}>How Workouts works</Text>
          <Text style={ws.body}>• Pick a workout — or build one from exercises and circuits.</Text>
          <Text style={ws.body}>• Log each set as you go; the rest timer starts on its own.</Text>
          <Text style={ws.body}>
            • Finish, and it hands back to Today: “How hard was it to start?”, then the habit’s checked off.
          </Text>
          <TouchableOpacity onPress={() => updatePrefs({ intro_seen: true }).catch(() => {})} style={styles.introBtn}>
            <Text style={styles.introBtnText}>Got it</Text>
          </TouchableOpacity>
        </View>
      )}

      {!!launchHabit && (
        <Text style={ws.muted}>Finishing a workout checks off “{launchHabit.name}”.</Text>
      )}

      {session && (
        <TouchableOpacity style={styles.resume} onPress={resume} accessibilityRole="button">
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.resumeEyebrow}>In progress</Text>
            <Text style={styles.resumeTitle}>{session.workoutName}</Text>
            <Text style={styles.resumeMeta}>
              {totalSetsLogged(session)} sets logged · started {formatSeconds(durationSec(session, new Date()))} ago
            </Text>
          </View>
          <View style={styles.resumeActions}>
            <Text style={styles.resumeCta}>Resume</Text>
            <TouchableOpacity
              hitSlop={8}
              onPress={() =>
                showConfirm('Discard this workout?', 'Nothing from it will be saved.', discardSession, 'Discard')
              }
            >
              <Text style={styles.resumeDiscard}>Discard</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.quickRow}>
        <TouchableOpacity style={[ws.card, styles.quick]} onPress={startEmpty} accessibilityRole="button">
          <Ionicons name="flash-outline" size={20} color={WORKOUTS_ACCENT} />
          <Text style={ws.title}>Empty workout</Text>
          <Text style={ws.muted}>Add exercises as you go</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[ws.card, styles.quick]}
          onPress={() => navigation.navigate('WorkoutBuilder', {})}
          accessibilityRole="button"
        >
          <Ionicons name="add-circle-outline" size={20} color={WORKOUTS_ACCENT} />
          <Text style={ws.title}>New workout</Text>
          <Text style={ws.muted}>Build and save a routine</Text>
        </TouchableOpacity>
      </View>

      <Text style={ws.sectionLabel}>Your workouts</Text>

      {loading && workouts.length === 0 && <ActivityIndicator color={WORKOUTS_ACCENT} style={{ marginTop: Spacing.lg }} />}

      {!!loadError && (
        <TouchableOpacity style={ws.card} onPress={reload}>
          <Text style={ws.title}>Couldn't load your workouts</Text>
          <Text style={ws.muted}>Check your connection, then tap to try again. A workout in progress is safe on this phone.</Text>
        </TouchableOpacity>
      )}

      {!loading && !loadError && workouts.length === 0 && (
        <Text style={ws.muted}>No saved workouts. Build one, or start an empty workout.</Text>
      )}

      {workouts.map((w) => (
        <TouchableOpacity
          key={w.id}
          style={ws.card}
          onPress={() => navigation.navigate('WorkoutPreview', { workoutId: w.id })}
          accessibilityRole="button"
        >
          <View style={styles.workoutHead}>
            <Text style={[ws.title, { flex: 1, fontSize: FontSizes.lg }]}>{w.name}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
          </View>
          <Text style={ws.muted}>
            {w.blocks.length} {w.blocks.length === 1 ? 'block' : 'blocks'} · {lastDoneLabel(w.last_done_at)}
          </Text>
          <View style={styles.blockList}>
            {w.blocks.slice(0, 4).map((b) => (
              <Text key={b.id} style={styles.blockLine} numberOfLines={1}>
                {b.items.length > 1 ? '↻ ' : '• '}
                {b.items.length > 1 ? `${b.name || 'Circuit'}: ` : ''}
                {describeBlock(b, exercisesById, prefs.unit)}
              </Text>
            ))}
            {w.blocks.length > 4 && <Text style={styles.blockLine}>+ {w.blocks.length - 4} more</Text>}
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  intro: { gap: 6, borderColor: WORKOUTS_ACCENT + '55' },
  introBtn: { alignSelf: 'flex-end', paddingVertical: 4, paddingHorizontal: Spacing.sm },
  introBtnText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: WORKOUTS_ACCENT },
  resume: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: 14,
    backgroundColor: WORKOUTS_ACCENT,
  },
  resumeEyebrow: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.white,
    opacity: 0.8,
  },
  resumeTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.white },
  resumeMeta: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.white, opacity: 0.85 },
  resumeActions: { alignItems: 'flex-end', gap: Spacing.sm },
  resumeCta: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.white },
  resumeDiscard: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.white, opacity: 0.8 },
  quickRow: { flexDirection: 'row', gap: Spacing.sm },
  quick: { flex: 1, gap: 4 },
  workoutHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
  blockList: { marginTop: Spacing.sm, gap: 3, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: WORKOUTS_TINT },
  blockLine: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.dark },
});
