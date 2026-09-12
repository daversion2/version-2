import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import {
  HabitSchedule,
  WEEKDAY_LABELS,
  WEEK_DISPLAY_ORDER,
  Weekday,
  describeSchedule,
  scheduleFields,
  switchScheduleKind,
  toggleDay,
} from '../../services/habitSchedule';

// ============================================================================
// SCHEDULE PICKER — the one place a habit's schedule is chosen.
//
// Used by onboarding beat 3, the custom-habit form, the library detail screen
// and the edit sheet. Four surfaces, one control: a habit set up in the library
// and the same habit edited a month later have to offer the same promise, or
// "Mon, Wed & Fri" becomes something only certain screens can express.
//
// PRESENTATIONAL ONLY. Every rule about what a schedule may be —
// spreading days across the week, refusing to empty the set, carrying the size
// across a mode switch — lives in services/habitSchedule, where jest can see
// it. This file renders those functions and nothing else.
// ============================================================================

const MIN_COUNT = 1;
const MAX_COUNT = 7;

const DAY_PRESETS: { label: string; days: Weekday[] }[] = [
  { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
  { label: 'Weekends', days: [0, 6] },
  { label: 'Every day', days: [0, 1, 2, 3, 4, 5, 6] },
];

const COUNT_PRESETS: { label: string; value: number }[] = [
  { label: '3×', value: 3 },
  { label: '5×', value: 5 },
  { label: 'Daily', value: 7 },
];

interface Props {
  schedule: HabitSchedule;
  onChange: (next: HabitSchedule) => void;
  /** One-tap Weekdays / Weekends / Every day shortcuts. */
  showPresets?: boolean;
  /**
   * The schedule spelled back — "Mon, Wed & Fri". On by default: the chips say
   * M W F, and reading that as a sentence is what makes it a promise.
   */
  showSummary?: boolean;
  /** An extra line under the summary, for whatever this surface has to add. */
  helper?: string;
  style?: StyleProp<ViewStyle>;
  /**
   * Resting / selected styles for the two mode buttons, so a caller with its
   * own choice vocabulary (onboarding's `ob.choice`) stays visually native.
   * Defaults to the segmented control below.
   */
  modeStyle?: StyleProp<ViewStyle>;
  modeStyleOn?: StyleProp<ViewStyle>;
}

export const SchedulePicker: React.FC<Props> = ({
  schedule,
  onChange,
  showPresets = true,
  showSummary = true,
  helper,
  style,
  modeStyle,
  modeStyleOn,
}) => {
  const segmented = modeStyle === undefined;

  const setCount = (target: number) =>
    onChange({ kind: 'count', target: Math.max(MIN_COUNT, Math.min(MAX_COUNT, target)) });

  return (
    <View style={style}>
      {/* Mode switch. Two genuinely different promises: "4× a week" leaves the
          days to you and can only be judged at the end of the week; "Mon, Wed &
          Fri" names them, which is what makes a missed day a fact rather than a
          projection — and what lets a reminder fire only on days you claimed. */}
      <View style={[styles.modes, segmented && styles.modesSegmented]}>
        {(
          [
            { kind: 'days', label: 'Specific days' },
            { kind: 'count', label: 'Times a week' },
          ] as const
        ).map((option) => {
          const on = schedule.kind === option.kind;
          return (
            <TouchableOpacity
              key={option.kind}
              style={[
                styles.mode,
                segmented ? styles.modeSegmented : modeStyle,
                on && (segmented ? styles.modeSegmentedOn : modeStyleOn),
              ]}
              onPress={() => onChange(switchScheduleKind(schedule, option.kind))}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.modeText, on && styles.modeTextOn]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {schedule.kind === 'days' ? (
        <>
          <View style={styles.days}>
            {WEEK_DISPLAY_ORDER.map((day) => {
              const on = schedule.days.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.day, on && styles.dayOn]}
                  onPress={() => onChange({ kind: 'days', days: toggleDay(schedule.days, day) })}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={WEEKDAY_LABELS[day]}
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.dayText, on && styles.dayTextOn]}>
                    {WEEKDAY_LABELS[day].charAt(0)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {showPresets && (
            <View style={styles.presets}>
              {DAY_PRESETS.map((preset) => {
                const on =
                  preset.days.length === schedule.days.length &&
                  preset.days.every((d) => schedule.days.includes(d));
                return (
                  <TouchableOpacity
                    key={preset.label}
                    style={[styles.preset, on && styles.presetOn]}
                    onPress={() => onChange({ kind: 'days', days: preset.days })}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.presetText, on && styles.presetTextOn]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </>
      ) : (
        <>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={[styles.stepButton, schedule.target <= MIN_COUNT && styles.stepButtonOff]}
              onPress={() => setCount(schedule.target - 1)}
              disabled={schedule.target <= MIN_COUNT}
              accessibilityLabel="Fewer"
              accessibilityRole="button"
            >
              <Text style={styles.stepButtonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepValue}>{schedule.target}</Text>
            <Text style={styles.stepUnit}>× a week</Text>
            <TouchableOpacity
              style={[
                styles.stepButton,
                { marginLeft: 'auto' },
                schedule.target >= MAX_COUNT && styles.stepButtonOff,
              ]}
              onPress={() => setCount(schedule.target + 1)}
              disabled={schedule.target >= MAX_COUNT}
              accessibilityLabel="More"
              accessibilityRole="button"
            >
              <Text style={styles.stepButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          {showPresets && (
            <View style={styles.presets}>
              {COUNT_PRESETS.map((preset) => {
                const on = schedule.target === preset.value;
                return (
                  <TouchableOpacity
                    key={preset.value}
                    style={[styles.preset, on && styles.presetOn]}
                    onPress={() => setCount(preset.value)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.presetText, on && styles.presetTextOn]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </>
      )}

      {showSummary && (
        <Text style={styles.summary}>{describeSchedule(scheduleFields(schedule))}</Text>
      )}
      {!!helper && <Text style={styles.helper}>{helper}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  modes: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.sm },
  modesSegmented: {
    padding: 4,
    gap: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.lightGray,
  },
  mode: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  modeSegmented: { borderRadius: BorderRadius.full },
  modeSegmentedOn: { backgroundColor: Colors.white },
  modeText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.gray },
  modeTextOn: { color: Colors.primary },

  days: { flexDirection: 'row', gap: Spacing.xs },
  day: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.gray },
  dayTextOn: { color: Colors.white },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonOff: { opacity: 0.4 },
  stepButtonText: { fontFamily: Fonts.secondary, fontSize: 20, color: Colors.primary },
  stepValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.hero,
    color: Colors.dark,
    minWidth: 56,
  },
  stepUnit: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginLeft: -Spacing.sm,
  },

  presets: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  preset: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  presetText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.gray },
  presetTextOn: { color: Colors.white },

  summary: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    lineHeight: 18,
    marginTop: Spacing.sm,
  },
  helper: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    lineHeight: 18,
    marginTop: 4,
  },
});
