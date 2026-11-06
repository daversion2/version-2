import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Spacing } from '../../../../constants/theme';
import { Stepper } from '../../../../components/common/Stepper';
import type { BuiltInGroupId, MealsStackParamList } from '../../../../types/meals';
import { DEFAULT_MEAL_GOAL, FOOD_SECTIONS, mealGoal, sectionGroups } from '../../../../data/mealGroups';
import { chipReason, goalScores, groupScoresFor, overrideCount, setScoreOverride } from '../../../../services/mealsMath';
import { showConfirm } from '../../../../utils/alert';
import { useMeals } from './MealsContext';
import { MEALS_ACCENT, mls } from './components/mealsStyle';

type Props = NativeStackScreenProps<MealsStackParamList, 'MealsScores'>;

/**
 * Every food group's score, by section, starting from the goal's — each with
 * the one line its score comes from. A changed one says what the goal had.
 * Only the changes are saved, so a goal retuned in a later update still
 * reaches the rest (types/meals.ts).
 */
export const MealsScoresScreen: React.FC<Props> = () => {
  const { prefs, model, updatePrefs } = useMeals();
  const goal = mealGoal(prefs.goal ?? DEFAULT_MEAL_GOAL);
  const overrides = prefs.score_overrides ?? {};
  const defaults = goalScores(goal.id, model);
  const scores = groupScoresFor(goal.id, overrides, model);
  const changed = overrideCount(goal.id, overrides, model);

  const setScore = (id: BuiltInGroupId, score: number) =>
    updatePrefs({ score_overrides: setScoreOverride(goal.id, overrides, id, score, model) });

  const reset = () =>
    showConfirm(
      `Reset to ${goal.label}?`,
      'Every score goes back to your goal’s default. Days already logged keep their scores.',
      () => updatePrefs({ score_overrides: {} }),
      'Reset'
    );

  return (
    <ScrollView style={mls.screen} contentContainerStyle={mls.scroll}>
      <Text style={mls.muted}>
        Starting from {goal.label}: each score comes from what the food brings and what your goal counts most. A
        plate scores the average of its food groups. Changes apply from today; days already logged keep their scores.
      </Text>

      {FOOD_SECTIONS.map((section) => (
        <React.Fragment key={section.id}>
          <Text style={mls.sectionLabel}>{section.label}</Text>
          <View style={[mls.card, styles.list]}>
            {sectionGroups(section.id).map((g, i) => {
              const isChanged = scores[g.id] !== defaults[g.id];
              return (
                <View key={g.id} style={[styles.row, i > 0 && styles.divider]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={mls.body}>{g.label}</Text>
                    <Text style={mls.muted}>
                      {isChanged ? `${goal.label}: ${defaults[g.id]}. ` : ''}
                      {chipReason(g.id, model)}
                    </Text>
                  </View>
                  <Stepper
                    value={scores[g.id]}
                    min={0}
                    max={100}
                    step={5}
                    onChange={(n) => setScore(g.id, n)}
                    accessibilityLabel={`${g.label} score`}
                    tint={MEALS_ACCENT}
                  />
                </View>
              );
            })}
          </View>
        </React.Fragment>
      ))}

      {changed > 0 && (
        <TouchableOpacity onPress={reset} style={styles.reset} accessibilityRole="button">
          <Ionicons name="refresh" size={16} color={MEALS_ACCENT} />
          <Text style={mls.link}>Reset to {goal.label} defaults</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  list: { paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm + 2, minHeight: 52 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.separator },
  reset: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 4 },
});
