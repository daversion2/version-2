import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import {
  getPendingSubmissions,
  approveSubmission,
  rejectSubmission,
  getSubmissionStats,
} from '../../services/submissions';
import { ChallengeSubmission } from '../../types';

export const AdminSubmissionsScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([]);
  const [stats, setStats] = useState<{
    pending: number;
    approved: number;
    rejected: number;
    withdrawn: number;
    approvalRate: number;
  } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [pendingSubmissions, submissionStats] = await Promise.all([
        getPendingSubmissions(),
        getSubmissionStats(),
      ]);
      setSubmissions(pendingSubmissions);
      setStats(submissionStats);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleApprove = async (submission: ChallengeSubmission) => {
    if (!user) return;

    Alert.alert(
      'Approve Submission',
      `Approve "${submission.name}" and add it to the challenge library?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            setProcessingId(submission.id);
            try {
              await approveSubmission(submission.id, user.uid);
              setSubmissions((prev) => prev.filter((s) => s.id !== submission.id));
              if (stats) {
                setStats({
                  ...stats,
                  pending: stats.pending - 1,
                  approved: stats.approved + 1,
                });
              }
              Alert.alert('Approved', 'Challenge has been added to the library.');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = async (submission: ChallengeSubmission) => {
    if (!user) return;

    Alert.prompt(
      'Reject Submission',
      'Optionally provide a reason for rejection:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason?: string) => {
            setProcessingId(submission.id);
            try {
              await rejectSubmission(submission.id, user.uid, reason);
              setSubmissions((prev) => prev.filter((s) => s.id !== submission.id));
              if (stats) {
                setStats({
                  ...stats,
                  pending: stats.pending - 1,
                  rejected: stats.rejected + 1,
                });
              }
              Alert.alert('Rejected', 'Submission has been rejected.');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Stats Overview */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.primary }]}>
              {stats.approved}
            </Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: Colors.secondary }]}>
              {stats.rejected}
            </Text>
            <Text style={styles.statLabel}>Rejected</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.approvalRate.toFixed(0)}%</Text>
            <Text style={styles.statLabel}>Rate</Text>
          </View>
        </View>
      )}

      {/* Pending Submissions */}
      <Text style={styles.sectionTitle}>Pending Submissions</Text>

      {submissions.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Ionicons name="checkmark-circle-outline" size={48} color={Colors.gray} />
          <Text style={styles.emptyText}>No pending submissions</Text>
        </Card>
      ) : (
        submissions.map((submission) => (
          <Card key={submission.id} style={styles.submissionCard}>
            <View style={styles.submissionHeader}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{submission.category_name}</Text>
              </View>
              <Text style={styles.dateText}>
                {formatDate(submission.submitted_at)}
              </Text>
            </View>

            <Text style={styles.submissionName}>{submission.name}</Text>
            <Text style={styles.submissionDesc}>{submission.description}</Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                Difficulty: {submission.difficulty_suggested}/5
              </Text>
              <Text style={styles.metaText}>
                Level {submission.user_level} user
              </Text>
            </View>

            {submission.success_criteria && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Success Criteria:</Text>
                <Text style={styles.detailText}>{submission.success_criteria}</Text>
              </View>
            )}

            {submission.tips && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Tips:</Text>
                <Text style={styles.detailText}>{submission.tips}</Text>
              </View>
            )}

            {submission.variations && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Variations:</Text>
                <Text style={styles.detailText}>{submission.variations}</Text>
              </View>
            )}

            <View style={styles.actionRow}>
              <Button
                title="Reject"
                onPress={() => handleReject(submission)}
                variant="outline"
                style={styles.actionButton}
                disabled={processingId === submission.id}
              />
              <Button
                title="Approve"
                onPress={() => handleApprove(submission)}
                variant="primary"
                style={styles.actionButton}
                loading={processingId === submission.id}
                disabled={processingId === submission.id}
              />
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
  },
  statLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    marginTop: Spacing.sm,
  },
  submissionCard: {
    marginBottom: Spacing.md,
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  dateText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  submissionName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  submissionDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  metaText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  detailSection: {
    backgroundColor: Colors.lightGray,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  detailLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: 4,
  },
  detailText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
