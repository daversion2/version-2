import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Colors, Spacing, TextStyles } from '../../../../constants/theme';
import type { FoodGroupId } from '../../../../types/meals';
import { FOOD_SECTIONS, MEAL_GUIDE_RULES, mealGoal, sectionGroups } from '../../../../data/mealGroups';
import { chipScore, describeGroups, scorePlate } from '../../../../services/mealsMath';
import { useMeals } from './MealsContext';
import { scoreColor, mls } from './components/mealsStyle';
import { NutrientTags } from './components/MealsParts';

/** Worked examples, scored live by the same rule the app uses — so they can't drift from it. */
const EXAMPLES: { meal: string; groups: FoodGroupId[] }[] = [
  { meal: 'Eggs and berries', groups: ['eggs', 'fruit'] },
  { meal: 'Chicken stir-fry with bottled sauce', groups: ['chicken', 'veggies', 'grains', 'sauces'] },
  { meal: 'Salmon, rice and greens', groups: ['fish', 'bread', 'veggies'] },
  { meal: 'Greek yogurt with berries', groups: ['fruit', 'dairy'] },
  { meal: 'Protein shake for lunch', groups: ['supplements'] },
  { meal: 'Turkey sandwich', groups: ['chicken', 'bread'] },
  { meal: 'Frozen pizza with a side salad', groups: ['ready_meals', 'veggies'] },
  { meal: 'Drive-through combo and a soda', groups: ['fast_food', 'sugary_drinks'] },
];

/** What each chip covers, its score under your goal, and how a plate is scored. */
export const MealsGuideScreen: React.FC = () => {
  const { rules } = useMeals();

  return (
    <ScrollView style={mls.screen} contentContainerStyle={mls.scroll}>
      <Text style={mls.sectionLabel}>The rules</Text>
      <View style={[mls.card, styles.list]}>
        {MEAL_GUIDE_RULES.map((rule) => (
          <Text key={rule} style={mls.body}>
            • {rule}
          </Text>
        ))}
      </View>

      <Text style={mls.sectionLabel}>Examples · {mealGoal(rules.goal).label}</Text>
      <View style={mls.card}>
        {EXAMPLES.map((ex, i) => {
          const score = scorePlate(ex.groups, rules);
          return (
            <View key={ex.meal} style={[styles.example, i === EXAMPLES.length - 1 && styles.last]}>
              <View style={{ flex: 1 }}>
                <Text style={mls.body}>{ex.meal}</Text>
                <Text style={mls.muted}>{describeGroups(ex.groups)}</Text>
              </View>
              <Text style={[styles.result, { color: scoreColor(score) }]}>{score}</Text>
            </View>
          );
        })}
      </View>

      {FOOD_SECTIONS.map((section) => (
        <React.Fragment key={section.id}>
          <Text style={mls.sectionLabel}>{section.label}</Text>
          <View style={[mls.card, styles.list]}>
            {sectionGroups(section.id).map((g) => (
              <View key={g.id} style={styles.group}>
                <View style={styles.groupTop}>
                  <Text style={[mls.title, { flex: 1 }]}>{g.label}</Text>
                  <Text style={[styles.result, { color: scoreColor(chipScore(g.id, rules)) }]}>
                    {chipScore(g.id, rules)}
                  </Text>
                </View>
                <Text style={mls.muted}>{g.examples}</Text>
                <NutrientTags have={g.nutrients} />
              </View>
            ))}
          </View>
        </React.Fragment>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  list: { gap: Spacing.md },
  group: { gap: 4 },
  groupTop: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.md },
  example: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separator,
  },
  last: { borderBottomWidth: 0 },
  result: { ...TextStyles.headline },
});
