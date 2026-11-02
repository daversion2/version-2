import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomSheet } from '../../../../../components/common/BottomSheet';
import { Stepper } from '../../../../../components/common/Stepper';
import { SegmentedControl } from '../../../../../components/common/SegmentedControl';
import { BorderRadius, Colors, Fonts, FontSizes, Spacing } from '../../../../../constants/theme';
import { RESISTANCE_LEVELS, RESISTANCE_SCALE } from '../../../../../constants/resistance';
import type { HotColdSession, ThermalKind } from '../../../../../types/hotcold';
import { KIND_LABEL } from '../../../../../data/hotcold';
import {
  clampDuration,
  clampTemp,
  dayLabel,
  displayTemp,
  durationStep,
  formatDuration,
  MAX_DURATION_SEC,
  MIN_DURATION_SEC,
  prefillFor,
  RECORD_LABEL,
  storedTemp,
  tempBounds,
} from '../../../../../services/hotcoldMath';
import { addDays } from '../../../../../services/habitSchedule';
import { showConfirm } from '../../../../../utils/alert';
import { useHotCold } from '../HotColdContext';
import { hcs, KIND_COLOR } from './hotcoldStyle';

/** What the sheet is for: a new session (maybe from the timer) or an edit. */
export type LogTarget =
  | { mode: 'new'; kind: ThermalKind; duration_sec?: number; timed?: boolean }
  | { mode: 'edit'; session: HotColdSession };

type Day = 'today' | 'yesterday';

/**
 * The log sheet: time and temperature, prefilled from your last session of
 * that kind, then "How hard was it to start?". Tapping a rating saves, so a
 * whole log is two taps from opening the app. Render it with a fresh `key`
 * per target so its fields start over.
 */
export const LogSheet: React.FC<{
  target: LogTarget | null;
  onClose: () => void;
  /** After a save: a short line for Home, e.g. "New record: longest cold". */
  onSaved?: (note: string) => void;
}> = ({ target, onClose, onSaved }) => {
  const { prefs, sessions, today, saveSession, deleteSession, newId, clearUnlogged } = useHotCold();
  const unit = prefs.unit;

  const editing = target?.mode === 'edit' ? target.session : undefined;
  const kind: ThermalKind = editing?.kind ?? (target?.mode === 'new' ? target.kind : 'cold');
  const prefill = prefillFor(kind, sessions);
  const startSec =
    editing?.duration_sec ?? (target?.mode === 'new' ? target.duration_sec : undefined) ?? prefill.duration_sec;

  const [durationSec, setDurationSec] = useState(() => clampDuration(startSec, kind));
  const [temp, setTemp] = useState(() => displayTemp(editing?.temp_c ?? prefill.temp_c, unit));
  const [day, setDay] = useState<Day>(editing && editing.date !== today ? 'yesterday' : 'today');

  if (!target) return null;

  const bounds = tempBounds(kind, unit);
  const color = KIND_COLOR[kind];
  // An edit can't move a session older than yesterday; it just keeps its day.
  const canPickDay = !editing || editing.date === today || editing.date === addDays(today, -1);
  // From the timer: the time is only on the phone until this sheet saves it.
  const fromTimer = target.mode === 'new' && !!target.timed;

  // Tapping away from a timed session asks first — it can't be timed again.
  const dismiss = () => {
    if (!fromTimer) return onClose();
    showConfirm(
      'Discard this session?',
      `Your timed ${KIND_LABEL[kind].toLowerCase()} (${formatDuration(durationSec)}) won’t be saved.`,
      () => {
        clearUnlogged();
        onClose();
      },
      'Discard',
      'Keep it'
    );
  };

  const save = async (resistance?: 1 | 2 | 3) => {
    const session: HotColdSession = {
      id: editing?.id ?? newId(),
      kind,
      date: canPickDay ? (day === 'today' ? today : addDays(today, -1)) : editing!.date,
      logged_at: editing?.logged_at ?? new Date().toISOString(),
      duration_sec: clampDuration(durationSec, kind),
      temp_c: clampTemp(kind, storedTemp(temp, unit)),
      timed: editing?.timed ?? (target.mode === 'new' ? target.timed : undefined),
      // "Save changes" on an edit keeps the rating it had.
      resistance: resistance ?? editing?.resistance,
      resistance_scale: (resistance ?? editing?.resistance) ? RESISTANCE_SCALE : undefined,
    };
    onClose();
    const broke = await saveSession(session);
    // A failed save keeps a timed session on the phone; Home offers it again.
    if (broke === null) return;
    if (fromTimer) clearUnlogged();
    onSaved?.(
      broke.length
        ? `New record: ${broke.map((r) => RECORD_LABEL[r].toLowerCase()).join(' and ')}.`
        : `${KIND_LABEL[kind]} saved · ${formatDuration(session.duration_sec)}.`
    );
  };

  const remove = () =>
    showConfirm(
      'Delete this session?',
      'It comes off your week and your records.',
      () => {
        onClose();
        if (editing) deleteSession(editing.id);
      },
      'Delete'
    );

  return (
    <BottomSheet visible onClose={dismiss} title={editing ? `Edit ${KIND_LABEL[kind].toLowerCase()}` : KIND_LABEL[kind]}>
      <View style={styles.body}>
        {canPickDay ? (
          <SegmentedControl<Day>
            options={[
              { value: 'today', label: 'Today' },
              { value: 'yesterday', label: 'Yesterday' },
            ]}
            value={day}
            onChange={setDay}
            accessibilityLabel="Which day"
          />
        ) : (
          <Text style={[hcs.muted, styles.center]}>{dayLabel(editing!.date, today)}</Text>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>How long</Text>
          <Stepper
            value={durationSec}
            onChange={setDurationSec}
            min={MIN_DURATION_SEC}
            max={MAX_DURATION_SEC[kind]}
            step={durationStep(kind)}
            format={formatDuration}
            accessibilityLabel="How long"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{kind === 'cold' ? 'Water temperature' : 'Room temperature'}</Text>
          <Stepper
            value={temp}
            onChange={setTemp}
            min={bounds.min}
            max={bounds.max}
            step={bounds.step}
            format={(n) => `${n} °${unit}`}
            accessibilityLabel={kind === 'cold' ? 'Water temperature' : 'Room temperature'}
          />
        </View>

        <Text style={[styles.label, styles.question]}>How hard was it to start?</Text>
        <View style={styles.levels}>
          {RESISTANCE_LEVELS.map((level) => {
            const chosen = editing?.resistance === level.value;
            return (
              <TouchableOpacity
                key={level.value}
                style={[styles.level, chosen && { borderColor: color, backgroundColor: color + '14' }]}
                onPress={() => save(level.value)}
                accessibilityRole="button"
                accessibilityLabel={`${level.label}. Saves the session.`}
              >
                <Text style={styles.levelLabel}>{level.label}</Text>
                <Text style={hcs.muted}>{level.sublabel}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={hcs.textBtn} onPress={() => save()}>
            <Text style={hcs.textBtnText}>{editing ? 'Save changes' : 'Save without a rating'}</Text>
          </TouchableOpacity>
          {editing ? (
            <TouchableOpacity style={hcs.textBtn} onPress={remove}>
              <Text style={[hcs.textBtnText, { color: Colors.danger }]}>Delete</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  body: { gap: Spacing.md, paddingTop: Spacing.sm },
  center: { textAlign: 'center' },
  field: { alignItems: 'center', gap: Spacing.xs },
  label: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.gray },
  question: { textAlign: 'center', marginTop: Spacing.xs },
  levels: { gap: Spacing.sm },
  level: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.white,
    gap: 2,
  },
  levelLabel: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.md },
});
