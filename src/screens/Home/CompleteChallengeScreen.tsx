import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { DifficultySelector } from '../../components/common/DifficultySelector';
import { InputField } from '../../components/common/InputField';
import { useAuth } from '../../context/AuthContext';
import { completeChallenge, saveReflectionAnswers } from '../../services/challenges';
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

type Props = NativeStackScreenProps<any, 'CompleteChallenge'>;

export const CompleteChallengeScreen: React.FC<Props> = ({ route, navigation }) => {
  const { user } = useAuth();
  const challenge = route.params?.challenge as Challenge;
  const { isWalkthroughActive, currentStep, currentStepConfig, nextStep, skipWalkthrough } = useWalkthrough();
  const isMyStep = isWalkthroughActive && currentStepConfig?.screen === 'CompleteChallenge';

  const [result, setResult] = useState<'completed' | 'failed' | null>(null);
  const [difficulty, setDifficulty] = useState(3);
  const [reflectionHardest, setReflectionHardest] = useState('');
  const [reflectionPush, setReflectionPush] = useState('');
  const [reflectionNextTime, setReflectionNextTime] = useState('');
  const [loading, setLoading] = useState(false);

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
      const answers: Record<string, string> = {};
      if (reflectionHardest.trim()) answers.reflection_hardest_moment = reflectionHardest.trim();
      if (reflectionPush.trim()) answers.reflection_push_through = reflectionPush.trim();
      if (reflectionNextTime.trim()) answers.reflection_next_time = reflectionNextTime.trim();
      if (Object.keys(answers).length > 0) {
        await saveReflectionAnswers(user.uid, challenge.id, answers);
      }

      // Calculate and award willpower points
      const hasReflection = Object.keys(answers).length > 0;
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

      // Show streak milestone pop-up first if new tier reached
      if (updateResult.newTierReached && updateResult.tierInfo) {
        showAlert(
          'Streak Milestone!',
          `${updateResult.newStreak}-Day Streak: ${updateResult.tierInfo.tierName}!\n\nYou're now earning ${updateResult.tierInfo.multiplier}x points on all activities!`,
          () => {
            showAlert(
              result === 'completed' ? 'Challenge Complete' : 'Challenge Logged',
              pointsMessage,
              () => navigation.popToTop()
            );
          }
        );
      } else {
        showAlert(
          result === 'completed' ? 'Challenge Complete' : 'Challenge Logged',
          pointsMessage,
          () => navigation.popToTop()
        );
      }
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
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

      {/* Reflection */}
      <Text style={styles.sectionLabel}>Reflection (optional)</Text>
      <InputField
        label="What was the hardest moment, and what were you telling yourself then?"
        value={reflectionHardest}
        onChangeText={setReflectionHardest}
        placeholder="Your thoughts..."
        multiline
        numberOfLines={3}
      />
      <InputField
        label="What helped you push through — or what would have helped?"
        value={reflectionPush}
        onChangeText={setReflectionPush}
        placeholder="Your thoughts..."
        multiline
        numberOfLines={3}
      />
      <InputField
        label="What's one rule or adjustment you'll apply next time?"
        value={reflectionNextTime}
        onChangeText={setReflectionNextTime}
        placeholder="Your thoughts..."
        multiline
        numberOfLines={3}
      />

      <Button
        title="Submit"
        onPress={handleSubmit}
        loading={loading}
        disabled={!result}
        style={{ marginTop: Spacing.md }}
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
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
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
});
