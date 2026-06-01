import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform, Animated, StyleSheet } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { InputField } from '../common/InputField';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import {
  MeasurementType,
  MeasurementConfig,
  MeasurementConfigDoneByDate,
  MeasurementConfigReachNumber,
} from '../../types';

interface MeasurementConfigPanelProps {
  type: MeasurementType;
  config: Partial<MeasurementConfig>;
  onChange: (config: Partial<MeasurementConfig>) => void;
}

const formatDate = (date: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

const toYYYYMMDD = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const parseDate = (dateStr?: string): Date => {
  if (dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d;
};

export const MeasurementConfigPanel: React.FC<MeasurementConfigPanelProps> = ({
  type,
  config,
  onChange,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [showDatePicker, setShowDatePicker] = React.useState(false);

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [type]);

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) {
      onChange({ type: 'done_by_date', target_date: toYYYYMMDD(date) } as MeasurementConfigDoneByDate);
    }
  };

  const renderDoneByDate = () => {
    const c = config as Partial<MeasurementConfigDoneByDate>;
    const dateValue = parseDate(c.target_date);

    return (
      <View style={styles.section}>
        <Text style={styles.label}>Target date</Text>
        <TouchableOpacity
          style={styles.dateSelector}
          onPress={() => setShowDatePicker(!showDatePicker)}
        >
          <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
          <Text style={styles.dateSelectorText}>{formatDate(dateValue)}</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.gray} />
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={dateValue}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}
      </View>
    );
  };

  const renderReachNumber = () => {
    const c = config as Partial<MeasurementConfigReachNumber>;
    return (
      <View style={styles.section}>
        <InputField
          label="What are you measuring?"
          value={c.metric_name || ''}
          onChangeText={(v) => onChange({ ...c, type: 'reach_number', metric_name: v } as any)}
          placeholder="e.g., Weight, Revenue, Pages read"
          maxLength={60}
        />
        <View style={styles.row}>
          <View style={styles.halfField}>
            <InputField
              label="Starting value"
              value={c.starting_value !== undefined ? String(c.starting_value) : ''}
              onChangeText={(v) => onChange({ ...c, type: 'reach_number', starting_value: Number(v) || 0 } as any)}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.halfField}>
            <InputField
              label="Target value"
              value={c.target_value !== undefined ? String(c.target_value) : ''}
              onChangeText={(v) => onChange({ ...c, type: 'reach_number', target_value: Number(v) || 0 } as any)}
              placeholder="0"
              keyboardType="numeric"
            />
          </View>
        </View>
        <Text style={styles.label}>Direction</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleOption, c.direction === 'up' && styles.toggleOptionActive]}
            onPress={() => onChange({ ...c, type: 'reach_number', direction: 'up' } as any)}
          >
            <Text style={[styles.toggleText, c.direction === 'up' && styles.toggleTextActive]}>Going up</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleOption, c.direction === 'down' && styles.toggleOptionActive]}
            onPress={() => onChange({ ...c, type: 'reach_number', direction: 'down' } as any)}
          >
            <Text style={[styles.toggleText, c.direction === 'down' && styles.toggleTextActive]}>Going down</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {type === 'done_by_date' && renderDoneByDate()}
      {type === 'reach_number' && renderReachNumber()}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: Spacing.md,
  },
  label: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfField: {
    flex: 1,
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
    borderColor: Colors.border,
  },
  dateSelectorText: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  toggleOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  toggleText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.gray,
  },
  toggleTextActive: {
    color: Colors.primary,
  },
});
