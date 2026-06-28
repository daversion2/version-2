import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PRACTICE_GROUPS, PRACTICES, getPracticesByGroup, resolvePracticeGroup, Practice, PracticeGroup } from '../../data/practices';
import { HomeScreenProps } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { getActiveHabits, getWeeklyCompletionCounts, createHabit, updateHabit } from '../../services/practices';
import { cancelHabitReminder } from '../../services/habitReminders';
import { PracticeInstance } from '../../types';
import { SHOW_HABIT_LIBRARY } from '../../constants/featureFlags';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { GoalTagPicker } from '../../components/goals/GoalTagPicker';
import { showAlert, showConfirm } from '../../utils/alert';

type Props = HomeScreenProps<'ManageHabits'>;

/**
 * Curated practice card — adopt it, or (once adopted) see this week's progress and
 * edit/remove it. Completion lives on Home; this screen is for building & managing
 * the protocol, not checking reps off.
 */
const PracticeCard: React.FC<{
  practice: Practice;
  color: string;
  habit?: PracticeInstance;
  weekDone: number;
  busy: boolean;
  onOpen: () => void;
  onAdopt: () => void;
  onEdit: () => void;
  onRemove: () => void;
}> = ({ practice, color, habit, weekDone, busy, onOpen, onAdopt, onEdit, onRemove }) => {
  const adopted = !!habit;
  const target = habit?.target_count_per_week ?? practice.suggested_target_per_week;
  const complete = adopted && weekDone >= target;

  return (
    <TouchableOpacity style={styles.card} onPress={onOpen} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: color + '1A' }]}>
          <Ionicons name={practice.icon as any} size={20} color={color} />
        </View>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle}>{practice.name}</Text>
          <Text style={styles.cardTarget}>
            {adopted ? `${weekDone}/${target} this week` : `${target}×/week`}
          </Text>
        </View>

        {!adopted ? (
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: color }]}
            onPress={onAdopt}
            disabled={busy}
            activeOpacity={0.7}
          >
            {busy ? (
              <ActivityIndicator size="small" color={color} />
            ) : (
              <>
                <Ionicons name="add" size={16} color={color} />
                <Text style={[styles.addBtnText, { color }]}>Add</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.manageRow}>
            {complete && <Ionicons name="checkmark-circle" size={18} color={Colors.success} />}
            <TouchableOpacity onPress={onEdit} style={styles.iconBtn} hitSlop={8}>
              <Ionicons name="pencil-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onRemove} style={styles.iconBtn} hitSlop={8}>
              <Ionicons name="close-circle-outline" size={18} color={Colors.gray} />
            </TouchableOpacity>
          </View>
        )}
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

const FREQ = [1, 2, 3, 4, 5, 6, 7];

/**
 * The single practice management screen: browse the curated protocol by group,
 * adopt practices, create your own, and edit/remove what you've adopted. Reached
 * from Home → Add activity → Practice (route name 'ManageHabits'). Doing reps
 * (completion) lives on Home; this screen never logs a completion.
 */
export const PracticesScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user } = useAuth();
  const [habits, setHabits] = useState<PracticeInstance[]>([]);
  const [weekly, setWeekly] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Create-custom form
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState<PracticeGroup>('custom');
  const [timesPerWeek, setTimesPerWeek] = useState(3);
  const [goalIds, setGoalIds] = useState<string[]>([]);
  const [formLoading, setFormLoading] = useState(false);

  // Edit form
  const [editingHabit, setEditingHabit] = useState<PracticeInstance | null>(null);
  const [editName, setEditName] = useState('');
  const [editTimesPerWeek, setEditTimesPerWeek] = useState(3);
  const [editGoalIds, setEditGoalIds] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(false);

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

  // Deep-link: open the create form directly (the "Add practice" entry point).
  useEffect(() => {
    if (route.params?.openAddForm) {
      setShowForm(true);
      navigation.setParams({ openAddForm: undefined });
    }
  }, [route.params?.openAddForm]);

  const habitForPractice = (practice: Practice): PracticeInstance | undefined =>
    habits.find((h) => h.practice_id === practice.id) ||
    habits.find((h) => h.name.trim().toLowerCase() === practice.name.toLowerCase());

  const isCustom = (h: PracticeInstance): boolean =>
    !PRACTICES.some(
      (p) => p.id === h.practice_id || p.name.toLowerCase() === h.name.trim().toLowerCase()
    );
  const customHabits = habits.filter(isCustom);
  const customForGroup = (groupId: Practice['group']): PracticeInstance[] =>
    customHabits.filter((h) => resolvePracticeGroup(h) === groupId);

  const handleAdopt = async (practice: Practice) => {
    if (!user) return;
    setBusyId(practice.id);
    try {
      await createHabit(user.uid, {
        name: practice.name,
        target_count_per_week: practice.suggested_target_per_week,
        practice_id: practice.id,
        created_by_user: false,
      });
      await load();
    } catch (err) {
      console.warn('Failed to adopt practice:', err);
    } finally {
      setBusyId(null);
    }
  };

  const resetCreateForm = () => {
    setNewName('');
    setNewGroup('custom');
    setTimesPerWeek(3);
    setGoalIds([]);
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      showAlert('Required', 'Enter a practice name.');
      return;
    }
    if (!user) return;
    setFormLoading(true);
    try {
      const habitId = await createHabit(user.uid, {
        name: newName.trim(),
        target_count_per_week: timesPerWeek,
        group: newGroup,
        ...(goalIds.length > 0 ? { goal_ids: goalIds } : {}),
      });
      resetCreateForm();
      setShowForm(false);
      await load();
      navigation.navigate('HabitActionPlan', { habitId, afterSaveRoute: 'ManageHabits' });
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setFormLoading(false);
    }
  };

  const startEdit = (habit: PracticeInstance) => {
    setEditingHabit(habit);
    setEditName(habit.name);
    setEditTimesPerWeek(habit.target_count_per_week);
    setEditGoalIds(habit.goal_ids || []);
    setShowForm(false);
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
        target_count_per_week: editTimesPerWeek,
        goal_ids: editGoalIds,
      } as Partial<PracticeInstance>);
      cancelEdit();
      await load();
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleRemove = (habit: PracticeInstance) => {
    showConfirm(
      'Remove',
      `Remove "${habit.name}" from your practices?`,
      async () => {
        if (!user) return;
        try {
          await cancelHabitReminder(habit);
          await updateHabit(user.uid, habit.id, { is_active: false });
          await load();
        } catch (e: any) {
          showAlert('Error', e.message || 'Failed to remove practice.');
        }
      },
      'Remove'
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
        Your practice protocol. Add practices to your routine, then check them off on Home.
      </Text>

      {SHOW_HABIT_LIBRARY && !showForm && !editingHabit && (
        <TouchableOpacity style={styles.libraryBtn} onPress={() => navigation.navigate('HabitLibrary')}>
          <Ionicons name="library-outline" size={16} color={Colors.secondary} />
          <Text style={styles.libraryBtnText}>Browse Habit Library</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.secondary} />
        </TouchableOpacity>
      )}

      {/* Create-custom form */}
      {showForm && (
        <Card style={styles.formCard}>
          <InputField
            label="Practice Name"
            value={newName}
            onChangeText={setNewName}
            placeholder="e.g. Read 10 pages"
          />
          <Text style={styles.formLabel}>Group</Text>
          <View style={styles.chipRow}>
            {PRACTICE_GROUPS.map((g) => {
              const active = newGroup === g.id;
              return (
                <TouchableOpacity
                  key={g.id}
                  onPress={() => setNewGroup(g.id)}
                  style={[styles.groupChip, { borderColor: g.color }, active && { backgroundColor: g.color }]}
                >
                  <Text style={[styles.groupChipText, active && { color: Colors.white }]}>{g.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.formLabel}>Times per week</Text>
          <View style={styles.chipRow}>
            {FREQ.map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => setTimesPerWeek(n)}
                style={[styles.freqChip, timesPerWeek === n && styles.freqChipActive]}
              >
                <Text style={[styles.freqChipText, timesPerWeek === n && { color: Colors.white }]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <GoalTagPicker
            selectedGoalIds={goalIds}
            onChange={setGoalIds}
            onCreateGoal={() => navigation.navigate('GoalCreationFlow')}
          />
          <View style={styles.formButtons}>
            <Button title="Add" onPress={handleCreate} loading={formLoading} style={{ flex: 1 }} />
            <Button
              title="Cancel"
              onPress={() => { setShowForm(false); resetCreateForm(); }}
              variant="outline"
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      )}

      {/* Edit form */}
      {editingHabit && (
        <Card style={styles.formCard}>
          <Text style={styles.editLabel}>Editing Practice</Text>
          <InputField label="Practice Name" value={editName} onChangeText={setEditName} placeholder="Practice name" />
          <Text style={styles.formLabel}>Times per week</Text>
          <View style={styles.chipRow}>
            {FREQ.map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => setEditTimesPerWeek(n)}
                style={[styles.freqChip, editTimesPerWeek === n && styles.freqChipActive]}
              >
                <Text style={[styles.freqChipText, editTimesPerWeek === n && { color: Colors.white }]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <GoalTagPicker
            selectedGoalIds={editGoalIds}
            onChange={setEditGoalIds}
            onCreateGoal={() => navigation.navigate('GoalCreationFlow')}
          />
          <View style={styles.formButtons}>
            <Button title="Save" onPress={handleSaveEdit} loading={editLoading} style={{ flex: 1 }} />
            <Button title="Cancel" onPress={cancelEdit} variant="outline" style={{ flex: 1 }} />
          </View>
        </Card>
      )}

      {PRACTICE_GROUPS.map((group) => (
        <View key={group.id} style={styles.group}>
          <View style={styles.groupHeader}>
            <View style={[styles.groupDot, { backgroundColor: group.color }]} />
            <Text style={styles.groupName}>{group.name}</Text>
          </View>
          <Text style={styles.groupDesc}>{group.description}</Text>
          {getPracticesByGroup(group.id).map((practice) => {
            const habit = habitForPractice(practice);
            return (
              <PracticeCard
                key={practice.id}
                practice={practice}
                color={group.color}
                habit={habit}
                weekDone={habit ? weekly[habit.id] ?? 0 : 0}
                busy={busyId === practice.id}
                onOpen={() => navigation.navigate('PracticeDetail', { practiceId: practice.id })}
                onAdopt={() => handleAdopt(practice)}
                onEdit={() => habit && startEdit(habit)}
                onRemove={() => habit && handleRemove(habit)}
              />
            );
          })}
          {customForGroup(group.id).map((habit) => (
            <CustomPracticeCard
              key={habit.id}
              habit={habit}
              color={group.color}
              weekDone={weekly[habit.id] ?? 0}
              onOpen={() => navigation.navigate('PracticeDetail', { habitId: habit.id })}
              onEdit={() => startEdit(habit)}
              onRemove={() => handleRemove(habit)}
            />
          ))}
          {group.id === 'custom' && !showForm && !editingHabit && (
            <TouchableOpacity style={styles.createCard} onPress={() => setShowForm(true)} activeOpacity={0.7}>
              <Ionicons name="add-circle-outline" size={20} color={group.color} />
              <Text style={[styles.createCardText, { color: group.color }]}>Create your own</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
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
  editLabel: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.primary, marginBottom: Spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  groupChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2, borderRadius: BorderRadius.full, borderWidth: 2 },
  groupChipText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xs, color: Colors.dark },
  freqChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqChipActive: { backgroundColor: Colors.primary },
  freqChipText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.primary },
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    minWidth: 64,
    justifyContent: 'center',
  },
  addBtnText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs },
  manageRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  iconBtn: { padding: Spacing.xs },
  cardDesc: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, marginTop: Spacing.sm },
  learnRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: Spacing.sm },
  learnLink: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs },
  optionalReason: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.secondary, marginTop: Spacing.xs },
  createCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.gray,
  },
  createCardText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm },
});
