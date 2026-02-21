import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { ChallengeReview } from '../../types';
import { formatReviewTime } from '../../services/reviews';

interface ReviewCardProps {
  review: ChallengeReview;
  onVoteHelpful?: () => void;
  hasVoted?: boolean;
  isHighlighted?: boolean;
}

const EXPERIENCE_DISPLAY = {
  positive: { label: 'Positive', icon: 'happy', color: Colors.primary },
  neutral: { label: 'Neutral', icon: 'remove', color: Colors.gray },
  challenging: { label: 'Challenging', icon: 'fitness', color: Colors.secondary },
};

const DIFFICULTY_DISPLAY = {
  easier: 'Easier than expected',
  about_right: 'About right',
  harder: 'Harder than expected',
};

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  onVoteHelpful,
  hasVoted = false,
  isHighlighted = false,
}) => {
  const experienceConfig = EXPERIENCE_DISPLAY[review.overall_experience];

  return (
    <View style={[styles.container, isHighlighted && styles.highlighted]}>
      {isHighlighted && (
        <View style={styles.highlightBadge}>
          <Ionicons name="star" size={12} color={Colors.secondary} />
          <Text style={styles.highlightText}>Most Helpful</Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.levelText}>Level {review.user_level} user</Text>
        <Text style={styles.timeText}>
          {formatReviewTime(review.created_at)}
        </Text>
      </View>

      {/* Experience and Difficulty */}
      <View style={styles.tagsRow}>
        <View style={[styles.tag, { backgroundColor: experienceConfig.color + '15' }]}>
          <Ionicons
            name={experienceConfig.icon as any}
            size={14}
            color={experienceConfig.color}
          />
          <Text style={[styles.tagText, { color: experienceConfig.color }]}>
            {experienceConfig.label}
          </Text>
        </View>
        <View style={styles.tag}>
          <Text style={styles.tagText}>
            {DIFFICULTY_DISPLAY[review.difficulty_accuracy]}
          </Text>
        </View>
      </View>

      {/* Review Text */}
      {review.what_made_it_hard && (
        <View style={styles.textSection}>
          <Text style={styles.textLabel}>What made it hard:</Text>
          <Text style={styles.textContent}>{review.what_made_it_hard}</Text>
        </View>
      )}

      {review.tips_for_success && (
        <View style={styles.textSection}>
          <Text style={styles.textLabel}>Tips for success:</Text>
          <Text style={styles.textContent}>{review.tips_for_success}</Text>
        </View>
      )}

      {/* Recommendation */}
      <View style={styles.footer}>
        <View style={styles.recommendBadge}>
          <Ionicons
            name={review.would_recommend ? 'thumbs-up' : 'thumbs-down'}
            size={14}
            color={review.would_recommend ? Colors.primary : Colors.gray}
          />
          <Text
            style={[
              styles.recommendText,
              { color: review.would_recommend ? Colors.primary : Colors.gray },
            ]}
          >
            {review.would_recommend ? 'Recommends' : "Doesn't recommend"}
          </Text>
        </View>

        {onVoteHelpful && (
          <TouchableOpacity
            style={[styles.helpfulButton, hasVoted && styles.helpfulButtonVoted]}
            onPress={onVoteHelpful}
            disabled={hasVoted}
          >
            <Ionicons
              name={hasVoted ? 'thumbs-up' : 'thumbs-up-outline'}
              size={14}
              color={hasVoted ? Colors.primary : Colors.gray}
            />
            <Text
              style={[
                styles.helpfulText,
                hasVoted && styles.helpfulTextVoted,
              ]}
            >
              {review.helpful_count > 0 ? review.helpful_count : ''} Helpful
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  highlighted: {
    borderWidth: 2,
    borderColor: Colors.secondary + '40',
  },
  highlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  highlightText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
    marginLeft: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  levelText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  timeText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  tagText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginLeft: 4,
  },
  textSection: {
    marginBottom: Spacing.sm,
  },
  textLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginBottom: 2,
  },
  textContent: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  recommendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    marginLeft: 4,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.lightGray,
  },
  helpfulButtonVoted: {
    backgroundColor: Colors.primary + '15',
  },
  helpfulText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginLeft: 4,
  },
  helpfulTextVoted: {
    color: Colors.primary,
    fontFamily: Fonts.secondaryBold,
  },
});
