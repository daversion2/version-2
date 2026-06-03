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
import { Nudge } from '../../types';

const BARRIER_OPTIONS = [
  'Work was too busy',
  'I was tired or low energy',
  'I forgot',
  "I wasn't feeling well",
  'Life got in the way',
  'I lost motivation',
];

interface ComebackModalProps {
  visible: boolean;
  habits: Nudge[];
  onCommit: (habitId: string, habitName: string, barrierReason: string) => void;
  onDismiss: () => void;
}

export const ComebackModal: React.FC<ComebackModalProps> = ({
  visible,
  habits,
  onCommit,
  onDismiss,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedBarrier, setSelectedBarrier] = useState<string | null>(null);
  const [otherText, setOtherText] = useState('');
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);

  const resetAndDismiss = () => {
    setStep(1);
    setSelectedBarrier(null);
    setOtherText('');
    setSelectedHabitId(null);
    onDismiss();
  };

  const handleCommit = () => {
    if (!selectedHabitId) return;
    const habit = habits.find((h) => h.id === selectedHabitId);
    if (!habit) return;
    const reason =
      selectedBarrier === 'Other' ? otherText.trim() || 'Other' : selectedBarrier || '';
    onCommit(selectedHabitId, habit.name, reason);
    setStep(1);
    setSelectedBarrier(null);
    setOtherText('');
    setSelectedHabitId(null);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={resetAndDismiss}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Progress indicator */}
          <View style={styles.progressRow}>
            {[1, 2, 3].map((s) => (
              <View
                key={s}
                style={[styles.dot, s <= step && styles.dotActive]}
              />
            ))}
          </View>

          {/* Step 1: Welcome */}
          {step === 1 && (
            <View>
              <View style={styles.iconRow}>
                <Ionicons name="refresh" size={32} color={Colors.secondary} />
              </View>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.body}>
                You've been away for a couple days. That's okay — life happens. Let's figure out what's next.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setStep(2)}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dismissLink} onPress={resetAndDismiss}>
                <Text style={styles.dismissText}>Not now</Text>
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

                {/* Other option */}
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
                style={[
                  styles.primaryButton,
                  !selectedBarrier && styles.primaryButtonDisabled,
                ]}
                onPress={() => setStep(3)}
                disabled={!selectedBarrier}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dismissLink} onPress={resetAndDismiss}>
                <Text style={styles.dismissText}>Not now</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 3: Commit to a habit */}
          {step === 3 && (
            <View>
              <Text style={styles.title}>Commit to one thing today</Text>
              <Text style={styles.subtitle}>Even if it's not perfect.</Text>

              <ScrollView style={styles.habitList} showsVerticalScrollIndicator={false}>
                {habits.map((habit) => (
                  <TouchableOpacity
                    key={habit.id}
                    style={[
                      styles.habitCard,
                      selectedHabitId === habit.id && styles.habitCardSelected,
                    ]}
                    onPress={() => setSelectedHabitId(habit.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.habitInfo}>
                      <Text
                        style={[
                          styles.habitName,
                          selectedHabitId === habit.id && styles.habitNameSelected,
                        ]}
                      >
                        {habit.name}
                      </Text>
                    </View>
                    {selectedHabitId === habit.id && (
                      <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  !selectedHabitId && styles.primaryButtonDisabled,
                ]}
                onPress={handleCommit}
                disabled={!selectedHabitId}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Let's Do This</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dismissLink} onPress={resetAndDismiss}>
                <Text style={styles.dismissText}>Not now</Text>
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
    maxHeight: 280,
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
  habitList: {
    maxHeight: 260,
  },
  habitCard: {
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
  habitCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  habitInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  habitName: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  habitNameSelected: {
    color: Colors.primary,
  },
});
