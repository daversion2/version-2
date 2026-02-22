import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { getChallengeById, deleteChallenge, getChallengeRepeatStats } from '../../services/challenges';
import { canSubmitChallenge } from '../../services/submissions';
import { Challenge, ChallengeRepeatStats } from '../../types';
import { showConfirm, showAlert } from '../../utils/alert';

type Props = NativeStackScreenProps<any, 'ChallengeDetail'>;

export const ChallengeDetailScreen: React.FC<Props> = ({ route }) => {
  const { challengeId } = route.params as { challengeId: string };
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [submitReason, setSubmitReason] = useState<string | undefined>();
  const [repeatStats, setRepeatStats] = useState<ChallengeRepeatStats | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      (async () => {
        const c = await getChallengeById(user.uid, challengeId);
        setChallenge(c);
        if (c) {
          // category_id actually stores the category name, not ID
          setCategoryName(c.category_id || 'Uncategorized');

          // Fetch repeat stats for this challenge name
          const stats = await getChallengeRepeatStats(user.uid, c.name);
          setRepeatStats(stats);

          // Check if challenge can be submitted to library
          if (c.status === 'completed') {
            const eligibility = await canSubmitChallenge(user.uid, 0, challengeId);
            setCanSubmit(eligibility.canSubmit);
            setSubmitReason(eligibility.reason);
          }
        }
      })();
    }, [user, challengeId])
  );

  const handleDelete = () => {
    if (!user || !challenge) return;

    // Cannot delete active challenge
    if (challenge.status === 'active') {
      showAlert('Cannot Delete', 'You cannot delete an active challenge. Complete or fail it first.');
      return;
    }

    const pointsText = challenge.points_awarded
      ? `This will remove ${challenge.points_awarded} points from your Willpower Bank.`
      : '';

    showConfirm(
      'Delete Challenge',
      `Delete "${challenge.name}"? ${pointsText}`,
      async () => {
        setIsDeleting(true);
        try {
          const result = await deleteChallenge(user.uid, challengeId);
          showAlert(
            'Challenge Deleted',
            result.pointsRemoved > 0
              ? `Removed ${result.pointsRemoved} points from your Willpower Bank.`
              : 'Challenge has been deleted.',
            () => navigation.goBack()
          );
        } catch (error) {
          showAlert('Error', 'Failed to delete challenge. Please try again.');
          setIsDeleting(false);
        }
      },
      'Delete'
    );
  };

  if (!challenge) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Loading...</Text>
      </View>
    );
  }

  const statusColor = challenge.status === 'completed' ? Colors.success : Colors.fail;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.name}>{challenge.name}</Text>

      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: statusColor }]}>
          <Text style={styles.badgeText}>
            {challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1)}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{categoryName}</Text>
        </View>
      </View>

      {/* Repeat Stats */}
      {repeatStats && repeatStats.total_completions > 0 && (
        <Card style={styles.repeatStatsCard}>
          <View style={styles.repeatStatsRow}>
            <Text style={styles.repeatIcon}>🔄</Text>
            <View style={styles.repeatStatsContent}>
              <Text style={styles.repeatStatsTitle}>
                Completed {repeatStats.total_completions} time{repeatStats.total_completions !== 1 ? 's' : ''}
              </Text>
              {repeatStats.first_completed_at && repeatStats.last_completed_at && (
                <Text style={styles.repeatStatsDates}>
                  First: {repeatStats.first_completed_at.split('T')[0]} · Last: {repeatStats.last_completed_at.split('T')[0]}
                </Text>
              )}
            </View>
          </View>
        </Card>
      )}

      <Card style={styles.card}>
        <Row label="Date" value={challenge.date} />
        {challenge.completed_at && (
          <Row label="Completed" value={challenge.completed_at.split('T')[0]} />
        )}
        {challenge.deadline && (
          <Row label="Deadline" value={new Date(challenge.deadline).toLocaleDateString()} />
        )}
      </Card>

      <Card style={styles.card}>
        <Row label="Expected Difficulty" value={`${challenge.difficulty_expected} / 5`} />
        {challenge.difficulty_actual != null && (
          <Row label="Actual Difficulty" value={`${challenge.difficulty_actual} / 5`} />
        )}
        {challenge.points_awarded != null && (
          <Row label="Points Awarded" value={`${challenge.points_awarded}`} />
        )}
      </Card>

      {challenge.description ? (
        <Card style={styles.card}>
          <Text style={styles.fieldLabel}>Description</Text>
          <Text style={styles.fieldValue}>{challenge.description}</Text>
        </Card>
      ) : null}

      {challenge.success_criteria ? (
        <Card style={styles.card}>
          <Text style={styles.fieldLabel}>Success Criteria</Text>
          <Text style={styles.fieldValue}>{challenge.success_criteria}</Text>
        </Card>
      ) : null}

      {challenge.why ? (
        <Card style={styles.card}>
          <Text style={styles.fieldLabel}>Why It Matters</Text>
          <Text style={styles.fieldValue}>{challenge.why}</Text>
        </Card>
      ) : null}

      {challenge.reflection_note ? (
        <Card style={styles.card}>
          <Text style={styles.fieldLabel}>Post-Challenge Journaling</Text>
          <Text style={styles.fieldValue}>{challenge.reflection_note}</Text>
        </Card>
      ) : null}

      {(challenge.reflection_hardest_moment || challenge.reflection_push_through || challenge.reflection_next_time) ? (
        <Card style={styles.card}>
          <Text style={styles.fieldLabel}>Post-Challenge Reflection</Text>
          {challenge.reflection_hardest_moment ? (
            <View style={styles.reflectionItem}>
              <Text style={styles.reflectionQuestion}>What was the hardest moment, and what were you telling yourself then?</Text>
              <Text style={styles.fieldValue}>{challenge.reflection_hardest_moment}</Text>
            </View>
          ) : null}
          {challenge.reflection_push_through ? (
            <View style={styles.reflectionItem}>
              <Text style={styles.reflectionQuestion}>What helped you push through — or what would have helped?</Text>
              <Text style={styles.fieldValue}>{challenge.reflection_push_through}</Text>
            </View>
          ) : null}
          {challenge.reflection_next_time ? (
            <View style={styles.reflectionItem}>
              <Text style={styles.reflectionQuestion}>What's one rule or adjustment you'll apply next time?</Text>
              <Text style={styles.fieldValue}>{challenge.reflection_next_time}</Text>
            </View>
          ) : null}
        </Card>
      ) : null}

      {/* Submit to Library - only for completed challenges */}
      {challenge.status === 'completed' && (
        <View style={styles.submitSection}>
          {canSubmit ? (
            <Button
              title="Submit to Library"
              variant="secondary"
              onPress={() => navigation.navigate('SubmitChallenge', { challengeId })}
              style={styles.submitButton}
            />
          ) : submitReason ? (
            <Text style={styles.submitReasonText}>{submitReason}</Text>
          ) : null}
        </View>
      )}

      {challenge.status !== 'active' && (
        <Button
          title="Delete Challenge"
          variant="outline"
          onPress={handleDelete}
          loading={isDeleting}
          disabled={isDeleting}
          style={styles.deleteButton}
        />
      )}
    </ScrollView>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.gray },
  name: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  badgeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  repeatStatsCard: {
    marginBottom: Spacing.lg,
    backgroundColor: Colors.white,
  },
  repeatStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  repeatIcon: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  repeatStatsContent: {
    flex: 1,
  },
  repeatStatsTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  repeatStatsDates: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },
  badge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  badgeText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.white },
  card: { marginBottom: Spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLabel: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray },
  rowValue: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.dark },
  fieldLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  fieldValue: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
  },
  reflectionItem: {
    marginBottom: Spacing.sm,
  },
  reflectionQuestion: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    color: Colors.dark,
    marginBottom: 2,
  },
  submitSection: {
    marginTop: Spacing.lg,
  },
  submitButton: {
    marginBottom: Spacing.sm,
  },
  submitReasonText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  deleteButton: {
    marginTop: Spacing.lg,
    borderColor: Colors.fail,
  },
});
