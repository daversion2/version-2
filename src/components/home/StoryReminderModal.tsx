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
import { ProofPoint } from '../../types';

const ACCENT = '#8B6F47';

interface StoryReminderModalProps {
  visible: boolean;
  proofPoint: ProofPoint | null;
  onSubmit: (reflection: string) => void;
  onDismiss: () => void;
}

export const StoryReminderModal: React.FC<StoryReminderModalProps> = ({
  visible,
  proofPoint,
  onSubmit,
  onDismiss,
}) => {
  const [reflection, setReflection] = useState('');

  const handleSubmit = () => {
    onSubmit(reflection.trim());
    setReflection('');
  };

  const handleDismiss = () => {
    setReflection('');
    onDismiss();
  };

  if (!visible || !proofPoint) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.iconRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="book" size={24} color={ACCENT} />
              </View>
            </View>

            <Text style={styles.title}>you've been here before</Text>
            <Text style={styles.subtitle}>
              Your streak broke. Your story didn't.
            </Text>

            {/* Proof point evidence */}
            <View style={styles.evidenceCard}>
              <Text style={styles.evidenceLabel}>PROOF FROM YOUR OWN HISTORY</Text>
              <View style={styles.quoteRow}>
                <Ionicons name="chatbubble-outline" size={14} color={ACCENT} />
                <Text style={styles.quoteText}>
                  You've survived harder than this. Here's the evidence.
                </Text>
              </View>

              <View style={styles.proofBlock}>
                <Text style={styles.proofLabel}>the hard moment</Text>
                <Text style={styles.proofText}>{proofPoint.hard_moment}</Text>
              </View>

              <View style={styles.proofBlock}>
                <Text style={[styles.proofLabel, { color: ACCENT }]}>what you did anyway</Text>
                <Text style={styles.proofText}>{proofPoint.what_you_did}</Text>
              </View>
            </View>

            {/* Reflection prompt */}
            <Text style={styles.reflectionPrompt}>
              That person — the one who kept going then — is still you. What's one thing they'd do right now?
            </Text>

            <TextInput
              style={styles.reflectionInput}
              value={reflection}
              onChangeText={setReflection}
              placeholder="Tap to reflect..."
              placeholderTextColor={Colors.gray + '80'}
              multiline
              maxLength={300}
            />

            {/* CTA */}
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaText}>get back on track</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.white} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.dismissLink} onPress={handleDismiss}>
              <Text style={styles.dismissText}>Not now</Text>
            </TouchableOpacity>
          </ScrollView>
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
    maxHeight: '85%',
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ACCENT + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  evidenceCard: {
    backgroundColor: ACCENT + '08',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: ACCENT + '20',
  },
  evidenceLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 10,
    color: Colors.gray,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  quoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  quoteText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: ACCENT,
    fontStyle: 'italic',
    flex: 1,
    lineHeight: 18,
  },
  proofBlock: {
    marginBottom: Spacing.sm,
  },
  proofLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginBottom: 2,
  },
  proofText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
  },
  reflectionPrompt: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
    marginBottom: Spacing.md,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  reflectionInput: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    minHeight: 60,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  ctaButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  ctaText: {
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
});
