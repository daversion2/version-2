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

const DIFFICULTY_LABELS: Record<DifficultyTier, string> = {
  moderate: 'Moderate',
  hard: 'Hard',
  very_hard: 'Very Hard',
};

// Deterministic verb picker based on entry ID
const CHALLENGE_VERBS = ['crushed', 'powered through', 'conquered', 'locked in', 'completed'];
const getVerb = (id: string): string => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return CHALLENGE_VERBS[Math.abs(hash) % CHALLENGE_VERBS.length];
};

const getOrdinalSuffix = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

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

      const ownBumps = feedEntries
        .filter((e) => e.user_id === user.uid)
        .reduce((sum, e) => sum + (e.fist_bump_count || 0), 0);
      setTotalBumpsReceived(ownBumps);

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

  // ============================================================================
  // SHARED: Fist bump footer
  // ============================================================================

  const renderFistBumpFooter = (item: InspirationFeedEntry) => {
    const isOwnEntry = item.user_id === user?.uid;
    const hasBumped = bumpedEntries.has(item.id);
    const bumpCount = item.fist_bump_count || 0;

    return (
      <View style={styles.entryFooter}>
        {bumpCount > 0 && (
          <View style={styles.bumpCountRow}>
            <Text style={styles.bumpCountText}>
              {bumpCount} {bumpCount === 1 ? 'fist bump' : 'fist bumps'}
            </Text>
          </View>
        )}
        {!isOwnEntry ? (
          <TouchableOpacity
            style={[styles.fistBumpButton, hasBumped && styles.fistBumpButtonBumped]}
            onPress={() => handleFistBump(item.id)}
            disabled={bumpingInProgress.has(item.id)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 16 }}>{'\uD83E\uDD1C'}</Text>
            <Text style={[styles.fistBumpLabel, hasBumped && styles.fistBumpLabelBumped]}>
              {hasBumped ? 'Bumped!' : 'Fist Bump'}
            </Text>
          </TouchableOpacity>
        ) : bumpCount > 0 ? (
          <View style={styles.inspiredRow}>
            <Ionicons name="heart" size={12} color={Colors.primary} />
            <Text style={styles.inspiredText}>You inspired others</Text>
          </View>
        ) : null}
      </View>
    );
  };

  // ============================================================================
  // CHALLENGE COMPLETION — category accent, teaser as headline, difficulty pill
  // ============================================================================

  const renderChallengeEntry = (item: InspirationFeedEntry) => {
    const iconName = item.category_icon || 'flash';
    const difficultyColor = DIFFICULTY_COLORS[item.difficulty_tier];
    const difficultyLabel = DIFFICULTY_LABELS[item.difficulty_tier];
    const isOwnEntry = item.user_id === user?.uid;
    const displayName = isOwnEntry ? 'You' : (item.username || 'Someone');
    const verb = getVerb(item.id);
    const hasStreak = item.streak_days && item.streak_days >= 7;

    return (
      <Card style={{ ...styles.entryCard, borderLeftWidth: 4, borderLeftColor: difficultyColor }}>
        {/* Header */}
        <View style={styles.entryHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconCircle, { backgroundColor: difficultyColor + '12' }]}>
              <Ionicons name={iconName as any} size={16} color={difficultyColor} />
            </View>
            <Text style={styles.headerName}>{displayName}</Text>
            {isOwnEntry && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>You</Text>
              </View>
            )}
          </View>
          <Text style={styles.timeText}>{formatRelativeTime(item.display_timestamp)}</Text>
        </View>

        {/* Main content */}
        <View style={styles.entryBody}>
          {item.challenge_teaser ? (
            <>
              <Text style={styles.challengeHeadline}>"{item.challenge_teaser}"</Text>
              <Text style={styles.challengeSubtext}>
                {displayName} {verb} this{hasStreak ? ` on a ${item.streak_days}-day streak` : ''}
              </Text>
            </>
          ) : (
            <Text style={styles.challengeSubtext}>
              {displayName} {verb} a challenge{hasStreak ? ` on a ${item.streak_days}-day streak` : ''}
            </Text>
          )}

          {item.completion_message && (
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>"{item.completion_message}"</Text>
            </View>
          )}
        </View>

        {/* Badges row */}
        <View style={styles.badgeRow}>
          <View style={[styles.difficultyPill, { backgroundColor: difficultyColor + '15' }]}>
            <Text style={[styles.difficultyPillText, { color: difficultyColor }]}>
              {difficultyLabel}
            </Text>
          </View>
          {item.category_name && (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{item.category_name}</Text>
            </View>
          )}
          {item.willpower_level && item.willpower_level >= 3 && (
            <View style={styles.levelPill}>
              <Text style={styles.levelPillText}>Lv.{item.willpower_level}</Text>
            </View>
          )}
        </View>

        {renderFistBumpFooter(item)}
      </Card>
    );
  };

  // ============================================================================
  // STREAK MILESTONE — warm tones, big number, flame icon
  // ============================================================================

  const renderStreakEntry = (item: InspirationFeedEntry) => {
    const isOwnEntry = item.user_id === user?.uid;
    const displayName = isOwnEntry ? 'You' : (item.username || 'Someone');
    const streakVerb = isOwnEntry ? 'are' : 'is';

    return (
      <Card style={{ ...styles.entryCard, backgroundColor: '#FFF8F0' }}>
        <View style={styles.entryHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.secondary + '20' }]}>
              <Ionicons name="flame" size={18} color={Colors.secondary} />
            </View>
            <Text style={styles.headerName}>{displayName}</Text>
            {isOwnEntry && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>You</Text>
              </View>
            )}
          </View>
          <Text style={styles.timeText}>{formatRelativeTime(item.display_timestamp)}</Text>
        </View>

        <View style={styles.milestoneCenter}>
          <Text style={[styles.bigNumber, { color: Colors.secondary }]}>{item.streak_days}</Text>
          <Text style={styles.bigNumberLabel}>day streak</Text>
          {item.streak_tier && (
            <View style={[styles.tierBadge, { backgroundColor: Colors.secondary + '15' }]}>
              <Ionicons name="flame" size={12} color={Colors.secondary} />
              <Text style={[styles.tierBadgeText, { color: Colors.secondary }]}>{item.streak_tier}</Text>
            </View>
          )}
        </View>

        <Text style={styles.milestoneNarrative}>
          {displayName} {streakVerb} on fire — {item.streak_days} days straight!
        </Text>

        {renderFistBumpFooter(item)}
      </Card>
    );
  };

  // ============================================================================
  // LEVEL UP — purple theme, big level number, title badge
  // ============================================================================

  const renderLevelUpEntry = (item: InspirationFeedEntry) => {
    const isOwnEntry = item.user_id === user?.uid;
    const displayName = isOwnEntry ? 'You' : (item.username || 'Someone');
    const purple = '#7B1FA2';

    return (
      <Card style={{ ...styles.entryCard, backgroundColor: '#F9F0FF' }}>
        <View style={styles.entryHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconCircle, { backgroundColor: purple + '20' }]}>
              <Ionicons name="arrow-up-circle" size={18} color={purple} />
            </View>
            <Text style={styles.headerName}>{displayName}</Text>
            {isOwnEntry && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>You</Text>
              </View>
            )}
          </View>
          <Text style={styles.timeText}>{formatRelativeTime(item.display_timestamp)}</Text>
        </View>

        <View style={styles.milestoneCenter}>
          <Text style={[styles.bigNumber, { color: purple }]}>Lv.{item.willpower_level}</Text>
          {item.willpower_title && (
            <View style={[styles.tierBadge, { backgroundColor: purple + '15' }]}>
              <Ionicons name="star" size={12} color={purple} />
              <Text style={[styles.tierBadgeText, { color: purple }]}>{item.willpower_title}</Text>
            </View>
          )}
        </View>

        <Text style={styles.milestoneNarrative}>
          {displayName} just leveled up to Level {item.willpower_level}!
        </Text>

        {renderFistBumpFooter(item)}
      </Card>
    );
  };

  // ============================================================================
  // REPEAT MILESTONE — dedication theme, count featured
  // ============================================================================

  const renderRepeatEntry = (item: InspirationFeedEntry) => {
    const isOwnEntry = item.user_id === user?.uid;
    const displayName = isOwnEntry ? 'You' : (item.username || 'Someone');

    return (
      <Card style={{ ...styles.entryCard, borderLeftWidth: 4, borderLeftColor: Colors.primary }}>
        <View style={styles.entryHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.primary + '15' }]}>
              <Ionicons name="repeat" size={16} color={Colors.primary} />
            </View>
            <Text style={styles.headerName}>{displayName}</Text>
            {isOwnEntry && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>You</Text>
              </View>
            )}
          </View>
          <Text style={styles.timeText}>{formatRelativeTime(item.display_timestamp)}</Text>
        </View>

        <View style={styles.repeatBody}>
          <View style={styles.repeatCountBox}>
            <Text style={[styles.repeatCount, { color: Colors.primary }]}>{item.milestone_value}x</Text>
          </View>
          <View style={styles.repeatTextBox}>
            <Text style={styles.challengeHeadline}>"{item.milestone_challenge_name}"</Text>
            <Text style={styles.repeatSubtext}>
              {displayName} completed this for the {item.milestone_value}{getOrdinalSuffix(item.milestone_value || 0)} time — that's dedication
            </Text>
          </View>
        </View>

        {renderFistBumpFooter(item)}
      </Card>
    );
  };

  // ============================================================================
  // BUDDY COMPLETION — partnership visual
  // ============================================================================

  const renderBuddyEntry = (item: InspirationFeedEntry) => {
    const isOwnEntry = item.user_id === user?.uid;
    const inviterName = item.buddy_inviter_username || 'Someone';
    const partnerName = item.buddy_partner_username || 'their buddy';
    const challengeName = item.buddy_challenge_name || 'a challenge';

    return (
      <Card style={{ ...styles.entryCard, borderLeftWidth: 4, borderLeftColor: Colors.secondary }}>
        <View style={styles.entryHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.secondary + '15' }]}>
              <Ionicons name="people" size={16} color={Colors.secondary} />
            </View>
            <View style={[styles.typeBadge, { backgroundColor: Colors.secondary + '12' }]}>
              <Text style={[styles.typeBadgeText, { color: Colors.secondary }]}>Buddy Challenge</Text>
            </View>
            {isOwnEntry && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>You</Text>
              </View>
            )}
          </View>
          <Text style={styles.timeText}>{formatRelativeTime(item.display_timestamp)}</Text>
        </View>

        <View style={styles.entryBody}>
          <Text style={styles.challengeHeadline}>"{challengeName}"</Text>
          <Text style={styles.challengeSubtext}>
            <Text style={styles.boldName}>{inviterName}</Text> & <Text style={styles.boldName}>{partnerName}</Text> crushed this one together
          </Text>
        </View>

        {renderFistBumpFooter(item)}
      </Card>
    );
  };

  // ============================================================================
  // PROGRAM COMPLETION — most celebratory, ribbon icon
  // ============================================================================

  const renderProgramEntry = (item: InspirationFeedEntry) => {
    const isOwnEntry = item.user_id === user?.uid;
    const displayName = isOwnEntry ? 'You' : (item.username || 'Someone');
    const modeLabel = item.program_mode === 'cold_turkey' ? 'Cold Turkey' : 'Gradual Build';

    return (
      <Card style={{ ...styles.entryCard, backgroundColor: '#F0FAFA' }}>
        <View style={styles.entryHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconCircle, { backgroundColor: Colors.primary + '20' }]}>
              <Ionicons name="ribbon" size={18} color={Colors.primary} />
            </View>
            <View style={[styles.typeBadge, { backgroundColor: Colors.primary + '12' }]}>
              <Text style={[styles.typeBadgeText, { color: Colors.primary }]}>Program Complete</Text>
            </View>
            {isOwnEntry && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>You</Text>
              </View>
            )}
          </View>
          <Text style={styles.timeText}>{formatRelativeTime(item.display_timestamp)}</Text>
        </View>

        <View style={styles.milestoneCenter}>
          <Ionicons name="trophy" size={36} color={Colors.primary} />
          <Text style={[styles.programName, { color: Colors.primary }]}>{item.program_name}</Text>
          <View style={styles.badgeRow}>
            {item.program_duration_days && (
              <View style={[styles.categoryPill, { backgroundColor: Colors.primary + '12' }]}>
                <Text style={[styles.categoryPillText, { color: Colors.primary }]}>{item.program_duration_days} days</Text>
              </View>
            )}
            <View style={[styles.categoryPill, { backgroundColor: Colors.primary + '12' }]}>
              <Text style={[styles.categoryPillText, { color: Colors.primary }]}>{modeLabel}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.milestoneNarrative}>
          {displayName} conquered {item.program_name} — {item.program_duration_days} days of {modeLabel}!
        </Text>

        {renderFistBumpFooter(item)}
      </Card>
    );
  };

  // ============================================================================
  // ENTRY ROUTER
  // ============================================================================

  const renderEntry = ({ item }: { item: InspirationFeedEntry }) => {
    const entryType = item.entry_type || 'challenge_completion';

    switch (entryType) {
      case 'streak_milestone':
        return renderStreakEntry(item);
      case 'level_up':
        return renderLevelUpEntry(item);
      case 'repeat_milestone':
        return renderRepeatEntry(item);
      case 'buddy_completion':
        return renderBuddyEntry(item);
      case 'program_completion':
        return renderProgramEntry(item);
      default:
        return renderChallengeEntry(item);
    }
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
            <Text style={styles.bumpBannerEmoji}>{'\uD83E\uDD1C'}</Text>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.lightGray },
  headerSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  headerTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xxl, color: Colors.dark },
  headerSubtitle: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.gray, marginTop: Spacing.xs },
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
  bumpBannerContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  bumpBannerEmoji: { fontSize: 20, marginRight: Spacing.sm },
  bumpBannerText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.primary, flex: 1 },
  listContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },

  // ---- Shared card styles ----
  entryCard: { marginBottom: Spacing.md },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerName: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.dark },
  timeText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  youBadge: {
    backgroundColor: Colors.secondary + '20',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.sm,
  },
  youBadgeText: { fontFamily: Fonts.secondaryBold, fontSize: 10, color: Colors.secondary },
  typeBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  typeBadgeText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs },

  // ---- Challenge entry ----
  entryBody: { marginBottom: Spacing.md },
  challengeHeadline: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 22,
    marginBottom: Spacing.xs,
  },
  challengeSubtext: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
  },
  boldName: { fontFamily: Fonts.secondaryBold, color: Colors.dark },
  messageBox: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  messageText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  badgeRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap', marginBottom: Spacing.sm },
  difficultyPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  difficultyPillText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs },
  categoryPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary + '10',
  },
  categoryPillText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.primary },
  levelPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray + '15',
  },
  levelPillText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },

  // ---- Milestone-style center block (streak, level up, program) ----
  milestoneCenter: { alignItems: 'center', paddingVertical: Spacing.md },
  bigNumber: { fontFamily: Fonts.primaryBold, fontSize: 40, marginBottom: 2 },
  bigNumberLabel: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  tierBadgeText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs },
  milestoneNarrative: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  programName: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, marginTop: Spacing.xs },

  // ---- Repeat milestone ----
  repeatBody: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  repeatCountBox: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatCount: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl },
  repeatTextBox: { flex: 1 },
  repeatSubtext: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    lineHeight: 18,
  },

  // ---- Fist bump footer ----
  entryFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bumpCountRow: { flexDirection: 'row', alignItems: 'center' },
  bumpCountText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  fistBumpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fistBumpButtonBumped: { backgroundColor: Colors.primary + '08', borderColor: Colors.primary + '30' },
  fistBumpLabel: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.gray },
  fistBumpLabelBumped: { color: Colors.primary },
  inspiredRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  inspiredText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.primary },

  // ---- Empty state ----
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.lg },
  emptyTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, color: Colors.dark, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  emptyDesc: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.gray, textAlign: 'center', lineHeight: 24 },
});
