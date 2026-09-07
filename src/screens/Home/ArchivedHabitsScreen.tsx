import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { HomeScreenProps } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { CompletionLog, PracticeInstance } from '../../types';
import {
  fetchAllNudgeLogs,
  getArchivedHabits,
  isRetiredCurated,
  unarchiveHabit,
} from '../../services/practices';
import { syncHabitReminder } from '../../services/habitReminders';
import { describeSchedule } from '../../services/habitSchedule';
import { formatRelativeDay } from '../../utils/date';
import { showAlert } from '../../utils/alert';
import { useScreenIntro } from '../../hooks/useScreenIntro';
import { ScreenIntro, ScreenIntroButton } from '../../components/common/ScreenIntro';

type Props = HomeScreenProps<'ArchivedHabits'>;

interface ArchivedRow {
  habit: PracticeInstance;
  reps: number;
  lastDone?: string;
  /** Retired from the catalog rather than archived by the user — can't be restored. */
  retired: boolean;
}

/**
 * Practices you've put away.
 *
 * Archiving already existed as a side effect — "Delete" wrote is_active: false
 * and kept every log — but nothing ever read those rows back, so a practice you
 * removed was gone in every way that mattered while its history sat in the
 * database being counted by nothing. This is the other half: what you archived,
 * what it did while it was active, and the way back.
 */
export const ArchivedHabitsScreen: React.FC<Props> = ({ navigation }) => {
  // First visit explains the screen; the ⓘ in the header brings it back.
  const intro = useScreenIntro('archived', {
    navigation,
    side: 'right',
    renderButton: (onPress) => <ScreenIntroButton onPress={onPress} />,
  });
  const { user } = useAuth();
  const [rows, setRows] = useState<ArchivedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      // One pass over the logs for every archived habit — this list is a
      // history view, so it reads the whole log collection exactly once rather
      // than once per row.
      const [habits, logs] = await Promise.all([
        getArchivedHabits(user.uid),
        fetchAllNudgeLogs(user.uid),
      ]);
      setRows(habits.map((habit) => summarise(habit, logs)));
    } catch (err) {
      console.warn('Failed to load archived practices:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleRestore = async (habit: PracticeInstance) => {
    if (!user) return;
    setRestoringId(habit.id);
    try {
      await unarchiveHabit(user.uid, habit.id);
      // Its reminders were cancelled on the way out; a habit that still wants
      // them gets them back on the way in.
      if (habit.reminder?.enabled) {
        await syncHabitReminder(user.uid, habit.id, habit.reminder);
      }
      await load();
    } catch (e: any) {
      showAlert("Couldn't restore", e?.message ?? 'Please try again.');
    } finally {
      setRestoringId(null);
    }
  };

  const empty = useMemo(() => !loading && rows.length === 0, [loading, rows]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {empty ? (
        <View style={styles.emptyCard}>
          <Ionicons name="archive-outline" size={28} color={Colors.gray} />
          <Text style={styles.emptyTitle}>Nothing archived</Text>
          <Text style={styles.emptyText}>
            Practices you archive land here — off Home, out of your streaks and pace, with every
            rep you logged kept intact.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.intro}>
            Off Home and out of your streaks. Nothing was deleted — restore one and it picks up
            with its history, schedule and plan as they were.
          </Text>

          {rows.map(({ habit, reps, lastDone, retired }) => (
            <View key={habit.id} style={styles.card}>
              <TouchableOpacity
                style={styles.cardMain}
                onPress={() => navigation.navigate('HabitDetail', { habitId: habit.id })}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`History for ${habit.name}`}
              >
                <Text style={styles.name} numberOfLines={1}>
                  {habit.name}
                </Text>
                <Text style={styles.meta}>
                  {reps === 0
                    ? 'Never logged'
                    : `${reps} ${reps === 1 ? 'rep' : 'reps'}${
                        lastDone ? ` · last ${formatRelativeDay(lastDone).toLowerCase()}` : ''
                      }`}
                </Text>
                <Text style={styles.schedule}>
                  {retired
                    ? 'Retired from the library'
                    : `${describeSchedule(habit)}${
                        habit.archived_at ? ` · archived ${formatDate(habit.archived_at)}` : ''
                      }`}
                </Text>
              </TouchableOpacity>

              {/* A retired practice is inactive because the LIBRARY dropped it,
                  not because the user put it away — and the curated reconciler
                  would deactivate it again on the next app load. Offering
                  Restore here would be a button that silently undoes itself, so
                  it says what happened instead. The history stays reachable. */}
              {retired ? (
                <View style={styles.retiredChip}>
                  <Text style={styles.retiredChipText}>Retired</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.restoreBtn}
                  onPress={() => handleRestore(habit)}
                  disabled={restoringId === habit.id}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`Restore ${habit.name}`}
                >
                  {restoringId === habit.id ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="arrow-undo-outline" size={15} color={Colors.primary} />
                      <Text style={styles.restoreText}>Restore</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ))}
        </>
      )}
      <ScreenIntro intro={intro} />
    </ScrollView>
  );
};

const summarise = (habit: PracticeInstance, logs: CompletionLog[]): ArchivedRow => {
  const mine = logs.filter((l) => l.reference_id === habit.id);
  const dates = mine.map((l) => l.date).sort();
  return {
    habit,
    reps: mine.length,
    lastDone: dates[dates.length - 1],
    retired: isRetiredCurated(habit),
  };
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  intro: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardMain: { flex: 1, gap: 3 },
  name: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark },
  meta: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  schedule: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.border },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 92,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  restoreText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.primary },
  retiredChip: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 92,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.lightGray,
  },
  retiredChipText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.gray },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  emptyTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
});
