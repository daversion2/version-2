import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { FadeRise } from '../common/FadeRise';
import { HABIT_CATEGORIES } from '../../data/habitLibrary';
import {
  HabitDefinition,
  getHabitDefinitionsByCategory,
  getPracticeIntensity,
} from '../../data/practices';
import { ob } from './onboardingStyles';

// ============================================================================
// BEAT 7 — PICK ONE HABIT
//
// The last beat, and the only one that asks for anything. It used to be second,
// ahead of two setup forms; now the argument and the walkthrough come first, so
// by the time this appears the user knows what they are picking a habit FOR.
//
// Nothing else is asked. Amount, days, anchor and reminder all come from the
// chosen habit's own definition via deriveHabitSetupDraft — which is where the
// old promise beat got its starting values anyway — and stay editable on the
// habit afterwards. The note under the list says so, because a reminder that
// appears without having been agreed to is a surprise.
//
// Browses the REAL catalog by category, not the six curated practices the
// previous onboarding offered. A user who came for "No social media before
// noon" has to be able to find it, or they conclude the app isn't for them.
//
// Each row carries the habit's own `whyItWorks` line so the choice is informed
// rather than a name off a list. The intense practices stay in the mix with
// their flame meter, and the medical caution attaches TO THOSE HABITS rather
// than to the whole app.
//
// One selection only. "Pick one. Just one." is the flow's promise, and
// ensureCuratedPractices is narrowed to keep it true on the screen they land on.
// ============================================================================

interface Props {
  selectedId: string | null;
  onSelect: (definition: HabitDefinition) => void;
}

/** Habits needing a medical caution before someone commits to one. */
const needsMedicalCaution = (def: HabitDefinition): boolean =>
  getPracticeIntensity({ practice_id: def.id }) === 'extreme';

const flameCount = (def: HabitDefinition): number => {
  const intensity = getPracticeIntensity({ practice_id: def.id });
  return intensity === 'extreme' ? 3 : intensity === 'challenging' ? 2 : 0;
};

export const OnboardingHabitPicker: React.FC<Props> = ({ selectedId, onSelect }) => {
  const [categoryId, setCategoryId] = useState(HABIT_CATEGORIES[0].id);

  const habits = useMemo(() => getHabitDefinitionsByCategory(categoryId), [categoryId]);
  const showCaution = habits.some(needsMedicalCaution);

  return (
    <View style={{ flex: 1 }}>
      <Text style={ob.eyebrow}>Your turn</Text>
      <Text style={ob.headline}>Pick the first one to push against.</Text>
      <Text style={ob.body}>
        Just one. You'll add more when this one is sticking — starting with five is how people end
        the week with none.
      </Text>

      <View style={styles.categories}>
        {HABIT_CATEGORIES.map((category) => {
          const on = category.id === categoryId;
          return (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.category,
                on && { backgroundColor: category.color, borderColor: category.color },
              ]}
              onPress={() => setCategoryId(category.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              activeOpacity={0.8}
            >
              <Text style={[styles.categoryText, on && styles.categoryTextOn]}>{category.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {habits.map((habit, index) => {
        const category = HABIT_CATEGORIES.find((c) => c.id === habit.category_id);
        const accent = category?.color ?? Colors.primary;
        const on = selectedId === habit.id;
        const flames = flameCount(habit);
        return (
          <FadeRise key={habit.id} delay={100 + index * 45}>
            <TouchableOpacity
              style={[styles.row, ob.choice, on && ob.choiceOn]}
              onPress={() => onSelect(habit)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              activeOpacity={0.8}
            >
              <View style={[styles.rowIcon, { backgroundColor: accent + '1A' }]}>
                <Ionicons name={(habit.icon as any) ?? 'ellipse-outline'} size={18} color={accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowName, on && { color: Colors.primary }]}>{habit.name}</Text>
                {/* whyItWorks is the insider hook; description is the plain
                    one-liner. Either informs the pick — an empty row does not. */}
                <Text style={styles.rowWhy}>{habit.whyItWorks ?? habit.description}</Text>
                {flames > 0 && (
                  <Text style={styles.rowFlames}>{'▲'.repeat(flames)} INTENSE</Text>
                )}
              </View>
              {on && <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />}
            </TouchableOpacity>
          </FadeRise>
        );
      })}

      {/* Says out loud what gets written without being asked. The reminder in
          particular: it is scheduled on completion, and a notification nobody
          agreed to is the kind of surprise that gets an app deleted. */}
      <Text style={styles.defaultsNote}>
        Amount, days and reminders are already set to something sensible. Change any of it later,
        or add more from the Library.
      </Text>

      {showCaution && (
        <View style={styles.caution}>
          <Ionicons name="warning" size={15} color={Colors.secondary} style={{ marginTop: 1 }} />
          <Text style={styles.cautionText}>
            <Text style={styles.cautionBold}>Cold and heat exposure</Text> put real stress on the
            body. Check with your doctor before starting — especially if you have a heart, blood
            pressure, or other medical condition.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.md },
  category: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingVertical: 7,
    paddingHorizontal: 13,
    backgroundColor: Colors.white,
  },
  categoryText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.gray },
  categoryTextOn: { color: Colors.white },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowName: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: Colors.dark },
  rowWhy: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    lineHeight: 17,
    marginTop: 3,
  },
  rowFlames: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 10,
    letterSpacing: 1,
    color: Colors.secondary,
    marginTop: 4,
  },

  defaultsNote: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    lineHeight: 18,
    marginTop: Spacing.sm,
  },

  caution: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.secondary + '10',
    borderWidth: 1,
    borderColor: Colors.secondary + '30',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.xs,
  },
  cautionText: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    lineHeight: 17,
  },
  cautionBold: { fontFamily: Fonts.secondaryBold, color: Colors.dark },
});
