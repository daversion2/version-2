import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../constants/theme';
import type {
  CustomFoodGroup,
  GroupGoal,
  MealSlot,
  MealsScoringWeights,
  MealsStackParamList,
  NutrientId,
} from '../../../../types/meals';
import {
  DEFAULT_MEALS_SCORING,
  MAX_CUSTOM_GROUPS,
  MAX_GROUP_GOALS,
  MAX_SLOTS,
  NUTRIENTS,
  WHOLE_GROUPS,
} from '../../../../data/mealGroups';
import {
  activeCustomGroups,
  addSlot,
  archiveCustomGroup,
  describeGroupGoal,
  moveSlot,
  newCustomGroup,
  newGroupGoal,
  removeSlot,
  updateCustomGroup,
} from '../../../../services/mealsMath';
import { showConfirm } from '../../../../utils/alert';
import { clampWeeklyGoal } from '../../../../services/appCheckins';
import { WeeklyGoalPicker } from '../../../../components/miniapps/WeeklyGoalPicker';
import { useMeals } from './MealsContext';
import { MEALS_ACCENT, NUTRIENT_COLOR, mls } from './components/mealsStyle';

type Props = NativeStackScreenProps<MealsStackParamList, 'MealsSettings'>;

const Stepper: React.FC<{
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
}> = ({ value, onChange, min, max, step = 1, label }) => (
  <View style={styles.stepper}>
    <TouchableOpacity
      style={[styles.stepBtn, value <= min && mls.disabled]}
      onPress={() => onChange(Math.max(min, value - step))}
      disabled={value <= min}
      accessibilityLabel={`Fewer ${label}`}
    >
      <Ionicons name="remove" size={16} color={Colors.dark} />
    </TouchableOpacity>
    <Text style={styles.stepValue}>{value}</Text>
    <TouchableOpacity
      style={[styles.stepBtn, value >= max && mls.disabled]}
      onPress={() => onChange(Math.min(max, value + step))}
      disabled={value >= max}
      accessibilityLabel={`More ${label}`}
    >
      <Ionicons name="add" size={16} color={Colors.dark} />
    </TouchableOpacity>
  </View>
);

/** A meal's name, saved when you leave the field — not on every keystroke. Arrows move it up or down. */
const SlotRow: React.FC<{
  slot: MealSlot;
  canRemove: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onRename: (name: string) => void;
  onRemove: () => void;
  onMove: (by: -1 | 1) => void;
}> = ({ slot, canRemove, canMoveUp, canMoveDown, onRename, onRemove, onMove }) => {
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
      <View style={styles.moves}>
        <TouchableOpacity
          onPress={() => onMove(-1)}
          disabled={!canMoveUp}
          style={!canMoveUp && mls.disabled}
          hitSlop={6}
          accessibilityLabel={`Move ${slot.name} up`}
        >
          <Ionicons name="chevron-up" size={20} color={Colors.gray} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onMove(1)}
          disabled={!canMoveDown}
          style={!canMoveDown && mls.disabled}
          hitSlop={6}
          accessibilityLabel={`Move ${slot.name} down`}
        >
          <Ionicons name="chevron-down" size={20} color={Colors.gray} />
        </TouchableOpacity>
      </View>
      {canRemove && (
        <TouchableOpacity onPress={onRemove} hitSlop={8} accessibilityLabel={`Remove ${slot.name}`}>
          <Ionicons name="trash-outline" size={20} color={Colors.gray} />
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * One of your own foods: its name (saved on leaving the field), its score and
 * the tags it carries. Removing it only archives it — see archiveCustomGroup.
 */
const CustomFoodRow: React.FC<{
  food: CustomFoodGroup;
  autoFocus: boolean;
  onChange: (changes: Partial<Omit<CustomFoodGroup, 'id'>>) => void;
  onRemove: () => void;
}> = ({ food, autoFocus, onChange, onRemove }) => {
  const [name, setName] = useState(food.label);
  useEffect(() => setName(food.label), [food.label]);
  const commit = () => {
    const trimmed = name.trim();
    if (!trimmed) setName(food.label);
    else if (trimmed !== food.label) onChange({ label: trimmed });
  };
  const toggleTag = (id: NutrientId) =>
    onChange({ nutrients: food.nutrients.includes(id) ? food.nutrients.filter((n) => n !== id) : [...food.nutrients, id] });
  return (
    <View style={[mls.card, styles.goalCard]}>
      <View style={styles.row}>
        <TextInput
          style={styles.slotInput}
          value={name}
          onChangeText={setName}
          onEndEditing={commit}
          autoFocus={autoFocus}
          selectTextOnFocus={autoFocus}
          maxLength={28}
          returnKeyType="done"
          accessibilityLabel={`Rename ${food.label}`}
        />
        <TouchableOpacity onPress={onRemove} hitSlop={8} accessibilityLabel={`Remove ${food.label}`}>
          <Ionicons name="trash-outline" size={20} color={Colors.gray} />
        </TouchableOpacity>
      </View>
      <View style={styles.goalLine}>
        <Text style={mls.body}>Scores</Text>
        <Stepper
          value={food.score}
          min={0}
          max={100}
          step={5}
          label={`${food.label} score`}
          onChange={(score) => onChange({ score })}
        />
      </View>
      <View style={mls.chipRow}>
        {NUTRIENTS.map((n) => {
          const on = food.nutrients.includes(n.id);
          const color = NUTRIENT_COLOR[n.id];
          return (
            <TouchableOpacity
              key={n.id}
              style={[mls.chip, on && { borderColor: color, backgroundColor: color }]}
              onPress={() => toggleTag(n.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${food.label} has ${n.label}`}
            >
              <Text style={[mls.chipText, on && mls.chipTextActive]}>{n.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export const MealsSettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { prefs, updatePrefs, habits, newId } = useMeals();
  const [choosingFor, setChoosingFor] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const customGroups = prefs.custom_groups ?? [];
  const myFoods = activeCustomGroups(customGroups);

  const setWeight = (key: keyof MealsScoringWeights, n: number) =>
    updatePrefs({ scoring: { ...prefs.scoring, [key]: n } });

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

  const moveMeal = (slotId: string, by: -1 | 1) => updatePrefs(moveSlot(prefs, slotId, by));

  const addFood = () => {
    const food = newCustomGroup(customGroups, newId(), prefs.scoring.on_target_threshold);
    if (!food) return;
    setJustAdded(food.id);
    updatePrefs({ custom_groups: [...customGroups, food] });
  };

  const changeFood = (id: string, changes: Partial<Omit<CustomFoodGroup, 'id'>>) =>
    updatePrefs({ custom_groups: updateCustomGroup(customGroups, id, changes) });

  const removeFood = (food: CustomFoodGroup) =>
    showConfirm(
      `Remove ${food.label}?`,
      'It leaves the picker. Days already logged with it keep it.',
      () => updatePrefs({ custom_groups: archiveCustomGroup(customGroups, food.id) }),
      'Remove'
    );

  const addGoal = () => {
    const goal = newGroupGoal(prefs.group_goals, newId());
    if (goal) setGoals([...prefs.group_goals, goal]);
  };

  return (
    <ScrollView style={mls.screen} contentContainerStyle={mls.scroll} keyboardShouldPersistTaps="handled">
      <Text style={mls.sectionLabel}>Weekly goal</Text>
      <WeeklyGoalPicker
        noun="days logged"
        value={clampWeeklyGoal(prefs.weekly_goal, 'meals')}
        accent={MEALS_ACCENT}
        onChange={(n) => updatePrefs({ weekly_goal: n })}
      />

      <Text style={mls.sectionLabel}>My meals</Text>
      {prefs.slots.map((slot, i) => (
        <SlotRow
          key={slot.id}
          slot={slot}
          canRemove={prefs.slots.length > 1}
          canMoveUp={i > 0}
          canMoveDown={i < prefs.slots.length - 1}
          onRename={(name) => renameMeal(slot.id, name)}
          onRemove={() => removeMeal(slot)}
          onMove={(by) => moveMeal(slot.id, by)}
        />
      ))}
      {prefs.slots.length < MAX_SLOTS && (
        <TouchableOpacity onPress={addMeal} style={styles.add}>
          <Ionicons name="add" size={16} color={MEALS_ACCENT} />
          <Text style={mls.link}>Add a meal</Text>
        </TouchableOpacity>
      )}
      <Text style={mls.muted}>Snacks and drinks between meals don’t need a meal — add them as “something additional”.</Text>

      <Text style={mls.sectionLabel}>My foods</Text>
      <Text style={mls.muted}>
        Foods the groups don’t fit, like a carb supplement. On its own, a plate scores what you give the food. With other
        food, it’s one share of the plate at that score. Tags show on the plate but add no points.
      </Text>
      {myFoods.map((food) => (
        <CustomFoodRow
          key={food.id}
          food={food}
          autoFocus={food.id === justAdded}
          onChange={(changes) => changeFood(food.id, changes)}
          onRemove={() => removeFood(food)}
        />
      ))}
      {myFoods.length < MAX_CUSTOM_GROUPS && (
        <TouchableOpacity onPress={addFood} style={styles.add}>
          <Ionicons name="add" size={16} color={MEALS_ACCENT} />
          <Text style={mls.link}>Add a food</Text>
        </TouchableOpacity>
      )}

      <Text style={mls.sectionLabel}>Scoring</Text>
      <View style={[mls.card, styles.goal]}>
        <View style={styles.goalLine}>
          <Text style={mls.title}>On target at</Text>
          <Stepper
            value={prefs.scoring.on_target_threshold}
            min={0}
            max={100}
            step={5}
            label="on-target threshold"
            onChange={(n) => setWeight('on_target_threshold', n)}
          />
        </View>
        <Text style={mls.muted}>Your day is on target once your plates average this score or more.</Text>
      </View>
      <View style={[mls.card, styles.goal]}>
        <View style={styles.goalLine}>
          <Text style={mls.title}>Whole-food ratio</Text>
          <Stepper
            value={prefs.scoring.ratio_points}
            min={0}
            max={100}
            step={5}
            label="whole-food ratio points"
            onChange={(n) => setWeight('ratio_points', n)}
          />
        </View>
        <Text style={mls.muted}>How much of a plate's score comes from how much of it was whole food.</Text>
      </View>
      <View style={[mls.card, styles.goal]}>
        <View style={styles.goalLine}>
          <Text style={mls.title}>Nutrient bonus</Text>
          <Stepper
            value={prefs.scoring.nutrient_bonus}
            min={0}
            max={20}
            label="nutrient bonus"
            onChange={(n) => setWeight('nutrient_bonus', n)}
          />
        </View>
        <Text style={mls.muted}>Added per nutrient (protein, fiber, healthy fats) the plate hits — up to 3.</Text>
      </View>
      <View style={[mls.card, styles.goal]}>
        <View style={styles.goalLine}>
          <Text style={mls.title}>Processed penalty</Text>
          <Stepper
            value={prefs.scoring.processed_penalty}
            min={0}
            max={100}
            step={5}
            label="processed penalty"
            onChange={(n) => setWeight('processed_penalty', n)}
          />
        </View>
        <Text style={mls.muted}>Subtracted when Processed is on the plate, on top of what it already costs the ratio.</Text>
      </View>
      <View style={[mls.card, styles.goal]}>
        <View style={styles.goalLine}>
          <Text style={mls.title}>Strict penalty</Text>
          <Stepper
            value={prefs.scoring.strict_penalty}
            min={0}
            max={50}
            step={5}
            label="strict penalty"
            onChange={(n) => setWeight('strict_penalty', n)}
          />
        </View>
        <Text style={mls.muted}>Strict mode only: subtracted when Dairy, Semi-processed or Protein shake are on the plate.</Text>
      </View>
      <TouchableOpacity onPress={() => updatePrefs({ scoring: DEFAULT_MEALS_SCORING })} style={styles.add}>
        <Ionicons name="refresh" size={16} color={MEALS_ACCENT} />
        <Text style={mls.link}>Reset scoring to defaults</Text>
      </TouchableOpacity>

      <View style={[mls.card, styles.row]}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={mls.title}>Strict mode</Text>
          <Text style={mls.muted}>
            Dairy, Semi-processed and Protein shake (mixed with food) cost −{prefs.scoring.strict_penalty} instead of only diluting your ratio.
          </Text>
        </View>
        <Switch
          value={prefs.strict}
          onValueChange={(strict) => updatePrefs({ strict })}
          trackColor={{ true: MEALS_ACCENT }}
        />
      </View>

      <Text style={mls.sectionLabel}>Food-group goals</Text>
      <Text style={mls.muted}>
        Up to {MAX_GROUP_GOALS}. A progress readout, not a gate — it doesn't change whether the day is on target.
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

      <TouchableOpacity onPress={() => navigation.navigate('MealsGuide')} style={styles.add}>
        <Ionicons name="information-circle-outline" size={16} color={MEALS_ACCENT} />
        <Text style={mls.link}>What counts as what</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  moves: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
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
