import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PointsPopup } from '../../components/common/PointsPopup';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { DifficultySelector } from '../../components/common/DifficultySelector';
import { InputField } from '../../components/common/InputField';
import { useAuth } from '../../context/AuthContext';
import { completeChallenge, saveReflectionAnswers, cancelChallenge } from '../../services/challenges';
import { showConfirm } from '../../utils/alert';
import {
  calculateChallengePoints,
  calculateFailedChallengePoints,
  updateWillpowerStats,
  getWillpowerStats,
  getStreakMultiplier,
} from '../../services/willpower';
import { Challenge } from '../../types';
import { showAlert } from '../../utils/alert';
import { CountdownTimer } from '../../components/challenge/CountdownTimer';
import { useWalkthrough, WALKTHROUGH_STEPS } from '../../context/WalkthroughContext';
import { WalkthroughOverlay } from '../../components/walkthrough/WalkthroughOverlay';
import { PointsAlertModal } from '../../components/common/PointsAlertModal';
import { LevelUpPopup } from '../../components/common/LevelUpPopup';
import { shouldShowPointsAlert } from '../../services/alertPreferences';

type Props = NativeStackScreenProps<any, 'CompleteChallenge'>;

export const CompleteChallengeScreen: React.FC<Props> = ({ route, navigation }) => {
  const { user } = useAuth();
  const challenge = route.params?.challenge as Challenge;
  const { isWalkthroughActive, currentStep, currentStepConfig, nextStep, skipWalkthrough } = useWalkthrough();
  const isMyStep = isWalkthroughActive && currentStepConfig?.screen === 'CompleteChallenge';

  const [result, setResult] = useState<'completed' | 'failed' | null>(null);
  const [difficulty, setDifficulty] = useState(3);
  const [journalEntry, setJournalEntry] = useState('');
  const [showPrompts, setShowPrompts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPointsPopup, setShowPointsPopup] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [pendingAlert, setPendingAlert] = useState<(() => void) | null>(null);
  const [pointsAlertVisible, setPointsAlertVisible] = useState(false);
  const [pointsAlertTitle, setPointsAlertTitle] = useState('');
  const [pointsAlertMessage, setPointsAlertMessage] = useState('');
  const [levelUpVisible, setLevelUpVisible] = useState(false);
  const [levelUpLevel, setLevelUpLevel] = useState(0);
  const [levelUpTitle, setLevelUpTitle] = useState('');

  const handlePopupComplete = useCallback(() => {
    setShowPointsPopup(false);
    if (pendingAlert) {
      pendingAlert();
      setPendingAlert(null);
    }
  }, [pendingAlert]);

  const handleCancel = () => {
    if (!user) return;
    showConfirm(
      'Cancel Challenge',
      'Are you sure you want to cancel this challenge? You will not be penalized.',
      async () => {
        try {
          await cancelChallenge(user.uid, challenge.id);
          showAlert('Challenge Cancelled', 'You can start a new challenge anytime.');
          navigation.popToTop();
        } catch (e: any) {
          showAlert('Error', e.message);
        }
      },
      'Yes, Cancel'
    );
  };

  const handleSubmit = async () => {
    if (!result) {
      showAlert('Required', 'Please select success or fail.');
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      await completeChallenge(user.uid, challenge.id, {
        status: result,
        difficulty_actual: difficulty,
      });
      const trimmedJournal = journalEntry.trim();
      if (trimmedJournal) {
        await saveReflectionAnswers(user.uid, challenge.id, trimmedJournal);
      }

      // Calculate and award willpower points
      const hasReflection = trimmedJournal.length > 0;
      const stats = await getWillpowerStats(user.uid);
      const pointsEarned =
        result === 'completed'
          ? calculateChallengePoints(difficulty, stats.currentStreak, hasReflection)
          : calculateFailedChallengePoints(stats.currentStreak, hasReflection);

      const updateResult = await updateWillpowerStats(user.uid, pointsEarned);

      // Build points message with multiplier info
      const multiplier = getStreakMultiplier(stats.currentStreak);
      let pointsMessage = `You earned ${pointsEarned} Willpower Point${pointsEarned !== 1 ? 's' : ''}!`;
      if (multiplier > 1) {
        pointsMessage += `\n(${multiplier}x streak bonus applied)`;
      }

      // Show points popup animation first
      setEarnedPoints(pointsEarned);
      setShowPointsPopup(true);

      // Prepare the alert to show after popup animation completes
      const showAlerts = async () => {
        const alertTitle = result === 'completed' ? 'Challenge Complete' : 'Challenge Logged';

        // Show level-up popup first if new level reached
        if (updateResult.newLevelReached && updateResult.levelInfo) {
          setLevelUpLevel(updateResult.levelInfo.level);
          setLevelUpTitle(updateResult.levelInfo.title);
          setLevelUpVisible(true);
          return; // Navigation will happen when level-up is dismissed
        }

        if (updateResult.newTierReached && updateResult.tierInfo) {
          showAlert(
            'Streak Milestone!',
            `${updateResult.newStreak}-Day Streak: ${updateResult.tierInfo.tierName}!\n\nYou're now earning ${updateResult.tierInfo.multiplier}x points on all activities!`,
            async () => {
              const shouldShow = await shouldShowPointsAlert();
              if (shouldShow) {
                setPointsAlertTitle(alertTitle);
                setPointsAlertMessage(pointsMessage);
                setPointsAlertVisible(true);
              } else {
                navigation.popToTop();
              }
            }
          );
        } else {
          const shouldShow = await shouldShowPointsAlert();
          if (shouldShow) {
            setPointsAlertTitle(alertTitle);
            setPointsAlertMessage(pointsMessage);
            setPointsAlertVisible(true);
          } else {
            navigation.popToTop();
          }
        }
      };

      setPendingAlert(() => showAlerts);
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
      <Card style={styles.challengeCard}>
        <Text style={styles.challengeName}>{challenge.name}</Text>
        <Text style={styles.meta}>
          Expected difficulty: {challenge.difficulty_expected}
        </Text>
      </Card>

      {challenge.deadline ? (
        <CountdownTimer deadline={challenge.deadline} variant="full" />
      ) : null}

      {/* Success / Fail */}
      <Text style={styles.sectionLabel}>How did it go?</Text>
      <View style={styles.resultRow}>
        <Button
          title="Success"
          onPress={() => setResult('completed')}
          variant={result === 'completed' ? 'secondary' : 'outline'}
          style={styles.resultBtn}
        />
        <Button
          title="Fail"
          onPress={() => setResult('failed')}
          variant={result === 'failed' ? 'primary' : 'outline'}
          style={styles.resultBtn}
        />
      </View>

      {/* Difficulty */}
      <DifficultySelector
        label="Actual Difficulty"
        value={difficulty}
        onChange={setDifficulty}
      />

      {/* Journaling */}
      <View style={styles.journalHeader}>
        <Text style={[styles.sectionLabel, { marginTop: 0, marginBottom: 0 }]}>Post-Challenge Journaling</Text>
        <TouchableOpacity
          onPress={() => setShowPrompts(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="information-circle-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.journalSubtext}>Optional — earns bonus points</Text>
      <InputField
        label=""
        value={journalEntry}
        onChangeText={setJournalEntry}
        placeholder="Reflect on your experience..."
        multiline
        numberOfLines={6}
        style={styles.journalInput}
      />

      {/* Prompts Modal */}
      <Modal
        visible={showPrompts}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPrompts(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPrompts(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Journaling Prompts</Text>
            <Text style={styles.modalSubtitle}>Consider reflecting on:</Text>
            <View style={styles.promptList}>
              <Text style={styles.promptItem}>• What was the hardest moment, and what were you telling yourself then?</Text>
              <Text style={styles.promptItem}>• What helped you push through — or what would have helped?</Text>
              <Text style={styles.promptItem}>• What's one rule or adjustment you'll apply next time?</Text>
              <Text style={styles.promptItem}>• How do you feel now compared to before?</Text>
            </View>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowPrompts(false)}
            >
              <Text style={styles.modalCloseText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Button
        title="Submit"
        onPress={handleSubmit}
        loading={loading}
        disabled={!result}
        style={{ marginTop: Spacing.md }}
      />

      <Button
        title="Cancel Challenge"
        onPress={handleCancel}
        variant="outline"
        style={styles.cancelBtn}
      />

      {isMyStep && (
        <WalkthroughOverlay
          visible
          stepText={currentStepConfig?.text || ''}
          stepNumber={currentStep}
          totalSteps={WALKTHROUGH_STEPS.length}
          isLast={currentStep === WALKTHROUGH_STEPS.length - 1}
          onNext={nextStep}
          onSkip={skipWalkthrough}
        />
      )}
      </ScrollView>
      <PointsPopup
        points={earnedPoints}
        visible={showPointsPopup}
        onComplete={handlePopupComplete}
      />
      <PointsAlertModal
        visible={pointsAlertVisible}
        title={pointsAlertTitle}
        message={pointsAlertMessage}
        onDismiss={() => {
          setPointsAlertVisible(false);
          navigation.popToTop();
        }}
      />
      <LevelUpPopup
        visible={levelUpVisible}
        level={levelUpLevel}
        title={levelUpTitle}
        onContinue={() => {
          setLevelUpVisible(false);
          navigation.popToTop();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  scrollView: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  challengeCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
    marginBottom: Spacing.lg,
  },
  challengeName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
  },
  meta: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.xs,
  },
  sectionLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  resultBtn: { flex: 1 },
  cancelBtn: {
    marginTop: Spacing.lg,
  },
  journalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  journalSubtext: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.sm,
  },
  journalInput: {
    minHeight: 120,
    backgroundColor: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.md,
  },
  promptList: {
    gap: Spacing.sm,
  },
  promptItem: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
  },
  modalClose: {
    marginTop: Spacing.lg,
    alignSelf: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  modalCloseText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});
