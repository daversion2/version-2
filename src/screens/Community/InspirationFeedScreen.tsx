import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { useAuth } from '../../context/AuthContext';
import {
  getInspirationFeed,
  formatRelativeTime,
  getDifficultyTierDisplay,
  sendFistBump,
  removeFistBump,
  getUserFistBumps,
} from '../../services/inspirationFeed';
import { InspirationFeedEntry, DifficultyTier } from '../../types';

const DIFFICULTY_COLORS: Record<DifficultyTier, string> = {
  moderate: Colors.primary,
  hard: Colors.secondary,
  very_hard: '#9B2C2C',
};

// Streak tiers that are worth showing (skip "Starting" and "Building Momentum")
const NOTABLE_STREAK_TIERS = ['On Fire', 'Unstoppable', 'Legendary'];

export const InspirationFeedScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState<InspirationFeedEntry[]>([]);
  const [bumpedEntries, setBumpedEntries] = useState<Set<string>>(new Set());
  const [bumpingInProgress, setBumpingInProgress] = useState<Set<string>>(new Set());
  const [totalBumpsReceived, setTotalBumpsReceived] = useState(0);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const loadFeed = useCallback(async () => {
    if (!user) return;
    try {
      const feedEntries = await getInspirationFeed(user.uid, 50);
      setEntries(feedEntries);

      // Calculate total fist bumps received on the user's own entries
      const ownBumps = feedEntries
        .filter((e) => e.user_id === user.uid)
        .reduce((sum, e) => sum + (e.fist_bump_count || 0), 0);
      setTotalBumpsReceived(ownBumps);

      // Fetch which entries the current user has fist-bumped
      const entryIds = feedEntries.map((e) => e.id);
      const bumped = await getUserFistBumps(user.uid, entryIds);
      setBumpedEntries(bumped);
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setBannerDismissed(false);
      loadFeed();
    }, [loadFeed])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadFeed();
  };

  const handleFistBump = useCallback(async (entryId: string) => {
    if (!user || bumpingInProgress.has(entryId)) return;

    setBumpingInProgress((prev) => new Set(prev).add(entryId));
    const alreadyBumped = bumpedEntries.has(entryId);

    try {
      if (alreadyBumped) {
        await removeFistBump(entryId, user.uid);
        setBumpedEntries((prev) => {
          const next = new Set(prev);
          next.delete(entryId);
          return next;
        });
      } else {
        await sendFistBump(entryId, user.uid);
        setBumpedEntries((prev) => new Set(prev).add(entryId));
      }
    } catch (err) {
      console.warn('Fist bump error:', err);
    } finally {
      setBumpingInProgress((prev) => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
    }
  }, [user, bumpedEntries, bumpingInProgress]);

  const renderMilestoneEntry = (item: InspirationFeedEntry) => {
    const isOwnEntry = item.user_id === user?.uid;
    const displayName = isOwnEntry ? 'You' : (item.username || 'Someone');

    let milestoneText = '';
    let milestoneIcon: string = 'trophy';
    let accentColor = Colors.primary;

    switch (item.entry_type) {
      case 'streak_milestone':
        milestoneIcon = 'flame';
        accentColor = Colors.secondary;
        milestoneText = `${displayName} hit a ${item.streak_days}-day streak! ${item.streak_tier}!`;
        break;
      case 'level_up':
        milestoneIcon = 'arrow-up-circle';
        accentColor = '#7B1FA2'; // Purple
        milestoneText = `${displayName} reached Level ${item.willpower_level}: ${item.willpower_title}!`;
        break;
      case 'repeat_milestone':
        milestoneIcon = 'repeat';
        accentColor = Colors.primary;
        milestoneText = `${displayName} completed "${item.milestone_challenge_name}" for the ${item.milestone_value}${getOrdinalSuffix(item.milestone_value || 0)} time!`;
        break;
    }

    return (
      <Card style={{ ...styles.entryCard, ...styles.milestoneCard, borderLeftColor: accentColor }}>
        <View style={styles.entryHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.milestoneBadge, { backgroundColor: accentColor + '15' }]}>
              <Ionicons name={milestoneIcon as any} size={16} color={accentColor} />
              <Text style={[styles.milestoneBadgeText, { color: accentColor }]}>Milestone</Text>
            </View>
            {isOwnEntry && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>You</Text>
              </View>
            )}
          </View>
          <Text style={styles.timeText}>
            {formatRelativeTime(item.display_timestamp)}
          </Text>
        </View>

        <Text style={styles.milestoneText}>{milestoneText}</Text>
      </Card>
    );
  };

  const renderChallengeEntry = (item: InspirationFeedEntry) => {
    const iconName = item.category_icon || 'flash';
    const difficultyColor = DIFFICULTY_COLORS[item.difficulty_tier];
    const difficultyLabel = getDifficultyTierDisplay(item.difficulty_tier);
    const isOwnEntry = item.user_id === user?.uid;
    const showStreakBadge = item.streak_tier && NOTABLE_STREAK_TIERS.includes(item.streak_tier);
    const hasBumped = bumpedEntries.has(item.id);
    const bumpCount = item.fist_bump_count || 0;

    return (
      <Card style={styles.entryCard}>
        {/* Header row */}
        <View style={styles.entryHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.categoryBadge}>
              <Ionicons name={iconName as any} size={16} color={Colors.primary} />
              <Text style={styles.categoryText}>{item.category_name}</Text>
            </View>
            {isOwnEntry && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>You</Text>
              </View>
            )}
          </View>
          <Text style={styles.timeText}>
            {formatRelativeTime(item.display_timestamp)}
          </Text>
        </View>

        {/* Main content */}
        <View style={styles.entryContent}>
          <Text style={styles.entryText}>
            {isOwnEntry ? 'You' : (item.username || 'Someone')} completed a{' '}
            <Text style={[styles.difficultyText, { color: difficultyColor }]}>
              {difficultyLabel}
            </Text>{' '}
            challenge
          </Text>

          {item.challenge_teaser && (
            <Text style={styles.teaserText}>"{item.challenge_teaser}"</Text>
          )}

          {/* Completion message */}
          {item.completion_message && (
            <Text style={styles.completionMessage}>"{item.completion_message}"</Text>
          )}
        </View>

        {/* Footer: badges + fist bump */}
        <View style={styles.entryFooter}>
          <View style={styles.badgeRow}>
            {/* Streak badge */}
            {showStreakBadge && (
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={12} color={Colors.secondary} />
                <Text style={styles.streakBadgeText}>{item.streak_tier}</Text>
              </View>
            )}
            {/* Level badge */}
            {item.willpower_level && item.willpower_level >= 2 && (
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>
                  Lv.{item.willpower_level} {item.willpower_title}
                </Text>
              </View>
            )}
          </View>

          {/* Fist bump button (not on own entries) or inspired count (on own entries) */}
          {!isOwnEntry ? (
            <TouchableOpacity
              style={styles.fistBumpButton}
              onPress={() => handleFistBump(item.id)}
              disabled={bumpingInProgress.has(item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ fontSize: 18, opacity: hasBumped ? 0.4 : 1 }}>🤜</Text>
              <Text style={styles.fistBumpLabel}>
                {hasBumped ? 'bumped!' : 'fist bump'}
              </Text>
            </TouchableOpacity>
          ) : bumpCount > 0 ? (
            <Text style={styles.inspiredText}>
              {bumpCount} {bumpCount === 1 ? 'person' : 'people'} inspired
            </Text>
          ) : null}
        </View>
      </Card>
    );
  };

  const renderEntry = ({ item }: { item: InspirationFeedEntry }) => {
    const entryType = item.entry_type || 'challenge_completion';

    if (entryType !== 'challenge_completion') {
      return renderMilestoneEntry(item);
    }

    return renderChallengeEntry(item);
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="flash-outline" size={80} color={Colors.gray} />
      <Text style={styles.emptyTitle}>No Inspiration Yet</Text>
      <Text style={styles.emptyDesc}>
        When the community completes challenging tasks, you'll see them here for
        inspiration. Check back soon!
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
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Inspiration Feed</Text>
        <Text style={styles.headerSubtitle}>
          See what others are pushing through
        </Text>
      </View>

      {totalBumpsReceived > 0 && !bannerDismissed && (
        <View style={styles.bumpBanner}>
          <View style={styles.bumpBannerContent}>
            <Text style={styles.bumpBannerEmoji}>🤜</Text>
            <Text style={styles.bumpBannerText}>
              Your challenges inspired {totalBumpsReceived} {totalBumpsReceived === 1 ? 'person' : 'people'}!
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setBannerDismissed(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderEntry}
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

const getOrdinalSuffix = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
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
  headerSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  headerTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
  },
  headerSubtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    marginTop: Spacing.xs,
  },
  bumpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary + '12',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary + '20',
  },
  bumpBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bumpBannerEmoji: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  bumpBannerText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    flex: 1,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  entryCard: {
    marginBottom: Spacing.md,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  youBadge: {
    backgroundColor: Colors.secondary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  youBadgeText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    marginLeft: Spacing.xs,
  },
  timeText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  entryContent: {
    marginBottom: Spacing.sm,
  },
  entryText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 24,
  },
  difficultyText: {
    fontFamily: Fonts.secondaryBold,
    textTransform: 'uppercase',
  },
  teaserText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  completionMessage: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginTop: Spacing.sm,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  // Footer with badges and fist bump
  entryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 1,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary + '12',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    gap: 3,
  },
  streakBadgeText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
  },
  levelBadge: {
    backgroundColor: Colors.gray + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  levelBadgeText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  fistBumpButton: {
    padding: Spacing.xs,
    alignItems: 'center',
  },
  fistBumpLabel: {
    fontFamily: Fonts.secondary,
    fontSize: 10,
    color: Colors.gray,
    marginTop: 1,
  },
  inspiredText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },
  // Milestone card styles
  milestoneCard: {
    borderLeftWidth: 4,
  },
  milestoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  milestoneBadgeText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
  },
  milestoneText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 24,
  },
  // Empty state
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
