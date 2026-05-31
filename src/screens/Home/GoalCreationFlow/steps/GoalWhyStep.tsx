import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { InputField } from '../../../../components/common/InputField';
import { NeuroscienceBlurb } from '../../../../components/goals/NeuroscienceBlurb';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../../constants/theme';
import { GOAL_CONSTANTS, NEUROSCIENCE_BLURBS } from '../../../../constants/goals';

interface GoalWhyStepProps {
  deeperWhy: string;
  identityStatement: string;
  onChangeWhy: (why: string) => void;
  onChangeIdentity: (identity: string) => void;
}

const REVEAL_THRESHOLD = 20;

export const GoalWhyStep: React.FC<GoalWhyStepProps> = ({
  deeperWhy,
  identityStatement,
  onChangeWhy,
  onChangeIdentity,
}) => {
  const showIdentity = deeperWhy.trim().length >= REVEAL_THRESHOLD;
  const identityFade = useRef(new Animated.Value(showIdentity ? 1 : 0)).current;
  const identitySlide = useRef(new Animated.Value(showIdentity ? 0 : 20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(identityFade, {
        toValue: showIdentity ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(identitySlide, {
        toValue: showIdentity ? 0 : 20,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [showIdentity]);

  return (
    <View>
      <Text style={styles.prompt}>What changes in your life when you achieve this?</Text>

      <InputField
        label=""
        value={deeperWhy}
        onChangeText={onChangeWhy}
        placeholder="Beyond the surface goal, what does achieving this really mean to you?"
        multiline
        numberOfLines={4}
        maxLength={GOAL_CONSTANTS.WHY_MAX_LENGTH}
      />

      {showIdentity && (
        <Animated.View style={[styles.identitySection, { opacity: identityFade, transform: [{ translateY: identitySlide }] }]}>
          <Text style={styles.identityNudge}>Want to go deeper?</Text>
          <View style={styles.identityCard}>
            <Text style={styles.identityPrefix}>I am becoming someone who</Text>
            <InputField
              label=""
              value={identityStatement}
              onChangeText={onChangeIdentity}
              placeholder="e.g., shows up for themselves every day"
              maxLength={GOAL_CONSTANTS.IDENTITY_MAX_LENGTH}
            />
          </View>
          <Text style={styles.optionalLabel}>Optional</Text>
        </Animated.View>
      )}

      <NeuroscienceBlurb
        title={NEUROSCIENCE_BLURBS.why.title}
        content={NEUROSCIENCE_BLURBS.why.content}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  prompt: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginBottom: Spacing.lg,
  },
  identitySection: {
    marginTop: Spacing.lg,
  },
  identityNudge: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  identityCard: {
    backgroundColor: Colors.primary + '08',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  identityPrefix: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  optionalLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: Spacing.xs,
  },
});
