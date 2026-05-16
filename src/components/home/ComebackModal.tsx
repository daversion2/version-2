import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Goal } from '../../types';

interface ComebackModalProps {
  visible: boolean;
  goal: Goal | null;
  onDismiss: () => void;
  navigation: any;
}

export const ComebackModal: React.FC<ComebackModalProps> = ({
  visible,
  goal,
  onDismiss,
  navigation,
}) => {
  if (!visible || !goal) return null;

  const hasRecoveryPlan = !!goal.recovery_plan;
  const hasMinAction = !!goal.minimum_action;
  const hasInnerVoice = !!goal.inner_voice_challenge && !!goal.inner_voice_response;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Ionicons name="refresh" size={24} color={Colors.secondary} />
            <Text style={styles.title}>Welcome Back</Text>
          </View>

          <Text style={styles.subtitle}>
            You planned for days like this.
          </Text>

          {/* Recovery Plan */}
          {hasRecoveryPlan && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Your recovery plan:</Text>
              <Text style={styles.planText}>"{goal.recovery_plan}"</Text>
            </View>
          )}

          {/* Minimum Action */}
          {hasMinAction && (
            <View style={styles.minActionSection}>
              <Text style={styles.minActionLabel}>Your worst-day win:</Text>
              <Text style={styles.minActionText}>"{goal.minimum_action}"</Text>
              <Text style={styles.minActionCta}>Can you do just that today?</Text>
            </View>
          )}

          {/* Inner Voice */}
          {hasInnerVoice && (
            <View style={styles.section}>
              <Text style={styles.innerVoiceQuote}>
                Your inner voice might say: "{goal.inner_voice_challenge}"
              </Text>
              <Text style={styles.innerVoiceResponse}>
                Remember: "{goal.inner_voice_response}"
              </Text>
            </View>
          )}

          {/* Framing */}
          <Text style={styles.framingText}>
            Missing a day is data, not failure. One action restarts everything.
          </Text>

          <TouchableOpacity style={styles.button} onPress={onDismiss} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Let's Go</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.unpackButton}
            onPress={() => {
              onDismiss();
              navigation.navigate('MicroExerciseFeeling', { trigger_context: 'comeback' });
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.unpackButtonText}>Want to unpack this? →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  container: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 340,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
  },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  planText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  minActionSection: {
    backgroundColor: Colors.secondary + '10',
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  minActionLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  minActionText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  minActionCta: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
  },
  innerVoiceQuote: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  innerVoiceResponse: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    lineHeight: 20,
  },
  framingText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  button: {
    backgroundColor: Colors.secondary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  unpackButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  unpackButtonText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
});
