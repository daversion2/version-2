import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { useAuth } from '../../context/AuthContext';
import {
  getTeamById,
  getTeamMembers,
  getTodayTeamActivityFeed,
  getWeeklyTeamActivityCounts,
  getTeamStats,
} from '../../services/teams';
import { Team, TeamMember, TeamActivityFeedItem } from '../../types';

type RouteParams = {
  TeamDetail: { teamId: string };
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const TeamDetailScreen: React.FC = () => {
  const { user } = useAuth();
  const route = useRoute<RouteProp<RouteParams, 'TeamDetail'>>();
  const { teamId } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [activityFeed, setActivityFeed] = useState<TeamActivityFeedItem[]>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<number[]>([]);
  const [stats, setStats] = useState<{
    combinedStreak: number;
    longestStreak: number;
    daysActive: number;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const teamData = await getTeamById(teamId);
      setTeam(teamData);

      if (teamData) {
        const teamMembers = await getTeamMembers(teamId);
        setMembers(teamMembers);

        // Get activity feed (individual items sorted by time)
        const feed = await getTodayTeamActivityFeed(teamId);
        setActivityFeed(feed);

        const weekly = await getWeeklyTeamActivityCounts(teamId);
        setWeeklyActivity(weekly);

        const teamStats = await getTeamStats(teamId);
        setStats(teamStats);
      }
    } catch (error) {
      console.error('Error loading team detail:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [teamId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatActivityTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 60) {
      return diffMins <= 1 ? 'Just now' : `${diffMins} min ago`;
    }
    if (diffHours < 24) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    }
    return 'Yesterday';
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!team) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Team not found</Text>
      </View>
    );
  }

  // Count unique users who have activity today
  const activeTodayCount = new Set(activityFeed.map((a) => a.user_id)).size;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Team Header */}
      <View style={styles.header}>
        <View style={styles.teamIcon}>
          <Ionicons name="people" size={40} color={Colors.white} />
        </View>
        <Text style={styles.teamName}>{team.name}</Text>
        <Text style={styles.teamMeta}>
          {activeTodayCount} of {members.length} showed up today
        </Text>
      </View>

      {/* Stats Row */}
      {stats && (
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>
              {stats.combinedStreak > 0 && '🔥 '}
              {stats.combinedStreak}
            </Text>
            <Text style={styles.statLabel}>Team Streak</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{stats.longestStreak}</Text>
            <Text style={styles.statLabel}>Longest</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statValue}>{stats.daysActive}</Text>
            <Text style={styles.statLabel}>Days Active</Text>
          </Card>
        </View>
      )}

      {/* Today's Activity Feed */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Today's Activity</Text>

        {activityFeed.length === 0 ? (
          <Text style={styles.emptyFeedText}>No activity yet today</Text>
        ) : (
          activityFeed.map((activity) => (
            <View key={activity.id} style={styles.feedRow}>
              <View style={styles.memberLeft}>
                <View style={[styles.activityIndicator, styles.activityActive]}>
                  <Ionicons name="checkmark" size={14} color={Colors.white} />
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {activity.username || activity.display_name}
                    {activity.user_id === user?.uid && (
                      <Text style={styles.youBadge}> (You)</Text>
                    )}
                  </Text>
                  <Text style={styles.memberActivity}>
                    Completed a {activity.type} ·{' '}
                    <Text style={styles.categoryHighlight}>
                      {activity.category_name}
                    </Text>
                  </Text>
                </View>
              </View>
              <Text style={styles.activityTime}>
                {formatActivityTime(activity.created_at)}
              </Text>
            </View>
          ))
        )}
      </Card>

      {/* This Week */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>This Week</Text>
        <View style={styles.weekRow}>
          {DAYS.map((day, index) => {
            const count = weeklyActivity[index];
            const isFuture = count === -1;
            const isToday = index === new Date().getDay() - 1 || (new Date().getDay() === 0 && index === 6);

            return (
              <View key={day} style={styles.dayColumn}>
                <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                  {day}
                </Text>
                <View
                  style={[
                    styles.dayBubble,
                    isFuture && styles.dayBubbleFuture,
                    !isFuture && count > 0 && styles.dayBubbleActive,
                    isToday && styles.dayBubbleToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayCount,
                      !isFuture && count > 0 && styles.dayCountActive,
                    ]}
                  >
                    {isFuture ? '-' : count}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
        <Text style={styles.weekHint}>
          Number of team members active each day
        </Text>
      </Card>

      {/* Members List */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Members ({members.length})</Text>
        {members.map((member) => (
          <View key={member.user_id} style={styles.memberListRow}>
            <View style={styles.memberAvatar}>
              <Ionicons name="person" size={16} color={Colors.white} />
            </View>
            <Text style={styles.memberListName}>
              {member.username || member.display_name}
              {member.user_id === team.creator_id && (
                <Text style={styles.creatorBadge}> (Creator)</Text>
              )}
              {member.user_id === user?.uid && (
                <Text style={styles.youBadge}> (You)</Text>
              )}
            </Text>
          </View>
        ))}
      </Card>
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
  errorText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
  },
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  teamIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  teamName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
  },
  teamMeta: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    marginTop: Spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  statValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.primary,
  },
  statLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },
  card: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.md,
  },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  emptyFeedText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  activityActive: {
    backgroundColor: Colors.primary,
  },
  activityInactive: {
    backgroundColor: Colors.gray,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  youBadge: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  memberActivity: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: 2,
  },
  categoryHighlight: {
    color: Colors.primary,
    fontFamily: Fonts.secondaryBold,
  },
  memberInactiveText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: 2,
  },
  activityTime: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  dayColumn: {
    alignItems: 'center',
    flex: 1,
  },
  dayLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginBottom: Spacing.xs,
  },
  dayLabelToday: {
    color: Colors.primary,
    fontFamily: Fonts.secondaryBold,
  },
  dayBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayBubbleFuture: {
    backgroundColor: Colors.lightGray,
    opacity: 0.5,
  },
  dayBubbleActive: {
    backgroundColor: Colors.primary,
  },
  dayBubbleToday: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  dayCount: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  dayCountActive: {
    color: Colors.white,
  },
  weekHint: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'center',
  },
  memberListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  memberListName: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  creatorBadge: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
});
