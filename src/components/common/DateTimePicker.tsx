import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, TextInput } from 'react-native';
import DateTimePickerNative, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface Props {
  label: string;
  date: string;       // YYYY-MM-DD
  time: string;       // HH:MM
  onDateChange: (val: string) => void;
  onTimeChange: (val: string) => void;
}

export const DateTimePicker: React.FC<Props> = ({
  label,
  date,
  time,
  onDateChange,
  onTimeChange,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Parse current date/time or use defaults
  const currentDate = date ? new Date(`${date}T12:00:00`) : new Date();
  const currentTime = time
    ? new Date(`2000-01-01T${time}:00`)
    : new Date();

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // On Android, dismiss picker immediately
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'set' && selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      onDateChange(`${year}-${month}-${day}`);
    }

    // On iOS, keep picker open until user taps elsewhere
    if (Platform.OS === 'ios' && event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  };

  const handleTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    // On Android, dismiss picker immediately
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }

    if (event.type === 'set' && selectedTime) {
      const hours = String(selectedTime.getHours()).padStart(2, '0');
      const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
      onTimeChange(`${hours}:${minutes}`);
    }

    // On iOS, keep picker open until user taps elsewhere
    if (Platform.OS === 'ios' && event.type === 'dismissed') {
      setShowTimePicker(false);
    }
  };

  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return 'Select date';
    try {
      const d = new Date(`${dateStr}T12:00:00`);
      return d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatDisplayTime = (timeStr: string): string => {
    if (!timeStr) return 'Select time';
    try {
      const [hours, minutes] = timeStr.split(':');
      const d = new Date();
      d.setHours(parseInt(hours, 10));
      d.setMinutes(parseInt(minutes, 10));
      return d.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeStr;
    }
  };

  // Web version uses HTML native inputs
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.row}>
          <View style={styles.inputWrap}>
            <Text style={styles.subLabel}>Date</Text>
            <input
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              style={webInputStyle}
            />
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.subLabel}>Time</Text>
            <input
              type="time"
              value={time}
              onChange={(e) => onTimeChange(e.target.value)}
              style={webInputStyle}
            />
          </View>
        </View>
      </View>
    );
  }

  // Native version with proper pickers
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <View style={styles.inputWrap}>
          <Text style={styles.subLabel}>Date</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => {
              setShowTimePicker(false); // Close time picker first
              setShowDatePicker(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.pickerButtonText,
              !date && styles.pickerButtonPlaceholder
            ]}>
              {formatDisplayDate(date)}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.inputWrap}>
          <Text style={styles.subLabel}>Time</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => {
              setShowDatePicker(false); // Close date picker first
              setShowTimePicker(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.pickerButtonText,
              !time && styles.pickerButtonPlaceholder
            ]}>
              {formatDisplayTime(time)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePickerNative
          value={currentDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Time Picker Modal */}
      {showTimePicker && (
        <DateTimePickerNative
          value={currentTime}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
          is24Hour={false}
        />
      )}

      {/* iOS: Add done buttons when pickers are showing */}
      {Platform.OS === 'ios' && (showDatePicker || showTimePicker) && (
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => {
            setShowDatePicker(false);
            setShowTimePicker(false);
          }}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const webInputStyle: React.CSSProperties = {
  fontFamily: 'inherit',
  fontSize: 16,
  padding: '10px 12px',
  borderRadius: 8,
  border: `1px solid ${Colors.border}`,
  backgroundColor: Colors.white,
  color: Colors.dark,
  width: '100%',
  boxSizing: 'border-box',
};

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  label: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  inputWrap: { flex: 1 },
  subLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginBottom: Spacing.xs,
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    backgroundColor: Colors.white,
  },
  pickerButtonText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  pickerButtonPlaceholder: {
    color: Colors.gray,
  },
  doneButton: {
    alignSelf: 'flex-end',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  doneButtonText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.primary,
  },
});
