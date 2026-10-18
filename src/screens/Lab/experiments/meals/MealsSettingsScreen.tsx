import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../constants/theme';
import type { GroupGoal, MealSlot, MealsStackParamList } from '../../../../types/meals';
import { MAX_GROUP_GOALS, MAX_SLOTS, WHOLE_GROUPS } from '../../../../data/mealGroups';
import {
  addSlot,
  clampPassGoal,
  describeGroupGoal,
  describeMealGoal,
  newGroupGoal,
  removeSlot,
} from '../../../../services/mealsMath';
import { showConfirm } from '../../../../utils/alert';
import { useMeals } from './MealsContext';
import { MEALS_ACCENT, mls } from './components/mealsStyle';

type Props = NativeStackScreenProps<MealsStackParamList, 'MealsSettings'>;

const Stepper: React.FC<{ value: number; onChange: (n: number) => void; min: number; max: number; label: string }> = ({
  value,
  onChange,
  min,
  max,
  label,
}) => (
  <View style={styles.stepper}>
    <TouchableOpacity
      style={[styles.stepBtn, value <= min && mls.disabled]}
      onPress={() => onChange(value - 1)}
      disabled={value <= min}
      accessibilityLabel={`Fewer ${label}`}
    >
      <Ionicons name="remove" size={16} color={Colors.dark} />
    </TouchableOpacity>
    <Text style={styles.stepValue}>{value}</Text>
    <TouchableOpacity
      style={[styles.stepBtn, value >= max && mls.disabled]}
      onPress={() => onChange(value + 1)}
      disabled={value >= max}
      accessibilityLabel={`More ${label}`}
    >
      <Ionicons name="add" size={16} color={Colors.dark} />
    </TouchableOpacity>
  </View>
);

/** A meal's name, saved when you leave the field — not on every keystroke. */
const SlotRow: React.FC<{ slot: MealSlot; canRemove: boolean; onRename: (name: string) => void; onRemove: () => void }> = ({
  slot,
  canRemove,
  onRename,
  onRemove,
}) => {
  const [name, setName] = useState(slot.name);
  useEffect(() => setName(slot.name), [slot.name]);
  const commit = () => {
    const trimmed = name.trim();
    if (!trimmed) setName(slot.name);
    else if (trimmed !== slot.name) onRename(trimmed);
  };
  return (
    <View style={[mls.card, styles.row]}>
      <TextInput
        style={[styles.slotInput]}
        value={name}
        onChangeText={setName}
        onEndEditing={commit}
        maxLength={24}
        returnKeyType="done"
        accessibilityLabel={`Rename ${slot.name}`}
      />
      {canRemove && (
        <TouchableOpacity onPress={onRemove} hitSlop={8} accessibilityLabel={`Remove ${slot.name}`}>
          <Ionicons name="trash-outline" size={20} color={Colors.gray} />
        </TouchableOpacity>
      )}
    </View>
  );
};

export const MealsSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { prefs, updatePrefs, habits, newId } = useMeals();
  const [choosingFor, setChoosingFor] = useState<string | null>(null);

  const setGoals = (goals: GroupGoal[]) => updatePrefs({ group_goals: goals });
  const changeGoal = (id: string, changes: Partial<GroupGoal>) =>
    setGoals(prefs.group_goals.map((g) => (g.id === id ? { ...g, ...changes } : g)));

  const addMeal = () =>
    updatePrefs(addSlot(prefs, { id: newId(), name: prefs.slots.length === 3 ? 'Snack' : `Meal ${prefs.slots.length + 1}` }));

  const removeMeal = (slot: MealSlot) =>
    showConfirm(
      `Remove ${slot.name}?`,
      'Days already logged keep it. From today on, the day is scored without it.',
      () => updatePrefs(removeSlot(prefs, slot.id)),
      'Remove'
    );

  const renameMeal = (slotId: string, name: string) =>
    updatePrefs({ slots: prefs.slots.map((s) => (s.id === slotId ? { ...s, name } : s)) });

  const addGoal = () => {
    const goal = newGroupGoal(prefs.group_goals, newId());
    if (goal) setGoals([...prefs.group_goals, goal]);
  };

  const toggleLink = (habitId: string, on: boolean) => {
    const ids = new Set(prefs.linked_habit_ids);
    if (on) ids.add(habitId);
    else ids.delete(habitId);
    updatePrefs({ linked_habit_ids: [...ids] });
  };

  return (
    <ScrollView style={mls.screen} contentContainerStyle={mls.scroll} keyboardShouldPersistTaps="handled">
      <Text style={mls.sectionLabel}>My meals</Text>
      {prefs.slots.map((slot) => (
        <SlotRow
          key={slot.id}
          slot={slot}
          canRemove={prefs.slots.length > 1}
          onRename={(name) => renameMeal(slot.id, name)}
          onRemove={() => removeMeal(slot)}
        />
      ))}
      {prefs.slots.length < MAX_SLOTS && (
        <TouchableOpacity onPress={addMeal} style={styles.add}>
          <Ionicons name="add" size={16} color={MEALS_ACCENT} />
          <Text style={mls.link}>Add a meal</Text>
        </TouchableOpacity>
      )}
      <Text style={mls.muted}>Snacks and drinks between meals don’t need a meal — add them as “something additional”.</Text>

      <Text style={mls.sectionLabel}>My goal</Text>
      <View style={[mls.card, styles.goal]}>
        <View style={styles.goalLine}>
          <Text style={mls.title}>Pass</Text>
          <Stepper
            value={prefs.pass_goal}
            min={0}
            max={prefs.slots.length}
            label="meals to pass"
            onChange={(n) => updatePrefs({ pass_goal: clampPassGoal(n, prefs.slots.length) })}
          />
          <Text style={mls.title}>
            of {prefs.slots.length} {prefs.slots.length === 1 ? 'meal' : 'meals'}
          </Text>
        </View>
        <Text style={mls.muted}>{describeMealGoal(prefs)}</Text>
      </View>

      <View style={[mls.card, styles.row]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={mls.title}>Strict mode</Text>
          <Text style={mls.muted}>A meal passes on whole food only — no semi-processed either.</Text>
        </View>
        <Switch
          value={prefs.strict}
          onValueChange={(strict) => updatePrefs({ strict })}
          trackColor={{ true: MEALS_ACCENT }}
        />
      </View>

      <Text style={mls.sectionLabel}>Food-group goals</Text>
      <Text style={mls.muted}>
        Up to {MAX_GROUP_GOALS}. A daily goal has to be met for the day to be on target; a weekly one is a progress bar
        for the week.
      </Text>
      {prefs.group_goals.map((goal) => (
        <View key={goal.id} style={[mls.card, styles.goalCard]}>
          <View style={styles.row}>
            <Text style={[mls.title, { flex: 1 }]}>{describeGroupGoal(goal)}</Text>
            <TouchableOpacity
              onPress={() => setGoals(prefs.group_goals.filter((g) => g.id !== goal.id))}
              hitSlop={8}
              accessibilityLabel="Remove this goal"
            >
              <Ionicons name="trash-outline" size={20} color={Colors.gray} />
            </TouchableOpacity>
          </View>
          <View style={styles.goalControls}>
            <Stepper
              value={goal.count}
              min={1}
              max={goal.period === 'day' ? Math.max(1, prefs.slots.length + 3) : 21}
              label="times"
              onChange={(count) => changeGoal(goal.id, { count })}
            />
            <View style={styles.period}>
              {(['day', 'week'] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodBtn, goal.period === p && styles.periodBtnOn]}
                  onPress={() => changeGoal(goal.id, { period: p })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: goal.period === p }}
                >
                  <Text style={[styles.periodText, goal.period === p && styles.periodTextOn]}>
                    {p === 'day' ? 'Per day' : 'Per week'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => setChoosingFor(choosingFor === goal.id ? null : goal.id)}>
              <Text style={mls.link}>{choosingFor === goal.id ? 'Done' : 'Change food'}</Text>
            </TouchableOpacity>
          </View>
          {choosingFor === goal.id && (
            <View style={mls.chipRow}>
              {WHOLE_GROUPS.map((g) => {
                const active = goal.group === g.id;
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={[mls.chip, active && mls.chipActive]}
                    onPress={() => changeGoal(goal.id, { group: g.id })}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                  >
                    <Text style={[mls.chipText, active && mls.chipTextActive]}>{g.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      ))}
      {prefs.group_goals.length < MAX_GROUP_GOALS && (
        <TouchableOpacity onPress={addGoal} style={styles.add}>
          <Ionicons name="add" size={16} color={MEALS_ACCENT} />
          <Text style={mls.link}>Add a food-group goal</Text>
        </TouchableOpacity>
      )}

      <Text style={mls.sectionLabel}>The habit Meals checks off</Text>
      <Text style={mls.muted}>
        An on-target day checks off the habit you link here, with the usual “How hard was it to start?”. A custom habit like
        “Eat real food” works well. With the Lab switch on, it also gets an Open Meals button on Today.
      </Text>
      {habits.length === 0 && <Text style={mls.muted}>No active habits yet.</Text>}
      {habits.map((h) => (
        <View key={h.id} style={[mls.card, styles.row]}>
          <Text style={[mls.title, { flex: 1 }]}>{h.name}</Text>
          <Switch
            value={prefs.linked_habit_ids.includes(h.id)}
            onValueChange={(on) => toggleLink(h.id, on)}
            trackColor={{ true: MEALS_ACCENT }}
          />
        </View>
      ))}

      <TouchableOpacity onPress={() => navigation.navigate('MealsGuide')} style={styles.add}>
        <Ionicons name="information-circle-outline" size={16} color={MEALS_ACCENT} />
        <Text style={mls.link}>What counts as what</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  slotInput: { flex: 1, fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark, paddingVertical: 2 },
  add: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4 },
  goal: { gap: Spacing.sm },
  goalLine: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flexWrap: 'wrap' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark, minWidth: 22, textAlign: 'center' },
  goalCard: { gap: Spacing.md },
  goalControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flexWrap: 'wrap' },
  period: { flexDirection: 'row', borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, overflow: 'hidden' },
  periodBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: Colors.lightGray },
  periodBtnOn: { backgroundColor: MEALS_ACCENT },
  periodText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.gray },
  periodTextOn: { color: Colors.white },
});
