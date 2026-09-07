import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { HomeScreenProps } from '../../types/navigation';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { WeeklyTrendChart } from '../../components/habits/WeeklyTrendChart';
import { PracticePerformanceSection } from '../../components/habits/PracticePerformanceSection';
import { SkipPatternsCard } from '../../components/progress/SkipPatternsCard';
import { getSkipPatternsForHabit } from '../../services/skips';
import { resolveTemplateFields } from '../../data/habitTemplates';
import { SkipPatterns } from '../../services/skipLogic';
import { useAuth } from '../../context/AuthContext';
import {
  ADHERENCE_WINDOW_DAYS,
  archiveHabit,
  getHabitById,
  getHabitStats,
  getHabitCompletionLogs,
  habitSchedule,
  isRetiredCurated,
  setHabitSchedule,
  unarchiveHabit,
  updateHabit,
} from '../../services/practices';
import { HabitSchedule, describeSchedule } from '../../services/habitSchedule';
import { AdherenceCard } from '../../components/habits/AdherenceCard';
import { WeeklyGoalSheet } from '../../components/practices/WeeklyGoalSheet';
import { deleteCompletionLog } from '../../services/progress';
import { buildPracticePerformance } from '../../services/practicePerformance';
import { getPractice, getCommitmentField, formatCommitment } from '../../data/practices';
import { buildRaiseSuggestion } from '../../services/raiseSuggestion';
import { cancelHabitReminder, syncHabitReminder } from '../../services/habitReminders';
import { showConfirm, showAlert } from '../../utils/alert';
import {
  isEditableDate,
  formatRelativeDay,
  formatDayHeader,
  EDITABLE_WINDOW_DAYS,
} from '../../utils/date';
import { PracticeInstance, HabitStats, CompletionLog, HabitActionPlan } from '../../types';
import { useScreenIntro } from '../../hooks/useScreenIntro';
import { ScreenIntro, ScreenIntroButton } from '../../components/common/ScreenIntro';

type Props = HomeScreenProps<'HabitDetail'>;

const ACTION_PLAN_LABELS: {
  key: keyof HabitActionPlan;
  label: string;
  icon: string;
  fallbackKey?: keyof HabitActionPlan;
}[] = [
  { key: 'anchor', label: 'After I…', icon: 'link-outline', fallbackKey: 'cue' },
  { key: 'pairing', label: 'Pair it with', icon: 'heart-outline' },
  { key: 'environment_change', label: 'Environment tweak', icon: 'home-outline' },
  { key: 'obstacle_plan', label: 'Obstacle plan', icon: 'shield-outline' },
  { key: 'minimum_version', label: 'Minimum version', icon: 'trending-down-outline' },
  { key: 'accountability_person', label: 'Accountability', icon: 'people-outline' },
];

/** Resolve a label's value, falling back to a legacy key (e.g. anchor → cue). */
const planValueFor = (
  plan: HabitActionPlan,
  key: keyof HabitActionPlan,
  fallbackKey?: keyof HabitActionPlan
): string | undefined => plan[key] || (fallbackKey ? plan[fallbackKey] : undefined);

export const MyPracticeDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  // First visit explains the screen; the ⓘ in the header brings it back.
  const intro = useScreenIntro('habit_detail', {
    navigation,
    side: 'right',
    renderButton: (onPress) => <ScreenIntroButton onPress={onPress} />,
  });
  const { habitId } = route.params;
  const { user } = useAuth();

  const [habit, setHabit] = useState<PracticeInstance | null>(null);
  const [stats, setStats] = useState<HabitStats | null>(null);
  const [logs, setLogs] = useState<CompletionLog[]>([]);
  const [skipPatterns, setSkipPatterns] = useState<SkipPatterns | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit mode (name / schedule)
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [h, s, l, skips] = await Promise.all([
        getHabitById(user.uid, habitId),
        getHabitStats(user.uid, habitId),
        getHabitCompletionLogs(user.uid, habitId),
        // What stops you doing THIS habit specifically — the most actionable
        // framing of the skip data, because the pattern sits next to the thing
        // you would change.
        getSkipPatternsForHabit(user.uid, habitId).catch((err) => {
          console.warn('Habit skip patterns fetch failed:', err);
          return null;
        }),
      ]);
      setHabit(h);
      setStats(s);
      setLogs(l);
      setSkipPatterns(skips);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user, habitId]);

  // Reload every time this screen gains focus — handles initial load and return from HabitActionPlanScreen
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const startEdit = () => {
    if (!habit) return;
    setEditName(habit.name);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      Alert.alert('Required', 'Practice name cannot be empty.');
      return;
    }
    if (!user) return;
    setEditSaving(true);
    try {
      await updateHabit(user.uid, habitId, {
        name: editName.trim(),
      } as Partial<PracticeInstance>);
      setEditing(false);
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setEditSaving(false);
    }
  };

  // The schedule saves on its own, through the one writer that keeps the days
  // and the weekly target in agreement — it is never part of the name form.
  const handleSaveSchedule = async (schedule: HabitSchedule) => {
    if (!user) return;
    try {
      await setHabitSchedule(user.uid, habitId, schedule);
      // Reminders fire on the scheduled days, so the days changing changes which
      // notifications should exist.
      if (habit?.reminder?.enabled) {
        await syncHabitReminder(user.uid, habitId, habit.reminder);
      }
      await loadData();
    } catch (e: any) {
      showAlert("Couldn't save the schedule", e?.message ?? 'Please try again.');
    }
  };

  const handleArchive = () => {
    showConfirm(
      'Archive this practice?',
      // Names where Archived actually is. The promise is only as good as the
      // user's ability to find the place it points at.
      'It comes off Home and stops counting toward your streaks and pace. Every rep you logged is kept, and you can restore it any time from Settings → Archived Practices.',
      async () => {
        if (!user) return;
        try {
          if (habit) await cancelHabitReminder(habit);
          await archiveHabit(user.uid, habitId);
          navigation.goBack();
        } catch (e: any) {
          showAlert("Couldn't archive", e?.message ?? 'Please try again.');
        }
      },
      'Archive'
    );
  };

  const handleRestore = async () => {
    if (!user) return;
    try {
      await unarchiveHabit(user.uid, habitId);
      if (habit?.reminder?.enabled) {
        await syncHabitReminder(user.uid, habitId, habit.reminder);
      }
      await loadData();
    } catch (e: any) {
      showAlert("Couldn't restore", e?.message ?? 'Please try again.');
    }
  };


  // Generate marked dates for calendar heat map
  const markedDates = useMemo(() => {
    if (!stats) return {};

    const marks: Record<string, any> = {};
    const primaryColor = Colors.primary;

    Object.entries(stats.completionsByDate).forEach(([date, count]) => {
      // 3 intensity levels: 1 completion = 30%, 2 = 60%, 3+ = 100%
      let opacity = 0.3;
      if (count === 2) opacity = 0.6;
      else if (count >= 3) opacity = 1;

      marks[date] = {
        selected: true,
        selectedColor: `rgba(33, 113, 128, ${opacity})`,
      };
    });

    return marks;
  }, [stats]);

  // Per-practice performance reporting, computed from the already-fetched logs
  const performance = useMemo(
    // Curated habits resolve their template from the catalog; custom habits
    // have no catalog entry, so their preset is resolved instead. Without the
    // fallback a custom habit's metrics would be captured and never charted.
    () =>
      buildPracticePerformance(
        logs,
        getPractice(habit?.practice_id) ?? { tracking: resolveTemplateFields(habit ?? {}) }
      ),
    [logs, habit?.practice_id, habit?.template_id]
  );

  // "This has gotten easy — raise it?" Only ever offered; accepting is an
  // explicit tap. The app never moves a number the user promised.
  const raise = useMemo(() => {
    const def = getPractice(habit?.practice_id);
    const field = getCommitmentField(def);
    return buildRaiseSuggestion(logs, field, field ? habit?.metric_goals?.[field.key] : undefined);
  }, [logs, habit?.practice_id, habit?.metric_goals]);

  const acceptRaise = async () => {
    if (!user || !habit || !raise) return;
    try {
      await updateHabit(user.uid, habit.id, {
        metric_goals: { ...(habit.metric_goals ?? {}), [raise.metricKey]: raise.suggestedGoal },
      } as Partial<PracticeInstance>);
      await loadData();
    } catch (e: any) {
      showAlert('Could not update your goal', e.message);
    }
  };

  // Recent reps, newest first. This is the only place a single mis-logged rep
  // can be removed — the button below it deletes the whole practice, which is a
  // different thing entirely.
  const recentReps = useMemo(
    () =>
      [...logs]
        .sort((a, b) => (b.completed_at || b.date).localeCompare(a.completed_at || a.date))
        .slice(0, 12),
    [logs]
  );

  const handleDeleteRep = (log: CompletionLog) => {
    if (!user) return;
    showConfirm(
      'Delete this rep?',
      `${formatDayHeader(log.date)} · ${log.points} XP will be removed.`,
      async () => {
        try {
          await deleteCompletionLog(user.uid, log.id);
          await loadData();
        } catch (e: any) {
          showAlert("Couldn't delete", e?.message ?? 'Please try again.');
        }
      },
      'Delete'
    );
  };

  // Get notes with dates, sorted newest first
  const notesWithDates = useMemo(() => {
    return logs
      .filter((l) => l.notes && l.notes.trim())
      .sort((a, b) => {
        const dateA = a.completed_at || a.date;
        const dateB = b.completed_at || b.date;
        return dateB.localeCompare(dateA);
      });
  }, [logs]);

  // Inactive because the LIBRARY dropped this practice, not because the user
  // archived it — which decides whether restoring it can actually stick.
  const retired = useMemo(() => (habit ? isRetiredCurated(habit) : false), [habit]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!habit || !stats) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Practice not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.habitName}>{habit.name}</Text>
        {!editing && (
          <TouchableOpacity onPress={startEdit} style={styles.editHabitBtn}>
            <Ionicons name="pencil-outline" size={14} color={Colors.primary} />
            <Text style={styles.editHabitText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* An archived practice is read-only until it's back. Restoring is the
          only action offered, so nothing here quietly edits a habit that isn't
          running. */}
      {!habit.is_active && (
        <Card style={styles.archivedCard}>
          <View style={styles.archivedRow}>
            <Ionicons name="archive-outline" size={18} color={Colors.gray} />
            <Text style={styles.archivedText}>
              {retired
                ? 'Retired from the library, so it can’t be brought back — but everything you logged is kept below.'
                : 'Archived. Off Home and out of your streaks — the history below is kept.'}
            </Text>
          </View>
          {/* No Restore for a retired practice: the curated reconciler would
              deactivate it again on the next app load, so the button would
              silently undo itself. See isRetiredCurated. */}
          {!retired && (
            <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} activeOpacity={0.85}>
              <Ionicons name="arrow-undo-outline" size={15} color={Colors.white} />
              <Text style={styles.restoreBtnText}>Restore practice</Text>
            </TouchableOpacity>
          )}
        </Card>
      )}

      {/* Schedule — tappable whether or not the name form is open, because it is
          the setting people come here to change. */}
      <TouchableOpacity
        style={styles.scheduleRow}
        onPress={() => setScheduleOpen(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Schedule: ${describeSchedule(habit)}. Tap to change.`}
      >
        <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
        <View style={styles.scheduleText}>
          <Text style={styles.scheduleLabel}>Schedule</Text>
          <Text style={styles.scheduleValue}>{describeSchedule(habit)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.gray} />
      </TouchableOpacity>

      {/* Inline edit form: name */}
      {editing && (
        <Card style={styles.editCard}>
          <InputField
            label="Practice Name"
            value={editName}
            onChangeText={setEditName}
            placeholder="Practice name"
          />
          <View style={styles.editButtons}>
            <Button title="Save" onPress={handleSaveEdit} loading={editSaving} style={{ flex: 1 }} />
            <Button
              title="Cancel"
              onPress={() => setEditing(false)}
              variant="outline"
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      )}

      {/* Stats Card - 2x2 Grid */}
      <Card style={styles.statsCard}>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Ionicons name="flame" size={24} color={Colors.secondary} />
            </View>
            <Text style={styles.statValue}>{stats.currentStreak}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Ionicons name="trophy" size={24} color={Colors.primary} />
            </View>
            <Text style={styles.statValue}>{stats.longestStreak}</Text>
            <Text style={styles.statLabel}>Longest Streak</Text>
          </View>
          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            </View>
            <Text style={styles.statValue}>{stats.totalCompletions}</Text>
            <Text style={styles.statLabel}>Total Completions</Text>
          </View>
          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Ionicons name="flash" size={24} color="#FFD700" />
            </View>
            <Text style={styles.statValue}>{stats.totalPoints}</Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </View>
        </View>
      </Card>

      {/* Of the days this practice asked for, how many were kept. */}
      <AdherenceCard
        recent={stats.recentAdherence}
        lifetime={stats.lifetimeAdherence}
        scheduleLabel={describeSchedule(habit)}
        windowDays={ADHERENCE_WINDOW_DAYS}
      />

      {/* Active Since */}
      {stats.firstCompletionDate && (
        <Card style={styles.activeSinceCard}>
          <View style={styles.activeSinceRow}>
            <Ionicons name="calendar-outline" size={20} color={Colors.gray} />
            <Text style={styles.activeSinceText}>
              Active since {formatDate(stats.firstCompletionDate)}
            </Text>
          </View>
        </Card>
      )}

      {/* Performance — detailed per-practice reporting */}
      <Text style={styles.sectionTitle}>Performance</Text>
      {!!raise && (
        <Card style={styles.raiseCard}>
          <Text style={styles.raiseTitle}>This has gotten easier</Text>
          <Text style={styles.raiseBody}>
            You've hit {raise.currentGoal}
            {raise.unit ? ` ${raise.unit}` : ''} on {raise.hitRate}% of your recent
            check-ins, and it's been averaging {raise.recentResistance} out of 3 for
            difficulty. Want to raise it?
          </Text>
          <TouchableOpacity style={styles.raiseBtn} onPress={acceptRaise} activeOpacity={0.85}>
            <Text style={styles.raiseBtnText}>
              Raise to {raise.suggestedGoal}
              {raise.unit ? ` ${raise.unit}` : ''}
            </Text>
          </TouchableOpacity>
        </Card>
      )}

      <PracticePerformanceSection performance={performance} />

      {/* What actually stops you doing this one. Only rendered once something
          has been answered — an empty card here is just a reminder of nothing. */}
      {!!skipPatterns?.totalMissed && (
        <SkipPatternsCard patterns={skipPatterns} habitName={habit.name} />
      )}

      {/* Calendar Heat Map */}
      <Text style={styles.sectionTitle}>Completion History</Text>
      <Card style={styles.calendarCard}>
        <Calendar
          markedDates={markedDates}
          theme={{
            backgroundColor: Colors.white,
            calendarBackground: Colors.white,
            textSectionTitleColor: Colors.gray,
            selectedDayBackgroundColor: Colors.primary,
            selectedDayTextColor: Colors.white,
            todayTextColor: Colors.secondary,
            dayTextColor: Colors.dark,
            textDisabledColor: Colors.gray + '50',
            arrowColor: Colors.primary,
            monthTextColor: Colors.dark,
            textMonthFontFamily: Fonts.primaryBold,
            textDayFontFamily: Fonts.secondary,
            textDayHeaderFontFamily: Fonts.secondary,
          }}
          hideExtraDays
          enableSwipeMonths
        />
        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: `rgba(33, 113, 128, 0.3)` }]} />
            <Text style={styles.legendText}>1</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: `rgba(33, 113, 128, 0.6)` }]} />
            <Text style={styles.legendText}>2</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
            <Text style={styles.legendText}>3+</Text>
          </View>
        </View>
      </Card>

      {/* Weekly Trend */}
      <Text style={styles.sectionTitle}>Weekly Trend</Text>
      <Card>
        <WeeklyTrendChart
          data={stats.weeklyTrend}
          maxTarget={habit.target_count_per_week}
        />
      </Card>

      {/* Recent reps — with per-rep delete inside the editable window */}
      {recentReps.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Recent reps</Text>
          <Card style={styles.repsCard}>
            {recentReps.map((log, i) => {
              const editable = isEditableDate(log.date);
              return (
                <View key={log.id} style={[styles.repRow, i > 0 && styles.repDivider]}>
                  <View style={styles.repInfo}>
                    <Text style={styles.repDay}>{formatRelativeDay(log.date)}</Text>
                    <Text style={styles.repMeta}>
                      {log.difficulty >= 2 ? 'Challenging' : 'Easy day'} · {log.points} XP
                    </Text>
                  </View>
                  {editable ? (
                    <TouchableOpacity
                      onPress={() => handleDeleteRep(log)}
                      hitSlop={10}
                      style={styles.repDeleteBtn}
                      accessibilityLabel={`Delete the rep from ${formatDayHeader(log.date)}`}
                    >
                      <Ionicons name="trash-outline" size={17} color={Colors.fail} />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="lock-closed-outline" size={15} color={Colors.border} />
                  )}
                </View>
              );
            })}
            <Text style={styles.repsFootnote}>
              Reps stay editable for {EDITABLE_WINDOW_DAYS} days. Older ones are part of the record.
            </Text>
          </Card>
        </>
      )}

      {/* Notes */}
      {notesWithDates.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Notes</Text>
          {notesWithDates.map((log) => (
            <Card key={log.id} style={styles.noteCard}>
              <Text style={styles.noteDate}>
                {formatDate(log.completed_at || log.date)}
              </Text>
              <Text style={styles.noteText}>{log.notes}</Text>
            </Card>
          ))}
        </>
      )}

      {/* Action Plan */}
      <View style={styles.actionPlanHeader}>
        <Text style={styles.sectionTitle}>Action Plan</Text>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('HabitActionPlan', {
              habitId,
              prefilled: habit.action_plan,
              supportsPairing: !!habit.supports_pairing,
              reminder: habit.reminder,
            })
          }
          style={styles.editPlanBtn}
        >
          <Ionicons name="pencil-outline" size={14} color={Colors.primary} />
          <Text style={styles.editPlanText}>
            {habit.action_plan ? 'Edit' : 'Set up'}
          </Text>
        </TouchableOpacity>
      </View>

      {habit.action_plan &&
      ACTION_PLAN_LABELS.some(({ key, fallbackKey }) =>
        !!planValueFor(habit.action_plan!, key, fallbackKey)
      ) ? (
        ACTION_PLAN_LABELS.map(({ key, label, icon, fallbackKey }) => {
          const value = planValueFor(habit.action_plan!, key, fallbackKey);
          if (!value) return null;
          return (
            <Card key={key} style={styles.planCard}>
              <View style={styles.planLabelRow}>
                <Ionicons name={icon as any} size={14} color={Colors.primary} />
                <Text style={styles.planLabel}>{label}</Text>
              </View>
              <Text style={styles.planValue}>{value}</Text>
            </Card>
          );
        })
      ) : (
        <Card style={styles.planEmptyCard}>
          <Text style={styles.planEmptyText}>
            Set yourself up for success — create an action plan for this practice.
          </Text>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('HabitActionPlan', {
                habitId,
                supportsPairing: !!habit.supports_pairing,
                reminder: habit.reminder,
              })
            }
            style={styles.planEmptyBtn}
          >
            <Text style={styles.planEmptyBtnText}>Get started →</Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* Archive. Deliberately not called Delete: it never was one — the reps
          were always kept — and now there is a screen that says so. */}
      {habit.is_active && (
        <TouchableOpacity style={styles.deleteBtn} onPress={handleArchive}>
          <Ionicons name="archive-outline" size={18} color={Colors.secondary} />
          <Text style={styles.deleteBtnText}>Archive Practice</Text>
        </TouchableOpacity>
      )}

      <WeeklyGoalSheet
        visible={scheduleOpen}
        practiceName={habit.name}
        initialSchedule={habitSchedule(habit)}
        onSave={handleSaveSchedule}
        onClose={() => setScheduleOpen(false)}
      />
      <ScreenIntro intro={intro} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  raiseCard: { marginBottom: Spacing.md, gap: Spacing.sm },
  raiseTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
  raiseBody: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
  },
  raiseBtn: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  raiseBtnText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.white },
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  errorText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  habitName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    flex: 1,
  },
  arenaRow: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  editHabitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  editHabitText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },
  editCard: {
    marginBottom: Spacing.lg,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  scheduleText: { flex: 1 },
  scheduleLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scheduleValue: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginTop: 2,
  },
  archivedCard: { marginBottom: Spacing.md, gap: Spacing.md },
  archivedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  archivedText: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
  },
  restoreBtnText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
  editButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  categoryText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
  },
  statsCard: {
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  statIcon: {
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
  },
  statLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },
  activeSinceCard: {
    marginBottom: Spacing.lg,
  },
  activeSinceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  activeSinceText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  calendarCard: {
    paddingBottom: Spacing.sm,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  repsCard: {
    marginBottom: Spacing.sm,
  },
  repRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  repDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  repInfo: { flex: 1 },
  repDay: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  repMeta: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 1,
  },
  repDeleteBtn: { padding: Spacing.xs },
  repsFootnote: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  noteCard: {
    marginBottom: Spacing.sm,
  },
  noteDate: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginBottom: Spacing.xs,
  },
  noteText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 22,
  },
  actionPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  editPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  editPlanText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },
  planCard: {
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  planLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  planLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planValue: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
  },
  planEmptyCard: {
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  planEmptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
  },
  planEmptyBtn: {
    alignSelf: 'flex-start',
  },
  planEmptyBtnText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.xl,
  },
  deleteBtnText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.secondary,
  },
});
