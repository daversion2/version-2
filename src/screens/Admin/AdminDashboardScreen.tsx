import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { getUserStats, getLibraryStats } from '../../services/admin';
import { getSubmissionStats, getPendingSubmissions } from '../../services/submissions';
import { reseedPrograms } from '../../utils/seedPrograms';
import { seedRewardMessages } from '../../utils/seedRewardMessages';
import { seedNeuroscienceTidbits } from '../../utils/seedTidbits';
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
  const [reseeding, setReseeding] = useState(false);
  const [seedingMessages, setSeedingMessages] = useState(false);
  const [seedingTidbits, setSeedingTidbits] = useState(false);

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

  const handleReseedPrograms = () => {
    Alert.alert(
      'Reseed Programs',
      'This will clear all programs in Firestore and re-seed them from the latest seed data. User enrollments will not be affected. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reseed',
          style: 'destructive',
          onPress: async () => {
            setReseeding(true);
            try {
              await reseedPrograms();
              Alert.alert('Success', 'Programs have been reseeded successfully.');
            } catch (error) {
              console.error('Error reseeding programs:', error);
              Alert.alert('Error', 'Failed to reseed programs. Check the console for details.');
            } finally {
              setReseeding(false);
            }
          },
        },
      ]
    );
  };

  const handleSeedRewardMessages = async () => {
    setSeedingMessages(true);
    try {
      const count = await seedRewardMessages();
      Alert.alert('Success', `Seeded ${count} new reward messages.`);
    } catch (error) {
      console.error('Error seeding reward messages:', error);
      Alert.alert('Error', 'Failed to seed reward messages.');
    } finally {
      setSeedingMessages(false);
    }
  };

  const handleSeedTidbits = async () => {
    setSeedingTidbits(true);
    try {
      const count = await seedNeuroscienceTidbits();
      Alert.alert('Success', `Seeded ${count} new neuroscience tidbits.`);
    } catch (error) {
      console.error('Error seeding tidbits:', error);
      Alert.alert('Error', 'Failed to seed tidbits.');
    } finally {
      setSeedingTidbits(false);
    }
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
      <View style={[styles.actionsRow, { marginTop: Spacing.md }]}>
        <TouchableOpacity
          style={[styles.actionCard, reseeding && { opacity: 0.6 }]}
          onPress={handleReseedPrograms}
          disabled={reseeding}
        >
          {reseeding ? (
            <ActivityIndicator size={32} color={Colors.secondary} />
          ) : (
            <Ionicons name="refresh-circle" size={32} color={Colors.secondary} />
          )}
          <Text style={styles.actionText}>
            {reseeding ? 'Reseeding...' : 'Reseed Programs'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionCard, seedingMessages && { opacity: 0.6 }]}
          onPress={handleSeedRewardMessages}
          disabled={seedingMessages}
        >
          {seedingMessages ? (
            <ActivityIndicator size={32} color={Colors.primary} />
          ) : (
            <Ionicons name="chatbubble-ellipses" size={32} color={Colors.primary} />
          )}
          <Text style={styles.actionText}>
            {seedingMessages ? 'Seeding...' : 'Seed Messages'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.actionsRow, { marginTop: Spacing.md }]}>
        <TouchableOpacity
          style={[styles.actionCard, seedingTidbits && { opacity: 0.6 }]}
          onPress={handleSeedTidbits}
          disabled={seedingTidbits}
        >
          {seedingTidbits ? (
            <ActivityIndicator size={32} color={Colors.primary} />
          ) : (
            <Ionicons name="flash" size={32} color={Colors.primary} />
          )}
          <Text style={styles.actionText}>
            {seedingTidbits ? 'Seeding...' : 'Seed Tidbits'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('AdminTidbitEdit', { mode: 'create' })}
        >
          <Ionicons name="flash-outline" size={32} color={Colors.primary} />
          <Text style={styles.actionText}>Add Tidbit</Text>
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
      <Card
        style={styles.linkCard}
        onPress={() => navigation.navigate('AdminTidbits')}
      >
        <View style={styles.linkRow}>
          <Ionicons name="flash" size={24} color={Colors.primary} />
          <Text style={styles.linkText}>Neuroscience Tidbits</Text>
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
