import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from '../../../../../components/common/BottomSheet';
import { SegmentedControl } from '../../../../../components/common/SegmentedControl';
import { BorderRadius, Colors, Fonts, FontSizes, Spacing } from '../../../../../constants/theme';
import { RESISTANCE_LEVELS, RESISTANCE_SCALE } from '../../../../../constants/resistance';
import { PAIN_ITEM, PAIN_SCALE_HINT } from '../../../../../data/painPlan';
import type { PainDay, PainItemId } from '../../../../../types/pain';
import { dayLabel, isPlanDay, painWord, planOn } from '../../../../../services/painMath';
import { addDays } from '../../../../../services/habitSchedule';
import { showConfirm } from '../../../../../utils/alert';
import { usePain } from '../PainContext';
import { PainScale } from './PainScale';
import { PAIN_ACCENT, ps } from './painStyle';

/** Which day to check in, and a pain already tapped on Home. */
export interface CheckInTarget {
  date: string;
  pain?: number;
}

/**
 * The daily check-in: today's average pain, the plan items done, then "How
 * hard was it to get started today?" — tapping a rating saves. With nothing
 * ticked there's nothing to rate, so it's a plain Save. Render it with a fresh
 * `key` per target so its fields start over.
 */
export const CheckInSheet: React.FC<{
  target: CheckInTarget | null;
  onClose: () => void;
  /** After a save: a short line for Home. */
  onSaved?: (note: string) => void;
}> = ({ target, onClose, onSaved }) => {
  const { days, plans, today, saveDay, deleteDay } = usePain();

  const existingFor = (date: string) => days.find((d) => d.date === date);
  const [date, setDate] = useState(target?.date ?? today);
  const [pain, setPain] = useState<number | undefined>(target?.pain ?? existingFor(target?.date ?? today)?.pain);
  const [done, setDone] = useState<PainItemId[]>(existingFor(target?.date ?? today)?.done ?? []);

  if (!target) return null;

  const existing = existingFor(date);
  const plan = planOn(plans, date);
  const yesterday = addDays(today, -1);
  // Only a check-in started for today can move to yesterday (a forgotten evening).
  const canPickDay = target.date === today;

  const pickDay = (next: string) => {
    setDate(next);
    const there = existingFor(next);
    // Keep a number already tapped unless that day has its own.
    if (there) setPain(there.pain);
    setDone(there?.done ?? []);
  };

  const toggle = (id: PainItemId) =>
    setDone((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));

  // Only items on that day's plan count; an old tick from a swapped-out item is dropped.
  const ticked = plan ? done.filter((id) => plan.items.includes(id)) : [];

  const save = async (resistance?: 1 | 2 | 3) => {
    if (pain === undefined) return;
    // "Save changes" on an edit keeps its rating while something is still ticked.
    const rating = ticked.length ? (resistance ?? existing?.resistance) : undefined;
    const day: PainDay = {
      date,
      pain,
      done: ticked,
      logged_at: existing?.logged_at ?? new Date().toISOString(),
      resistance: rating,
      resistance_scale: rating ? RESISTANCE_SCALE : undefined,
    };
    onClose();
    if (!(await saveDay(day))) return;
    const label = date === today ? 'Today' : dayLabel(date, today);
    onSaved?.(
      isPlanDay(day, plan)
        ? `${label}: ${pain}/10, whole plan done.`
        : `${label}: ${pain}/10, ${painWord(pain).toLowerCase()}.`
    );
  };

  const remove = () =>
    showConfirm(
      'Delete this check-in?',
      'It comes off your week and your plan.',
      () => {
        onClose();
        deleteDay(date);
      },
      'Delete'
    );

  return (
    <BottomSheet visible onClose={onClose} title={existing ? 'Edit check-in' : 'How’s your back?'}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} bounces={false}>
        {canPickDay ? (
          <SegmentedControl<string>
            options={[
              { value: today, label: 'Today' },
              { value: yesterday, label: 'Yesterday' },
            ]}
            value={date}
            onChange={pickDay}
            accessibilityLabel="Which day"
          />
        ) : (
          <Text style={[ps.muted, ps.centerText]}>{dayLabel(date, today)}</Text>
        )}

        <View style={styles.block}>
          <Text style={ps.label}>Average pain {date === today ? 'today' : 'that day'}</Text>
          <PainScale value={pain} onChange={setPain} low="No pain" high="Worst" accessibilityLabel="Pain" />
          <Text style={[ps.muted, ps.centerText]}>{pain === undefined ? PAIN_SCALE_HINT : painWord(pain)}</Text>
        </View>

        {plan ? (
          <View style={styles.block}>
            <Text style={ps.label}>Did you do these?</Text>
            {plan.items.map((id) => {
              const on = done.includes(id);
              return (
                <TouchableOpacity
                  key={id}
                  style={[styles.item, on && styles.itemOn]}
                  onPress={() => toggle(id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={PAIN_ITEM[id].title}
                >
                  <Ionicons
                    name={on ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={on ? PAIN_ACCENT : Colors.separator}
                  />
                  <Text style={[ps.title, ps.flex]}>{PAIN_ITEM[id].title}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {ticked.length ? (
          <View style={styles.block}>
            <Text style={[ps.label, ps.centerText]}>How hard was it to get started today?</Text>
            {RESISTANCE_LEVELS.map((level) => {
              const chosen = existing?.resistance === level.value;
              return (
                <TouchableOpacity
                  key={level.value}
                  style={[styles.level, chosen && styles.levelOn, pain === undefined && styles.off]}
                  onPress={() => save(level.value)}
                  disabled={pain === undefined}
                  accessibilityRole="button"
                  accessibilityLabel={`${level.label}. Saves the check-in.`}
                >
                  <Text style={styles.levelLabel}>{level.label}</Text>
                  <Text style={ps.muted}>{level.sublabel}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={ps.textBtn} onPress={() => save()} disabled={pain === undefined}>
              <Text style={ps.textBtnText}>{existing ? 'Save changes' : 'Save without a rating'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[ps.primaryBtn, pain === undefined && ps.primaryBtnOff]}
            onPress={() => save()}
            disabled={pain === undefined}
          >
            <Text style={ps.primaryBtnText}>Save</Text>
          </TouchableOpacity>
        )}

        {existing ? (
          <TouchableOpacity style={ps.textBtn} onPress={remove}>
            <Text style={[ps.textBtnText, { color: Colors.danger }]}>Delete</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  scroll: { maxHeight: 620 },
  body: { gap: Spacing.md, paddingTop: Spacing.sm },
  block: { gap: Spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.white,
  },
  itemOn: { borderColor: PAIN_ACCENT, backgroundColor: PAIN_ACCENT + '14' },
  level: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.white,
    gap: 2,
  },
  levelOn: { borderColor: PAIN_ACCENT, backgroundColor: PAIN_ACCENT + '14' },
  off: { opacity: 0.4 },
  levelLabel: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark },
});
