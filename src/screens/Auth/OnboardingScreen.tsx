import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { ONBOARDING_STEPS } from '../../constants/onboarding';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import {
  markOnboardingComplete,
  saveUsername,
  validateUsername,
  checkUsernameAvailable,
} from '../../services/users';

const { width } = Dimensions.get('window');

const steps = ONBOARDING_STEPS;

export const OnboardingScreen: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);

  const currentStep = steps[step];
  const isUsernameStep = currentStep.type === 'username';
  const isLastStep = step === steps.length - 1;

  const validateAndCheckUsername = async (): Promise<boolean> => {
    const trimmed = username.trim();

    // Validate format
    const validation = validateUsername(trimmed);
    if (!validation.valid) {
      setUsernameError(validation.error || 'Invalid username');
      return false;
    }

    // Check availability
    setCheckingUsername(true);
    try {
      const available = await checkUsernameAvailable(trimmed);
      if (!available) {
        setUsernameError('This username is already taken');
        return false;
      }
      setUsernameError('');
      return true;
    } catch (error) {
      setUsernameError('Error checking username availability');
      return false;
    } finally {
      setCheckingUsername(false);
    }
  };

  const next = async () => {
    if (isUsernameStep) {
      // Validate username before proceeding
      const isValid = await validateAndCheckUsername();
      if (!isValid) return;

      // Save username and complete onboarding
      if (user) {
        setSaving(true);
        try {
          await saveUsername(user.uid, username.trim());
          await markOnboardingComplete(user.uid);
          await refreshProfile();
        } catch (error: any) {
          setUsernameError(error.message || 'Failed to save username');
          setSaving(false);
        }
      }
    } else if (!isLastStep) {
      setStep(step + 1);
    }
  };

  const handleUsernameChange = (text: string) => {
    setUsername(text);
    if (usernameError) {
      setUsernameError('');
    }
  };

  const isNextDisabled = saving || checkingUsername || (isUsernameStep && username.trim().length < 3);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.step}>
          {step + 1} / {steps.length}
        </Text>
        <Text style={styles.title}>{currentStep.title}</Text>
        <Text style={styles.body}>{currentStep.body}</Text>

        {isUsernameStep && (
          <View style={styles.usernameContainer}>
            <TextInput
              style={[styles.usernameInput, usernameError ? styles.usernameInputError : null]}
              placeholder="Enter username"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={username}
              onChangeText={handleUsernameChange}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
            />
            {checkingUsername && (
              <ActivityIndicator color={Colors.white} style={styles.loader} />
            )}
            {usernameError ? (
              <Text style={styles.errorText}>{usernameError}</Text>
            ) : (
              <Text style={styles.hintText}>
                3-20 characters, letters, numbers, and underscores only
              </Text>
            )}
          </View>
        )}
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
        title={isLastStep ? "Let's Go" : 'Next'}
        onPress={next}
        disabled={isNextDisabled}
        loading={saving}
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
  usernameContainer: {
    width: width - Spacing.lg * 2,
    marginTop: Spacing.xl,
  },
  usernameInput: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.lg,
    color: Colors.white,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  usernameInputError: {
    borderColor: '#FF6B6B',
  },
  loader: {
    marginTop: Spacing.sm,
  },
  errorText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  hintText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.white,
    textAlign: 'center',
    marginTop: Spacing.sm,
    opacity: 0.7,
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
