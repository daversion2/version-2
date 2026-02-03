import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { markOnboardingComplete } from '../../services/users';

const { width } = Dimensions.get('window');

const steps = [
  {
    title: 'Challenge Yourself Daily',
    body: 'Pick one challenge each day that pushes you outside your comfort zone.',
  },
  {
    title: 'Build Habits That Stick',
    body: 'Track repeatable actions alongside your challenges to build lasting discipline.',
  },
  {
    title: 'Track Your Growth',
    body: 'Your Willpower Quotient (WPQ) measures your effort over time. Keep moving forward.',
  },
];

export const OnboardingScreen: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const next = async () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else if (user) {
      setSaving(true);
      await markOnboardingComplete(user.uid);
      await refreshProfile();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.step}>
          {step + 1} / {steps.length}
        </Text>
        <Text style={styles.title}>{steps[step].title}</Text>
        <Text style={styles.body}>{steps[step].body}</Text>
      </View>

      <View style={styles.dots}>
        {steps.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === step && styles.activeDot]}
          />
        ))}
      </View>

      <Button
        title={step < steps.length - 1 ? 'Next' : "Let's Go"}
        onPress={next}
        disabled={saving}
        style={styles.button}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  content: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  step: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.white,
    opacity: 0.7,
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  body: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.white,
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
    opacity: 0.3,
  },
  activeDot: { opacity: 1, width: 24 },
  button: {
    width: width - Spacing.lg * 2,
    marginBottom: Spacing.xxl,
  },
});
