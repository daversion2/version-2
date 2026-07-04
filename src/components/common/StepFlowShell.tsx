import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { ProgressBar } from '../../screens/Tools/components/ProgressBar';
import { StepTransition } from '../../screens/Tools/components/StepTransition';

interface StepFlowShellProps {
  /** 0–1 fill for the top progress bar. */
  progress: number;
  /** Changes trigger the slide transition; use the current step's id. */
  stepKey: string;
  direction: 'forward' | 'backward';
  accentColor: string;
  /** Optional label centered in the header (e.g. the practice name). */
  title?: string;
  canGoBack: boolean;
  onBack: () => void;
  onCancel: () => void;
  /** Enables the primary button; when false (and allowSkip) the skip link shows instead. */
  canContinue: boolean;
  /** Required steps pass false so no skip link ever shows. */
  allowSkip: boolean;
  nextLabel: string;
  skipLabel: string;
  isLast: boolean;
  /** Advance — both the primary button and the skip link route here. */
  onNext: () => void;
  children: React.ReactNode;
}

/**
 * The one-question-per-screen flow chrome — progress bar, back/close header,
 * animated step transition, and a skip/next footer. Extracted from the
 * post-challenge reflection so the practice Capture flow renders the exact
 * same experience; hosts own the step state and just describe the current one.
 */
export const StepFlowShell: React.FC<StepFlowShellProps> = ({
  progress,
  stepKey,
  direction,
  accentColor,
  title,
  canGoBack,
  onBack,
  onCancel,
  canContinue,
  allowSkip,
  nextLabel,
  skipLabel,
  isLast,
  onNext,
  children,
}) => (
  <SafeAreaView style={styles.container}>
    <ProgressBar progress={progress} color={accentColor} />

    {/* Header */}
    <View style={styles.header}>
      {canGoBack ? (
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={22} color={Colors.dark} />
        </TouchableOpacity>
      ) : (
        <View style={styles.headerButton} />
      )}
      {!!title && (
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
      )}
      <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
        <Ionicons name="close" size={22} color={Colors.gray} />
      </TouchableOpacity>
    </View>

    {/* Step content */}
    <View style={styles.stepContainer}>
      <StepTransition stepKey={stepKey} direction={direction}>
        {children}
      </StepTransition>
    </View>

    {/* Footer */}
    <View style={styles.footer}>
      {allowSkip && !canContinue && (
        <TouchableOpacity onPress={onNext} style={styles.skipButton}>
          <Text style={styles.skipText}>{skipLabel}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={[
          styles.continueButton,
          { backgroundColor: accentColor },
          !canContinue && styles.continueButtonDisabled,
        ]}
        onPress={onNext}
        disabled={!canContinue}
        activeOpacity={0.85}
      >
        <Text style={styles.continueButtonText}>{nextLabel}</Text>
        {!isLast && <Ionicons name="arrow-forward" size={18} color={Colors.white} />}
      </TouchableOpacity>
    </View>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerButton: {
    padding: Spacing.xs,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  stepContainer: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
    backgroundColor: '#FAFBFC',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  skipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md + 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  continueButtonDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});
