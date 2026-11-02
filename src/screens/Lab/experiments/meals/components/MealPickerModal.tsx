import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, TextStyles } from '../../../../../constants/theme';
import type { FoodGroup } from '../../../../../data/mealGroups';
import { MEAL_GUIDE_RULES, PROCESSED_GROUPS, WHOLE_GROUPS } from '../../../../../data/mealGroups';
import type { CustomFoodGroup, FoodGroupId, MealsScoringWeights } from '../../../../../types/meals';
import { pickerFoods, plateNutrients, scoreVerdict } from '../../../../../services/mealsMath';
import { MEALS_ACCENT, scoreColor, mls } from './mealsStyle';
import { NutrientTags } from './MealsParts';

export interface PickerTarget {
  kind: 'meal' | 'extra';
  /** "Lunch", or "Something additional". */
  title: string;
  groups: FoodGroupId[];
  /** Extras only. */
  name?: string;
  /** Something is already logged — offer to clear it (meal) or delete it (extra). */
  existing: boolean;
}

interface Props {
  target: PickerTarget | null;
  strict: boolean;
  weights: MealsScoringWeights;
  /** Every one of the user's foods this plate is scored with, archived ones included. */
  custom?: CustomFoodGroup[];
  /** The user's foods to offer as chips — the ones not removed. */
  offered?: CustomFoodGroup[];
  onCancel: () => void;
  onSave: (groups: FoodGroupId[], name?: string) => void;
  /** Meals only: "Didn't eat" — never counts against the day. */
  onSkip?: () => void;
  /** Clear a meal back to not logged, or delete an extra. */
  onRemove?: () => void;
}

/**
 * What was on the plate. Tap every group that applies; the score is worked out
 * as you go, so you see it before saving. The user never chooses the score —
 * only the groups.
 */
export const MealPickerModal: React.FC<Props> = ({
  target,
  strict,
  weights,
  custom = [],
  offered = [],
  onCancel,
  onSave,
  onSkip,
  onRemove,
}) => {
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState<FoodGroupId[]>([]);
  const [name, setName] = useState('');
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    if (target) {
      setGroups(target.groups);
      setName(target.name ?? '');
      setShowRules(false);
    }
  }, [target]);

  const toggle = (id: FoodGroupId) =>
    setGroups((list) => (list.includes(id) ? list.filter((g) => g !== id) : [...list, id]));

  const verdict = scoreVerdict(groups, strict, weights, custom);
  const isExtra = target?.kind === 'extra';
  // Labelled with the score this plate uses (a past day's saved one), and a
  // removed food already on the plate stays tappable, so it can be taken off.
  const myFoods = pickerFoods(offered, custom, groups);

  const renderChip = (group: Pick<FoodGroup, 'id' | 'label'>, score?: number) => {
    const on = groups.includes(group.id);
    return (
      <TouchableOpacity
        key={group.id}
        testID={`meal-chip-${group.id}`}
        style={[mls.chip, on && mls.chipActive]}
        onPress={() => toggle(group.id)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: on }}
        accessibilityLabel={score !== undefined ? `${group.label}, scores ${score}` : group.label}
      >
        <Text style={[mls.chipText, on && mls.chipTextActive]}>
          {group.label}
          {score !== undefined ? ` · ${score}` : ''}
        </Text>
      </TouchableOpacity>
    );
  };

  const canSave = groups.length > 0;
  const save = () => onSave(groups, isExtra ? name.trim() || undefined : undefined);

  return (
    <Modal visible={!!target} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn} accessibilityRole="button">
            <Text style={styles.headerAction}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1} accessibilityRole="header">
            {target?.title}
          </Text>
          <TouchableOpacity
            onPress={save}
            disabled={!canSave}
            style={[styles.headerBtn, styles.headerBtnRight]}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
          >
            <Text style={[styles.headerAction, styles.headerSave, !canSave && styles.headerActionOff]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={mls.lead}>
            {isExtra ? 'A snack or drink on top of your meals. What was in it?' : 'What was on the plate? Tap all that apply.'}
          </Text>

          {isExtra && (
            <TextInput
              style={mls.input}
              value={name}
              onChangeText={setName}
              placeholder="What was it? (optional)"
              placeholderTextColor={Colors.gray}
              maxLength={40}
              returnKeyType="done"
              accessibilityLabel="What was it?"
            />
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Whole food</Text>
            <View style={mls.chipRow}>{WHOLE_GROUPS.map((g) => renderChip(g))}</View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Processed</Text>
            <View style={mls.chipRow}>{PROCESSED_GROUPS.map((g) => renderChip(g))}</View>
            <Text style={mls.muted}>{PROCESSED_GROUPS.map((g) => `${g.label}: ${g.examples}.`).join(' ')}</Text>
          </View>

          {myFoods.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My foods</Text>
              <View style={mls.chipRow}>{myFoods.map((g) => renderChip(g, g.score))}</View>
              <Text style={mls.muted}>Each scores what you gave it in settings, as one share of the plate.</Text>
            </View>
          )}

          <TouchableOpacity onPress={() => setShowRules((v) => !v)} style={styles.rulesToggle}>
            <Text style={mls.link}>{showRules ? 'Hide the rules' : 'What counts as what?'}</Text>
            <Ionicons name={showRules ? 'chevron-up' : 'chevron-down'} size={14} color={MEALS_ACCENT} />
          </TouchableOpacity>
          {showRules && (
            <View style={[mls.card, styles.rules]}>
              {MEAL_GUIDE_RULES.map((rule) => (
                <Text key={rule} style={styles.rule}>
                  • {rule}
                </Text>
              ))}
            </View>
          )}

          {/* Out of the way at the bottom: the header holds Save. */}
          {target?.existing && onRemove && (
            <TouchableOpacity onPress={onRemove} style={mls.textBtn} accessibilityRole="button">
              <Text style={mls.destructiveText}>{isExtra ? 'Delete this' : 'Clear this meal'}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Spacing.md + insets.bottom }]} accessibilityLiveRegion="polite">
          <View style={styles.verdictRow}>
            <View style={{ flex: 1, gap: 1 }}>
              <Text
                style={[styles.verdictTitle, verdict.score !== null && { color: scoreColor(verdict.score) }]}
              >
                {verdict.score !== null ? `Scores ${verdict.score}` : 'Nothing picked yet'}
              </Text>
              <Text style={styles.verdictWhy}>{verdict.why}</Text>
            </View>
            {!isExtra && onSkip && (
              <TouchableOpacity onPress={onSkip} style={styles.skip} accessibilityRole="button">
                <Text style={mls.link}>Didn’t eat</Text>
              </TouchableOpacity>
            )}
          </View>
          {groups.length > 0 && <NutrientTags have={plateNutrients(groups, custom)} showMissing />}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: Colors.lightGray },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    minHeight: 56,
  },
  headerBtn: { minWidth: 72, minHeight: 44, justifyContent: 'center' },
  headerBtnRight: { alignItems: 'flex-end' },
  headerAction: { ...TextStyles.body, color: MEALS_ACCENT },
  headerSave: { fontWeight: '600' },
  headerActionOff: { color: Colors.separator },
  headerTitle: { ...TextStyles.headline, flex: 1, textAlign: 'center', color: Colors.dark },
  body: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xl, gap: 20 },
  section: { gap: 10 },
  sectionTitle: { ...TextStyles.footnote, fontWeight: '600', color: Colors.gray, paddingHorizontal: 4 },
  rulesToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 4, marginVertical: -Spacing.sm },
  rules: { gap: Spacing.sm },
  rule: { ...TextStyles.subhead, color: Colors.dark },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.separator,
    backgroundColor: Colors.cardBg,
  },
  verdictRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  verdictTitle: { ...TextStyles.title3, fontWeight: '700', color: Colors.dark },
  verdictWhy: { ...TextStyles.subhead, color: Colors.gray },
  skip: { minHeight: 44, justifyContent: 'center' },
});
