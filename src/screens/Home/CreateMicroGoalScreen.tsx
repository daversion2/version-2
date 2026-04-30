import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { InputField } from '../../components/common/InputField';
import { Button } from '../../components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { createMicroGoal, getTodaysCount } from '../../services/microGoals';
import { MICRO_GOAL_CONSTANTS } from '../../constants/microGoals';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { GoalTagPicker } from '../../components/goals/GoalTagPicker';

type Props = NativeStackScreenProps<any, 'CreateMicroGoal'>;

const getDefaultDeadline = (): Date => {
  const d = new Date();
  d.setHours(d.getHours() + MICRO_GOAL_CONSTANTS.DEFAULT_DEADLINE_OFFSET_HOURS);
  d.setMinutes(0, 0, 0);
  return d;
};

const toHHMM = (date: Date): string =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

const formatTime12 = (date: Date): string => {
  const h = date.getHours();
  const m = date.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

export const CreateMicroGoalScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();

  const [description, setDescription] = useState('');
  const [deadlineDate, setDeadlineDate] = useState(getDefaultDeadline);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [todaysCount, setTodaysCount] = useState(0);
  const [goalIds, setGoalIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    getTodaysCount(user.uid).then(setTodaysCount);
  }, [user]);

  const handleTimeChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (date) setDeadlineDate(date);
  };

  const atCap = todaysCount >= MICRO_GOAL_CONSTANTS.MAX_PER_DAY;

  const handleCreate = async () => {
    if (!user || !description.trim() || atCap) return;
    setLoading(true);
    try {
      await createMicroGoal(user.uid, {
        description: description.trim(),
        deadline: toHHMM(deadlineDate),
        ...(goalIds.length > 0 ? { goal_ids: goalIds } : {}),
      });
      navigation.goBack();
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {atCap && (
          <View style={styles.capBanner}>
            <Ionicons name="information-circle" size={18} color={Colors.secondary} />
            <Text style={styles.capText}>
              You've reached the daily limit of {MICRO_GOAL_CONSTANTS.MAX_PER_DAY} sprints
            </Text>
          </View>
        )}

        {/* Description */}
        <Text style={styles.label}>What do you want to accomplish?</Text>
        <InputField
          label=""
          value={description}
          onChangeText={setDescription}
          placeholder="e.g., Finish the draft report"
          maxLength={MICRO_GOAL_CONSTANTS.DESCRIPTION_MAX_LENGTH}
          multiline
          numberOfLines={2}
        />
        <Text style={styles.charCount}>
          {description.length}/{MICRO_GOAL_CONSTANTS.DESCRIPTION_MAX_LENGTH}
        </Text>

        {/* Deadline */}
        <Text style={styles.label}>Deadline</Text>
        <TouchableOpacity
          style={styles.timeSelector}
          onPress={() => setShowTimePicker(!showTimePicker)}
        >
          <Ionicons name="time-outline" size={20} color={Colors.primary} />
          <Text style={styles.timeSelectorText}>
            {formatTime12(deadlineDate)}
          </Text>
          <Ionicons name="chevron-down" size={16} color={Colors.gray} />
        </TouchableOpacity>

        {showTimePicker && (
          <DateTimePicker
            value={deadlineDate}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
            minuteInterval={5}
          />
        )}

        <GoalTagPicker selectedGoalIds={goalIds} onChange={setGoalIds} />

        <Button
          title="Create Sprint"
          onPress={handleCreate}
          disabled={!description.trim() || loading || atCap}
          style={{ marginTop: Spacing.xl }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  label: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  charCount: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  timeSelectorText: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  capBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.secondary + '15',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  capText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
    flex: 1,
  },
});
