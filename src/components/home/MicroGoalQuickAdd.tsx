import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { MICRO_GOAL_CONSTANTS } from '../../constants/microGoals';

interface MicroGoalQuickAddProps {
  onAdd: (description: string, deadline: string) => Promise<void>;
  disabled: boolean;
  currentCount: number;
  maxCount: number;
}

const getDefaultDeadline = (): Date => {
  const d = new Date();
  d.setHours(d.getHours() + MICRO_GOAL_CONSTANTS.DEFAULT_DEADLINE_OFFSET_HOURS);
  d.setMinutes(0, 0, 0);
  return d;
};

const formatTime12 = (date: Date): string => {
  const h = date.getHours();
  const m = date.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

const toHHMM = (date: Date): string => {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export const MicroGoalQuickAdd: React.FC<MicroGoalQuickAddProps> = ({
  onAdd,
  disabled,
  currentCount,
  maxCount,
}) => {
  const [description, setDescription] = useState('');
  const [deadlineDate, setDeadlineDate] = useState(getDefaultDeadline);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (date) setDeadlineDate(date);
  };

  const handleAdd = async () => {
    const trimmed = description.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      await onAdd(trimmed, toHHMM(deadlineDate));
      setDescription('');
      setDeadlineDate(getDefaultDeadline());
    } finally {
      setSubmitting(false);
    }
  };

  if (disabled) {
    return (
      <View style={styles.disabledContainer}>
        <Ionicons name="checkmark-done" size={16} color={Colors.gray} />
        <Text style={styles.disabledText}>
          {currentCount}/{maxCount} sprints today
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Add a sprint..."
          placeholderTextColor={Colors.gray}
          value={description}
          onChangeText={setDescription}
          maxLength={MICRO_GOAL_CONSTANTS.DESCRIPTION_MAX_LENGTH}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />

        <TouchableOpacity
          style={styles.timeBtn}
          onPress={() => setShowTimePicker(!showTimePicker)}
        >
          <Ionicons name="time-outline" size={16} color={Colors.primary} />
          <Text style={styles.timeText}>{formatTime12(deadlineDate)}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.addBtn, (!description.trim() || submitting) && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={!description.trim() || submitting}
        >
          <Ionicons name="add" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      {showTimePicker && (
        <DateTimePicker
          value={deadlineDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
          minuteInterval={5}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    backgroundColor: Colors.lightGray,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  timeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  timeText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    backgroundColor: Colors.gray,
    opacity: 0.5,
  },
  disabledContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  disabledText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
});
