import React from 'react';
import { View, Text, TextInput, StyleSheet, Platform } from 'react-native';
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

  // Fallback for native — plain text inputs until native pickers are added
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <View style={styles.inputWrap}>
          <Text style={styles.subLabel}>Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.nativeInput}
            value={date}
            onChangeText={onDateChange}
            placeholder="2025-01-30"
            placeholderTextColor={Colors.gray}
          />
        </View>
        <View style={styles.inputWrap}>
          <Text style={styles.subLabel}>Time (HH:MM)</Text>
          <TextInput
            style={styles.nativeInput}
            value={time}
            onChangeText={onTimeChange}
            placeholder="17:00"
            placeholderTextColor={Colors.gray}
          />
        </View>
      </View>
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
  nativeInput: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    backgroundColor: Colors.white,
  },
});
