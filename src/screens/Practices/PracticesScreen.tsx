import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PRACTICE_GROUPS, getAllPractices, getPracticesByGroup, resolvePracticeGroup, Practice } from '../../data/practices';
import { HomeScreenProps } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  archiveHabit,
  getActiveHabits,
  getWeeklyCompletionCounts,
  habitSchedule,
  setHabitSchedule,
  updateHabit,
} from '../../services/practices';
import { cancelHabitReminder, syncHabitReminder } from '../../services/habitReminders';
import { HabitSchedule, describeSchedule } from '../../services/habitSchedule';
import { WeeklyGoalSheet } from '../../components/practices/WeeklyGoalSheet';
import { PracticeInstance } from '../../types';
import { SHOW_HABIT_LIBRARY } from '../../constants/featureFlags';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { showAlert, showConfirm } from '../../utils/alert';

type Props = HomeScreenProps<'ManageHabits'>;

/**
 * Curated practice card — this week's progress + edit. Every curated practice
 * is always on the user's home (no adopt/remove); completion lives on Home.
 * This screen is for managing weekly goals and plans, not checking reps off.
 */
const PracticeCard: React.FC<{
  practice: Practice;
  color: string;
  habit?: PracticeInstance;
  weekDone: number;
  onOpen: () => void;
  onEdit: () => void;
}> = ({ practice, color, habit, weekDone, onOpen, onEdit }) => {
  // A target of 0 means the practice has no weekly goal yet.
  const hasGoal = !!habit && (habit.target_count_per_week || 0) >= 1;
  const target = hasGoal ? habit!.target_count_per_week : practice.suggested_target_per_week;
  const complete = hasGoal && weekDone >= target;

  return (
    <TouchableOpacity style={styles.card} onPress={onOpen} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: color + '1A' }]}>
          <Ionicons name={practice.icon as any} size={20} color={color} />
        </View>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle}>{practice.name}</Text>
          <Text style={styles.cardTarget}>
            {hasGoal ? `${weekDone}/${target} this week` : 'Set a goal'}
          </Text>
        </View>

        <View style={styles.manageRow}>
          {complete && <Ionicons name="checkmark-circle" size={18} color={Colors.success} />}
          {!!habit && (
            <TouchableOpacity onPress={onEdit} style={styles.iconBtn} hitSlop={8}>
              <Ionicons name="pencil-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={styles.cardDesc}>{practice.description}</Text>
      <View style={styles.learnRow}>
        <Text style={[styles.learnLink, { color }]}>Learn how & why</Text>
        <Ionicons name="chevron-forward" size={14} color={color} />
      </View>
      {!practice.core && practice.optional_reason && (
        <Text style={styles.optionalReason}>{practice.optional_reason}</Text>
      )}
    </TouchableOpacity>
  );
};

/** Card for a user-authored (custom) practice — always adopted; edit/remove only. */
const CustomPracticeCard: React.FC<{
  habit: PracticeInstance;
  color: string;
  weekDone: number;
  onOpen: () => void;
  onEdit: () => void;
  onRemove: () => void;
}> = ({ habit, color, weekDone, onOpen, onEdit, onRemove }) => {
  const target = habit.target_count_per_week;
  const complete = weekDone >= target;

  return (
    <TouchableOpacity style={styles.card} onPress={onOpen} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: color + '1A' }]}>
          <Ionicons name="ellipse-outline" size={20} color={color} />
        </View>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle}>{habit.name}</Text>
          <Text style={styles.cardTarget}>{weekDone}/{target} this week</Text>
        </View>
        <View style={styles.manageRow}>
          {complete && <Ionicons name="checkmark-circle" size={18} color={Colors.success} />}
          <TouchableOpacity onPress={onEdit} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="pencil-outline" size={18} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onRemove} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="close-circle-outline" size={18} color={Colors.gray} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

/**
 * The single practice management screen: browse the curated protocol by group
 * and edit weekly goals. Every curated practice lives on Home automatically
 * (no adopt/remove); doing reps (completion) also lives on Home — this screen
 * never logs a completion. Route name 'ManageHabits'.
 */
export const PracticesScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [habits, setHabits] = useState<PracticeInstance[]>([]);
  const [weekly, setWeekly] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Edit form
  const [editingHabit, setEditingHabit] = useState<PracticeInstance | null>(null);
  const [editName, setEditName] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  // The habit whose schedule sheet is open — separate from the name form, since
  // the schedule saves on its own.
  const [schedulingHabit, setSchedulingHabit] = useState<PracticeInstance | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [hs, counts] = await Promise.all([
        getActiveHabits(user.uid),
        getWeeklyCompletionCounts(user.uid),
      ]);
      setHabits(hs);
      setWeekly(counts);
    } catch (err) {
      console.warn('Failed to load practices:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const habitForPractice = (practice: Practice): PracticeInstance | undefined =>
    habits.find((h) => h.practice_id === practice.id) ||
    habits.find((h) => h.name.trim().toLowerCase() === practice.name.toLowerCase());

  const isCustom = (h: PracticeInstance): boolean =>
    !getAllPractices().some(
      (p) => p.id === h.practice_id || p.name.toLowerCase() === h.name.trim().toLowerCase()
    );
  const customHabits = habits.filter(isCustom);
  const customForGroup = (groupId: Practice['group']): PracticeInstance[] =>
    customHabits.filter((h) => resolvePracticeGroup(h) === groupId);

  const startEdit = (habit: PracticeInstance) => {
    setEditingHabit(habit);
    setEditName(habit.name);
  };

  const cancelEdit = () => {
    setEditingHabit(null);
    setEditName('');
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      showAlert('Required', 'Practice name cannot be empty.');
      return;
    }
    if (!user || !editingHabit) return;
    setEditLoading(true);
    try {
      await updateHabit(user.uid, editingHabit.id, {
        name: editName.trim(),
      } as Partial<PracticeInstance>);
      cancelEdit();
      await load();
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setEditLoading(false);
    }
  };

  // Writing the schedule goes through the one writer that keeps the chosen days
  // and the weekly target in agreement — editing the target alone would leave a
  // habit still pinned to weekdays it no longer claims.
  const handleSaveSchedule = async (habit: PracticeInstance, schedule: HabitSchedule) => {
    if (!user) return;
    try {
      await setHabitSchedule(user.uid, habit.id, schedule);
      if (habit.reminder?.enabled) {
        await syncHabitReminder(user.uid, habit.id, habit.reminder);
      }
      await load();
    } catch (e: any) {
      showAlert("Couldn't save the schedule", e?.message ?? 'Please try again.');
    }
  };

  const handleArchive = (habit: PracticeInstance) => {
    showConfirm(
      'Archive this practice?',
      `"${habit.name}" comes off Home and stops counting toward your streaks. Every rep is kept — restore it any time from Archived.`,
      async () => {
        if (!user) return;
        try {
          await cancelHabitReminder(habit);
          await archiveHabit(user.uid, habit.id);
          await load();
        } catch (e: any) {
          showAlert('Error', e.message || 'Failed to archive practice.');
        }
      },
      'Archive'
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Your practice protocol. Every practice lives on Home — set weekly goals and plans here.
      </Text>

      {SHOW_HABIT_LIBRARY && !editingHabit && (
        <TouchableOpacity style={styles.libraryBtn} onPress={() => navigation.navigate('HabitLibrary')}>
          <Ionicons name="library-outline" size={16} color={Colors.secondary} />
          <Text style={styles.libraryBtnText}>Browse Practice Library</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.secondary} />
        </TouchableOpacity>
      )}

      {/* Edit form */}
      {editingHabit && (
        <Card style={styles.formCard}>
          <Text style={styles.editLabel}>Editing Practice</Text>
          <InputField label="Practice Name" value={editName} onChangeText={setEditName} placeholder="Practice name" />
          <Text style={styles.formLabel}>Schedule</Text>
          <TouchableOpacity
            style={styles.scheduleBtn}
            onPress={() => setSchedulingHabit(editingHabit)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
            <Text style={styles.scheduleBtnText}>{describeSchedule(editingHabit)}</Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.gray} />
          </TouchableOpacity>
          <View style={styles.formButtons}>
            <Button title="Save" onPress={handleSaveEdit} loading={editLoading} style={{ flex: 1 }} />
            <Button title="Cancel" onPress={cancelEdit} variant="outline" style={{ flex: 1 }} />
          </View>
        </Card>
      )}

      {PRACTICE_GROUPS.map((group) => {
        const curated = getPracticesByGroup(group.id);
        const custom = customForGroup(group.id);
        // Custom-practice creation was removed; the Custom group only appears
        // for users who still have previously created practices in it.
        if (curated.length === 0 && custom.length === 0) return null;
        return (
          <View key={group.id} style={styles.group}>
            <View style={styles.groupHeader}>
              <View style={[styles.groupDot, { backgroundColor: group.color }]} />
              <Text style={styles.groupName}>{group.name}</Text>
            </View>
            <Text style={styles.groupDesc}>{group.description}</Text>
            {curated.map((practice) => {
              const habit = habitForPractice(practice);
              return (
                <PracticeCard
                  key={practice.id}
                  practice={practice}
                  color={group.color}
                  habit={habit}
                  weekDone={habit ? weekly[habit.id] ?? 0 : 0}
                  onOpen={() => navigation.navigate('PracticeDetail', { practiceId: practice.id })}
                  onEdit={() => habit && startEdit(habit)}
                />
              );
            })}
            {custom.map((habit) => (
              <CustomPracticeCard
                key={habit.id}
                habit={habit}
                color={group.color}
                weekDone={weekly[habit.id] ?? 0}
                onOpen={() => navigation.navigate('PracticeDetail', { habitId: habit.id })}
                onEdit={() => startEdit(habit)}
                onRemove={() => handleArchive(habit)}
              />
            ))}
          </View>
        );
      })}

      {/* Practices you've put away. A one-line door rather than a buried
          setting: archiving is only reversible if the way back is findable. */}
      <TouchableOpacity
        style={styles.archivedLink}
        onPress={() => navigation.navigate('ArchivedHabits')}
        activeOpacity={0.7}
      >
        <Ionicons name="archive-outline" size={16} color={Colors.gray} />
        <Text style={styles.archivedLinkText}>Archived practices</Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.gray} />
      </TouchableOpacity>

      <WeeklyGoalSheet
        visible={!!schedulingHabit}
        practiceName={schedulingHabit?.name ?? ''}
        initialSchedule={
          schedulingHabit ? habitSchedule(schedulingHabit) : { kind: 'count', target: 3 }
        }
        onSave={(schedule) => {
          if (schedulingHabit) handleSaveSchedule(schedulingHabit, schedule);
        }}
        onClose={() => setSchedulingHabit(null)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.lightGray },
  intro: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, marginBottom: Spacing.lg },
  libraryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondary + '08',
  },
  libraryBtnText: { flex: 1, fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.secondary },
  formCard: { marginBottom: Spacing.lg },
  formLabel: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, marginBottom: Spacing.sm },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.lightGray,
    marginBottom: Spacing.md,
  },
  scheduleBtnText: { flex: 1, fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.dark },
  archivedLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cardBg,
  },
  archivedLinkText: { flex: 1, fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray },
  editLabel: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.primary, marginBottom: Spacing.sm },
  formButtons: { flexDirection: 'row', gap: Spacing.sm },
  group: { marginBottom: Spacing.xl },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  groupDot: { width: 12, height: 12, borderRadius: 6 },
  groupName: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, color: Colors.dark },
  groupDesc: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, marginTop: 2, marginBottom: Spacing.md },
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cardTitleWrap: { flex: 1 },
  cardTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark },
  cardTarget: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, marginTop: 1 },
  manageRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  iconBtn: { padding: Spacing.xs },
  cardDesc: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, marginTop: Spacing.sm },
  learnRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: Spacing.sm },
  learnLink: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs },
  optionalReason: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.secondary, marginTop: Spacing.xs },
});
