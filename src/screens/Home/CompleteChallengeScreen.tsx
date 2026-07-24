import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreenProps } from '../../types/navigation';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { DifficultySelector } from '../../components/common/DifficultySelector';
import { InputField } from '../../components/common/InputField';
import { useAuth } from '../../context/AuthContext';
import { ChallengeReflectionFlow } from './components/ChallengeReflectionFlow';
import { completeChallenge, saveReflectionAnswers, cancelChallenge, getChallengeRepeatStats, getRepeatMilestone, getTotalCompletionCount } from '../../services/challenges';
import { showConfirm } from '../../utils/alert';
import {
  calculateChallengePoints,
  calculateFailedChallengePoints,
  updateWillpowerStats,
  getWillpowerStats,
  getStreakMultiplier,
} from '../../services/willpower';
import { showAlert } from '../../utils/alert';
import { CountdownTimer } from '../../components/challenge/CountdownTimer';
import { RewardMoment } from '../../components/reward/RewardMoment';
import { HabitCelebrationModal } from '../../components/habits/HabitCelebrationModal';
import { HabitTidbitModal } from '../../components/habits/HabitTidbitModal';
import { TidbitLearnMore } from '../../components/reward/TidbitLearnMore';
import { ChallengeFailureModal } from '../../components/challenge/ChallengeFailureModal';
import { saveChallengeFailureLog } from '../../services/challengeFailureLogs';
import {
  selectTidbitForCompletion,
  recordTidbitShown,
  recordLearnMoreTap,
  buildTidbitContext,
} from '../../services/neuroscienceTidbits';
import { NeuroscienceTidbit } from '../../types';
import { triggerMilestoneHaptic } from '../../utils/haptics';

type Props = HomeScreenProps<'CompleteChallenge'>;

export const CompleteChallengeScreen: React.FC<Props> = ({ route, navigation }) => {
  const { user } = useAuth();
  const challenge = route.params?.challenge;

  const [result, setResult] = useState<'completed' | 'failed' | null>(null);
  const [difficulty, setDifficulty] = useState(3);
  const [journalEntry, setJournalEntry] = useState('');
  // Mind-noticing reflection flow state (success path)
  const [reflecting, setReflecting] = useState(false);
  const [reflectionText, setReflectionText] = useState('');
  const [reflectionTags, setReflectionTags] = useState<string[]>([]);
  const [failureReflection, setFailureReflection] = useState('');
  const [showPrompts, setShowPrompts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resistanceExpanded, setResistanceExpanded] = useState(false);
  const [learningExpanded, setLearningExpanded] = useState(false);
  // Celebration state (success path — same modal as practice completion)
  const [celebration, setCelebration] = useState<{
    points: number;
    streak: number;
    bonusLabel: string | null;
  } | null>(null);
  // Neuroscience tidbit shown after the celebration (success path)
  const [pendingTidbit, setPendingTidbit] = useState<NeuroscienceTidbit | null>(null);
  const [tidbitVisible, setTidbitVisible] = useState(false);
  const [learnMoreVisible, setLearnMoreVisible] = useState(false);
  // Reward moment state (failed path)
  const [rewardVisible, setRewardVisible] = useState(false);
  const [rewardMessage, setRewardMessage] = useState('');
  const [narrativeLine, setNarrativeLine] = useState('');
  const [rewardPoints, setRewardPoints] = useState(0);
  const [rewardStreakMultiplier, setRewardStreakMultiplier] = useState(1);

  // Milestone alerts (fire after reward moment)
  const [pendingStreakTier, setPendingStreakTier] = useState<{ streak: number; tierName: string; multiplier: number } | null>(null);

  const [failureModalVisible, setFailureModalVisible] = useState(false);

  // Navigate home after challenge completion
  const navigateHome = useCallback(() => {
    navigation.popToTop();
  }, [navigation]);

  const proceedAfterReward = useCallback(() => {
    // Fire milestone alerts in sequence after reward moment
    if (pendingStreakTier) {
      triggerMilestoneHaptic();
      showAlert(
        'Streak Milestone!',
        `${pendingStreakTier.streak}-Day Streak: ${pendingStreakTier.tierName}!\n\nYou're now earning ${pendingStreakTier.multiplier}x XP on all activities!`,
        () => navigateHome()
      );
      setPendingStreakTier(null);
      return;
    }

    navigateHome();
  }, [pendingStreakTier, navigateHome]);

  const dismissCelebration = useCallback(() => {
    setCelebration(null);
    // Tidbit follows the celebration; otherwise navigate — but only after the
    // native celebration Modal has fully torn down, since actions dispatched
    // during its dismissal are silently dropped on iOS.
    if (pendingTidbit) {
      setTidbitVisible(true);
      return;
    }
    setTimeout(() => proceedAfterReward(), 300);
  }, [pendingTidbit, proceedAfterReward]);

  const handleTidbitDismiss = useCallback(() => {
    setTidbitVisible(false);
    setTimeout(() => proceedAfterReward(), 300);
  }, [proceedAfterReward]);

  const handleTidbitLearnMore = useCallback(() => {
    if (user && pendingTidbit) {
      recordLearnMoreTap(user.uid, pendingTidbit.id).catch(console.warn);
    }
    setTidbitVisible(false);
    setLearnMoreVisible(true);
  }, [user, pendingTidbit]);

  const handleLearnMoreClose = useCallback(() => {
    setLearnMoreVisible(false);
    setTimeout(() => proceedAfterReward(), 300);
  }, [proceedAfterReward]);

  const handleRewardDismiss = useCallback(() => {
    setRewardVisible(false);
    // The reward moment is only shown for failed challenges now — follow up
    // with the failure reflection modal.
    setFailureModalVisible(true);
  }, []);

  const handleFailureComplete = useCallback(async (barrierReason: string, nextAction: string) => {
    setFailureModalVisible(false);
    if (user) {
      try {
        await saveChallengeFailureLog(user.uid, {
          challengeId: challenge.id,
          challengeName: challenge.name,
          barrierReason,
          nextAction,
        });
      } catch (err) {
        console.warn('Failed to save challenge failure log:', err);
      }
    }
    proceedAfterReward();
  }, [user, challenge.id, challenge.name, proceedAfterReward]);

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

      // Compute the XP up front so the stored points_awarded matches what is
      // actually credited below (streak multiplier / failed-challenge rate)
      const stats = await getWillpowerStats(user.uid);
      const pointsEarned =
        result === 'completed'
          ? calculateChallengePoints(difficulty, stats.currentStreak)
          : calculateFailedChallengePoints(stats.currentStreak);

      await completeChallenge(user.uid, challenge.id, {
        status: result,
        difficulty_actual: difficulty,
        points_awarded: pointsEarned,
        reflection_note: result === 'completed' ? trimmedJournal : undefined,
        failure_reflection: result === 'failed' ? trimmedFailureReflection : undefined,
      });

      // Save reflection answers for completed challenges
      if (result === 'completed' && trimmedJournal) {
        await saveReflectionAnswers(user.uid, challenge.id, trimmedJournal, reflectionTags);
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

      // Award XP (reflection is optional and never affects points)
      const updateResult = await updateWillpowerStats(user.uid, pointsEarned);

      // Store pending milestones for after the celebration/reward moment
      if (updateResult.newTierReached && updateResult.tierInfo) {
        setPendingStreakTier({
          streak: updateResult.newStreak,
          tierName: updateResult.tierInfo.tierName,
          multiplier: updateResult.tierInfo.multiplier,
        });
      }

      if (result === 'completed') {
        // Fetch neuroscience tidbit — shown after the celebration
        let tidbit: NeuroscienceTidbit | null = null;
        try {
          const totalCount = await getTotalCompletionCount(user.uid);
          const tidbitContext = buildTidbitContext(challenge, {
            totalCount,
            streakDays: updateResult.newStreak,
            difficulty,
            repeatMilestone,
            previousStreak: stats.currentStreak,
          });
          tidbit = await selectTidbitForCompletion(user.uid, tidbitContext);
          if (tidbit) {
            await recordTidbitShown(user.uid, tidbit.id);
          }
        } catch (err) {
          console.warn('Failed to fetch neuroscience tidbit:', err);
        }
        setPendingTidbit(tidbit);

        // Success — same celebration as completing a practice
        setCelebration({
          points: pointsEarned,
          streak: updateResult.newStreak,
          bonusLabel: repeatMilestone
            ? `${repeatMilestone}th time completing this challenge!`
            : null,
        });
      } else {
        // Failed — supportive reward moment, then the failure reflection modal
        const multiplier = getStreakMultiplier(stats.currentStreak);

        // Static, consistent message for the failed / "Not yet" moment.
        const messageText = 'Progress, not perfection.';

        let narrativeText = '';
        try {
          const totalCount = await getTotalCompletionCount(user.uid);
          if (totalCount === 1) {
            narrativeText = 'Challenge 1.';
          } else {
            const streakDays = updateResult.newStreak;
            narrativeText = streakDays >= 7
              ? `Day ${streakDays}`
              : `Challenge ${totalCount}.`;
          }
        } catch (err) {
          console.warn('Failed to compute narrative line:', err);
        }

        setRewardMessage(messageText);
        setNarrativeLine(narrativeText);
        setRewardPoints(pointsEarned);
        setRewardStreakMultiplier(multiplier);
        setRewardVisible(true);
      }
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
          title="Not Yet"
          onPress={() => setResult('failed')}
          variant={result === 'failed' ? 'primary' : 'outline'}
          style={styles.resultBtn}
        />
      </View>

      {/* Difficulty */}
      <DifficultySelector
        label="How hard was the override?"
        value={difficulty}
        onChange={setDifficulty}
      />

      {/* Failure Reflection */}
      {result === 'failed' && (
        <View style={styles.failureReflectionSection}>
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
            Optional — earns bonus XP
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
            <Text style={[styles.sectionLabel, { marginTop: 0, marginBottom: 0 }]}>Post-Challenge Reflection</Text>
          </View>
          <Text style={styles.journalSubtext}>Optional — earns bonus XP</Text>

          {journalEntry.trim() ? (
            <Card style={styles.reflectionReadback}>
              <Text style={styles.reflectionReadbackText}>{journalEntry}</Text>
              <TouchableOpacity
                style={styles.reflectionEditLink}
                onPress={() => setReflecting(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={16} color={Colors.primary} />
                <Text style={styles.reflectionEditText}>Edit reflection</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            <TouchableOpacity
              style={styles.reflectCta}
              onPress={() => setReflecting(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubbles-outline" size={22} color={Colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.reflectCtaTitle}>Reflect on your win</Text>
                <Text style={styles.reflectCtaSubtitle}>
                  One quick question — what did you notice your mind doing?
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={Colors.success} />
            </TouchableOpacity>
          )}
        </>
      )}

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

      </ScrollView>
      <HabitCelebrationModal
        visible={!!celebration}
        pointsEarned={celebration?.points ?? 0}
        streakDays={celebration?.streak ?? 0}
        bonusLabel={celebration?.bonusLabel}
        onDismiss={dismissCelebration}
      />
      <HabitTidbitModal
        visible={tidbitVisible}
        tidbit={pendingTidbit}
        onLearnMore={handleTidbitLearnMore}
        onDismiss={handleTidbitDismiss}
      />
      {pendingTidbit && (
        <TidbitLearnMore
          visible={learnMoreVisible}
          tidbit={pendingTidbit}
          onClose={handleLearnMoreClose}
        />
      )}
      <RewardMoment
        visible={rewardVisible}
        message={rewardMessage}
        narrativeLine={narrativeLine}
        pointsEarned={rewardPoints}
        streakMultiplier={rewardStreakMultiplier}
        challengeResult="failed"
        onDismiss={handleRewardDismiss}
      />
      <ChallengeFailureModal
        visible={failureModalVisible}
        challengeName={challenge.name}
        onComplete={handleFailureComplete}
        onDismiss={() => {
          setFailureModalVisible(false);
          proceedAfterReward();
        }}
      />
      <ChallengeReflectionFlow
        visible={reflecting}
        accentColor={Colors.success}
        initialText={reflectionText}
        initialTags={reflectionTags}
        onComplete={(note, text, tags) => {
          setJournalEntry(note);
          setReflectionText(text);
          setReflectionTags(tags);
          setReflecting(false);
        }}
        onCancel={() => setReflecting(false)}
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
  reflectCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.success + '10',
    borderWidth: 1.5,
    borderColor: Colors.success + '40',
    borderRadius: 14,
    padding: Spacing.md,
  },
  reflectCtaTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  reflectCtaSubtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },
  reflectionReadback: {
    backgroundColor: Colors.white,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  reflectionReadbackText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 22,
  },
  reflectionEditLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.sm,
  },
  reflectionEditText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
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
  // Inline prompts
  inlinePromptsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  inlinePromptsLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    flex: 1,
  },
  inlinePromptsList: {
    backgroundColor: Colors.primary + '08',
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
});
