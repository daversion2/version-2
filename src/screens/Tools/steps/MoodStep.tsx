import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../../constants/theme';
import { MoodSelector } from '../../../components/worksheets/MoodSelector';

interface MoodStepProps {
  type: 'before' | 'after';
  value?: number;
  onChange: (val: number) => void;
}

export const MoodStep: React.FC<MoodStepProps> = ({ type, value, onChange }) => {
  const title =
    type === 'before'
      ? 'Before we start...'
      : "You've done the work.";
  const subtitle =
    type === 'before'
      ? 'How are you feeling right now?'
      : 'How are you feeling now?';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.selectorWrapper}>
        <MoodSelector
          label=""
          value={value}
          onChange={onChange}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  selectorWrapper: {
    marginTop: Spacing.md,
  },
});
