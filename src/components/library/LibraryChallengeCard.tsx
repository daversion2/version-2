import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { LibraryChallenge } from '../../types';
import {
  TIME_CATEGORIES,
  ACTION_TYPES,
  ACTION_CATEGORIES,
} from '../../constants/challengeLibrary';

interface LibraryChallengeCardProps {
  challenge: LibraryChallenge;
  onPress: () => void;
  showActionType?: boolean;
  showDescription?: boolean;
}

export const LibraryChallengeCard: React.FC<LibraryChallengeCardProps> = ({
  challenge,
  onPress,
  showActionType = true,
  showDescription = false,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.98,
      friction: 8,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const timeCategory = challenge.time_category
    ? TIME_CATEGORIES[challenge.time_category]
    : null;
  const actionType = challenge.action_type
    ? ACTION_TYPES[challenge.action_type]
    : null;
  // Map action_type to display category for styling
  const actionCategoryKey = challenge.action_type === 'complete' ? 'start' : 'stop';
  const actionCategory = ACTION_CATEGORIES[actionCategoryKey];

  const getTimeDisplay = (): string => {
    if (challenge.time_required_minutes) {
      if (challenge.time_required_minutes >= 1440) {
        return 'All day';
      }
      if (challenge.time_required_minutes >= 60) {
        const hours = Math.floor(challenge.time_required_minutes / 60);
        return `${hours}hr+`;
      }
      return `${challenge.time_required_minutes} mins`;
    }
    return timeCategory?.description ?? '';
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        {/* Header row with name and difficulty */}
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={2}>
            {challenge.name}
          </Text>
          <View style={styles.difficultyBadge}>
            <Text style={styles.difficultyText}>{challenge.difficulty}</Text>
          </View>
        </View>

        {/* Metadata row */}
        <View style={styles.metadataRow}>
          {showActionType && actionType && actionCategory && (
            <View style={[styles.actionBadge, { backgroundColor: actionCategory.color }]}>
              <Text style={[styles.actionBadgeText, { color: actionCategory.accentColor }]}>
                {actionCategory.icon} {actionCategory.name}
              </Text>
            </View>
          )}

          <View style={styles.badge}>
            <Text style={styles.badgeText}>{challenge.category}</Text>
          </View>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>{getTimeDisplay()}</Text>
          </View>
        </View>

        {/* Description (optional) */}
        {showDescription && challenge.why && (
          <Text style={styles.description} numberOfLines={2}>
            "{challenge.why}"
          </Text>
        )}

        {/* Completion count (if available) */}
        {challenge.completion_count !== undefined && challenge.completion_count > 0 && (
          <Text style={styles.completionCount}>
            {challenge.completion_count} completed
          </Text>
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  name: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    flex: 1,
  },
  difficultyBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  difficultyText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.lightGray,
  },
  badgeText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  actionBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary + '15',
  },
  actionBadgeText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },
  description: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
  },
  completionCount: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: Spacing.sm,
    textAlign: 'right',
  },
});
