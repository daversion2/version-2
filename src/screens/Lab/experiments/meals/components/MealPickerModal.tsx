import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../../constants/theme';
import type { FoodGroup } from '../../../../../data/mealGroups';
import { MEAL_GUIDE_RULES, PROCESSED_GROUPS, WHOLE_GROUPS } from '../../../../../data/mealGroups';
import type { FoodGroupId } from '../../../../../types/meals';
import { plateVerdict } from '../../../../../services/mealsMath';
import { FAIL_COLOR, MEALS_ACCENT, PASS_COLOR, mls } from './mealsStyle';

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
  onCancel: () => void;
  onSave: (groups: FoodGroupId[], name?: string) => void;
  /** Meals only: "Didn't eat" — never counts against the day. */
  onSkip?: () => void;
  /** Clear a meal back to not logged, or delete an extra. */
  onRemove?: () => void;
}

/**
 * What was on the plate. Tap every group that applies; the result is worked out
 * as you go, so you see pass or fail before saving. The user never chooses the
 * result — only the groups.
 */
export const MealPickerModal: React.FC<Props> = ({ target, strict, onCancel, onSave, onSkip, onRemove }) => {
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

  const verdict = plateVerdict(groups, strict);
  const isExtra = target?.kind === 'extra';

  const renderChip = (group: FoodGroup, processed: boolean) => {
    const on = groups.includes(group.id);
    const color = processed ? FAIL_COLOR : PASS_COLOR;
    return (
      <TouchableOpacity
        key={group.id}
        style={[styles.chip, on && { borderColor: color, backgroundColor: color + '14' }]}
        onPress={() => toggle(group.id)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: on }}
        accessibilityLabel={group.label}
      >
        <View style={[styles.tick, on && { backgroundColor: color, borderColor: color }]}>
          {on && <Ionicons name="checkmark" size={12} color={Colors.white} />}
        </View>
        <Text style={styles.chipText} numberOfLines={2}>
          {group.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={!!target} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} hitSlop={8}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {target?.title}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={mls.body}>
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
            />
          )}

          <Text style={mls.sectionLabel}>Whole food</Text>
          <View style={styles.grid}>{WHOLE_GROUPS.map((g) => renderChip(g, false))}</View>

          <Text style={mls.sectionLabel}>Processed</Text>
          <View style={styles.grid}>{PROCESSED_GROUPS.map((g) => renderChip(g, true))}</View>
          <Text style={mls.muted}>
            Semi-processed: {PROCESSED_GROUPS[0].examples}. Processed: {PROCESSED_GROUPS[1].examples}.
          </Text>

          <TouchableOpacity onPress={() => setShowRules((v) => !v)} style={styles.rulesToggle}>
            <Ionicons name={showRules ? 'chevron-up' : 'information-circle-outline'} size={16} color={MEALS_ACCENT} />
            <Text style={mls.link}>{showRules ? 'Hide the rules' : 'What counts as what?'}</Text>
          </TouchableOpacity>
          {showRules && (
            <View style={[mls.card, styles.rules]}>
              {MEAL_GUIDE_RULES.map((rule) => (
                <Text key={rule} style={mls.body}>
                  • {rule}
                </Text>
              ))}
            </View>
          )}

          {target?.existing && onRemove && (
            <TouchableOpacity onPress={onRemove} style={mls.textBtn}>
              <Text style={mls.textBtnText}>{isExtra ? 'Delete this' : 'Clear this meal'}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
          <View
            style={[
              styles.verdict,
              verdict.result === 'pass' && { backgroundColor: PASS_COLOR + '14' },
              verdict.result === 'fail' && { backgroundColor: FAIL_COLOR + '14' },
            ]}
          >
            <Text
              style={[
                styles.verdictTitle,
                { color: verdict.result === 'pass' ? PASS_COLOR : verdict.result === 'fail' ? FAIL_COLOR : Colors.gray },
              ]}
            >
              {verdict.result === 'pass' ? 'Pass' : verdict.result === 'fail' ? 'Fail' : 'Nothing picked yet'}
            </Text>
            <Text style={mls.muted}>{verdict.why}</Text>
          </View>
          <View style={styles.footerRow}>
            {!isExtra && onSkip && (
              <TouchableOpacity style={[mls.secondaryBtn, styles.footerBtn]} onPress={onSkip}>
                <Text style={mls.secondaryBtnText}>Didn’t eat</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[mls.primaryBtn, styles.footerBtn, groups.length === 0 && mls.disabled]}
              onPress={() => onSave(groups, isExtra ? name.trim() || undefined : undefined)}
              disabled={groups.length === 0}
              accessibilityRole="button"
            >
              <Text style={mls.primaryBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  cancel: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: MEALS_ACCENT, minWidth: 60 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
  },
  headerSpacer: { minWidth: 60 },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  tick: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { flex: 1, fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.dark },
  rulesToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: Spacing.sm },
  rules: { gap: Spacing.sm },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.lightGray,
  },
  verdict: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    gap: 2,
  },
  verdictTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md },
  footerRow: { flexDirection: 'row', gap: Spacing.sm },
  footerBtn: { flex: 1 },
});
