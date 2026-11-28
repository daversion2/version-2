import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Spacing, TextStyles } from '../../../../constants/theme';
import { Stepper as SharedStepper } from '../../../../components/common/Stepper';
import { SegmentedControl } from '../../../../components/common/SegmentedControl';
import type {
  CustomFoodGroup,
  GroupGoal,
  MealGoalId,
  MealsScoringWeights,
  MealsStackParamList,
  NutrientId,
} from '../../../../types/meals';
import {
  DEFAULT_MEAL_GOAL,
  MAX_CUSTOM_GROUPS,
  MAX_GROUP_GOALS,
  MEAL_GOALS,
  NUTRIENTS,
  WHOLE_GROUPS,
  mealGoal,
} from '../../../../data/mealGroups';
import {
  activeCustomGroups,
  archiveCustomGroup,
  clampOnTargetThreshold,
  MIN_ON_TARGET_THRESHOLD,
  describeGroupGoal,
  newCustomGroup,
  newGroupGoal,
  overrideCount,
  updateCustomGroup,
} from '../../../../services/mealsMath';
import { showConfirm } from '../../../../utils/alert';
import { clampWeeklyGoal } from '../../../../services/appCheckins';
import { WeeklyGoalPicker } from '../../../../components/miniapps/WeeklyGoalPicker';
import { useMeals } from './MealsContext';
import { MEALS_ACCENT, NUTRIENT_COLOR, mls } from './components/mealsStyle';
import { Copy } from '../../../../components/common/Copy';
import { useCopy } from '../../../../context/CopyContext';

type Props = NativeStackScreenProps<MealsStackParamList, 'MealsSettings'>;

/** The most meals a day a daily food-group goal can ask for. */
const MAX_DAILY_GOAL_COUNT = 6;

/** The shared − value + control, in Meals' accent. */
const Stepper: React.FC<{
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
}> = ({ label, ...rest }) => <SharedStepper {...rest} accessibilityLabel={label} tint={MEALS_ACCENT} />;

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
          style={styles.nameInput}
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
        <Copy id="meals.settings.food.scores" style={mls.body}>Scores</Copy>
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
  const t = useCopy();
  const { prefs, model, updatePrefs, habits, newId } = useMeals();
  const [choosingFor, setChoosingFor] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const customGroups = prefs.custom_groups ?? [];
  const myFoods = activeCustomGroups(customGroups);

  const setWeight = (key: keyof MealsScoringWeights, n: number) =>
    updatePrefs({ scoring: { ...prefs.scoring, [key]: n } });

  const goalId = prefs.goal ?? DEFAULT_MEAL_GOAL;
  const changed = overrideCount(goalId, prefs.score_overrides, model);
  // A new goal brings its own scores, so changes made to the old one go.
  const chooseGoal = (id: MealGoalId) => {
    if (id === goalId) return;
    if (changed === 0) return updatePrefs({ goal: id, score_overrides: {} });
    showConfirm(
      t('meals.settings.switch.title', 'Switch to {goal}?', { goal: mealGoal(id).label }),
      changed === 1
        ? t('meals.settings.switch.message.one', 'Your {n} changed score goes back to the {goal} defaults. Days already logged keep their scores.', { n: changed, goal: mealGoal(id).label })
        : t('meals.settings.switch.message.other', 'Your {n} changed scores go back to the {goal} defaults. Days already logged keep their scores.', { n: changed, goal: mealGoal(id).label }),
      () => updatePrefs({ goal: id, score_overrides: {} }),
      t('meals.settings.switch.confirm', 'Switch')
    );
  };

  const setGoals = (goals: GroupGoal[]) => updatePrefs({ group_goals: goals });
  const changeGoal = (id: string, changes: Partial<GroupGoal>) =>
    setGoals(prefs.group_goals.map((g) => (g.id === id ? { ...g, ...changes } : g)));

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
      t('meals.settings.removeFood.title', 'Remove {food}?', { food: food.label }),
      t('meals.settings.removeFood.message', 'It leaves the picker. Days already logged with it keep it.'),
      () => updatePrefs({ custom_groups: archiveCustomGroup(customGroups, food.id) }),
      t('meals.settings.removeFood.confirm', 'Remove')
    );

  const addGoal = () => {
    const goal = newGroupGoal(prefs.group_goals, newId());
    if (goal) setGoals([...prefs.group_goals, goal]);
  };

  return (
    <ScrollView style={mls.screen} contentContainerStyle={mls.scroll} keyboardShouldPersistTaps="handled">
      <Copy id="meals.settings.weeklyGoal" style={mls.sectionLabel}>Weekly goal</Copy>
      <WeeklyGoalPicker
        noun={t('meals.settings.noun', 'days logged')}
        value={clampWeeklyGoal(prefs.weekly_goal, 'meals')}
        accent={MEALS_ACCENT}
        onChange={(n) => updatePrefs({ weekly_goal: n })}
      />

      <Copy id="meals.settings.eatingFor" style={mls.sectionLabel}>What you’re eating for</Copy>
      <Copy id="meals.settings.eatingForNote" style={mls.muted} vars={{ cap: model.ceilings[3] }}>
        {'Your goal decides what counts most in each food group’s score. Ultra-processed food stays at {cap} or under in every goal.'}
      </Copy>
      <View style={[mls.card, styles.goalList]}>
        {MEAL_GOALS.map((g, i) => {
          const active = goalId === g.id;
          return (
            <TouchableOpacity
              key={g.id}
              style={[styles.goalOption, i > 0 && styles.goalOptionDivider]}
              onPress={() => chooseGoal(g.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={mls.title}>{g.label}</Text>
                <Text style={mls.muted}>{g.blurb}</Text>
              </View>
              {active && <Ionicons name="checkmark" size={20} color={MEALS_ACCENT} />}
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity
        style={[mls.card, styles.row]}
        onPress={() => navigation.navigate('MealsScores')}
        accessibilityRole="button"
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Copy id="meals.settings.customize.title" style={mls.title}>Customize scores</Copy>
          <Copy
            id={changed === 0 ? 'meals.settings.customize.using' : changed === 1 ? 'meals.settings.customize.changed.one' : 'meals.settings.customize.changed.other'}
            style={mls.muted}
            vars={{ goal: mealGoal(goalId).label, n: changed }}
          >
            {changed === 0
              ? 'Using the {goal} scores.'
              : changed === 1
                ? '{n} score changed from {goal}.'
                : '{n} scores changed from {goal}.'}
          </Copy>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.gray} />
      </TouchableOpacity>

      <Copy id="meals.settings.myFoods" style={mls.sectionLabel}>My foods</Copy>
      <Copy id="meals.settings.myFoodsNote" style={mls.muted}>
        Foods the groups don’t fit, like a carb supplement. Each scores what you give it, like any other food group. Tags show on the plate but add no points.
      </Copy>
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
          <Copy id="meals.settings.addFood" style={mls.link}>Add a food</Copy>
        </TouchableOpacity>
      )}

      <Copy id="meals.settings.scoring" style={mls.sectionLabel}>Scoring</Copy>
      <View style={[mls.card, styles.goal]}>
        <View style={styles.goalLine}>
          <Copy id="meals.settings.onTargetAt" style={mls.title}>On target at</Copy>
          <Stepper
            value={clampOnTargetThreshold(prefs.scoring.on_target_threshold)}
            min={MIN_ON_TARGET_THRESHOLD}
            max={100}
            step={5}
            label="on-target threshold"
            onChange={(n) => setWeight('on_target_threshold', n)}
          />
        </View>
        <Copy id="meals.settings.onTargetNote" style={mls.muted}>Your day is on target once your plates average this score or more.</Copy>
      </View>
      <Copy id="meals.settings.groupGoals" style={mls.sectionLabel}>Food-group goals</Copy>
      <Copy id="meals.settings.groupGoalsNote" style={mls.muted} vars={{ max: MAX_GROUP_GOALS }}>
        {"Up to {max}. A progress readout, not a gate — it doesn't change whether the day is on target."}
      </Copy>
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
              max={goal.period === 'day' ? MAX_DAILY_GOAL_COUNT : 21}
              label="times"
              onChange={(count) => changeGoal(goal.id, { count })}
            />
            <SegmentedControl
              options={[
                { value: 'day', label: t('meals.settings.perDay', 'Per day') },
                { value: 'week', label: t('meals.settings.perWeek', 'Per week') },
              ]}
              value={goal.period}
              onChange={(period) => changeGoal(goal.id, { period })}
              accessibilityLabel="How often"
              style={styles.period}
            />
            <TouchableOpacity onPress={() => setChoosingFor(choosingFor === goal.id ? null : goal.id)}>
              <Copy id={choosingFor === goal.id ? 'meals.settings.done' : 'meals.settings.changeFood'} style={mls.link}>
                {choosingFor === goal.id ? 'Done' : 'Change food'}
              </Copy>
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
          <Copy id="meals.settings.addGoal" style={mls.link}>Add a food-group goal</Copy>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => navigation.navigate('MealsGuide')} style={styles.add}>
        <Ionicons name="information-circle-outline" size={16} color={MEALS_ACCENT} />
        <Copy id="meals.settings.whatCounts" style={mls.link}>What counts as what</Copy>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  nameInput: { flex: 1, ...TextStyles.body, color: Colors.dark, paddingVertical: 2 },
  add: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 4 },
  goal: { gap: Spacing.sm },
  goalLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, flexWrap: 'wrap' },
  goalCard: { gap: Spacing.md },
  goalControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flexWrap: 'wrap' },
  period: { minWidth: 170 },
  goalList: { paddingVertical: 0 },
  goalOption: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, minHeight: 44 },
  goalOptionDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.separator },
});
