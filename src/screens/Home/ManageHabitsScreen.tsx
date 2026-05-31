import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreenProps } from '../../types/navigation';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { useAuth } from '../../context/AuthContext';
import { getActiveHabits, createHabit, updateHabit } from '../../services/habits';
import { Nudge } from '../../types';
import { showAlert, showConfirm } from '../../utils/alert';
import { GoalTagPicker } from '../../components/goals/GoalTagPicker';

type Props = HomeScreenProps<'ManageHabits'>;

export const ManageHabitsScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();

  const [habits, setHabits] = useState<Nudge[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [timesPerWeek, setTimesPerWeek] = useState(3);
  const [goalIds, setGoalIds] = useState<string[]>([]);

  // Edit mode state
  const [editingHabit, setEditingHabit] = useState<Nudge | null>(null);
  const [editName, setEditName] = useState('');
  const [editTimesPerWeek, setEditTimesPerWeek] = useState(3);
  const [editLoading, setEditLoading] = useState(false);
  const [editGoalIds, setEditGoalIds] = useState<string[]>([]);

  const load = async () => {
    if (!user) return;
    const h = await getActiveHabits(user.uid);
    setHabits(h);

  };

  useEffect(() => {
    load();
  }, [user]);


  const handleAdd = async () => {
    if (!newName.trim()) {
      showAlert('Required', 'Enter a habit name.');
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      const habitId = await createHabit(user.uid, {
        name: newName.trim(),
        target_count_per_week: timesPerWeek,
        ...(goalIds.length > 0 ? { goal_ids: goalIds } : {}),
      });
      setNewName('');
      setTimesPerWeek(3);
      setGoalIds([]);
      setShowForm(false);
      await load();
      navigation.navigate('HabitActionPlan', {
        habitId,
        afterSaveRoute: 'ManageHabits',
      });
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (habit: Nudge) => {
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
      showAlert('Required', 'Habit name cannot be empty.');
      return;
    }
    if (!user || !editingHabit) return;
    setEditLoading(true);
    try {
      await updateHabit(user.uid, editingHabit.id, {
        name: editName.trim(),
        target_count_per_week: editTimesPerWeek,
        goal_ids: editGoalIds,
      } as Partial<Nudge>);
      cancelEdit();
      await load();
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeactivate = (habit: Nudge) => {
    showConfirm(
      'Deactivate',
      `Remove "${habit.name}" from your active habits?`,
      async () => {
        if (!user) return;
        await updateHabit(user.uid, habit.id, { is_active: false });
        await load();
      },
      'Deactivate'
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Manage Habits</Text>

      {!showForm && !editingHabit && (
        <TouchableOpacity
          style={styles.libraryBtn}
          onPress={() => navigation.navigate('HabitLibrary')}
        >
          <Ionicons name="library-outline" size={16} color={Colors.secondary} />
          <Text style={styles.libraryBtnText}>Browse Habit Library</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.secondary} />
        </TouchableOpacity>
      )}

      {showForm ? (
        <Card style={styles.formCard}>
          <InputField
            label="Habit Name"
            value={newName}
            onChangeText={setNewName}
            placeholder="e.g. Meditate 10 minutes"
          />
          <Text style={styles.catLabel}>Times per week</Text>
          <View style={styles.catRow}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => setTimesPerWeek(n)}
                style={[
                  styles.freqChip,
                  timesPerWeek === n && styles.freqChipActive,
                ]}
              >
                <Text style={[styles.freqChipText, timesPerWeek === n && { color: Colors.white }]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <GoalTagPicker
            selectedGoalIds={goalIds}
            onChange={setGoalIds}
            onCreateGoal={() => navigation.navigate('GoalCreationFlow')}
          />
          <View style={styles.formButtons}>
            <Button title="Add" onPress={handleAdd} loading={loading} style={{ flex: 1 }} />
            <Button
              title="Cancel"
              onPress={() => { setShowForm(false); setNewName(''); }}
              variant="outline"
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      ) : !editingHabit ? (
        <Button
          title="Add New Habit"
          onPress={() => setShowForm(true)}
          style={{ marginHorizontal: Spacing.lg, marginBottom: Spacing.md }}
        />
      ) : null}

      {/* Edit form (inline, replaces the add button when editing) */}
      {editingHabit && (
        <Card style={styles.formCard}>
          <Text style={styles.editLabel}>Editing Habit</Text>
          <InputField
            label="Habit Name"
            value={editName}
            onChangeText={setEditName}
            placeholder="Habit name"
          />
          <Text style={styles.catLabel}>Times per week</Text>
          <View style={styles.catRow}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => setEditTimesPerWeek(n)}
                style={[
                  styles.freqChip,
                  editTimesPerWeek === n && styles.freqChipActive,
                ]}
              >
                <Text style={[styles.freqChipText, editTimesPerWeek === n && { color: Colors.white }]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <GoalTagPicker
            selectedGoalIds={editGoalIds}
            onChange={setEditGoalIds}
            required
            onCreateGoal={() => navigation.navigate('GoalCreationFlow')}
          />
          <View style={styles.formButtons}>
            <Button title="Save" onPress={handleSaveEdit} loading={editLoading} style={{ flex: 1 }} />
            <Button
              title="Cancel"
              onPress={cancelEdit}
              variant="outline"
              style={{ flex: 1 }}
            />
          </View>
        </Card>
      )}

      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card style={styles.habitCard}>
            <View style={styles.habitRow}>
              <View style={styles.habitInfo}>
                <Text style={styles.habitName}>{item.name}</Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: Colors.primary + '15' }]}>
                    <Text style={[styles.badgeText, { color: Colors.primary }]}>
                      {item.target_count_per_week}x/week
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => startEdit(item)} style={styles.actionBtn}>
                  <Ionicons name="pencil-outline" size={20} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeactivate(item)} style={styles.actionBtn}>
                  <Ionicons name="close-circle-outline" size={20} color={Colors.gray} />
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No active habits.</Text>
        }
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lightGray, paddingTop: Spacing.lg },
  heading: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  formCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  editLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  catLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.sm,
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  catChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
  },
  catChipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.dark,
  },
  formButtons: { flexDirection: 'row', gap: Spacing.sm },
  list: { paddingHorizontal: Spacing.lg },
  habitCard: { marginBottom: Spacing.sm },
  habitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  habitInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  habitName: {
    fontFamily: Fonts.primary,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    padding: Spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  freqChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqChipActive: {
    backgroundColor: Colors.primary,
  },
  freqChipText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  empty: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  libraryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondary + '08',
  },
  libraryBtnText: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
  },
});
