import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
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
import { completeChallenge, saveReflectionAnswers, cancelChallenge, getChallengeRepeatStats, getRepeatMilestone } from '../../services/challenges';
import { showConfirm } from '../../utils/alert';
import {
  calculateChallengePoints,
  calculateFailedChallengePoints,
  updateWillpowerStats,
  getWillpowerStats,
  getStreakMultiplier,
  getStreakTierInfo,
  getLevelInfo,
} from '../../services/willpower';
import { Challenge, BuddyChallenge } from '../../types';
import { onBuddyChallengeUserComplete } from '../../services/buddyChallenge';
import { showAlert } from '../../utils/alert';
import { CountdownTimer } from '../../components/challenge/CountdownTimer';
import { useWalkthrough, WALKTHROUGH_STEPS } from '../../context/WalkthroughContext';
import { getUserTeam, logTeamActivity } from '../../services/teams';
import { createFeedEntry, createMilestoneFeedEntry, updateFeedEntryMessage } from '../../services/inspirationFeed';
import { getUser } from '../../services/users';
import { getCategoryByName } from '../../services/categories';
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
  const [failureReflection, setFailureReflection] = useState('');
  const [showPrompts, setShowPrompts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resistanceExpanded, setResistanceExpanded] = useState(false);
  const [learningExpanded, setLearningExpanded] = useState(false);
  const [showPointsPopup, setShowPointsPopup] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [pendingAlert, setPendingAlert] = useState<(() => void) | null>(null);
  const [pointsAlertVisible, setPointsAlertVisible] = useState(false);
  const [pointsAlertTitle, setPointsAlertTitle] = useState('');
  const [pointsAlertMessage, setPointsAlertMessage] = useState('');
  const [levelUpVisible, setLevelUpVisible] = useState(false);
  const [levelUpLevel, setLevelUpLevel] = useState(0);
  const [levelUpTitle, setLevelUpTitle] = useState('');
  const [repeatMilestoneVisible, setRepeatMilestoneVisible] = useState(false);
  const [repeatMilestoneCount, setRepeatMilestoneCount] = useState(0);
  const [feedEntryId, setFeedEntryId] = useState<string | null>(null);
  const [showMessagePrompt, setShowMessagePrompt] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');

  // Navigate home, or show the message prompt first if a feed entry was created
  const navigateHome = useCallback(() => {
    if (feedEntryId) {
      setShowMessagePrompt(true);
    } else {
      navigation.popToTop();
    }
  }, [feedEntryId, navigation]);

  const handleShareMessage = useCallback(async () => {
    if (feedEntryId && completionMessage.trim()) {
      try {
        await updateFeedEntryMessage(feedEntryId, completionMessage);
      } catch (err) {
        console.warn('Failed to save completion message:', err);
      }
    }
    setShowMessagePrompt(false);
    navigation.popToTop();
  }, [feedEntryId, completionMessage, navigation]);

  const handleSkipMessage = useCallback(() => {
    setShowMessagePrompt(false);
    navigation.popToTop();
  }, [navigation]);

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
      const trimmedJournal = journalEntry.trim();
      const trimmedFailureReflection = failureReflection.trim();

      await completeChallenge(user.uid, challenge.id, {
        status: result,
        difficulty_actual: difficulty,
        reflection_note: result === 'completed' ? trimmedJournal : undefined,
        failure_reflection: result === 'failed' ? trimmedFailureReflection : undefined,
      });

      // Save reflection answers for completed challenges
      if (result === 'completed' && trimmedJournal) {
        await saveReflectionAnswers(user.uid, challenge.id, trimmedJournal);
      }

      // Log team activity if user is in a team
      try {
        const team = await getUserTeam(user.uid);
        if (team) {
          await logTeamActivity(
            team.id,
            user.uid,
            'challenge',
            challenge.category_id || '',
            challenge.category_id || ''
          );
        }
      } catch (teamErr) {
        console.warn('Failed to log team activity:', teamErr);
      }

      // Check for repeat milestone (5, 10, 25, 50, 100)
      let repeatMilestone: number | null = null;
      if (result === 'completed') {
        try {
          const repeatStats = await getChallengeRepeatStats(user.uid, challenge.name);
          if (repeatStats) {
            repeatMilestone = getRepeatMilestone(repeatStats.total_completions);
          }
        } catch (err) {
          console.warn('Failed to get repeat stats:', err);
        }
      }

      // Calculate and award willpower points
      // Check EITHER reflection (success journal OR failure reflection)
      const hasReflection = result === 'completed'
        ? trimmedJournal.length > 0
        : trimmedFailureReflection.length > 0;
      const stats = await getWillpowerStats(user.uid);

      // Add to inspiration feed if completed and difficulty 3+
      if (result === 'completed' && difficulty >= 3) {
        try {
          const userData = await getUser(user.uid);
          // Default to opted in if not explicitly set
          const optedIn = userData?.inspiration_feed_opt_in !== false;

          if (optedIn && challenge.category_id) {
            // Note: challenge.category_id contains the category name (e.g., "Physical")
            const categoryName = challenge.category_id;
            const category = await getCategoryByName(user.uid, categoryName);
            const streakInfo = getStreakTierInfo(stats.currentStreak);
            const currentLevelInfo = getLevelInfo(stats.totalPoints);
            const entryId = await createFeedEntry(
              user.uid,
              categoryName,
              categoryName,
              difficulty,
              challenge.name,
              true,
              category?.icon,
              userData?.username,
              streakInfo.tierName,
              stats.currentStreak,
              currentLevelInfo.level,
              currentLevelInfo.title
            );
            if (entryId) {
              setFeedEntryId(entryId);
            }
          }
        } catch (feedErr) {
          console.warn('Failed to create inspiration feed entry:', feedErr);
        }
      }
      const pointsEarned =
        result === 'completed'
          ? calculateChallengePoints(difficulty, stats.currentStreak, hasReflection)
          : calculateFailedChallengePoints(stats.currentStreak, hasReflection);

      const updateResult = await updateWillpowerStats(user.uid, pointsEarned);

      // Handle buddy challenge completion
      let buddyBonusPoints = 0;
      let buddyBothComplete = false;
      if (challenge.is_buddy_challenge && challenge.buddy_challenge_id) {
        try {
          const buddyResult = await onBuddyChallengeUserComplete(
            user.uid,
            challenge.buddy_challenge_id,
            result,
            pointsEarned,
          );
          buddyBothComplete = buddyResult.bothComplete;
          buddyBonusPoints = buddyResult.bonusPoints;
        } catch (buddyErr) {
          console.warn('Failed to update buddy challenge:', buddyErr);
        }
      }

      // Create milestone feed entries (fire-and-forget)
      try {
        const userData = await getUser(user.uid);
        const optedIn = userData?.inspiration_feed_opt_in !== false;
        if (optedIn) {
          if (updateResult.newTierReached && updateResult.tierInfo) {
            createMilestoneFeedEntry(
              user.uid,
              userData?.username,
              'streak_milestone',
              undefined,
              undefined,
              updateResult.newStreak,
              updateResult.tierInfo.tierName,
              undefined,
              undefined
            );
          }
          if (updateResult.newLevelReached && updateResult.levelInfo) {
            createMilestoneFeedEntry(
              user.uid,
              userData?.username,
              'level_up',
              updateResult.levelInfo.level,
              undefined,
              updateResult.newStreak,
              undefined,
              updateResult.levelInfo.level,
              updateResult.levelInfo.title
            );
          }
          if (repeatMilestone) {
            createMilestoneFeedEntry(
              user.uid,
              userData?.username,
              'repeat_milestone',
              repeatMilestone,
              challenge.name,
              updateResult.newStreak,
              undefined,
              undefined,
              undefined
            );
          }
        }
      } catch (milestoneErr) {
        console.warn('Failed to create milestone feed entry:', milestoneErr);
      }

      // Build points message with multiplier info
      const multiplier = getStreakMultiplier(stats.currentStreak);
      let pointsMessage = `You earned ${pointsEarned} Willpower Point${pointsEarned !== 1 ? 's' : ''}!`;
      if (multiplier > 1) {
        pointsMessage += `\n(${multiplier}x streak bonus applied)`;
      }
      if (buddyBothComplete && buddyBonusPoints > 0) {
        pointsMessage += `\n+${buddyBonusPoints} Buddy Bonus!`;
      }

      // Show points popup animation first (include buddy bonus in display)
      setEarnedPoints(pointsEarned + buddyBonusPoints);
      setShowPointsPopup(true);

      // Prepare the alert to show after popup animation completes
      const showAlerts = async () => {
        // Show buddy-specific alerts first
        if (challenge.is_buddy_challenge && result === 'completed') {
          if (buddyBothComplete) {
            showAlert(
              'Buddy Bonus!',
              `You and ${challenge.buddy_partner_username || 'your teammate'} both crushed it!\n\n+${buddyBonusPoints} bonus points earned!`
            );
          } else {
            showAlert(
              'Waiting for Partner',
              `Your partner hasn't finished yet. They can see you did it!`
            );
          }
        }

        const alertTitle = result === 'completed' ? 'Challenge Complete' : 'Challenge Logged';

        // Show repeat milestone first if applicable
        if (repeatMilestone) {
          setRepeatMilestoneCount(repeatMilestone);
          setRepeatMilestoneVisible(true);
          return; // Navigation will happen when milestone is dismissed
        }

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
                navigateHome();
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
            navigateHome();
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

      {/* Common Resistance Section - helps with motivation before completing */}
      {challenge.common_resistance && challenge.common_resistance.length > 0 && !result && (
        <View style={styles.collapsibleSection}>
          <TouchableOpacity
            style={styles.collapsibleHeader}
            onPress={() => setResistanceExpanded(!resistanceExpanded)}
            activeOpacity={0.7}
          >
            <Text style={styles.collapsibleTitle}>Feeling Resistance?</Text>
            <Ionicons
              name={resistanceExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={Colors.primary}
            />
          </TouchableOpacity>
          {resistanceExpanded && (
            <View style={styles.collapsibleContent}>
              <Text style={styles.collapsibleSubtitle}>Common thoughts that come up:</Text>
              {challenge.common_resistance.map((resistance, index) => (
                <Text key={index} style={styles.resistanceItem}>• "{resistance}"</Text>
              ))}
              <Text style={styles.encouragementText}>
                These thoughts are normal. Do it anyway.
              </Text>
            </View>
          )}
        </View>
      )}

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

      {/* Failure Reflection - shown only when result is 'failed' */}
      {result === 'failed' && (
        <View style={styles.failureReflectionSection}>
          <Text style={styles.sectionLabel}>What got in the way?</Text>
          <Text style={styles.reflectionSubtext}>
            Understanding obstacles helps you overcome them next time.
          </Text>
          <InputField
            label=""
            value={failureReflection}
            onChangeText={setFailureReflection}
            placeholder="I got distracted by..."
            multiline
            numberOfLines={4}
            style={styles.journalInput}
          />
          <Text style={styles.optionalText}>
            Optional — no judgment, just learning
          </Text>
        </View>
      )}

      {/* Journaling - shown only when result is 'completed' */}
      {result === 'completed' && (
        <>
          {/* What You'll Learn Section - reinforcement after completion */}
          {challenge.what_youll_learn && (
            <View style={styles.collapsibleSection}>
              <TouchableOpacity
                style={styles.collapsibleHeader}
                onPress={() => setLearningExpanded(!learningExpanded)}
                activeOpacity={0.7}
              >
                <Text style={styles.collapsibleTitle}>What You Just Learned</Text>
                <Ionicons
                  name={learningExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={Colors.success}
                />
              </TouchableOpacity>
              {learningExpanded && (
                <View style={styles.collapsibleContent}>
                  <Text style={styles.learningText}>{challenge.what_youll_learn}</Text>
                  {challenge.neuroscience_explanation && (
                    <>
                      <Text style={styles.neuroscienceLabel}>The Science:</Text>
                      <Text style={styles.neuroscienceText}>{challenge.neuroscience_explanation}</Text>
                    </>
                  )}
                </View>
              )}
            </View>
          )}

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
        </>
      )}

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
          navigateHome();
        }}
      />
      <LevelUpPopup
        visible={levelUpVisible}
        level={levelUpLevel}
        title={levelUpTitle}
        onContinue={() => {
          setLevelUpVisible(false);
          navigateHome();
        }}
      />

      {/* Repeat Milestone Celebration Modal */}
      <Modal
        visible={repeatMilestoneVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setRepeatMilestoneVisible(false);
          navigateHome();
        }}
      >
        <View style={styles.milestoneOverlay}>
          <View style={styles.milestoneContent}>
            <Text style={styles.milestoneEmoji}>🎉</Text>
            <Text style={styles.milestoneTitle}>Challenge Complete!</Text>
            <Text style={styles.milestoneMessage}>
              You've now completed "{challenge.name}" {repeatMilestoneCount} times!
            </Text>
            <TouchableOpacity
              style={styles.milestoneButton}
              onPress={() => {
                setRepeatMilestoneVisible(false);
                navigateHome();
              }}
            >
              <Text style={styles.milestoneButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Completion Message Prompt Modal */}
      <Modal
        visible={showMessagePrompt}
        transparent
        animationType="fade"
        onRequestClose={handleSkipMessage}
      >
        <View style={styles.milestoneOverlay}>
          <View style={styles.milestoneContent}>
            <Text style={styles.milestoneTitle}>Share a Thought</Text>
            <Text style={styles.milestoneMessage}>
              Want to share something with the community?
            </Text>
            <TextInput
              style={styles.messageInput}
              value={completionMessage}
              onChangeText={setCompletionMessage}
              placeholder="e.g., That was tough but worth it!"
              placeholderTextColor={Colors.gray}
              maxLength={150}
              multiline
              numberOfLines={3}
            />
            <Text style={styles.charCount}>
              {completionMessage.length}/150
            </Text>
            <TouchableOpacity
              style={[styles.milestoneButton, !completionMessage.trim() && styles.buttonDisabled]}
              onPress={handleShareMessage}
              disabled={!completionMessage.trim()}
            >
              <Text style={styles.milestoneButtonText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkipMessage}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  failureReflectionSection: {
    marginTop: Spacing.lg,
  },
  reflectionSubtext: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.sm,
  },
  optionalText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
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
  milestoneOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  milestoneContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  milestoneEmoji: {
    fontSize: 56,
    marginBottom: Spacing.md,
  },
  milestoneTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  milestoneMessage: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  milestoneButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 12,
  },
  milestoneButtonText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  collapsibleSection: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  collapsibleTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  collapsibleContent: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  collapsibleSubtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.sm,
  },
  resistanceItem: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    fontStyle: 'italic',
    marginBottom: Spacing.xs,
    lineHeight: 20,
  },
  encouragementText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    marginTop: Spacing.sm,
  },
  learningText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 22,
  },
  neuroscienceLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  neuroscienceText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  messageInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.md,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: Spacing.xs,
  },
  charCount: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    alignSelf: 'flex-end',
    marginBottom: Spacing.md,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  skipButton: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
  skipButtonText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.gray,
  },
});
