import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { getUserSubmissions, withdrawSubmission } from '../../services/submissions';
import { ChallengeSubmission, SubmissionStatus } from '../../types';
import { showAlert, showConfirm } from '../../utils/alert';

const STATUS_CONFIG: Record<
  SubmissionStatus,
  { icon: string; color: string; label: string }
> = {
  pending: { icon: 'time', color: Colors.secondary, label: 'Pending Review' },
  approved: { icon: 'checkmark-circle', color: Colors.primary, label: 'Approved' },
  rejected: { icon: 'close-circle', color: '#9B2C2C', label: 'Not Approved' },
  withdrawn: { icon: 'arrow-undo', color: Colors.gray, label: 'Withdrawn' },
};

export const MySubmissionsScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([]);

  const loadSubmissions = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getUserSubmissions(user.uid);
      setSubmissions(data);
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadSubmissions();
    }, [loadSubmissions])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadSubmissions();
  };

  const handleWithdraw = (submission: ChallengeSubmission) => {
    showConfirm(
      'Withdraw Submission',
      'Are you sure you want to withdraw this submission?',
      async () => {
        try {
          await withdrawSubmission(submission.id, user!.uid);
          showAlert('Withdrawn', 'Your submission has been withdrawn.');
          loadSubmissions();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to withdraw');
        }
      }
    );
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderSubmission = ({ item }: { item: ChallengeSubmission }) => {
    const config = STATUS_CONFIG[item.status];

    return (
      <Card style={styles.submissionCard}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: config.color + '15' }]}>
              <Ionicons name={config.icon as any} size={14} color={config.color} />
              <Text style={[styles.statusText, { color: config.color }]}>
                {config.label}
              </Text>
            </View>
          </View>
          <Text style={styles.date}>Submitted {formatDate(item.submitted_at)}</Text>
        </View>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue}>{item.category_name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Difficulty</Text>
            <Text style={styles.detailValue}>{item.difficulty_suggested}/5</Text>
          </View>
        </View>

        {item.status === 'rejected' && item.rejection_reason && (
          <View style={styles.rejectionBox}>
            <Text style={styles.rejectionLabel}>Feedback:</Text>
            <Text style={styles.rejectionText}>{item.rejection_reason}</Text>
          </View>
        )}

        {item.status === 'pending' && (
          <Button
            title="Withdraw"
            onPress={() => handleWithdraw(item)}
            variant="outline"
            style={styles.withdrawButton}
          />
        )}
      </Card>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-outline" size={80} color={Colors.gray} />
      <Text style={styles.emptyTitle}>No Submissions Yet</Text>
      <Text style={styles.emptyDesc}>
        Complete a challenge you've created, then submit it to the library for
        others to try.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={submissions}
        keyExtractor={(item) => item.id}
        renderItem={renderSubmission}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  submissionCard: {
    marginBottom: Spacing.md,
  },
  header: {
    marginBottom: Spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  name: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    flex: 1,
    marginRight: Spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    marginLeft: 4,
  },
  date: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  details: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  detailLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  detailValue: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  rejectionBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  rejectionLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: '#9B2C2C',
    marginBottom: 4,
  },
  rejectionText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: '#9B2C2C',
    lineHeight: 18,
  },
  withdrawButton: {
    marginTop: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 24,
  },
});
