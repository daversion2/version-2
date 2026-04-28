import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { InputField } from '../../components/common/InputField';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { createGoal, getActiveGoals } from '../../services/goals';
import { GOAL_CONSTANTS } from '../../constants/goals';

type Props = NativeStackScreenProps<any, 'CreateGoal'>;

const formatDate = (date: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

const toYYYYMMDD = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const CreateGoalScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30); // Default 30 days out
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    getActiveGoals(user.uid).then(goals => setActiveCount(goals.length));
  }, [user]);

  const atCap = activeCount >= GOAL_CONSTANTS.MAX_ACTIVE;

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setEndDate(date);
  };

  const handleCreate = async () => {
    if (!user || !name.trim() || atCap) return;

    // Validate end date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (endDate <= today) {
      Alert.alert('Invalid Date', 'End date must be in the future.');
      return;
    }

    setLoading(true);
    try {
      await createGoal(user.uid, {
        name: name.trim(),
        description: description.trim() || undefined,
        end_date: toYYYYMMDD(endDate),
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create goal');
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
              You've reached the limit of {GOAL_CONSTANTS.MAX_ACTIVE} active goals. Complete or archive a goal first.
            </Text>
          </View>
        )}

        <Text style={styles.label}>Goal Name</Text>
        <InputField
          label=""
          value={name}
          onChangeText={setName}
          placeholder="e.g., Run a half marathon"
          maxLength={GOAL_CONSTANTS.NAME_MAX_LENGTH}
        />
        <Text style={styles.charCount}>
          {name.length}/{GOAL_CONSTANTS.NAME_MAX_LENGTH}
        </Text>

        <Text style={styles.label}>Description (Optional)</Text>
        <InputField
          label=""
          value={description}
          onChangeText={setDescription}
          placeholder="Why is this goal important to you?"
          maxLength={GOAL_CONSTANTS.DESCRIPTION_MAX_LENGTH}
          multiline
          numberOfLines={3}
        />
        <Text style={styles.charCount}>
          {description.length}/{GOAL_CONSTANTS.DESCRIPTION_MAX_LENGTH}
        </Text>

        <Text style={styles.label}>Target Date</Text>
        <TouchableOpacity
          style={styles.dateSelector}
          onPress={() => setShowDatePicker(!showDatePicker)}
        >
          <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
          <Text style={styles.dateSelectorText}>{formatDate(endDate)}</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.gray} />
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}

        <Button
          title="Create Goal"
          onPress={handleCreate}
          disabled={!name.trim() || loading || atCap}
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
  dateSelector: {
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
  dateSelectorText: {
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
