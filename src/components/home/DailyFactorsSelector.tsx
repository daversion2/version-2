import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { DAILY_FACTORS, FactorDefinition } from '../../data/dailyFactors';
import { DailyFactors } from '../../types';

interface DailyFactorsSelectorProps {
  value: DailyFactors;
  onChange: (factorId: string, optionValue: string) => void;
  readOnly?: boolean;
}

const FactorRow: React.FC<{
  factor: FactorDefinition;
  selected: string | undefined;
  onSelect: (v: string) => void;
  readOnly: boolean;
}> = ({ factor, selected, onSelect, readOnly }) => (
  <View style={styles.factor}>
    <View style={styles.factorLabelRow}>
      <Text style={styles.emoji}>{factor.emoji}</Text>
      <Text style={styles.factorLabel}>{factor.label}</Text>
      {factor.timing === 'last_night' && (
        <View style={styles.tag}>
          <Text style={styles.tagText}>LAST NIGHT</Text>
        </View>
      )}
    </View>
    <View style={[styles.chips, factor.type === 'binary' && styles.chipsBinary]}>
      {factor.options.map(opt => {
        const isSelected = selected === opt.value;
        // Binary "no" gets an orange-tinted selected state; everything else uses teal.
        const isNegative = factor.type === 'binary' && opt.value === 'no';
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.chip,
              factor.type === 'binary' && styles.chipBinary,
              isSelected && (isNegative ? styles.chipSelectedNeg : styles.chipSelected),
            ]}
            onPress={() => !readOnly && onSelect(opt.value)}
            activeOpacity={readOnly ? 1 : 0.7}
          >
            <Text
              style={[
                styles.chipText,
                isSelected && (isNegative ? styles.chipTextNeg : styles.chipTextSelected),
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);

export const DailyFactorsSelector: React.FC<DailyFactorsSelectorProps> = ({
  value,
  onChange,
  readOnly = false,
}) => (
  <View>
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>Today's Inputs</Text>
      {!readOnly && <Text style={styles.sectionHint}>~15 sec</Text>}
    </View>
    {!readOnly && (
      <Text style={styles.sectionSub}>
        Quick tap. Over time this reveals what fuels your best days.
      </Text>
    )}
    {DAILY_FACTORS.map(factor => (
      <FactorRow
        key={factor.id}
        factor={factor}
        selected={value[factor.id]}
        onSelect={v => onChange(factor.id, v)}
        readOnly={readOnly}
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.primary,
  },
  sectionHint: {
    fontFamily: Fonts.secondary,
    fontSize: 11,
    color: Colors.gray,
  },
  sectionSub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginBottom: Spacing.md,
  },
  factor: {
    marginBottom: Spacing.md,
  },
  factorLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  emoji: {
    fontSize: 17,
  },
  factorLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  tag: {
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  tagText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 9,
    letterSpacing: 0.3,
    color: Colors.gray,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chipsBinary: {
    // Binary chips don't stretch full-width — they sit left-aligned.
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md - 2,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipBinary: {
    flex: 0,
    minWidth: 88,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipSelectedNeg: {
    backgroundColor: '#efe1da',
    borderColor: Colors.secondary,
  },
  chipText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  chipTextSelected: {
    color: Colors.white,
  },
  chipTextNeg: {
    color: Colors.secondary,
  },
});
