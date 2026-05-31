import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { InputField } from '../../../../components/common/InputField';
import { NeuroscienceBlurb } from '../../../../components/goals/NeuroscienceBlurb';
import { Colors, Fonts, FontSizes, Spacing } from '../../../../constants/theme';
import { GOAL_CONSTANTS, NEUROSCIENCE_BLURBS, SMART_GUIDANCE } from '../../../../constants/goals';

interface GoalNameStepProps {
  name: string;
  onChangeName: (name: string) => void;
}

export const GoalNameStep: React.FC<GoalNameStepProps> = ({ name, onChangeName }) => {
  return (
    <View>
      <Text style={styles.prompt}>What do you want to achieve?</Text>
      <Text style={styles.guidance}>{SMART_GUIDANCE}</Text>

      <InputField
        label=""
        value={name}
        onChangeText={onChangeName}
        placeholder="e.g., Run a half marathon by October"
        maxLength={GOAL_CONSTANTS.NAME_MAX_LENGTH}
      />
      <Text style={styles.charCount}>
        {name.length}/{GOAL_CONSTANTS.NAME_MAX_LENGTH}
      </Text>

      <NeuroscienceBlurb
        title={NEUROSCIENCE_BLURBS.goal.title}
        content={NEUROSCIENCE_BLURBS.goal.content}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  prompt: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  guidance: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  charCount: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'right',
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
});
