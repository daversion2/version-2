import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

interface CheckinScaleRowProps {
  label: string;
  /** 1–5, or null when unanswered. */
  value: number | null;
  onChange: (value: number) => void;
  lowLabel?: string;
  highLabel?: string;
}

/** One check-in question: a label over five tappable 1–5 chips. */
export const CheckinScaleRow: React.FC<CheckinScaleRowProps> = ({
  label,
  value,
  onChange,
  lowLabel,
  highLabel,
}) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.chips}>
      {[1, 2, 3, 4, 5].map((n) => {
        const selected = value === n;
        return (
          <TouchableOpacity
            key={n}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => onChange(n)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{n}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
    {(lowLabel || highLabel) && (
      <View style={styles.anchors}>
        <Text style={styles.anchorText}>{lowLabel ?? ''}</Text>
        <Text style={styles.anchorText}>{highLabel ?? ''}</Text>
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  row: { marginBottom: Spacing.lg },
  label: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  chips: { flexDirection: 'row', gap: Spacing.sm },
  chip: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  chipText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  chipTextSelected: {
    color: Colors.white,
  },
  anchors: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  anchorText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
});
