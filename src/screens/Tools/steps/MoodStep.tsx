import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../../constants/theme';
import { MoodSelector } from '../../../components/worksheets/MoodSelector';
import { AppMessage } from '../components/AppMessage';

interface MoodStepProps {
  type: 'before' | 'after';
  value?: number;
  onChange: (val: number) => void;
}

export const MoodStep: React.FC<MoodStepProps> = ({ type, value, onChange }) => {
  const selectorFade = useRef(new Animated.Value(0)).current;
  const selectorSlide = useRef(new Animated.Value(15)).current;

  const title =
    type === 'before'
      ? 'Before we dive in...'
      : "You've done the hard part.";
  const subtitle =
    type === 'before'
      ? 'Just a quick check-in. No wrong answer.'
      : undefined;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(700),
      Animated.parallel([
        Animated.timing(selectorFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(selectorSlide, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <AppMessage
        message={title}
        subtitle={subtitle}
        color={Colors.primary}
        delay={300}
      />

      <Animated.View
        style={[
          styles.selectorWrapper,
          { opacity: selectorFade, transform: [{ translateY: selectorSlide }] },
        ]}
      >
        <Text style={styles.prompt}>
          {type === 'before'
            ? 'How are you feeling right now?'
            : 'How are you feeling now?'}
        </Text>
        <MoodSelector label="" value={value} onChange={onChange} />
        {value !== undefined && (
          <Animated.Text style={styles.selectedFeedback}>
            {value <= 3 ? "Got it. Let's work through this." :
             value <= 6 ? "Okay. Let's see where this takes you." :
             "Good place to start. Let's go deeper."}
          </Animated.Text>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  selectorWrapper: {
    marginTop: Spacing.md,
  },
  prompt: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.lg,
  },
  selectedFeedback: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    fontStyle: 'italic',
    marginTop: Spacing.md,
    textAlign: 'center',
  },
});
