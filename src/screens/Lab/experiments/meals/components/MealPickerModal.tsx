import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, TextStyles } from '../../../../../constants/theme';
import type { FoodGroup } from '../../../../../data/mealGroups';
import { FOOD_SECTIONS, MEAL_GUIDE_RULES, isCustomGroup, sectionGroups } from '../../../../../data/mealGroups';
import type { CustomFoodGroup, FoodGroupId, MealsRules } from '../../../../../types/meals';
import { chipScore, pickerFoods, plateNutrients, scoreVerdict, usesChipScores } from '../../../../../services/mealsMath';
import { MEALS_ACCENT, scoreColor, mls } from './mealsStyle';
import { NutrientTags, plateTime } from './MealsParts';

export interface PickerTarget {
  /** "Log a meal", or the plate's name. */
  title: string;
  groups: FoodGroupId[];
  name?: string;
  /** When an existing plate was logged. Absent for a new one. */
  loggedAt?: string;
}

interface Props {
  target: PickerTarget | null;
  /** The rules this plate is scored with: today's, or a past day's own. */
  rules: MealsRules;
  /** The user's foods to offer as chips — the ones not removed. */
  offered?: CustomFoodGroup[];
  onCancel: () => void;
  onSave: (groups: FoodGroupId[], name?: string) => void;
  /** Delete a plate already logged. */
  onRemove?: () => void;
}

/**
 * What was on the plate. Tap every group that applies; each chip shows its
 * score and the plate's average is worked out as you go, so you see it before
 * saving. Scores are changed in settings, never here.
 */
export const MealPickerModal: React.FC<Props> = ({
  target,
  rules,
  offered = [],
  onCancel,
  onSave,
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

  const custom = rules.custom_groups ?? [];
  const verdict = scoreVerdict(groups, rules);
  const existing = !!target?.loggedAt;
  // Labelled with the score this plate uses (a past day's saved one), and a
  // removed food already on the plate stays tappable, so it can be taken off.
  const myFoods = pickerFoods(offered, custom, groups);
  // A day saved before chip scores is scored by the old formula: no per-chip number to show.
  const showScores = usesChipScores(rules);

  const renderChip = (group: Pick<FoodGroup, 'id' | 'label'>) => {
    const on = groups.includes(group.id);
    const score = showScores || isCustomGroup(group.id) ? (chipScore(group.id, rules) ?? undefined) : undefined;
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
  const save = () => onSave(groups, name.trim() || undefined);

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
            {target?.loggedAt
              ? `Logged at ${plateTime(target.loggedAt)}. What was on the plate?`
              : 'What was on the plate? Tap all that apply.'}
          </Text>

          <TextInput
            style={mls.input}
            value={name}
            onChangeText={setName}
            placeholder="Name it (optional), like Breakfast"
            placeholderTextColor={Colors.gray}
            maxLength={40}
            returnKeyType="done"
            accessibilityLabel="Meal name"
          />

          {FOOD_SECTIONS.map((section) => (
            <View key={section.id} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.label}</Text>
              <View style={mls.chipRow}>{sectionGroups(section.id, groups).map((g) => renderChip(g))}</View>
            </View>
          ))}

          {myFoods.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My foods</Text>
              <View style={mls.chipRow}>{myFoods.map((g) => renderChip(g))}</View>
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
          {existing && onRemove && (
            <TouchableOpacity onPress={onRemove} style={mls.textBtn} accessibilityRole="button">
              <Text style={mls.destructiveText}>Delete this meal</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Spacing.md + insets.bottom }]} accessibilityLiveRegion="polite">
          <View style={{ gap: 1 }}>
            <Text style={[styles.verdictTitle, verdict.score !== null && { color: scoreColor(verdict.score) }]}>
              {verdict.score !== null ? `Scores ${verdict.score}` : 'Nothing picked yet'}
            </Text>
            <Text style={styles.verdictWhy}>{verdict.why}</Text>
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
  verdictTitle: { ...TextStyles.title3, fontWeight: '700', color: Colors.dark },
  verdictWhy: { ...TextStyles.subhead, color: Colors.gray },
});
