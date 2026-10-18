import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import type { FoodGroupId } from '../../../../types/meals';
import { MEAL_GUIDE_RULES, PROCESSED_GROUPS, WHOLE_GROUPS } from '../../../../data/mealGroups';
import { describeGroups, evaluatePlate } from '../../../../services/mealsMath';
import { useMeals } from './MealsContext';
import { FAIL_COLOR, PASS_COLOR, mls } from './components/mealsStyle';

/** Worked examples, scored live by the same rule the app uses — so they can't drift from it. */
const EXAMPLES: { meal: string; groups: FoodGroupId[] }[] = [
  { meal: 'Eggs and berries', groups: ['eggs', 'fruit'] },
  { meal: 'Chicken stir-fry with bottled sauce', groups: ['chicken', 'veggies', 'grains', 'semi'] },
  { meal: 'Greek yogurt with berries', groups: ['fruit', 'semi'] },
  { meal: 'Greek yogurt on its own', groups: ['semi'] },
  { meal: 'Frozen pizza with a side salad', groups: ['processed', 'veggies'] },
  { meal: 'Drive-through combo', groups: ['processed'] },
];

/** What each chip covers and how a plate is scored. The user never has to decide what's processed. */
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
        <Text style={mls.body}>• Strict mode (in settings): a meal passes on whole food only.</Text>
      </View>

      <Text style={mls.sectionLabel}>Examples{rules.strict ? ' — strict mode is on' : ''}</Text>
      <View style={mls.card}>
        {EXAMPLES.map((ex, i) => {
          const result = evaluatePlate(ex.groups, rules.strict);
          return (
            <View key={ex.meal} style={[styles.example, i === EXAMPLES.length - 1 && styles.last]}>
              <View style={{ flex: 1 }}>
                <Text style={mls.body}>{ex.meal}</Text>
                <Text style={mls.muted}>{describeGroups(ex.groups)}</Text>
              </View>
              <Text style={[styles.result, { color: result === 'pass' ? PASS_COLOR : FAIL_COLOR }]}>
                {result === 'pass' ? 'Pass' : 'Fail'}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={mls.sectionLabel}>Whole food</Text>
      <View style={[mls.card, styles.list]}>
        {WHOLE_GROUPS.map((g) => (
          <View key={g.id}>
            <Text style={mls.title}>{g.label}</Text>
            <Text style={mls.muted}>{g.examples}</Text>
          </View>
        ))}
      </View>

      <Text style={mls.sectionLabel}>Processed</Text>
      <View style={[mls.card, styles.list]}>
        {PROCESSED_GROUPS.map((g) => (
          <View key={g.id}>
            <Text style={mls.title}>{g.label}</Text>
            <Text style={mls.muted}>{g.examples}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  list: { gap: Spacing.md },
  example: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  last: { borderBottomWidth: 0 },
  result: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm },
});
