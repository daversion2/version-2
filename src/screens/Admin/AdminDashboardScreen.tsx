import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { getUserStats, getLibraryStats } from '../../services/admin';
import { getSubmissionStats, getPendingSubmissions } from '../../services/submissions';
import { ChallengeSubmission } from '../../types';

export const AdminDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userStats, setUserStats] = useState<{
    total: number;
    active7d: number;
    active30d: number;
  } | null>(null);
  const [libraryStats, setLibraryStats] = useState<{
    totalChallenges: number;
    byCategory: Record<string, number>;
    byBarrierType: Record<string, number>;
  } | null>(null);
  const [submissionStats, setSubmissionStats] = useState<{
    pending: number;
    approved: number;
    rejected: number;
    withdrawn: number;
    approvalRate: number;
  } | null>(null);
  const [recentSubmissions, setRecentSubmissions] = useState<ChallengeSubmission[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [users, library, submissions, pending] = await Promise.all([
        getUserStats(),
        getLibraryStats(),
        getSubmissionStats(),
        getPendingSubmissions(),
      ]);
      setUserStats(users);
      setLibraryStats(library);
      setSubmissionStats(submissions);
      setRecentSubmissions(pending.slice(0, 3)); // Show first 3
    } catch (error) {
      console.error('Error loading admin dashboard:', error);
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
      {/* User Stats */}
      <Text style={styles.sectionTitle}>Users</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{userStats?.total || 0}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: Colors.primary }]}>
            {userStats?.active7d || 0}
          </Text>
          <Text style={styles.statLabel}>Active 7d</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{userStats?.active30d || 0}</Text>
          <Text style={styles.statLabel}>Active 30d</Text>
        </View>
      </View>

      {/* Library Stats */}
      <Text style={styles.sectionTitle}>Challenge Library</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{libraryStats?.totalChallenges || 0}</Text>
          <Text style={styles.statLabel}>Challenges</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {Object.keys(libraryStats?.byCategory || {}).length}
          </Text>
          <Text style={styles.statLabel}>Categories</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {Object.keys(libraryStats?.byBarrierType || {}).length}
          </Text>
          <Text style={styles.statLabel}>Barriers</Text>
        </View>
      </View>

      {/* Submission Stats */}
      <Text style={styles.sectionTitle}>Submissions</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: Colors.secondary }]}>
            {submissionStats?.pending || 0}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: Colors.primary }]}>
            {submissionStats?.approved || 0}
          </Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {submissionStats?.approvalRate?.toFixed(0) || 0}%
          </Text>
          <Text style={styles.statLabel}>Rate</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('AdminChallengeEdit', { mode: 'create' })}
        >
          <Ionicons name="add-circle" size={32} color={Colors.primary} />
          <Text style={styles.actionText}>Add Challenge</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('AdminFunFactEdit', { mode: 'create' })}
        >
          <Ionicons name="bulb" size={32} color={Colors.primary} />
          <Text style={styles.actionText}>Add Fun Fact</Text>
        </TouchableOpacity>
      </View>

      {/* Management Links */}
      <Text style={styles.sectionTitle}>Manage</Text>
      <Card
        style={styles.linkCard}
        onPress={() => navigation.navigate('AdminChallenges')}
      >
        <View style={styles.linkRow}>
          <Ionicons name="library" size={24} color={Colors.primary} />
          <Text style={styles.linkText}>Challenge Library</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
        </View>
      </Card>
      <Card
        style={styles.linkCard}
        onPress={() => navigation.navigate('AdminSubmissions')}
      >
        <View style={styles.linkRow}>
          <Ionicons name="document-text" size={24} color={Colors.primary} />
          <Text style={styles.linkText}>Review Submissions</Text>
          {(submissionStats?.pending || 0) > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{submissionStats?.pending}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
        </View>
      </Card>
      <Card
        style={styles.linkCard}
        onPress={() => navigation.navigate('AdminFunFacts')}
      >
        <View style={styles.linkRow}>
          <Ionicons name="sparkles" size={24} color={Colors.primary} />
          <Text style={styles.linkText}>Fun Facts</Text>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
        </View>
      </Card>

      {/* Recent Submissions */}
      {recentSubmissions.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Recent Submissions</Text>
          {recentSubmissions.map((sub) => (
            <Card key={sub.id} style={styles.submissionPreview}>
              <View style={styles.submissionRow}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{sub.category_name}</Text>
                </View>
                <Text style={styles.submissionName} numberOfLines={1}>
                  {sub.name}
                </Text>
              </View>
            </Card>
          ))}
        </>
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
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
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
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginTop: Spacing.sm,
  },
  linkCard: {
    marginBottom: Spacing.sm,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  linkText: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  badge: {
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginRight: Spacing.sm,
  },
  badgeText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },
  submissionPreview: {
    marginBottom: Spacing.sm,
  },
  submissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  categoryBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },
  submissionName: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
});
