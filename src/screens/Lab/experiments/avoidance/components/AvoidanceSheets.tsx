import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomSheet } from '../../../../../components/common/BottomSheet';
import { BorderRadius, Colors, Fonts, FontSizes, Spacing } from '../../../../../constants/theme';
import { RESISTANCE_LEVELS } from '../../../../../constants/resistance';
import type { AvoidanceTask, Level } from '../../../../../types/avoidance';
import { MAX_TASK_LENGTH } from '../../../../../data/avoidance';
import { cleanTaskText, describeAvoided, daysAvoided } from '../../../../../services/avoidanceMath';
import { showConfirm } from '../../../../../utils/alert';
import { useAvoidance } from '../AvoidanceContext';
import { avs, levelLabel } from './avoidanceStyle';
import { Copy } from '../../../../../components/common/Copy';
import { useCopy } from '../../../../../context/CopyContext';

/**
 * "Did it": how hard was it to start? Tapping a level saves, the same one-tap
 * rating every app uses. Shows what you expected, so the comparison is right
 * there.
 */
export const RateSheet: React.FC<{
  task: AvoidanceTask | null;
  onClose: () => void;
  onRate: (task: AvoidanceTask, resistance?: Level) => void;
}> = ({ task, onClose, onRate }) => {
  const t = useCopy();
  if (!task) return null;
  const expected = levelLabel(task.forecast);
  return (
    <BottomSheet visible onClose={onClose} title={t('avoidance.rate.title', 'How hard was it to start?')}>
      <View style={styles.body}>
        <Text style={[avs.body, styles.center]} numberOfLines={2}>
          {task.text}
        </Text>
        {expected ? (
          <Copy id="avoidance.rate.expected" style={[avs.muted, styles.center]} vars={{ expected }}>
            {'You expected: {expected}'}
          </Copy>
        ) : null}
        <View style={styles.levels}>
          {RESISTANCE_LEVELS.map((level) => (
            <TouchableOpacity
              key={level.value}
              style={styles.level}
              onPress={() => onRate(task, level.value)}
              accessibilityRole="button"
              accessibilityLabel={`${level.label}. Saves it.`}
            >
              <Text style={styles.levelLabel}>{level.label}</Text>
              <Text style={avs.muted}>{level.sublabel}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={avs.textBtn} onPress={() => onRate(task)}>
          <Copy id="avoidance.rate.saveNoRating" style={avs.textBtnText}>Save without a rating</Copy>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
};

/** The 3 levels as small chips, for "How hard will it be to start?". */
export const ForecastChips: React.FC<{
  value?: Level;
  onPick: (level: Level) => void;
  disabled?: boolean;
}> = ({ value, onPick, disabled }) => (
  <View style={avs.chipRow}>
    {RESISTANCE_LEVELS.map((level) => (
      <TouchableOpacity
        key={level.value}
        style={[avs.chip, value === level.value && avs.chipOn, disabled && styles.dim]}
        onPress={() => onPick(level.value)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ selected: value === level.value }}
      >
        <Text style={avs.chipText}>{level.label}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

/**
 * Tap a task in the list: do it now, rename it, change what you expect, or
 * delete it. Render with a fresh `key` per task so the fields start over.
 */
export const TaskSheet: React.FC<{
  task: AvoidanceTask | null;
  onClose: () => void;
  onDidIt: (task: AvoidanceTask) => void;
}> = ({ task, onClose, onDidIt }) => {
  const t = useCopy();
  const { today, updateTask, deleteTask } = useAvoidance();
  const [text, setText] = useState(task?.text ?? '');
  const [forecast, setForecast] = useState<Level | undefined>(task?.forecast);
  if (!task) return null;

  const changed = text.trim() !== task.text || forecast !== task.forecast;
  const valid = !!cleanTaskText(text);

  const save = async () => {
    if (!valid) return;
    onClose();
    await updateTask({ ...task, text, forecast });
  };

  const remove = () =>
    showConfirm(
      t('avoidance.task.delete.title', 'Delete this?'),
      t('avoidance.task.delete.message', 'It won’t count as cleared. It’s just gone from the list.'),
      () => {
        onClose();
        deleteTask(task.id);
      },
      t('avoidance.task.delete.confirm', 'Delete')
    );

  return (
    <BottomSheet visible onClose={onClose} avoidKeyboard>
      <View style={styles.body}>
        <Text style={avs.muted}>{describeAvoided(daysAvoided(task, today))}</Text>
        <TextInput
          style={avs.input}
          value={text}
          onChangeText={setText}
          maxLength={MAX_TASK_LENGTH}
          returnKeyType="done"
          onSubmitEditing={save}
          accessibilityLabel="What you’ve been putting off"
        />
        <Copy id="avoidance.task.forecast" style={styles.label}>How hard will it be to start?</Copy>
        <ForecastChips value={forecast} onPick={(l) => setForecast(forecast === l ? undefined : l)} />
        <TouchableOpacity
          style={[avs.primaryBtn, styles.didIt]}
          onPress={() => {
            // Unsaved edits go with it: saved now, so a skipped rating keeps them,
            // and cleared as edited. A blanked name keeps the old one.
            const edited: AvoidanceTask = { ...task, text: cleanTaskText(text) ?? task.text, forecast };
            onClose();
            if (changed) updateTask(edited);
            onDidIt(edited);
          }}
        >
          <Copy id="avoidance.task.didIt" style={avs.primaryBtnText}>Did it</Copy>
        </TouchableOpacity>
        <View style={styles.footer}>
          {changed ? (
            <TouchableOpacity style={avs.textBtn} onPress={save} disabled={!valid}>
              <Copy id="avoidance.task.saveChanges" style={[avs.link, !valid && styles.dim]}>Save changes</Copy>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={avs.textBtn} onPress={remove}>
            <Copy id="avoidance.task.delete" style={[avs.textBtnText, { color: Colors.danger }]}>Delete</Copy>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  body: { gap: Spacing.md, paddingTop: Spacing.xs },
  center: { textAlign: 'center' },
  label: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.gray },
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
  didIt: { marginTop: Spacing.xs },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.md },
  dim: { opacity: 0.4 },
});

