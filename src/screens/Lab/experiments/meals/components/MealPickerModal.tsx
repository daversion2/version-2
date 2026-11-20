import React, { useEffect, useState } from 'react';
import { Modal, Platform, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import DateTimePickerNative, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Spacing, TextStyles } from '../../../../../constants/theme';
import type { FoodGroup } from '../../../../../data/mealGroups';
import { FOOD_SECTIONS, MEAL_GUIDE_RULES, isCustomGroup, sectionGroups } from '../../../../../data/mealGroups';
import type { CustomFoodGroup, FoodGroupId, MealsRules } from '../../../../../types/meals';
import {
  addServing,
  chipScore,
  clearFood,
  MAX_SERVINGS,
  pickerFoods,
  plateNutrients,
  removeServing,
  scoreVerdict,
  servingCount,
  usesChipScores,
} from '../../../../../services/mealsMath';
import { MEALS_ACCENT, scoreColor, mls } from './mealsStyle';
import { NutrientTags, plateTime } from './MealsParts';

export interface PickerTarget {
  /** "Log a meal", or the plate's name. */
  title: string;
  groups: FoodGroupId[];
  name?: string;
  /** When an existing plate was logged. Absent for a new one. */
  loggedAt?: string;
  /** When it was eaten, "HH:MM" local, on the sheet's day. Changeable here. */
  time: string;
}

interface Props {
  target: PickerTarget | null;
  /** The rules this plate is scored with: today's, or a past day's own. */
  rules: MealsRules;
  /** The user's foods to offer as chips — the ones not removed. */
  offered?: CustomFoodGroup[];
  onCancel: () => void;
  onSave: (groups: FoodGroupId[], name: string | undefined, time: string) => void;
  /** Delete a plate already logged. */
  onRemove?: () => void;
}

/**
 * What was on the plate. Tap every group that applies, and tap one again for
 * another serving (founder, 2026-11-20): the chip reads "Fruit ×2", its − takes
 * one off, and a long press takes the food off the plate. Each chip shows its
 * score and the plate's average is worked out as you go, each serving counted,
 * so you see it before saving. Scores are changed in settings, never here.
 *
 * A past day scored by the old formula can't weigh servings, so there a chip
 * is still on or off.
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
  const [time, setTime] = useState('12:00');
  // Android shows the time picker as a dialog, opened from the row.
  const [androidTimeOpen, setAndroidTimeOpen] = useState(false);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    if (target) {
      setGroups(target.groups);
      setName(target.name ?? '');
      setTime(target.time);
      setAndroidTimeOpen(false);
      setShowRules(false);
    }
  }, [target]);

  // The picker works in Dates; only the clock time matters.
  const [hh, mm] = time.split(':').map(Number);
  const timeValue = new Date(2000, 0, 1, hh, mm);
  const pickTime = (event: DateTimePickerEvent, picked?: Date) => {
    if (Platform.OS === 'android') setAndroidTimeOpen(false);
    if (event.type === 'set' && picked) {
      setTime(`${String(picked.getHours()).padStart(2, '0')}:${String(picked.getMinutes()).padStart(2, '0')}`);
    }
  };

  // A day saved before chip scores is scored by the old formula: no per-chip
  // number to show, and no servings to weigh.
  const showScores = usesChipScores(rules);
  const servings = showScores;

  const add = (id: FoodGroupId) =>
    setGroups((list) =>
      servings ? addServing(list, id) : list.includes(id) ? clearFood(list, id) : [...list, id]
    );
  const less = (id: FoodGroupId) => setGroups((list) => removeServing(list, id));
  const clear = (id: FoodGroupId) => setGroups((list) => clearFood(list, id));

  const custom = rules.custom_groups ?? [];
  const verdict = scoreVerdict(groups, rules);
  const existing = !!target?.loggedAt;
  // Labelled with the score this plate uses (a past day's saved one), and a
  // removed food already on the plate stays tappable, so it can be taken off.
  const myFoods = pickerFoods(offered, custom, groups);

  const renderChip = (group: Pick<FoodGroup, 'id' | 'label'>) => {
    const count = servingCount(groups, group.id);
    const on = count > 0;
    const score = showScores || isCustomGroup(group.id) ? (chipScore(group.id, rules) ?? undefined) : undefined;
    const scored = score !== undefined ? `, scores ${score}` : '';
    const withMinus = servings && on;
    return (
      <View key={group.id} style={[mls.chip, on && mls.chipActive, styles.chip]}>
        {withMinus && (
          // Hidden from screen readers: the chip itself is adjustable.
          <TouchableOpacity
            testID={`meal-chip-${group.id}-less`}
            onPress={() => less(group.id)}
            style={styles.minus}
            hitSlop={{ top: 6, bottom: 6, left: 6 }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Ionicons name="remove" size={16} color={Colors.white} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          testID={`meal-chip-${group.id}`}
          style={[styles.chipMain, withMinus && styles.chipMainAfterMinus]}
          onPress={() => add(group.id)}
          onLongPress={() => clear(group.id)}
          {...(servings
            ? {
                accessibilityRole: 'adjustable' as const,
                accessibilityLabel: `${group.label}${scored}`,
                accessibilityValue: { text: on ? `${count} ${count === 1 ? 'serving' : 'servings'}` : 'not on the plate' },
                accessibilityHint: count >= MAX_SERVINGS ? `${MAX_SERVINGS} is the most a plate counts.` : undefined,
                accessibilityActions: [
                  { name: 'increment' as const },
                  { name: 'decrement' as const },
                  ...(on ? [{ name: 'longpress' as const, label: 'Take off the plate' }] : []),
                ],
                onAccessibilityAction: (e: { nativeEvent: { actionName: string } }) => {
                  if (e.nativeEvent.actionName === 'increment') add(group.id);
                  else if (e.nativeEvent.actionName === 'decrement') less(group.id);
                  else if (e.nativeEvent.actionName === 'longpress') clear(group.id);
                },
              }
            : {
                accessibilityRole: 'checkbox' as const,
                accessibilityState: { checked: on },
                accessibilityLabel: `${group.label}${scored}`,
              })}
        >
          <Text style={[mls.chipText, on && mls.chipTextActive]}>
            {group.label}
            {count > 1 ? ` ×${count}` : ''}
            {score !== undefined ? ` · ${score}` : ''}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const canSave = groups.length > 0;
  const save = () => onSave(groups, name.trim() || undefined, time);

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
            {servings
                ? 'What was on the plate? Tap all that apply, and tap again for another serving.'
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

          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>Time</Text>
            {Platform.OS === 'ios' ? (
              <DateTimePickerNative
                testID="meal-time"
                value={timeValue}
                mode="time"
                display="compact"
                onChange={pickTime}
                accentColor={MEALS_ACCENT}
                accessibilityLabel="Time eaten"
              />
            ) : (
              <TouchableOpacity
                testID="meal-time"
                onPress={() => setAndroidTimeOpen(true)}
                style={styles.timeButton}
                accessibilityRole="button"
                accessibilityLabel={`Time eaten, ${plateTime(timeValue.toISOString())}. Change`}
              >
                <Text style={styles.timeValue}>{plateTime(timeValue.toISOString())}</Text>
              </TouchableOpacity>
            )}
            {androidTimeOpen && <DateTimePickerNative value={timeValue} mode="time" onChange={pickTime} />}
          </View>

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
  // The chip's own padding moves onto its parts, so the − and the label each
  // get the full height as a target.
  chip: { flexDirection: 'row', alignItems: 'stretch', paddingHorizontal: 0 },
  chipMain: { paddingHorizontal: 14, justifyContent: 'center', minHeight: 40 },
  chipMainAfterMinus: { paddingLeft: 6 },
  minus: { paddingLeft: 12, paddingRight: 4, justifyContent: 'center', minHeight: 40 },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
  },
  timeLabel: { ...TextStyles.body, color: Colors.dark },
  timeButton: { minHeight: 44, justifyContent: 'center' },
  timeValue: { ...TextStyles.body, color: MEALS_ACCENT },
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
