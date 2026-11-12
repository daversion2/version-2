import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Spacing, TextStyles } from '../../../../constants/theme';
import { LargeTitle } from '../../../../components/common/LargeTitle';
import { ListGroup, ListRow } from '../../../../components/common/ListGroup';
import type { MealsStackParamList } from '../../../../types/meals';
import { closeDay, closeHandsOff, scoreDay } from '../../../../services/mealsMath';
import { MEAL_OFF_REASONS, groupLabel } from '../../../../data/mealGroups';
import { saveMealsDay } from '../../../../services/labMeals';
import { showAlert } from '../../../../utils/alert';
import { useMeals } from './MealsContext';
import { plateTitle } from './components/MealsParts';
import { FAIL_COLOR, MEALS_ACCENT, PASS_COLOR, scoreColor, mls } from './components/mealsStyle';

type Props = NativeStackScreenProps<MealsStackParamList, 'MealsClose'>;

/** Offline, a Firestore write never settles — give up and say so rather than spin forever. */
const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

/**
 * Close out today, on what's logged so far. A day nobody closes closes on its
 * own at midnight, without the "why" — Today asks its rating the next time it
 * opens (mealsMath.needsMealsCatchUp). The result:
 *   - On target or off: hand it back to Today, which asks the day's one rating
 *     ("How hard was it to eat this way today?") and runs the celebration. Off
 *     target first gets an optional "what got in the way?". Only the first
 *     close of a day hands off: reopened and closed again, it was already
 *     rated (closeHandsOff).
 *   - Nothing logged: nothing to score, so it closes neither on nor off.
 */
export const MealsCloseScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { userId, today, rules, dayFor, saveDay, closeAndCheckOff } = useMeals();
  const day = dayFor(today);
  // Scored as it will close: settled.
  const score = useMemo(() => scoreDay(day, rules, true), [day, rules]);

  const [reasonId, setReasonId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const on = score.status === 'on';
  const none = score.status === 'none';
  const handsOff = closeHandsOff(day, rules);

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
    if (handsOff) closeAndCheckOff(closed.date, on);
    else navigation.goBack();
  };

  return (
    <View style={mls.screen}>
      <ScrollView contentContainerStyle={[mls.scroll, styles.scroll, { paddingBottom: 120 + insets.bottom }]}>
        <View style={styles.hero}>
          <View style={[styles.badge, { backgroundColor: on ? MEALS_ACCENT : none ? Colors.gray : FAIL_COLOR }]}>
            <Ionicons name={on ? 'checkmark' : none ? 'remove' : 'close'} size={30} color={Colors.white} />
          </View>
          <Text style={styles.heroTitle} accessibilityRole="header">
            {on ? 'On target' : none ? 'Nothing to score' : 'Off target'}
          </Text>
          <Text style={styles.heroSub}>
            {on
              ? `Your day scored ${score.average}, at or above your target of ${rules.scoring.on_target_threshold}.`
              : none
                ? 'Nothing’s logged today, so it counts neither way.'
                : 'Not this time. Every meal you logged still counts toward your week.'}
          </Text>
        </View>

        <ListGroup title="Plates">
          {[
            ...score.items.map((item) => (
              <ListRow
                key={item.key}
                title={plateTitle(item.name)}
                right={<Text style={[styles.value, { color: scoreColor(item.score) }]}>{item.score}</Text>}
              />
            )),
            <ListRow
              key="day"
              title="Day score"
              right={
                <Text style={styles.total}>
                  {score.average ?? '–'} · target {rules.scoring.on_target_threshold}+
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

        {!none && (
          <Text style={mls.lead}>
            {handsOff
              ? 'Close the day, then rate it on Today: how hard was it to eat this way?'
              : 'You’ve already rated today. Closing it again just saves your changes.'}
          </Text>
        )}
        {on || none ? null : (
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
            <Text style={mls.primaryBtnText}>{handsOff ? 'Close & rate it' : 'Close the day'}</Text>
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
