import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { useAuth } from '../../context/AuthContext';
import { getActiveHabits, createHabit, updateHabit } from '../../services/habits';
import { Nudge, Category } from '../../types';
import { getUserCategories } from '../../services/categories';
import { showAlert, showConfirm } from '../../utils/alert';

type Props = NativeStackScreenProps<any, 'ManageHabits'>;

export const ManageHabitsScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Nudge[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCatIdx, setSelectedCatIdx] = useState(0);
  const [timesPerWeek, setTimesPerWeek] = useState(3);

  // Edit mode state
  const [editingHabit, setEditingHabit] = useState<Nudge | null>(null);
  const [editName, setEditName] = useState('');
  const [editCatIdx, setEditCatIdx] = useState(0);
  const [editTimesPerWeek, setEditTimesPerWeek] = useState(3);
  const [editLoading, setEditLoading] = useState(false);

  const load = async () => {
    if (!user) return;
    const [h, cats] = await Promise.all([
      getActiveHabits(user.uid),
      getUserCategories(user.uid),
    ]);
    setHabits(h);
    setCategories(cats);
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
      await createHabit(user.uid, {
        name: newName.trim(),
        category_id: categories[selectedCatIdx]?.name || 'Uncategorized',
        target_count_per_week: timesPerWeek,
      });
      setNewName('');
      setTimesPerWeek(3);
      setShowForm(false);
      await load();
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (habit: Nudge) => {
    setEditingHabit(habit);
    setEditName(habit.name);
    const catIdx = categories.findIndex((c) => c.name === habit.category_id);
    setEditCatIdx(catIdx >= 0 ? catIdx : 0);
    setEditTimesPerWeek(habit.target_count_per_week);
    setShowForm(false);
  };

  const cancelEdit = () => {
    setEditingHabit(null);
    setEditName('');
    setEditCatIdx(0);
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
        category_id: categories[editCatIdx]?.name || 'Uncategorized',
        target_count_per_week: editTimesPerWeek,
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

  const getCatColor = (catName: string) => {
    const cat = categories.find((c) => c.name === catName);
    return cat?.color || Colors.gray;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Manage Habits</Text>

      {showForm ? (
        <Card style={styles.formCard}>
          <InputField
            label="Habit Name"
            value={newName}
            onChangeText={setNewName}
            placeholder="e.g. Meditate 10 minutes"
          />
          <Text style={styles.catLabel}>Category</Text>
          <View style={styles.catRow}>
            {categories.map((cat, i) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCatIdx(i)}
                style={[
                  styles.catChip,
                  { borderColor: cat.color },
                  selectedCatIdx === i && { backgroundColor: cat.color },
                ]}
              >
                <Text style={[styles.catChipText, selectedCatIdx === i && { color: Colors.white }]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
          <Text style={styles.catLabel}>Category</Text>
          <View style={styles.catRow}>
            {categories.map((cat, i) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setEditCatIdx(i)}
                style={[
                  styles.catChip,
                  { borderColor: cat.color },
                  editCatIdx === i && { backgroundColor: cat.color },
                ]}
              >
                <Text style={[styles.catChipText, editCatIdx === i && { color: Colors.white }]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
                  <View style={[styles.badge, { backgroundColor: getCatColor(item.category_id) + '20' }]}>
                    <Text style={[styles.badgeText, { color: getCatColor(item.category_id) }]}>
                      {item.category_id}
                    </Text>
                  </View>
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
});
