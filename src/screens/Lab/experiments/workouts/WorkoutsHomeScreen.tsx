import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BorderRadius, Colors, Spacing, TextStyles } from '../../../../constants/theme';
import { LargeTitle } from '../../../../components/common/LargeTitle';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import { Workout, WorkoutsStackParamList } from '../../../../types/workouts';
import { blockTitle, durationSec, totalSetsLogged } from '../../../../services/workoutSession';
import { formatSeconds, formatSetValues, lastSetsFor } from '../../../../services/workoutMath';
import { formatRelativeDay, toLocalDateString } from '../../../../utils/date';
import { showChoice, showConfirm } from '../../../../utils/alert';
import { useWorkouts } from './WorkoutsContext';
import { WORKOUTS_ACCENT, ws } from './components/workoutsStyle';
import { isRetestDue, nextProgramWorkout, phaseSessions } from '../../../../services/trainingPhases';
import { upNextWorkout } from '../../../../services/workoutUpNext';
import { PhaseStatusCard } from './components/PhaseParts';
import { useOverrideStart } from '../../../../components/checkin/OverrideStartSheet';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutsHome'>;

/** "Last done today", "Last done Sat", "Last done Mon, May 5". */
export const lastDoneLabel = (iso?: string): string => {
  if (!iso) return 'Not done yet';
  const day = formatRelativeDay(toLocalDateString(new Date(iso)));
  return `Last done ${day === 'Today' || day === 'Yesterday' ? day.toLowerCase() : day}`;
};

/**
 * Workouts' home is for starting one: a workout left open, else the up-next
 * pick (the phase card while in a phase), your workouts, an empty workout.
 * Phases, tests, the week's volume and past workouts are one row away under
 * More. Opened from the Workouts page's Start, it goes on to what that named.
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
    updatePrefs,
    currentPhase,
    sessions,
  } = useWorkouts();
  const today = toLocalDateString(new Date());
  // Every Start asks the override first; its answer is what starts the workout.
  const overrideStart = useOverrideStart('Workouts', WORKOUTS_ACCENT);
  const nextInPhase = currentPhase ? nextProgramWorkout(currentPhase, workouts, sessions) : undefined;
  // Outside a phase, the next workout in rotation gets its own card — not while one's in progress.
  const upNext = !currentPhase && !session ? upNextWorkout({ workouts, sessions, today }) : undefined;

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
    } else if (launch.kind === 'phaseTest') {
      if (currentPhase) navigation.navigate('PhaseTest', { phaseId: currentPhase.id, mode: launch.mode });
      else handled = !loading;
    }
    if (!handled) return;
    launchDone.current = true;
    navigation.setParams({ launch: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launch, session, loading, currentPhase]);

  const listed = upNext ? workouts.filter((w) => w.id !== upNext.workout.id) : workouts;

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
            • Start asks how hard it is to start. Finish asks how hard you pushed. It counts toward your week.
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

      {!loading && currentPhase && (
        <PhaseStatusCard
          phase={currentPhase}
          sessionsDone={phaseSessions(currentPhase, sessions).length}
          today={today}
          nextWorkoutName={nextInPhase?.name}
          onOpen={() => navigation.navigate('Phase', { phaseId: currentPhase.id })}
          onTest={() =>
            navigation.navigate('PhaseTest', {
              phaseId: currentPhase.id,
              mode: currentPhase.status === 'baseline' || !isRetestDue(currentPhase, today) ? 'baseline' : 'retest',
            })
          }
          onStartNext={nextInPhase ? () => navigation.navigate('WorkoutPreview', { workoutId: nextInPhase.id }) : undefined}
        />
      )}

      {!loading && upNext && (
        <UpNextCard
          workout={upNext.workout}
          why={upNext.why}
          onOpen={() => navigation.navigate('WorkoutPreview', { workoutId: upNext.workout.id })}
          onStart={() => startWorkout(upNext.workout)}
        />
      )}

      {loading && workouts.length === 0 && <ActivityIndicator color={WORKOUTS_ACCENT} style={{ marginTop: Spacing.lg }} />}

      {!!loadError && (
        <TouchableOpacity style={ws.card} onPress={reload}>
          <Text style={ws.title}>Couldn't load your workouts</Text>
          <Text style={ws.muted}>Check your connection, then tap to try again. A workout in progress is safe on this phone.</Text>
        </TouchableOpacity>
      )}

      {listed.length > 0 ? (
        <ListGroup
          title={upNext ? 'Other workouts' : 'Your workouts'}
          action={{
            icon: 'add',
            color: WORKOUTS_ACCENT,
            onPress: () => navigation.navigate('WorkoutBuilder', {}),
            accessibilityLabel: 'Build a workout',
          }}
        >
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
      ) : (
        // Nothing else to list (no workouts, or the only one is up next): the + has nowhere to sit.
        !loading &&
        !loadError && (
          <ListGroup>
            <ListRow
              title="Build a workout"
              subtitle="Build and save a routine"
              icon={{ name: 'list', color: WORKOUTS_ACCENT }}
              onPress={() => navigation.navigate('WorkoutBuilder', {})}
            />
          </ListGroup>
        )
      )}

      <ListGroup>
        <ListRow
          title="Empty workout"
          subtitle="Add exercises as you go"
          icon={{ name: 'add', color: WORKOUTS_ACCENT }}
          onPress={startEmpty}
        />
        <ListRow
          title="More"
          subtitle="This week, tests, phases, past workouts"
          icon={{ name: 'ellipsis-horizontal', color: WORKOUTS_ACCENT }}
          onPress={() => navigation.navigate('WorkoutMore')}
        />
      </ListGroup>
      {overrideStart.sheet}
    </ScrollView>
  );
};

/** The workout to do next, with last time's numbers for its first few exercises. */
const UpNextCard: React.FC<{ workout: Workout; why: string; onOpen: () => void; onStart: () => void }> = ({
  workout,
  why,
  onOpen,
  onStart,
}) => {
  const { exercise, exercisesById, sessions, prefs } = useWorkouts();
  const count = workout.blocks.reduce((n, b) => n + b.items.length, 0);
  return (
    <TouchableOpacity style={[ws.card, styles.upNext]} onPress={onOpen} accessibilityRole="button">
      <View style={styles.upNextHead}>
        <Text style={ws.eyebrow}>{why}</Text>
        <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
      </View>
      <Text style={styles.featureTitle}>{workout.name}</Text>
      <Text style={ws.muted}>
        {count} {count === 1 ? 'exercise' : 'exercises'} · {lastDoneLabel(workout.last_done_at)}
      </Text>
      <View style={styles.lastList}>
        {workout.blocks.slice(0, 3).map((block) => {
          const item = block.items[0];
          const ex = exercise(item.exerciseId);
          const last = lastSetsFor(sessions, item.exerciseId)[0];
          return (
            <View key={block.id} style={styles.lastRow}>
              <Text style={[ws.body, styles.lastName]} numberOfLines={1}>
                {block.items.length > 1 ? blockTitle(block, exercisesById) : ex.name}
              </Text>
              <Text style={ws.muted}>{last ? formatSetValues(last, ex.kind, prefs.unit) : 'New'}</Text>
            </View>
          );
        })}
      </View>
      <TouchableOpacity style={[ws.primaryBtn, styles.upNextBtn]} onPress={onStart} accessibilityRole="button">
        <Text style={ws.primaryBtnText}>Start</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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
  featureTitle: { ...TextStyles.title2, color: Colors.dark },
  upNext: { gap: 4, paddingVertical: 18, paddingHorizontal: 20 },
  upNextHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lastList: {
    gap: 6,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.separator,
  },
  lastRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  lastName: { flex: 1 },
  upNextBtn: { marginTop: Spacing.sm + 4 },
});
