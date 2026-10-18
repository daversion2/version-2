import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import type { FoodGroupId, MealsStackParamList } from '../../../../types/meals';
import { closeDay, scoreDay, withMeal } from '../../../../services/mealsMath';
import { MEAL_OFF_REASONS, groupLabel } from '../../../../data/mealGroups';
import { saveMealsDay } from '../../../../services/labMeals';
import { showAlert } from '../../../../utils/alert';
import { useMeals } from './MealsContext';
import { MealPickerModal, PickerTarget } from './components/MealPickerModal';
import { PlateRow } from './components/MealsParts';
import { FAIL_COLOR, MEALS_ACCENT, MEALS_TINT, PASS_COLOR, mls } from './components/mealsStyle';

type Props = NativeStackScreenProps<MealsStackParamList, 'MealsClose'>;

/** Offline, a Firestore write never settles — give up and say so rather than spin forever. */
const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

/**
 * Close out today. First catch up any meal not logged yet, then the result:
 *   - On target: pick the habit it checks off and hand it back to Today, which
 *     asks "How hard was it to start?" and runs the celebration. Meals never awards XP.
 *   - Off target: one optional "what got in the way?" — then it's closed. No
 *     check-in is written; the meals still count toward the week.
 */
export const MealsCloseScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { userId, today, rules, dayFor, saveDay, habits, linkedHabits, launchHabitId, closeAndCheckOff } = useMeals();
  const day = dayFor(today);
  const score = useMemo(() => scoreDay(day, rules), [day, rules]);

  const [editing, setEditing] = useState<(PickerTarget & { slotId: string }) | null>(null);
  const [reasonId, setReasonId] = useState<string | undefined>();
  // Opened from a habit on Today: that's the one. Otherwise preselect when there's only one option.
  const [habitId, setHabitId] = useState<string | undefined>(
    launchHabitId ?? (linkedHabits.length === 1 ? linkedHabits[0].id : undefined)
  );
  const [saving, setSaving] = useState(false);

  const pendingMeals = score.items.filter((i) => i.kind === 'meal' && i.state === 'pending');
  const chosenHabit = habits.find((h) => h.id === habitId);
  const on = score.status === 'on';

  const logMeal = (groups: FoodGroupId[]) => {
    if (editing) saveDay(withMeal(day, editing.slotId, { groups, logged_at: new Date().toISOString() }));
    setEditing(null);
  };
  const skipMeal = () => {
    if (editing) saveDay(withMeal(day, editing.slotId, { skipped: true, logged_at: new Date().toISOString() }));
    setEditing(null);
  };

  const finish = async () => {
    setSaving(true);
    const closed = closeDay(day, rules, {
      now: new Date(),
      reasonId,
      habitId: on ? chosenHabit?.id : undefined,
    });
    try {
      // Straight to storage, not through saveDay: the handoff must only happen
      // once the close is safely written.
      await withTimeout(saveMealsDay(userId, closed), 15000);
    } catch (e) {
      console.warn('Meals: close failed:', e);
      setSaving(false);
      showAlert("Couldn't close the day", 'Check your connection and try again.');
      return;
    }
    saveDay(closed);
    if (on && chosenHabit) closeAndCheckOff(chosenHabit.id);
    else navigation.goBack();
  };

  if (pendingMeals.length > 0) {
    return (
      <View style={mls.screen}>
        <ScrollView contentContainerStyle={mls.scroll}>
          <Text style={mls.title}>Catch up first</Text>
          <Text style={mls.body}>
            {pendingMeals.length === 1 ? 'One meal isn’t' : `${pendingMeals.length} meals aren’t`} logged yet. Log
            it, or mark it “didn’t eat” — a skipped meal never counts against you.
          </Text>
          {pendingMeals.map((item) => (
            <PlateRow
              key={item.key}
              item={item}
              onPress={() =>
                setEditing({ kind: 'meal', slotId: item.key, title: item.name, groups: [], existing: false })
              }
            />
          ))}
        </ScrollView>
        <MealPickerModal
          target={editing}
          strict={rules.strict}
          onCancel={() => setEditing(null)}
          onSave={logMeal}
          onSkip={skipMeal}
        />
      </View>
    );
  }

  const tone = on ? PASS_COLOR : FAIL_COLOR;

  return (
    <View style={mls.screen}>
      <ScrollView contentContainerStyle={[mls.scroll, { paddingBottom: 150 + insets.bottom }]}>
        <View style={[styles.hero, { backgroundColor: tone }]}>
          <Ionicons name={on ? 'checkmark-circle' : 'close-circle'} size={40} color={Colors.white} />
          <Text style={styles.heroTitle}>{on ? 'On target' : 'Off target'}</Text>
          <Text style={styles.heroSub}>
            {on
              ? `Your goal was ${rules.pass_goal} of ${rules.slots.length} meals passing, and you made it.`
              : 'Not this time. Every meal you logged still counts toward your week.'}
          </Text>
        </View>

        <View style={mls.card}>
          {score.items.map((item) => (
            <View key={item.key} style={styles.line}>
              <Text style={mls.body}>{item.name}</Text>
              <Text
                style={[
                  styles.lineValue,
                  item.state === 'pass' && { color: PASS_COLOR },
                  item.state === 'fail' && { color: FAIL_COLOR },
                ]}
              >
                {item.state === 'pass' ? 'Pass' : item.state === 'fail' ? 'Fail' : 'Didn’t eat'}
              </Text>
            </View>
          ))}
          {score.groupGoals.map((g) => (
            <View key={g.goal.id} style={styles.line}>
              <Text style={mls.body}>{groupLabel(g.goal.group)} goal</Text>
              <Text style={[styles.lineValue, { color: g.met ? PASS_COLOR : FAIL_COLOR }]}>
                {g.have} of {g.goal.count}
              </Text>
            </View>
          ))}
          <View style={[styles.line, styles.lastLine]}>
            <Text style={mls.body}>Misses</Text>
            <Text style={styles.lineValue}>
              {score.fails} {score.allowed === 0 ? '(none to spare)' : `of ${score.allowed} the day can hold`}
            </Text>
          </View>
        </View>

        {on ? (
          <>
            <Text style={mls.sectionLabel}>Check off a habit</Text>
            {linkedHabits.length === 0 ? (
              <Text style={mls.muted}>
                No habit is linked to Meals, so there’s nothing to check off. Link one in Meals settings — a custom
                habit like “Eat real food” works well.
              </Text>
            ) : (
              <>
                {linkedHabits.map((h) => (
                  <TouchableOpacity
                    key={h.id}
                    style={[mls.card, styles.habitRow, habitId === h.id && styles.habitRowOn]}
                    onPress={() => setHabitId(h.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: habitId === h.id }}
                  >
                    <Ionicons
                      name={habitId === h.id ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={habitId === h.id ? MEALS_ACCENT : Colors.gray}
                    />
                    <Text style={[mls.title, { flex: 1 }]}>{h.name}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[mls.card, styles.habitRow, !habitId && styles.habitRowOn]}
                  onPress={() => setHabitId(undefined)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: !habitId }}
                >
                  <Ionicons
                    name={!habitId ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={!habitId ? MEALS_ACCENT : Colors.gray}
                  />
                  <Text style={[mls.body, { flex: 1 }]}>Just close the day</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        ) : (
          <>
            <Text style={mls.sectionLabel}>What got in the way? (optional)</Text>
            {(['internal', 'external'] as const).map((kind) => (
              <View key={kind} style={{ gap: Spacing.sm }}>
                <Text style={styles.reasonGroup}>{kind === 'internal' ? 'It was me' : 'It was the day'}</Text>
                <View style={mls.chipRow}>
                  {MEAL_OFF_REASONS.filter((r) => r.kind === kind).map((r) => {
                    const active = reasonId === r.id;
                    return (
                      <TouchableOpacity
                        key={r.id}
                        style={[mls.chip, active && mls.chipActive]}
                        onPress={() => setReasonId(active ? undefined : r.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                      >
                        <Text style={[mls.chipText, active && mls.chipTextActive]}>{r.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
        <TouchableOpacity
          style={[mls.primaryBtn, saving && mls.disabled]}
          onPress={finish}
          disabled={saving}
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={mls.primaryBtnText}>{on && chosenHabit ? 'Close & rate it' : 'Close the day'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: { borderRadius: 18, padding: Spacing.lg, alignItems: 'center', gap: 6 },
  heroTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, color: Colors.white },
  heroSub: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.white, textAlign: 'center', lineHeight: 20 },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  lastLine: { borderBottomWidth: 0 },
  lineValue: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.gray, flexShrink: 1, textAlign: 'right' },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  habitRowOn: { borderColor: MEALS_ACCENT, backgroundColor: MEALS_TINT },
  reasonGroup: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.dark },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.lightGray,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
