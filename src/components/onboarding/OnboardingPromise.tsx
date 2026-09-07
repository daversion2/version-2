import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, Switch } from 'react-native';
import DateTimePickerNative, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { ANCHORS, defaultTimeForAnchor, findAnchorByPhrase } from '../../data/anchors';
import { HabitDefinition, getCommitmentField } from '../../data/practices';
import {
  HabitSchedule,
  WEEKDAY_LABELS,
  WEEK_DISPLAY_ORDER,
  Weekday,
  describeSchedule,
} from '../../services/habitSchedule';
import {
  FALLBACK_REMINDER_TIME,
  HabitSetupDraft,
  defaultDaysForTarget,
  describePromise,
  draftSchedulable,
  formatReminderTime,
  stepAmount,
  toggleDay,
} from '../../services/onboardingSetup';
import { ob } from './onboardingStyles';

// ============================================================================
// BEAT 3 — MAKE IT A PROMISE
//
// The beat the previous onboarding didn't have, and the one that matters most.
// Nothing in the old flow set an amount, a schedule, an anchor or a reminder —
// yet those four fields are what make a habit a commitment rather than a
// checkbox. They lived on the library detail screen, which a brand-new user has
// never visited, so people landed on Today holding habits nobody had promised
// anything about.
//
// EVERY FIELD ARRIVES PRE-FILLED from the definition (see
// deriveHabitSetupDraft), so the honest path through is tap-to-accept.
//
// ONLY THE ANCHOR is asked from the action plan. The other five questions —
// environment, WOOP obstacle, minimum version, accountability — belong on the
// detail screen later. Asking someone to pre-plan their obstacles in minute two
// is how you lose them.
// ============================================================================

interface Props {
  definition: HabitDefinition;
  draft: HabitSetupDraft;
  onChange: (next: HabitSetupDraft) => void;
}

const timeToDate = (hhmm: string): Date => {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  return new Date(2000, 0, 1, Number.isNaN(h) ? 9 : h, Number.isNaN(m) ? 0 : m);
};

const MIN_COUNT = 1;
const MAX_COUNT = 7;

export const OnboardingPromise: React.FC<Props> = ({ definition, draft, onChange }) => {
  const [showTimePicker, setShowTimePicker] = useState(false);
  const commitment = getCommitmentField(definition);

  const patch = (next: Partial<HabitSetupDraft>) => onChange({ ...draft, ...next });

  const onAmountStep = (direction: 1 | -1) => {
    if (typeof draft.amount !== 'number') return;
    patch({ amount: stepAmount(definition, draft.amount, direction) });
  };

  const setMode = (kind: HabitSchedule['kind']) => {
    if (kind === draft.schedule.kind) return;
    // Carry the size of the commitment across the switch rather than resetting
    // it — the user picked "five" once and shouldn't have to pick it again.
    // Days come from defaultDaysForTarget so switching to "specific days" gives
    // a spread week rather than Mon–Wed.
    patch({
      schedule:
        kind === 'days'
          ? {
              kind: 'days',
              days: defaultDaysForTarget(
                draft.schedule.kind === 'count' ? draft.schedule.target : 3
              ),
            }
          : {
              kind: 'count',
              target: draft.schedule.kind === 'days' ? draft.schedule.days.length : 3,
            },
    });
  };

  const onToggleDay = (day: Weekday) => {
    if (draft.schedule.kind !== 'days') return;
    patch({ schedule: { kind: 'days', days: toggleDay(draft.schedule.days, day) } });
  };

  const onCountStep = (direction: 1 | -1) => {
    if (draft.schedule.kind !== 'count') return;
    const target = Math.max(MIN_COUNT, Math.min(MAX_COUNT, draft.schedule.target + direction));
    patch({ schedule: { kind: 'count', target } });
  };

  const onPickAnchor = (phrase: string) => {
    // Picking a curated anchor re-times the reminder with it. Typing a custom
    // one leaves the time alone — an event-based anchor ("reach a staircase")
    // has no natural clock time to derive.
    patch({ anchor: phrase, reminderTime: defaultTimeForAnchor(phrase) ?? draft.reminderTime });
  };

  const onTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selected) {
      const hh = String(selected.getHours()).padStart(2, '0');
      const mm = String(selected.getMinutes()).padStart(2, '0');
      patch({ reminderTime: `${hh}:${mm}` });
    }
    if (Platform.OS === 'ios' && event.type === 'dismissed') setShowTimePicker(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <Text style={ob.eyebrow}>{definition.name}</Text>
      <Text style={ob.headline}>Now make it a promise.</Text>
      <Text style={ob.body}>Everything's filled in already — change what's wrong, keep what isn't.</Text>

      {/* ---- How much? ---------------------------------------------------- */}
      <View style={[ob.field, ob.fieldFirst]}>
        {commitment && typeof draft.amount === 'number' ? (
          <>
            <View style={styles.labelRow}>
              <Text style={ob.label}>{commitment.label}</Text>
              <Text style={styles.prefill}>suggested</Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={styles.stepButton}
                onPress={() => onAmountStep(-1)}
                accessibilityLabel="Decrease"
              >
                <Text style={styles.stepButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepValue}>{draft.amount}</Text>
              {!!commitment.unit && <Text style={styles.stepUnit}>{commitment.unit}</Text>}
              <TouchableOpacity
                style={[styles.stepButton, { marginLeft: 'auto' }]}
                onPress={() => onAmountStep(1)}
                accessibilityLabel="Increase"
              >
                <Text style={styles.stepButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={[ob.helper, styles.helperSpaced]}>
              Falling short still counts as done. The amount is recorded, never enforced.
            </Text>
          </>
        ) : (
          <>
            <Text style={ob.label}>How much?</Text>
            <Text style={ob.helper}>
              This one has no natural amount — you either did it or you didn't, so logging it stays
              one tap.
            </Text>
          </>
        )}
      </View>

      {/* ---- Which days? -------------------------------------------------- */}
      <View style={ob.field}>
        <Text style={ob.label}>Which days?</Text>
        <View style={styles.modes}>
          {(['days', 'count'] as const).map((kind) => {
            const on = draft.schedule.kind === kind;
            return (
              <TouchableOpacity
                key={kind}
                style={[styles.mode, ob.choice, on && ob.choiceOn]}
                onPress={() => setMode(kind)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.modeText, on && styles.modeTextOn]}>
                  {kind === 'days' ? 'Specific days' : 'A number each week'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {draft.schedule.kind === 'days' ? (
          <View style={styles.days}>
            {WEEK_DISPLAY_ORDER.map((day) => {
              const on = draft.schedule.kind === 'days' && draft.schedule.days.includes(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.day, on && styles.dayOn]}
                  onPress={() => onToggleDay(day)}
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
        ) : (
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepButton}
              onPress={() => onCountStep(-1)}
              accessibilityLabel="Fewer"
            >
              <Text style={styles.stepButtonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepValue}>{draft.schedule.target}</Text>
            <Text style={styles.stepUnit}>× a week</Text>
            <TouchableOpacity
              style={[styles.stepButton, { marginLeft: 'auto' }]}
              onPress={() => onCountStep(1)}
              accessibilityLabel="More"
            >
              <Text style={styles.stepButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        )}
        <Text style={[ob.helper, styles.helperSpaced]}>
          {describeSchedule(draftSchedulable(draft))}
        </Text>
      </View>

      {/* ---- After what? -------------------------------------------------- */}
      <View style={ob.field}>
        <Text style={ob.label}>After what?</Text>
        <View style={styles.anchors}>
          {ANCHORS.map((anchor) => {
            const on = findAnchorByPhrase(draft.anchor)?.key === anchor.key;
            return (
              <TouchableOpacity
                key={anchor.key}
                // ob.choice FIRST: it carries a medium radius, and the pill
                // shape below has to win over it.
                style={[ob.choice, styles.anchor, on && ob.choiceOn]}
                onPress={() => onPickAnchor(anchor.phrase)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.anchorText, on && styles.anchorTextOn]}>{anchor.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.anchorLine}>
          <Text style={styles.anchorPrefix}>After I</Text>
          <TextInput
            style={styles.anchorInput}
            value={draft.anchor}
            onChangeText={(anchor) => patch({ anchor })}
            placeholder="walk the dog"
            placeholderTextColor={Colors.gray}
            accessibilityLabel="After I…"
          />
        </View>
        <Text style={[ob.helper, styles.helperSpaced]}>
          Stacking onto a routine you already run borrows a cue your brain fires without you.
        </Text>
      </View>

      {/* ---- Remind me ---------------------------------------------------- */}
      <View style={ob.field}>
        <View style={styles.reminderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[ob.label, { marginBottom: 2 }]}>Remind me</Text>
            <TouchableOpacity
              onPress={() => setShowTimePicker((v) => !v)}
              disabled={!draft.reminderEnabled}
            >
              <Text
                style={[styles.reminderTime, !draft.reminderEnabled && styles.reminderTimeOff]}
              >
                {formatReminderTime(draft.reminderTime)}
                {draft.reminderEnabled ? ' · change' : ''}
              </Text>
            </TouchableOpacity>
          </View>
          <Switch
            value={draft.reminderEnabled}
            onValueChange={(reminderEnabled) => patch({ reminderEnabled })}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            accessibilityLabel="Reminder"
          />
        </View>
        {showTimePicker && draft.reminderEnabled && (
          <DateTimePickerNative
            value={timeToDate(draft.reminderTime || FALLBACK_REMINDER_TIME)}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onTimeChange}
            is24Hour={false}
          />
        )}
      </View>

      {/* ---- The promise, spoken back ------------------------------------- */}
      <View style={styles.promise}>
        <Text style={styles.promiseWas}>{definition.name}</Text>
        <Text style={styles.promiseIs}>{describePromise(definition, draft)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  prefill: {
    marginLeft: 'auto',
    marginBottom: Spacing.sm,
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
    backgroundColor: Colors.primary + '14',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  helperSpaced: { marginTop: Spacing.sm },

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
  stepButtonText: { fontFamily: Fonts.secondary, fontSize: 20, color: Colors.primary },
  stepValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.hero,
    color: Colors.dark,
    minWidth: 56,
  },
  stepUnit: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, marginLeft: -Spacing.sm },

  modes: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.sm },
  mode: { flex: 1, paddingVertical: 10, alignItems: 'center' },
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

  anchors: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.sm },
  anchor: { paddingVertical: 6, paddingHorizontal: 11, borderRadius: BorderRadius.full },
  anchorText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  anchorTextOn: { fontFamily: Fonts.secondaryBold, color: Colors.primary },
  anchorLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 4,
  },
  anchorPrefix: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray },
  anchorInput: {
    flex: 1,
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    padding: 0,
  },

  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  reminderTime: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.primary },
  reminderTimeOff: { color: Colors.gray },

  promise: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
  },
  promiseWas: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.white,
    opacity: 0.7,
    textDecorationLine: 'line-through',
  },
  promiseIs: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
    lineHeight: 25,
    marginTop: 5,
  },
});
