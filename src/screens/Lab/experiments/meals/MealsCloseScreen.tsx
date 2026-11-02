import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Spacing, TextStyles } from '../../../../constants/theme';
import { LargeTitle } from '../../../../components/common/LargeTitle';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import type { FoodGroupId, MealsStackParamList } from '../../../../types/meals';
import { activeCustomGroups, closeDay, scoreDay, withMeal } from '../../../../services/mealsMath';
import { MEAL_OFF_REASONS, groupLabel } from '../../../../data/mealGroups';
import { saveMealsDay } from '../../../../services/labMeals';
import { showAlert } from '../../../../utils/alert';
import { useMeals } from './MealsContext';
import { MealPickerModal, PickerTarget } from './components/MealPickerModal';
import { PlateRow } from './components/MealsParts';
import { FAIL_COLOR, MEALS_ACCENT, PASS_COLOR, scoreColor, mls } from './components/mealsStyle';

type Props = NativeStackScreenProps<MealsStackParamList, 'MealsClose'>;

/** Offline, a Firestore write never settles — give up and say so rather than spin forever. */
const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

/**
 * Close out today. First catch up any meal not logged yet, then the result:
 *   - On target: hand it back to Today, which asks for the override ("How hard
 *     was it to start?") and runs the celebration. Meals never awards XP.
 *   - Off target: one optional "what got in the way?" — then it's closed. No
 *     check-in is written; the meals still count toward the week.
 */
export const MealsCloseScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { userId, today, prefs, rules, dayFor, saveDay, closeAndCheckOff } = useMeals();
  const day = dayFor(today);
  const score = useMemo(() => scoreDay(day, rules), [day, rules]);

  const [editing, setEditing] = useState<(PickerTarget & { slotId: string }) | null>(null);
  const [reasonId, setReasonId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const pendingMeals = score.items.filter((i) => i.kind === 'meal' && i.state === 'pending');
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
      // An on-target day is the Meals check-in itself — no habit to name.
      habitId: undefined,
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
    if (on) closeAndCheckOff();
    else navigation.goBack();
  };

  if (pendingMeals.length > 0) {
    return (
      <View style={mls.screen}>
        <ScrollView contentContainerStyle={mls.scroll}>
          <LargeTitle title="Catch up first" />
          <Text style={mls.lead}>
            {pendingMeals.length === 1 ? 'One meal isn’t' : `${pendingMeals.length} meals aren’t`} logged yet. Log
            it, or mark it “didn’t eat” — a skipped meal never counts against you.
          </Text>
          <ListGroup>
            {pendingMeals.map((item) => (
              <PlateRow
                key={item.key}
                item={item}
                onPress={() =>
                  setEditing({ kind: 'meal', slotId: item.key, title: item.name, groups: [], existing: false })
                }
              />
            ))}
          </ListGroup>
        </ScrollView>
        <MealPickerModal
          target={editing}
          strict={rules.strict}
          weights={rules.scoring}
          custom={rules.custom_groups}
          offered={activeCustomGroups(prefs.custom_groups)}
          onCancel={() => setEditing(null)}
          onSave={logMeal}
          onSkip={skipMeal}
        />
      </View>
    );
  }

  return (
    <View style={mls.screen}>
      <ScrollView contentContainerStyle={[mls.scroll, styles.scroll, { paddingBottom: 120 + insets.bottom }]}>
        <View style={styles.hero}>
          <View style={[styles.badge, { backgroundColor: on ? MEALS_ACCENT : FAIL_COLOR }]}>
            <Ionicons name={on ? 'checkmark' : 'close'} size={30} color={Colors.white} />
          </View>
          <Text style={styles.heroTitle} accessibilityRole="header">
            {on ? 'On target' : 'Off target'}
          </Text>
          <Text style={styles.heroSub}>
            {on
              ? `Your day scored ${score.average}, at or above your target of ${rules.scoring.on_target_threshold}.`
              : 'Not this time. Every meal you logged still counts toward your week.'}
          </Text>
        </View>

        <ListGroup title="Plates">
          {[
            ...score.items.map((item) => (
              <ListRow
                key={item.key}
                title={item.name}
                right={
                  <Text style={[styles.value, item.state === 'scored' && { color: scoreColor(item.score) }]}>
                    {item.state === 'scored' ? item.score : 'Didn’t eat'}
                  </Text>
                }
              />
            )),
            <ListRow
              key="day"
              title="Day score"
              right={
                <Text style={styles.total}>
                  {score.average} · target {rules.scoring.on_target_threshold}+
                </Text>
              }
            />,
          ]}
        </ListGroup>

        {score.groupGoals.length > 0 && (
          <ListGroup title="Goals">
            {score.groupGoals.map((g) => (
              <ListRow
                key={g.goal.id}
                title={groupLabel(g.goal.group)}
                right={
                  <Text style={[styles.value, { color: g.met ? PASS_COLOR : Colors.gray }]}>
                    {g.have} of {g.goal.count}
                    {g.met ? ' ✓' : ''}
                  </Text>
                }
              />
            ))}
          </ListGroup>
        )}

        {on ? (
          <Text style={mls.lead}>Close the day, then rate your override on Today: how hard was it to start?</Text>
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

      <View style={[mls.footer, { paddingBottom: Spacing.md + insets.bottom }]}>
        <TouchableOpacity
          style={[mls.primaryBtn, saving && mls.disabled]}
          onPress={finish}
          disabled={saving}
          accessibilityRole="button"
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={mls.primaryBtnText}>{on ? 'Close & rate it' : 'Close the day'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: { paddingTop: Spacing.xl, gap: 24 },
  hero: { alignItems: 'center', gap: 6 },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  heroTitle: { ...TextStyles.largeTitle, color: Colors.dark },
  heroSub: { ...TextStyles.body, color: Colors.label2, textAlign: 'center', maxWidth: 300 },
  value: { ...TextStyles.body, color: Colors.gray },
  total: { ...TextStyles.headline, color: Colors.dark },
  reasonGroup: { ...TextStyles.subhead, fontWeight: '600', color: Colors.dark, paddingHorizontal: 4 },
});
