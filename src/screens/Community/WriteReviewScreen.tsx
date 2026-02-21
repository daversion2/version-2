import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { useAuth } from '../../context/AuthContext';
import { createReview } from '../../services/reviews';
import { getLevelFromPoints } from '../../services/willpower';
import { OverallExperience, DifficultyAccuracy } from '../../types';
import { showAlert } from '../../utils/alert';

type RouteParams = {
  WriteReview: {
    libraryChallengeId: string;
    challengeName: string;
    completionId: string;
  };
};

const EXPERIENCE_OPTIONS: { value: OverallExperience; label: string; icon: string }[] = [
  { value: 'positive', label: 'Positive', icon: 'happy' },
  { value: 'neutral', label: 'Neutral', icon: 'remove' },
  { value: 'challenging', label: 'Challenging', icon: 'fitness' },
];

const DIFFICULTY_OPTIONS: { value: DifficultyAccuracy; label: string }[] = [
  { value: 'easier', label: 'Easier than expected' },
  { value: 'about_right', label: 'About right' },
  { value: 'harder', label: 'Harder than expected' },
];

export const WriteReviewScreen: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'WriteReview'>>();
  const { libraryChallengeId, challengeName, completionId } = route.params;

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [experience, setExperience] = useState<OverallExperience | null>(null);
  const [difficultyAccuracy, setDifficultyAccuracy] = useState<DifficultyAccuracy | null>(null);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [whatMadeItHard, setWhatMadeItHard] = useState('');
  const [tipsForSuccess, setTipsForSuccess] = useState('');

  const handleSubmit = async () => {
    if (!user || !userProfile) return;

    if (!experience) {
      showAlert('Missing Info', 'Please select your overall experience.');
      return;
    }

    if (!difficultyAccuracy) {
      showAlert('Missing Info', 'Please select difficulty accuracy.');
      return;
    }

    if (wouldRecommend === null) {
      showAlert('Missing Info', 'Please indicate if you would recommend this challenge.');
      return;
    }

    setSubmitting(true);
    try {
      const userLevel = getLevelFromPoints(userProfile.totalWillpowerPoints || 0);
      await createReview(user.uid, userLevel, libraryChallengeId, completionId, {
        overall_experience: experience,
        difficulty_accuracy: difficultyAccuracy,
        would_recommend: wouldRecommend,
        what_made_it_hard: whatMadeItHard.trim() || undefined,
        tips_for_success: tipsForSuccess.trim() || undefined,
      });
      setSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting review:', error);
      showAlert('Error', error.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  // Success state
  if (submitted) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
        <View style={styles.successState}>
          <Ionicons name="checkmark-circle" size={80} color={Colors.primary} />
          <Text style={styles.successTitle}>Review Submitted!</Text>
          <Text style={styles.successDesc}>
            Thanks for sharing your experience. Your review will help others
            prepare for this challenge.
          </Text>
        </View>

        <Button
          title="Done"
          onPress={() => navigation.goBack()}
          style={styles.doneButton}
        />
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>Write a Review</Text>
        <Text style={styles.challengeName}>{challengeName}</Text>

        {/* Overall Experience */}
        <Card style={styles.card}>
          <Text style={styles.questionLabel}>How was your overall experience?</Text>
          <View style={styles.optionsRow}>
            {EXPERIENCE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.experienceOption,
                  experience === option.value && styles.experienceOptionSelected,
                ]}
                onPress={() => setExperience(option.value)}
              >
                <Ionicons
                  name={option.icon as any}
                  size={28}
                  color={
                    experience === option.value ? Colors.white : Colors.primary
                  }
                />
                <Text
                  style={[
                    styles.experienceLabel,
                    experience === option.value && styles.experienceLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Difficulty Accuracy */}
        <Card style={styles.card}>
          <Text style={styles.questionLabel}>How was the difficulty?</Text>
          <View style={styles.difficultyOptions}>
            {DIFFICULTY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.difficultyOption,
                  difficultyAccuracy === option.value &&
                    styles.difficultyOptionSelected,
                ]}
                onPress={() => setDifficultyAccuracy(option.value)}
              >
                <View
                  style={[
                    styles.radioOuter,
                    difficultyAccuracy === option.value && styles.radioOuterSelected,
                  ]}
                >
                  {difficultyAccuracy === option.value && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text
                  style={[
                    styles.difficultyLabel,
                    difficultyAccuracy === option.value &&
                      styles.difficultyLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Would Recommend */}
        <Card style={styles.card}>
          <Text style={styles.questionLabel}>
            Would you recommend this challenge to others?
          </Text>
          <View style={styles.recommendRow}>
            <TouchableOpacity
              style={[
                styles.recommendOption,
                wouldRecommend === true && styles.recommendOptionYes,
              ]}
              onPress={() => setWouldRecommend(true)}
            >
              <Ionicons
                name="thumbs-up"
                size={24}
                color={wouldRecommend === true ? Colors.white : Colors.primary}
              />
              <Text
                style={[
                  styles.recommendLabel,
                  wouldRecommend === true && styles.recommendLabelSelected,
                ]}
              >
                Yes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.recommendOption,
                wouldRecommend === false && styles.recommendOptionNo,
              ]}
              onPress={() => setWouldRecommend(false)}
            >
              <Ionicons
                name="thumbs-down"
                size={24}
                color={wouldRecommend === false ? Colors.white : Colors.gray}
              />
              <Text
                style={[
                  styles.recommendLabel,
                  wouldRecommend === false && styles.recommendLabelSelected,
                ]}
              >
                No
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Optional Text Fields */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Share Your Experience (Optional)</Text>

          <InputField
            label="What made it hard?"
            placeholder="Share what was challenging about this..."
            value={whatMadeItHard}
            onChangeText={setWhatMadeItHard}
            multiline
            numberOfLines={3}
            maxLength={500}
          />

          <View style={{ height: Spacing.md }} />

          <InputField
            label="Tips for success"
            placeholder="Any advice for others attempting this?"
            value={tipsForSuccess}
            onChangeText={setTipsForSuccess}
            multiline
            numberOfLines={3}
            maxLength={500}
          />
        </Card>

        <Button
          title={submitting ? 'Submitting...' : 'Submit Review'}
          onPress={handleSubmit}
          disabled={submitting}
          style={styles.submitButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
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
  header: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  challengeName: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.primary,
    marginBottom: Spacing.lg,
  },
  card: {
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.md,
  },
  questionLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.md,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  experienceOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  experienceOptionSelected: {
    backgroundColor: Colors.primary,
  },
  experienceLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  experienceLabelSelected: {
    color: Colors.white,
  },
  difficultyOptions: {
    gap: Spacing.sm,
  },
  difficultyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    backgroundColor: Colors.white,
  },
  difficultyOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.gray,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  radioOuterSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  difficultyLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  difficultyLabelSelected: {
    fontFamily: Fonts.secondaryBold,
    color: Colors.primary,
  },
  recommendRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  recommendOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.lightGray,
    backgroundColor: Colors.white,
  },
  recommendOptionYes: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  recommendOptionNo: {
    borderColor: Colors.gray,
    backgroundColor: Colors.gray,
  },
  recommendLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginLeft: Spacing.sm,
  },
  recommendLabelSelected: {
    color: Colors.white,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
  // Success state
  successState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  successTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  successDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.lg,
  },
  doneButton: {
    marginTop: Spacing.lg,
  },
});
