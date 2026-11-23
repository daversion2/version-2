import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BorderRadius, Colors, Spacing, TextStyles } from '../../../../constants/theme';
import { LargeTitle } from '../../../../components/common/LargeTitle';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import { Workout, WorkoutsStackParamList } from '../../../../types/workouts';
import { PastSessionSheet } from '../../../../components/miniapps/PastSessionSheet';
import { durationSec, totalSetsLogged } from '../../../../services/workoutSession';
import { formatSeconds } from '../../../../services/workoutMath';
import { formatRelativeDay, toLocalDateString } from '../../../../utils/date';
import { showChoice, showConfirm } from '../../../../utils/alert';
import { useWorkouts } from './WorkoutsContext';
import { WORKOUTS_ACCENT, ws } from './components/workoutsStyle';
import { prsThisMonth, workoutHomeFocus } from '../../../../services/workoutUpNext';
import { useOverrideStart } from '../../../../components/checkin/OverrideStartSheet';
import { HomeFocusCard } from './components/HomeFocusCard';
import { WeekCard } from './components/WeekCard';
import { WorkoutLogSheet } from './components/WorkoutLogSheet';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutsHome'>;

/** "Last done today", "Last done Sat", "Last done Mon, May 5". */
export const lastDoneLabel = (iso?: string): string => {
  if (!iso) return 'Not done yet';
  const day = formatRelativeDay(toLocalDateString(new Date(iso)));
  return `Last done ${day === 'Today' || day === 'Yesterday' ? day.toLowerCase() : day}`;
};

/**
 * Workouts' home, by what you came to do (founder, 2026-11-22). The top card
 * is the one thing to do now, with Do it and Done it on it. Under it: the week
 * at a glance, Progress and Create, then your other workouts. Opened from the
 * Workouts page's Start, it goes on to what that named.
 */
export const WorkoutsHomeScreen: React.FC<Props> = ({ navigation, route }) => {
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
    closeAndCheckOff,
    userId,
    updatePrefs,
    currentPhase,
    sessions,
  } = useWorkouts();
  const today = toLocalDateString(new Date());
  // Every Start asks the override first; its answer is what starts the workout.
  const overrideStart = useOverrideStart('Workouts', WORKOUTS_ACCENT);
  const [loggingPast, setLoggingPast] = useState(false);
  const [loggingExercise, setLoggingExercise] = useState(false);
  // The one thing to do now. Not while loading or unloaded: "build your first" would be a false claim.
  const focus =
    loading || loadError
      ? undefined
      : workoutHomeFocus({ draft: session, phase: currentPhase ?? undefined, workouts, sessions, today });
  const focusWorkout = focus?.kind === 'workout' ? focus.workout : undefined;
  const prs = prsThisMonth(sessions, new Date());

  // Opened with no signal: try again each time Workouts' home comes back into view.
  useFocusEffect(
    useCallback(() => {
      if (loadError && !loading) reload();
    }, [loadError, loading, reload])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={closeApp} style={ws.headerIconBtn} accessibilityLabel="Close Workouts">
          <Ionicons name="close" size={24} color={Colors.dark} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('WorkoutSettings')}
          style={ws.headerIconBtn}
          accessibilityLabel="Workouts settings"
        >
          <Ionicons name="settings-outline" size={22} color={Colors.dark} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, closeApp]);

  const resume = () => navigation.navigate(session?.phase === 'summary' ? 'WorkoutSummary' : 'WorkoutSession');

  /** Starting anything while a session is saved asks first — never silently throws it away. */
  const guardStart = (start: () => void) => {
    if (!session) return start();
    showChoice(
      `${session.workoutName} is still in progress`,
      session.saveTimedOutAt
        ? 'Its last Finish didn’t get through, but may still save once you’re back online. Pick up where you left off, or start this one?'
        : 'Pick up where you left off, or throw it away and start this one?',
      [
        { label: 'Resume it', onPress: resume },
        {
          label: 'Discard and start',
          onPress: async () => {
            await discardSession();
            start();
          },
        },
      ]
    );
  };

  const startEmpty = () =>
    guardStart(() =>
      overrideStart.ask((override) => {
        beginSession(undefined, override);
        navigation.navigate('WorkoutSession');
      })
    );

  const startWorkout = (workout: Workout) =>
    guardStart(() =>
      overrideStart.ask((override) => {
        beginSession(workout, override);
        navigation.navigate('WorkoutSession');
      })
    );

  // Opened from the Workouts page's Start: go on to what it named, once. A
  // resume or phase test waits for the draft or the phase to load; if it
  // never turns up, home is where you stay.
  const launch = route.params?.launch;
  const launchDone = useRef(false);
  useEffect(() => {
    if (!launch || launchDone.current) return;
    let handled = true;
    if (launch.kind === 'workout') {
      navigation.navigate('WorkoutPreview', { workoutId: launch.workoutId });
    } else if (launch.kind === 'resume') {
      if (session) resume();
      else handled = !loading;
    } else if (launch.kind === 'week') {
      navigation.navigate('WorkoutWeek');
    } else if (launch.kind === 'phaseTest') {
      if (currentPhase) navigation.navigate('PhaseTest', { phaseId: currentPhase.id, mode: launch.mode });
      else handled = !loading;
    }
    if (!handled) return;
    launchDone.current = true;
    navigation.setParams({ launch: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launch, session, loading, currentPhase]);

  const listed = focusWorkout ? workouts.filter((w) => w.id !== focusWorkout.id) : workouts;

  return (
    <ScrollView
      style={ws.screen}
      contentContainerStyle={ws.scroll}
      refreshControl={<RefreshControl refreshing={false} onRefresh={reload} tintColor={WORKOUTS_ACCENT} />}
    >
      <LargeTitle title="Workouts" />

      {!prefs.intro_seen && !loading && (
        <View style={[ws.card, styles.intro]}>
          <Text style={ws.title}>How Workouts works</Text>
          <Text style={ws.body}>• Pick a workout — or build one from exercises and circuits.</Text>
          <Text style={ws.body}>• Log each set as you go; the rest timer starts on its own.</Text>
          <Text style={ws.body}>
            • Start asks how hard it is to start. Finish asks how hard it was to keep going. It counts toward your week.
          </Text>
          <TouchableOpacity onPress={() => updatePrefs({ intro_seen: true }).catch(() => {})} style={styles.introBtn}>
            <Text style={ws.link}>Got it</Text>
          </TouchableOpacity>
        </View>
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

      {focus && focus.kind !== 'resume' && (
        <HomeFocusCard
          focus={focus}
          onOpen={() => focusWorkout && navigation.navigate('WorkoutPreview', { workoutId: focusWorkout.id })}
          onDo={() => focusWorkout && startWorkout(focusWorkout)}
          onDone={() => focusWorkout && navigation.navigate('WorkoutDoneIt', { workoutId: focusWorkout.id })}
          onTest={() =>
            focus.kind === 'test' &&
            currentPhase &&
            navigation.navigate('PhaseTest', { phaseId: currentPhase.id, mode: focus.mode })
          }
          onCreate={() => navigation.navigate('WorkoutBuilder', {})}
          onPhase={currentPhase ? () => navigation.navigate('Phase', { phaseId: currentPhase.id }) : undefined}
        />
      )}

      {loading && workouts.length === 0 && <ActivityIndicator color={WORKOUTS_ACCENT} style={{ marginTop: Spacing.lg }} />}

      {!!loadError && (
        <TouchableOpacity style={ws.card} onPress={reload}>
          <Text style={ws.title}>Couldn't load your workouts</Text>
          <Text style={ws.muted}>Check your connection, then tap to try again. A workout in progress is safe on this phone.</Text>
        </TouchableOpacity>
      )}

      {!loading && <WeekCard onOpen={() => navigation.navigate('WorkoutWeek')} />}

      {!loading && (
        <View style={styles.tiles}>
          <HomeTile
            icon="trending-up"
            title="Progress"
            subtitle={prs > 0 ? `${prs} ${prs === 1 ? 'PR' : 'PRs'} this month` : 'Stats and records'}
            label="Progress, stats and records"
            onPress={() => navigation.navigate('WorkoutHistory')}
          />
          <HomeTile
            icon="add"
            title="Create"
            subtitle="Workout or phase"
            label="Create, workout or phase"
            onPress={() => navigation.navigate('WorkoutCreate')}
          />
        </View>
      )}

      {listed.length > 0 && (
        <ListGroup title={focusWorkout ? 'Other workouts' : 'Your workouts'}>
          {listed.map((w) => {
            const parts = w.blocks.slice(0, 2).map((b) =>
              b.items.length > 1 ? b.name || 'Circuit' : exercisesById[b.items[0]?.exerciseId]?.name ?? 'Exercise'
            );
            const more = w.blocks.length > 2 ? ` and ${w.blocks.length - 2} more` : '';
            return (
              <ListRow
                key={w.id}
                title={w.name}
                subtitle={`${parts.join(', ')}${more} · ${lastDoneLabel(w.last_done_at)}`}
                onPress={() => navigation.navigate('WorkoutPreview', { workoutId: w.id })}
              />
            );
          })}
        </ListGroup>
      )}

      <ListGroup>
        <ListRow
          title="Empty workout"
          subtitle="Add exercises as you go"
          icon={{ name: 'add', color: WORKOUTS_ACCENT }}
          onPress={startEmpty}
        />
        <ListRow
          title="Log an exercise"
          subtitle="Add sets of something you did"
          icon={{ name: 'barbell', color: WORKOUTS_ACCENT }}
          onPress={() => setLoggingExercise(true)}
        />
        <ListRow
          title="Done something else"
          subtitle="Log it with just a day and time"
          icon={{ name: 'calendar', color: WORKOUTS_ACCENT }}
          onPress={() => setLoggingPast(true)}
        />
      </ListGroup>

      <WorkoutLogSheet
        visible={loggingExercise}
        userId={userId}
        sessions={sessions}
        exercisesById={exercisesById}
        unit={prefs.unit}
        vt1={prefs.vt1_bpm}
        vt2={prefs.vt2_bpm}
        onCancel={() => setLoggingExercise(false)}
        onLogged={({ sessionId, durationSec }) => {
          setLoggingExercise(false);
          // Saved by the sheet: Today asks both ratings, as it does for any finished session.
          closeAndCheckOff(durationSec, undefined, sessionId);
        }}
      />

      <PastSessionSheet
        visible={loggingPast}
        accent={WORKOUTS_ACCENT}
        title="Done something else"
        minutes={{ min: 5, max: 180, step: 5, initial: 45 }}
        onCancel={() => setLoggingPast(false)}
        onSave={({ date, minutes }) => {
          setLoggingPast(false);
          closeAndCheckOff(minutes * 60, date);
        }}
      />
      {overrideStart.sheet}
    </ScrollView>
  );
};

const HomeTile: React.FC<{
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  label: string;
  onPress: () => void;
}> = ({ icon, title, subtitle, label, onPress }) => (
  <TouchableOpacity style={[ws.card, styles.tile]} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
    <Ionicons name={icon} size={22} color={WORKOUTS_ACCENT} />
    <Text style={ws.title}>{title}</Text>
    <Text style={ws.muted} numberOfLines={1}>
      {subtitle}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  intro: { gap: 6 },
  introBtn: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  resume: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: WORKOUTS_ACCENT,
  },
  resumeEyebrow: { ...TextStyles.footnote, fontWeight: '600', color: Colors.white, opacity: 0.85 },
  resumeTitle: { ...TextStyles.headline, color: Colors.white },
  resumeMeta: { ...TextStyles.footnote, color: Colors.white, opacity: 0.85 },
  resumeActions: { alignItems: 'flex-end', gap: Spacing.sm },
  resumeCta: { ...TextStyles.headline, color: Colors.white },
  resumeDiscard: { ...TextStyles.footnote, color: Colors.white, opacity: 0.85 },
  tiles: { flexDirection: 'row', gap: Spacing.sm + 4 },
  tile: { flex: 1, gap: 2 },
});
