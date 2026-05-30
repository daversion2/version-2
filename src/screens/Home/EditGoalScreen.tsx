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
  ActivityIndicator,
} from 'react-native';
import { HomeScreenProps } from '../../types/navigation';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { InputField } from '../../components/common/InputField';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { getGoalById, updateGoal, archiveGoal, isGoalExpired } from '../../services/goals';
import { GOAL_CONSTANTS } from '../../constants/goals';
import { ALL_GOAL_COLORS } from '../../constants/goalColors';
import { Goal } from '../../types';

type Props = HomeScreenProps<'EditGoal'>;

const formatDate = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m - 1]} ${d}, ${y}`;
};

const toYYYYMMDD = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const parseYYYYMMDD = (str: string): Date => {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const EditGoalScreen: React.FC<Props> = ({ route, navigation }) => {
  const { user } = useAuth();
  const goalId = route.params?.goalId;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [endDate, setEndDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [color, setColor] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !goalId) return;
    getGoalById(user.uid, goalId).then(g => {
      if (g) {
        setGoal(g);
        setName(g.name);
        setColor(g.color);
        setDescription(g.description || '');
        setEndDate(parseYYYYMMDD(g.end_date));
      }
      setLoading(false);
    });
  }, [user, goalId]);

  const handleSave = async () => {
    if (!user || !goal || !name.trim()) return;
    setSaving(true);
    try {
      const updates: { name?: string; description?: string; end_date?: string; color?: string } = {};
      if (name.trim() !== goal.name) updates.name = name.trim();
      if ((description.trim() || '') !== (goal.description || '')) updates.description = description.trim();
      const newEndDate = toYYYYMMDD(endDate);
      if (newEndDate !== goal.end_date) updates.end_date = newEndDate;
      if (color !== goal.color) updates.color = color;

      if (Object.keys(updates).length > 0) {
        await updateGoal(user.uid, goal.id, updates);
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = () => {
    Alert.alert(
      'Archive Goal',
      'This will move the goal to your archive. You can no longer track progress against it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            if (!user || !goal) return;
            try {
              await archiveGoal(user.uid, goal.id);
              navigation.popToTop();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setEndDate(date);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!goal) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Goal not found</Text>
      </View>
    );
  }

  const expired = isGoalExpired(goal);
  const canEditDate = goal.status === 'active' && !expired;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Goal Name</Text>
        <InputField
          label=""
          value={name}
          onChangeText={setName}
          placeholder="Goal name"
          maxLength={GOAL_CONSTANTS.NAME_MAX_LENGTH}
        />
        <Text style={styles.charCount}>
          {name.length}/{GOAL_CONSTANTS.NAME_MAX_LENGTH}
        </Text>

        <Text style={styles.label}>Color</Text>
        <View style={styles.colorRow}>
          {ALL_GOAL_COLORS.map(c => (
            <TouchableOpacity
              key={c}
              onPress={() => setColor(c)}
              style={[
                styles.colorCircle,
                { backgroundColor: c },
                color === c && styles.colorCircleSelected,
              ]}
            />
          ))}
        </View>

        <Text style={styles.label}>Description (Optional)</Text>
        <InputField
          label=""
          value={description}
          onChangeText={setDescription}
          placeholder="Why is this goal important?"
          maxLength={GOAL_CONSTANTS.DESCRIPTION_MAX_LENGTH}
          multiline
          numberOfLines={3}
        />
        <Text style={styles.charCount}>
          {description.length}/{GOAL_CONSTANTS.DESCRIPTION_MAX_LENGTH}
        </Text>

        <Text style={styles.label}>Target Date</Text>
        {canEditDate ? (
          <>
            <TouchableOpacity
              style={styles.dateSelector}
              onPress={() => setShowDatePicker(!showDatePicker)}
            >
              <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
              <Text style={styles.dateSelectorText}>{formatDate(toYYYYMMDD(endDate))}</Text>
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
          </>
        ) : (
          <View style={styles.disabledDate}>
            <Ionicons name="calendar-outline" size={20} color={Colors.gray} />
            <Text style={styles.disabledDateText}>{formatDate(goal.end_date)}</Text>
            <Text style={styles.disabledHint}>
              {expired ? 'Goal has expired' : 'Cannot change date'}
            </Text>
          </View>
        )}

        <Button
          title="Save Changes"
          onPress={handleSave}
          disabled={!name.trim() || saving}
          style={{ marginTop: Spacing.xl }}
        />

        <TouchableOpacity style={styles.archiveBtn} onPress={handleArchive}>
          <Ionicons name="archive-outline" size={18} color={Colors.secondary} />
          <Text style={styles.archiveBtnText}>Archive Goal</Text>
        </TouchableOpacity>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
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
  disabledDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.lightGray,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  disabledDateText: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
  },
  disabledHint: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: Colors.dark,
  },
  archiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.md,
  },
  archiveBtnText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.secondary,
  },
});
