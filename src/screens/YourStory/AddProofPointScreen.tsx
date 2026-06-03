import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { saveProofPoint } from '../../services/proofPoints';
import { WorksheetsScreenProps } from '../../types/navigation';

const ACCENT = '#8B6F47';

type Props = WorksheetsScreenProps<'AddProofPoint'>;

export const AddProofPointScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1=hard moment, 2=what you did, 3=complete
  const [hardMoment, setHardMoment] = useState('');
  const [whatYouDid, setWhatYouDid] = useState('');
  const [saving, setSaving] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState(0);

  // Animations
  const contentFade = useRef(new Animated.Value(1)).current;
  const completeFade = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  const transitionTo = (nextStep: 1 | 2 | 3) => {
    Animated.timing(contentFade, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);
      Animated.timing(contentFade, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleSave = async () => {
    if (!user || saving) return;
    Keyboard.dismiss();
    setSaving(true);
    try {
      const result = await saveProofPoint(user.uid, {
        hard_moment: hardMoment.trim(),
        what_you_did: whatYouDid.trim(),
      });
      setPointsAwarded(result.pointsAwarded);
      // Show completion
      transitionTo(3);
      setTimeout(() => {
        Animated.timing(completeFade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
        Animated.spring(checkScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }).start();
      }, 200);
    } catch (err) {
      console.warn('Failed to save proof point:', err);
      setSaving(false);
    }
  };

  const canContinue = step === 1 ? hardMoment.trim().length > 0 : whatYouDid.trim().length > 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (step === 2) transitionTo(1);
              else navigation.goBack();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={step === 1 ? 'close' : 'arrow-back'}
              size={24}
              color={Colors.dark}
            />
          </TouchableOpacity>

          {/* Dot pagination */}
          <View style={styles.dotsRow}>
            {[1, 2].map((s) => (
              <View
                key={s}
                style={[styles.dot, s <= (step === 3 ? 2 : step) && styles.dotActive]}
              />
            ))}
          </View>

          <View style={{ width: 24 }} />
        </View>

        {/* Step content */}
        <Animated.View style={[styles.body, { opacity: contentFade }]}>
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepLabel}>THE HARD MOMENT</Text>
              <Text style={styles.stepTitle}>
                What's a time life put you on the floor — a loss, a setback, something that felt unsurvivable?
              </Text>
              <TextInput
                style={styles.textArea}
                value={hardMoment}
                onChangeText={setHardMoment}
                placeholder="e.g. Lost my job unexpectedly, dealt with a painful injury, relationship fell apart..."
                placeholderTextColor={Colors.gray + '80'}
                multiline
                maxLength={500}
                autoFocus
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{hardMoment.length}/500</Text>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={styles.stepLabel}>WHAT YOU DID ANYWAY</Text>
              <Text style={styles.stepTitle}>
                You're still here. What did you actually do — even imperfectly?
              </Text>
              <TextInput
                style={styles.textArea}
                value={whatYouDid}
                onChangeText={setWhatYouDid}
                placeholder="e.g. Kept showing up, rebuilt my routine one day at a time, asked for help..."
                placeholderTextColor={Colors.gray + '80'}
                multiline
                maxLength={500}
                autoFocus
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{whatYouDid.length}/500</Text>
            </View>
          )}

          {step === 3 && (
            <Animated.View style={[styles.completeContent, { opacity: completeFade }]}>
              <Animated.View
                style={[
                  styles.checkCircle,
                  { transform: [{ scale: checkScale }] },
                ]}
              >
                <Ionicons name="checkmark" size={36} color={Colors.white} />
              </Animated.View>
              <Text style={styles.completeTitle}>proof point added</Text>
              <Text style={styles.completeSubtitle}>
                That's another piece of evidence that you're tougher than you think.
              </Text>
              {pointsAwarded > 0 && (
                <View style={styles.xpBadge}>
                  <Ionicons name="flash" size={14} color={Colors.secondary} />
                  <Text style={styles.xpText}>+{pointsAwarded} XP</Text>
                </View>
              )}
            </Animated.View>
          )}
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          {step === 1 && (
            <TouchableOpacity
              style={[styles.nextButton, !canContinue && styles.buttonDisabled]}
              onPress={() => transitionTo(2)}
              disabled={!canContinue}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>next</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.white} />
            </TouchableOpacity>
          )}

          {step === 2 && (
            <TouchableOpacity
              style={[styles.nextButton, (!canContinue || saving) && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={!canContinue || saving}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>
                {saving ? 'saving...' : 'save proof point'}
              </Text>
            </TouchableOpacity>
          )}

          {step === 3 && (
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Text style={styles.doneButtonText}>done</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: ACCENT,
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  stepContent: {
    flex: 1,
  },
  stepLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: ACCENT,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  stepTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    lineHeight: 30,
    marginBottom: Spacing.lg,
  },
  textArea: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    minHeight: 160,
    lineHeight: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  charCount: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  completeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Spacing.xxl,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  completeTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  completeSubtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.secondary + '15',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  xpText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
  },
  footer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  nextButton: {
    backgroundColor: ACCENT,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  nextButtonText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  doneButtonText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});
