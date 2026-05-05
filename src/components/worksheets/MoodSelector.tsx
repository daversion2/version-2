import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface MoodSelectorProps {
  value?: number;
  onChange: (val: number) => void;
  label: string;
}

const MOOD_COLORS: Record<number, string> = {
  1: '#D32F2F',
  2: '#E64A19',
  3: '#F57C00',
  4: '#FFA000',
  5: '#FBC02D',
  6: '#C0CA33',
  7: '#7CB342',
  8: '#43A047',
  9: '#2E7D32',
  10: '#1B5E20',
};

export const MoodSelector: React.FC<MoodSelectorProps> = ({
  value,
  onChange,
  label,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => {
          const selected = value === num;
          const color = MOOD_COLORS[num];
          return (
            <TouchableOpacity
              key={num}
              style={[
                styles.circle,
                selected && { backgroundColor: color, borderColor: color },
              ]}
              onPress={() => onChange(num)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.circleText,
                  selected && styles.circleTextSelected,
                ]}
              >
                {num}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.scaleLabels}>
        <Text style={styles.scaleLabel}>Low</Text>
        <Text style={styles.scaleLabel}>High</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  circleText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.dark,
  },
  circleTextSelected: {
    color: Colors.white,
    fontFamily: Fonts.secondaryBold,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  scaleLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
});
