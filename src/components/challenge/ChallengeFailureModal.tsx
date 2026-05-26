import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';

const BARRIER_OPTIONS = [
  'It was harder than I expected',
  'I ran out of time',
  'I lost motivation',
  'Something came up',
  "I wasn't in the right headspace",
];

const NEXT_ACTION_OPTIONS = [
  { key: 'retry', label: "I'll try this again tomorrow" },
  { key: 'easier', label: "I'll try a lower difficulty" },
  { key: 'different', label: "I'll try a different challenge" },
  { key: 'recharge', label: "I'll take today to recharge" },
];

interface ChallengeFailureModalProps {
  visible: boolean;
  challengeName: string;
  onComplete: (barrierReason: string, nextAction: string) => void;
  onDismiss: () => void;
}

export const ChallengeFailureModal: React.FC<ChallengeFailureModalProps> = ({
  visible,
  challengeName,
  onComplete,
  onDismiss,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedBarrier, setSelectedBarrier] = useState<string | null>(null);
  const [otherText, setOtherText] = useState('');
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const resetAndDismiss = () => {
    setStep(1);
    setSelectedBarrier(null);
    setOtherText('');
    setSelectedAction(null);
    onDismiss();
  };

  const handleComplete = () => {
    if (!selectedAction) return;
    const reason =
      selectedBarrier === 'Other' ? otherText.trim() || 'Other' : selectedBarrier || '';
    const action = NEXT_ACTION_OPTIONS.find((o) => o.key === selectedAction)?.label || selectedAction;
    onComplete(reason, action);
    setStep(1);
    setSelectedBarrier(null);
    setOtherText('');
    setSelectedAction(null);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Progress indicator */}
          <View style={styles.progressRow}>
            {[1, 2, 3].map((s) => (
              <View key={s} style={[styles.dot, s <= step && styles.dotActive]} />
            ))}
          </View>

          {/* Step 1: Normalize */}
          {step === 1 && (
            <View>
              <View style={styles.iconRow}>
                <Ionicons name="heart-outline" size={32} color={Colors.secondary} />
              </View>
              <Text style={styles.title}>You didn't finish this one</Text>
              <Text style={styles.body}>
                That's okay — what matters is what you do next. Let's figure that out.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setStep(2)}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dismissLink} onPress={resetAndDismiss}>
                <Text style={styles.dismissText}>Skip</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: Barrier */}
          {step === 2 && (
            <View>
              <Text style={styles.title}>What got in the way?</Text>
              <Text style={styles.subtitle}>No judgement. Just data.</Text>

              <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
                {BARRIER_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionCard,
                      selectedBarrier === option && styles.optionCardSelected,
                    ]}
                    onPress={() => setSelectedBarrier(option)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedBarrier === option && styles.optionTextSelected,
                      ]}
                    >
                      {option}
                    </Text>
                    {selectedBarrier === option && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    selectedBarrier === 'Other' && styles.optionCardSelected,
                  ]}
                  onPress={() => setSelectedBarrier('Other')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedBarrier === 'Other' && styles.optionTextSelected,
                    ]}
                  >
                    Something else
                  </Text>
                  {selectedBarrier === 'Other' && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>

                {selectedBarrier === 'Other' && (
                  <TextInput
                    style={styles.otherInput}
                    value={otherText}
                    onChangeText={setOtherText}
                    placeholder="What happened?"
                    placeholderTextColor={Colors.gray}
                    multiline
                    maxLength={200}
                    autoFocus
                  />
                )}
              </ScrollView>

              <TouchableOpacity
                style={[styles.primaryButton, !selectedBarrier && styles.primaryButtonDisabled]}
                onPress={() => setStep(3)}
                disabled={!selectedBarrier}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 3: What's next */}
          {step === 3 && (
            <View>
              <Text style={styles.title}>What's next?</Text>
              <Text style={styles.subtitle}>Pick what feels right for you.</Text>

              <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
                {NEXT_ACTION_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.optionCard,
                      selectedAction === option.key && styles.optionCardSelected,
                    ]}
                    onPress={() => setSelectedAction(option.key)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedAction === option.key && styles.optionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {selectedAction === option.key && (
                      <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={[styles.primaryButton, !selectedAction && styles.primaryButtonDisabled]}
                onPress={handleComplete}
                disabled={!selectedAction}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Got It</Text>
              </TouchableOpacity>
            </View>
          )}
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
    maxHeight: '80%',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.primary,
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  body: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  dismissLink: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  dismissText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  optionsList: {
    maxHeight: 260,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  optionCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  optionText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    flex: 1,
  },
  optionTextSelected: {
    fontFamily: Fonts.secondaryBold,
    color: Colors.primary,
  },
  otherInput: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    minHeight: 60,
    marginBottom: Spacing.sm,
    lineHeight: 22,
  },
});
