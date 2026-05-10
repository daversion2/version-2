import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { DifficultySelector } from '../../components/common/DifficultySelector';
import { InputField } from '../../components/common/InputField';
import { useAuth } from '../../context/AuthContext';
import { completeChallenge, saveReflectionAnswers, cancelChallenge, getChallengeRepeatStats, getRepeatMilestone, getTotalCompletionCount } from '../../services/challenges';
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
import { Challenge, BuddyChallenge, Goal, GoalFollowThrough } from '../../types';
import { onBuddyChallengeUserComplete } from '../../services/buddyChallenge';
import { getGoalById, computeGoalFollowThrough } from '../../services/goals';
import { showAlert } from '../../utils/alert';
import { CountdownTimer } from '../../components/challenge/CountdownTimer';
import { useWalkthrough, WALKTHROUGH_STEPS } from '../../context/WalkthroughContext';
import { getUserTeam, logTeamActivity } from '../../services/teams';
import { createFeedEntry, createMilestoneFeedEntry, updateFeedEntryMessage } from '../../services/inspirationFeed';
import { getUser } from '../../services/users';
import { getCategoryByName } from '../../services/categories';
import { WalkthroughOverlay } from '../../components/walkthrough/WalkthroughOverlay';
import { LevelUpPopup } from '../../components/common/LevelUpPopup';
import { RewardMoment } from '../../components/reward/RewardMoment';
import { TidbitLearnMore } from '../../components/reward/TidbitLearnMore';
import { getPersonalizedRewardMessage } from '../../services/userRewardMessages';
import {
  selectTidbitForCompletion,
  recordTidbitShown,
  recordLearnMoreTap,
  buildTidbitContext,
} from '../../services/neuroscienceTidbits';
import { NeuroscienceTidbit } from '../../types';
import { triggerMilestoneHaptic } from '../../utils/haptics';

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
  // Reward moment state
  const [rewardVisible, setRewardVisible] = useState(false);
  const [rewardMessage, setRewardMessage] = useState('');
  const [narrativeLine, setNarrativeLine] = useState('');
  const [rewardPoints, setRewardPoints] = useState(0);
  const [rewardStreakMultiplier, setRewardStreakMultiplier] = useState(1);
  const [rewardBuddyBonus, setRewardBuddyBonus] = useState(0);
  const [rewardResult, setRewardResult] = useState<'completed' | 'failed'>('completed');
  const [rewardRepeatMilestone, setRewardRepeatMilestone] = useState<number | null>(null);
  const [rewardTidbit, setRewardTidbit] = useState<NeuroscienceTidbit | null>(null);
  const [learnMoreVisible, setLearnMoreVisible] = useState(false);
  const [learnMoreTidbit, setLearnMoreTidbit] = useState<NeuroscienceTidbit | null>(null);

  // Milestone alerts (fire after reward moment)
  const [levelUpVisible, setLevelUpVisible] = useState(false);
  const [levelUpLevel, setLevelUpLevel] = useState(0);
  const [levelUpTitle, setLevelUpTitle] = useState('');
  const [pendingLevelUp, setPendingLevelUp] = useState<{ level: number; title: string } | null>(null);
  const [pendingStreakTier, setPendingStreakTier] = useState<{ streak: number; tierName: string; multiplier: number } | null>(null);

  const [feedEntryId, setFeedEntryId] = useState<string | null>(null);
  const feedEntryIdRef = useRef<string | null>(null);
  const [showMessagePrompt, setShowMessagePrompt] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');

  // Goal context for the banner + CBT data
  const [goalContext, setGoalContext] = useState<{ name: string; ft: GoalFollowThrough } | null>(null);
  const [goalCBT, setGoalCBT] = useState<Goal | null>(null);
  const [promptsExpanded, setPromptsExpanded] = useState(false);
  const [selectedTrigger, setSelectedTrigger] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !challenge.goal_ids?.length) return;
    const goalId = challenge.goal_ids[0];
    (async () => {
      try {
        const [goal, ft] = await Promise.all([
          getGoalById(user.uid, goalId),
          computeGoalFollowThrough(user.uid, goalId),
        ]);
        if (goal) {
          setGoalContext({ name: goal.name, ft });
          setGoalCBT(goal);
        }
      } catch (err) {
        console.warn('Failed to load goal context:', err);
      }
    })();
  }, [user, challenge.goal_ids]);

  // Navigate home, or show the message prompt first if a feed entry was created
  // Uses ref instead of state to avoid stale closure when called from pending alert callbacks
  const navigateHome = useCallback(() => {
    if (feedEntryIdRef.current) {
      setShowMessagePrompt(true);
    } else {
      navigation.popToTop();
    }
  }, [navigation]);

  const handleShareMessage = useCallback(async () => {
    const currentEntryId = feedEntryIdRef.current;
    if (currentEntryId && completionMessage.trim()) {
      try {
        await updateFeedEntryMessage(currentEntryId, completionMessage);
      } catch (err) {
        console.warn('Failed to save completion message:', err);
      }
    }
    setShowMessagePrompt(false);
    navigation.popToTop();
  }, [completionMessage, navigation]);

  const handleSkipMessage = useCallback(() => {
    setShowMessagePrompt(false);
    navigation.popToTop();
  }, [navigation]);

  const handleRewardDismiss = useCallback(() => {
    setRewardVisible(false);

    // Fire milestone alerts in sequence after reward moment
    if (pendingLevelUp) {
      triggerMilestoneHaptic();
      setLevelUpLevel(pendingLevelUp.level);
      setLevelUpTitle(pendingLevelUp.title);
      setLevelUpVisible(true);
      return;
    }

    if (pendingStreakTier) {
      triggerMilestoneHaptic();
      showAlert(
        'Streak Milestone!',
        `${pendingStreakTier.streak}-Day Streak: ${pendingStreakTier.tierName}!\n\nYou're now earning ${pendingStreakTier.multiplier}x points on all activities!`,
        () => navigateHome()
      );
      setPendingStreakTier(null);
      return;
    }

    navigateHome();
  }, [pendingLevelUp, pendingStreakTier, navigateHome]);

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
              feedEntryIdRef.current = entryId;
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

      // --- Prepare reward moment ---
      const multiplier = getStreakMultiplier(stats.currentStreak);

      // Fetch personalized reward message (user pool → global fallback → hardcoded)
      let messageText = 'One more proof point.';
      try {
        const msg = await getPersonalizedRewardMessage(user!.uid);
        messageText = msg.text;
      } catch (err) {
        console.warn('Failed to fetch reward message:', err);
      }

      // Compute narrative line — goal-centric framing + CBT identity/inner voice
      let narrativeText = '';
      let totalCount = 0;
      try {
        totalCount = await getTotalCompletionCount(user.uid);
        // Use goal context if available for identity-framing
        if (goalContext) {
          const kept = goalContext.ft.keptCommitments + 1; // +1 for this completion
          const total = goalContext.ft.totalCommitments + 1;
          narrativeText = `${goalContext.name}: ${kept}/${total} commitments kept. You're building proof.`;
        } else if (totalCount === 1) {
          narrativeText = 'Challenge 1. The first of many.';
        } else {
          const streakDays = updateResult.newStreak;
          narrativeText = streakDays >= 7
            ? `Day ${streakDays} of doing hard things.`
            : `Challenge ${totalCount}. Still here.`;
        }

        // 2A: Identity statement on milestone completions
        if (repeatMilestone && goalCBT?.identity_statement) {
          narrativeText = `You said you're becoming "${goalCBT.identity_statement}." Today is evidence.`;
        }
        // 2B: Inner voice victory on hard challenges (difficulty >= 4)
        else if (result === 'completed' && difficulty >= 4 && goalCBT?.inner_voice_challenge) {
          narrativeText = `Your inner voice said: "${goalCBT.inner_voice_challenge}." You did it anyway.`;
        }
      } catch (err) {
        console.warn('Failed to compute narrative line:', err);
      }

      // Fetch neuroscience tidbit (success only)
      let tidbit: NeuroscienceTidbit | null = null;
      if (result === 'completed') {
        try {
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
      }
      setRewardTidbit(tidbit);

      // Store pending milestones for after reward moment
      if (updateResult.newLevelReached && updateResult.levelInfo) {
        setPendingLevelUp({ level: updateResult.levelInfo.level, title: updateResult.levelInfo.title });
      }
      if (updateResult.newTierReached && updateResult.tierInfo) {
        setPendingStreakTier({
          streak: updateResult.newStreak,
          tierName: updateResult.tierInfo.tierName,
          multiplier: updateResult.tierInfo.multiplier,
        });
      }

      // Show buddy alert first if applicable
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

      // Show unified reward moment
      setRewardMessage(messageText);
      setNarrativeLine(narrativeText);
      setRewardPoints(pointsEarned + buddyBonusPoints);
      setRewardStreakMultiplier(multiplier);
      setRewardBuddyBonus(buddyBonusPoints);
      setRewardResult(result);
      setRewardRepeatMilestone(repeatMilestone);
      setRewardVisible(true);
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

      {/* Failure Reflection - CBT-enhanced with inner voice, recovery plan, triggers */}
      {result === 'failed' && (
        <View style={styles.failureReflectionSection}>
          {/* Inner Voice Pair — core CBT cognitive restructuring */}
          {goalCBT?.inner_voice_challenge && goalCBT?.inner_voice_response && (
            <Card style={styles.cbtCard}>
              <View style={styles.cbtCardHeader}>
                <Ionicons name="chatbubbles-outline" size={18} color={Colors.primary} />
                <Text style={styles.cbtCardTitle}>Your Inner Voice</Text>
              </View>
              <Text style={styles.cbtQuoteText}>
                Your inner voice predicted: "{goalCBT.inner_voice_challenge}"
              </Text>
              <Text style={styles.cbtResponseText}>
                You already have the answer: "{goalCBT.inner_voice_response}"
              </Text>
            </Card>
          )}

          {/* Recovery Plan — relapse prevention */}
          {goalCBT?.recovery_plan && (
            <Card style={styles.cbtCard}>
              <View style={styles.cbtCardHeader}>
                <Ionicons name="refresh-outline" size={18} color={Colors.secondary} />
                <Text style={styles.cbtCardTitle}>Your Recovery Plan</Text>
              </View>
              <Text style={styles.cbtFramingText}>
                Missing a day is data, not failure. You planned for this:
              </Text>
              <Text style={styles.cbtPlanText}>"{goalCBT.recovery_plan}"</Text>
            </Card>
          )}

          {/* Minimum Action reminder */}
          {goalCBT?.minimum_action && (
            <Card style={styles.cbtMinActionCard}>
              <Text style={styles.cbtMinActionLabel}>Your worst-day win:</Text>
              <Text style={styles.cbtMinActionText}>"{goalCBT.minimum_action}"</Text>
              <Text style={styles.cbtMinActionCta}>Can you do just that today?</Text>
            </Card>
          )}

          {/* Trigger Identification — replaces generic "What got in the way?" */}
          <Text style={styles.sectionLabel}>What got in the way?</Text>
          {goalCBT?.triggers && goalCBT.triggers.length > 0 ? (
            <>
              <Text style={styles.reflectionSubtext}>
                Was it one of your known triggers?
              </Text>
              <View style={styles.triggerChipsRow}>
                {goalCBT.triggers.map((trigger, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.triggerChip,
                      selectedTrigger === trigger && styles.triggerChipSelected,
                    ]}
                    onPress={() => setSelectedTrigger(selectedTrigger === trigger ? null : trigger)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.triggerChipText,
                      selectedTrigger === trigger && styles.triggerChipTextSelected,
                    ]}>
                      {trigger}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    styles.triggerChip,
                    selectedTrigger === '__other' && styles.triggerChipSelected,
                  ]}
                  onPress={() => setSelectedTrigger(selectedTrigger === '__other' ? null : '__other')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.triggerChipText,
                    selectedTrigger === '__other' && styles.triggerChipTextSelected,
                  ]}>
                    Something else
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Show the user's planned substitute for the selected trigger */}
              {selectedTrigger && selectedTrigger !== '__other' && goalCBT.trigger_substitutes && (
                <View style={styles.substituteHint}>
                  <Ionicons name="bulb-outline" size={14} color={Colors.primary} />
                  <Text style={styles.substituteHintText}>
                    Your planned response: "{goalCBT.trigger_substitutes[goalCBT.triggers.indexOf(selectedTrigger)] || goalCBT.trigger_substitutes[0]}"
                  </Text>
                </View>
              )}
            </>
          ) : (
            <Text style={styles.reflectionSubtext}>
              Understanding obstacles helps you overcome them next time.
            </Text>
          )}

          <InputField
            label=""
            value={failureReflection}
            onChangeText={setFailureReflection}
            placeholder={selectedTrigger && selectedTrigger !== '__other'
              ? "What happened? Did your planned response work?"
              : "I got distracted by..."}
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
          </View>
          <Text style={styles.journalSubtext}>Optional — earns bonus points</Text>

          {/* Inline prompts (collapsed by default) */}
          <TouchableOpacity
            style={styles.inlinePromptsToggle}
            onPress={() => setPromptsExpanded(!promptsExpanded)}
            activeOpacity={0.7}
          >
            <Ionicons name="bulb-outline" size={16} color={Colors.primary} />
            <Text style={styles.inlinePromptsLabel}>Need inspiration?</Text>
            <Ionicons
              name={promptsExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={Colors.primary}
            />
          </TouchableOpacity>
          {promptsExpanded && (
            <View style={styles.inlinePromptsList}>
              <Text style={styles.promptItem}>• What was the hardest moment, and what were you telling yourself then?</Text>
              <Text style={styles.promptItem}>• What helped you push through — or what would have helped?</Text>
              <Text style={styles.promptItem}>• What's one rule or adjustment you'll apply next time?</Text>
              <Text style={styles.promptItem}>• How do you feel now compared to before?</Text>
            </View>
          )}

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

      {/* Goal Context Banner */}
      {goalContext && (
        <Card style={styles.goalContextBanner}>
          <View style={styles.goalContextRow}>
            <Ionicons name="flag" size={18} color={Colors.primary} />
            <View style={styles.goalContextInfo}>
              <Text style={styles.goalContextTitle}>
                This counts toward {goalContext.name}
              </Text>
              <Text style={styles.goalContextStats}>
                {goalContext.ft.keptCommitments}/{goalContext.ft.totalCommitments} commitments kept
                {goalContext.ft.totalCommitments > 0 &&
                  ` (${Math.round(goalContext.ft.followThroughRate * 100)}%)`}
              </Text>
            </View>
          </View>
        </Card>
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
      <RewardMoment
        visible={rewardVisible}
        message={rewardMessage}
        narrativeLine={narrativeLine}
        pointsEarned={rewardPoints}
        streakMultiplier={rewardStreakMultiplier}
        buddyBonusPoints={rewardBuddyBonus > 0 ? rewardBuddyBonus : undefined}
        challengeResult={rewardResult}
        repeatMilestone={rewardRepeatMilestone}
        tidbit={rewardResult === 'completed' ? rewardTidbit : null}
        onLearnMore={(t) => {
          setLearnMoreTidbit(t);
          setLearnMoreVisible(true);
          recordLearnMoreTap(user!.uid, t.id).catch(console.warn);
        }}
        onDismiss={handleRewardDismiss}
      />
      {learnMoreTidbit && (
        <TidbitLearnMore
          visible={learnMoreVisible}
          tidbit={learnMoreTidbit}
          onClose={() => setLearnMoreVisible(false)}
        />
      )}
      <LevelUpPopup
        visible={levelUpVisible}
        level={levelUpLevel}
        title={levelUpTitle}
        onContinue={() => {
          setLevelUpVisible(false);
          if (pendingStreakTier) {
            triggerMilestoneHaptic();
            showAlert(
              'Streak Milestone!',
              `${pendingStreakTier.streak}-Day Streak: ${pendingStreakTier.tierName}!\n\nYou're now earning ${pendingStreakTier.multiplier}x points on all activities!`,
              () => navigateHome()
            );
            setPendingStreakTier(null);
          } else {
            navigateHome();
          }
        }}
      />

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
  // CBT failure flow styles
  cbtCard: {
    backgroundColor: Colors.primary + '08',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    marginBottom: Spacing.md,
  },
  cbtCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  cbtCardTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  cbtQuoteText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  cbtResponseText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    lineHeight: 20,
  },
  cbtFramingText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  cbtPlanText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  cbtMinActionCard: {
    backgroundColor: Colors.secondary + '10',
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  cbtMinActionLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  cbtMinActionText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  cbtMinActionCta: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
  },
  triggerChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  triggerChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  triggerChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  triggerChipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  triggerChipTextSelected: {
    color: Colors.primary,
    fontFamily: Fonts.secondaryBold,
  },
  substituteHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: Colors.primary + '08',
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  substituteHintText: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  // Goal context banner
  goalContextBanner: {
    backgroundColor: Colors.primary + '10',
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    marginTop: Spacing.md,
  },
  goalContextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  goalContextInfo: {
    flex: 1,
  },
  goalContextTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  goalContextStats: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.primary,
    marginTop: 2,
  },
});
