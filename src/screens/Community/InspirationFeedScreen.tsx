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
import { useAuth } from '../../context/AuthContext';
import {
  getInspirationFeed,
  formatRelativeTime,
  getDifficultyTierDisplay,
} from '../../services/inspirationFeed';
import { InspirationFeedEntry, DifficultyTier } from '../../types';

const CATEGORY_ICONS: Record<string, string> = {
  Physical: 'fitness',
  Mental: 'brain',
  Social: 'chatbubbles',
  Professional: 'briefcase',
  Creative: 'color-palette',
};

const DIFFICULTY_COLORS: Record<DifficultyTier, string> = {
  moderate: Colors.primary,
  hard: Colors.secondary,
  very_hard: '#9B2C2C',
};

export const InspirationFeedScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState<InspirationFeedEntry[]>([]);

  const loadFeed = useCallback(async () => {
    if (!user) return;
    try {
      const feedEntries = await getInspirationFeed(user.uid, 50);
      setEntries(feedEntries);
    } catch (error) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadFeed();
    }, [loadFeed])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadFeed();
  };

  const renderEntry = ({ item }: { item: InspirationFeedEntry }) => {
    const iconName = CATEGORY_ICONS[item.category_name] || 'flash';
    const difficultyColor = DIFFICULTY_COLORS[item.difficulty_tier];
    const difficultyLabel = getDifficultyTierDisplay(item.difficulty_tier);
    const isOwnEntry = item.user_id === user?.uid;

    return (
      <Card style={styles.entryCard}>
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

        <View style={styles.entryContent}>
          <Text style={styles.entryText}>
            {isOwnEntry ? 'You' : 'Someone'} completed a{' '}
            <Text style={[styles.difficultyText, { color: difficultyColor }]}>
              {difficultyLabel}
            </Text>{' '}
            challenge
          </Text>

          {item.challenge_teaser && (
            <Text style={styles.teaserText}>"{item.challenge_teaser}"</Text>
          )}
        </View>
      </Card>
    );
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
    marginBottom: Spacing.md,
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
