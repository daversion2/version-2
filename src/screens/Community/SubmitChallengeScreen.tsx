import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { DifficultySelector } from '../../components/common/DifficultySelector';
import { useAuth } from '../../context/AuthContext';
import { submitChallenge, canSubmitChallenge } from '../../services/submissions';
import { getChallengeById } from '../../services/challenges';
import { getCategory } from '../../services/categories';
import { getLevelFromPoints } from '../../services/willpower';
import { Challenge, Category } from '../../types';
import { showAlert } from '../../utils/alert';

type RouteParams = {
  SubmitChallenge: { challengeId: string };
};

export const SubmitChallengeScreen: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'SubmitChallenge'>>();
  const { challengeId } = route.params;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [canSubmit, setCanSubmit] = useState(false);
  const [submitReason, setSubmitReason] = useState<string | undefined>();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState(3);
  const [successCriteria, setSuccessCriteria] = useState('');
  const [tips, setTips] = useState('');
  const [variations, setVariations] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!user || !userProfile) return;

      try {
        const challengeData = await getChallengeById(user.uid, challengeId);
        if (!challengeData) {
          showAlert('Error', 'Challenge not found');
          navigation.goBack();
          return;
        }
        setChallenge(challengeData);

        // Pre-fill form
        setName(challengeData.name);
        setDescription(challengeData.description || '');
        setDifficulty(challengeData.difficulty_actual || challengeData.difficulty_expected);
        setSuccessCriteria(challengeData.success_criteria || '');

        // Load category
        const categoryData = await getCategory(user.uid, challengeData.category_id);
        setCategory(categoryData);

        // Check eligibility
        const userLevel = getLevelFromPoints(userProfile.totalWillpowerPoints || 0);
        const eligibility = await canSubmitChallenge(user.uid, userLevel, challengeId);
        setCanSubmit(eligibility.canSubmit);
        setSubmitReason(eligibility.reason);
      } catch (error) {
        console.error('Error loading challenge:', error);
        showAlert('Error', 'Failed to load challenge');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, userProfile, challengeId, navigation]);

  const handleSubmit = async () => {
    if (!user || !userProfile || !challenge || !category) return;

    if (!name.trim()) {
      showAlert('Missing Info', 'Please enter a challenge name.');
      return;
    }

    if (!description.trim()) {
      showAlert('Missing Info', 'Please enter a description.');
      return;
    }

    if (description.trim().length < 20) {
      showAlert('Too Short', 'Description should be at least 20 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const userLevel = getLevelFromPoints(userProfile.totalWillpowerPoints || 0);
      await submitChallenge(user.uid, userLevel, challengeId, {
        name: name.trim(),
        category_id: challenge.category_id,
        category_name: category.name,
        difficulty_suggested: difficulty,
        description: description.trim(),
        success_criteria: successCriteria.trim() || undefined,
        tips: tips.trim() || undefined,
        variations: variations.trim() || undefined,
      });
      setSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting challenge:', error);
      showAlert('Error', error.message || 'Failed to submit challenge');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Success state
  if (submitted) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
        <View style={styles.successState}>
          <Ionicons name="checkmark-circle" size={80} color={Colors.primary} />
          <Text style={styles.successTitle}>Submitted!</Text>
          <Text style={styles.successDesc}>
            Your challenge is now under review. You'll be notified when it's
            approved and added to the library.
          </Text>
        </View>

        <Card style={styles.card}>
          <Text style={styles.infoTitle}>What happens next?</Text>
          <Text style={styles.infoText}>
            An admin will review your submission. If approved, it will appear in
            the public Challenge Library for others to try.
          </Text>
        </Card>

        <Button
          title="Done"
          onPress={() => navigation.goBack()}
          style={styles.doneButton}
        />
      </ScrollView>
    );
  }

  // Not eligible
  if (!canSubmit) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
        <View style={styles.notEligible}>
          <Ionicons name="lock-closed" size={60} color={Colors.gray} />
          <Text style={styles.notEligibleTitle}>Cannot Submit</Text>
          <Text style={styles.notEligibleDesc}>{submitReason}</Text>
        </View>

        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          variant="outline"
          style={styles.backButton}
        />
      </ScrollView>
    );
  }

  // Submit form
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>Submit to Library</Text>
        <Text style={styles.subheader}>
          Share this challenge with the Neuro Nudge community. An admin will
          review before it goes live.
        </Text>

        <Card style={styles.card}>
          <InputField
            label="Challenge Name *"
            placeholder="Clear, actionable name"
            value={name}
            onChangeText={setName}
            maxLength={100}
          />

          <View style={{ height: Spacing.md }} />

          <Text style={styles.fieldLabel}>Category</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{category?.name || 'Unknown'}</Text>
          </View>

          <View style={{ height: Spacing.md }} />

          <Text style={styles.fieldLabel}>Suggested Difficulty</Text>
          <DifficultySelector value={difficulty} onChange={setDifficulty} />

          <View style={{ height: Spacing.md }} />

          <InputField
            label="Description *"
            placeholder="What does this challenge involve? Be specific."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Optional Details</Text>
          <Text style={styles.cardDesc}>
            Help others succeed with your challenge.
          </Text>

          <View style={{ height: Spacing.md }} />

          <InputField
            label="Success Criteria"
            placeholder="How will someone know they completed it?"
            value={successCriteria}
            onChangeText={setSuccessCriteria}
            multiline
            numberOfLines={2}
            maxLength={300}
          />

          <View style={{ height: Spacing.md }} />

          <InputField
            label="Tips for Others"
            placeholder="Any advice for someone attempting this?"
            value={tips}
            onChangeText={setTips}
            multiline
            numberOfLines={2}
            maxLength={300}
          />

          <View style={{ height: Spacing.md }} />

          <InputField
            label="Variations"
            placeholder="Easier or harder versions of this challenge"
            value={variations}
            onChangeText={setVariations}
            multiline
            numberOfLines={2}
            maxLength={300}
          />
        </Card>

        <Text style={styles.disclaimer}>
          By submitting, you agree to share this challenge anonymously with the
          community. Your name will not be displayed.
        </Text>

        <Button
          title={submitting ? 'Submitting...' : 'Submit for Review'}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  loadingText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
  },
  header: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  subheader: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  card: {
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  cardDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  fieldLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  categoryBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.primary,
  },
  disclaimer: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginVertical: Spacing.md,
    lineHeight: 18,
  },
  submitButton: {
    marginTop: Spacing.sm,
  },
  // Success state
  successState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
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
  infoTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  infoText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
  },
  doneButton: {
    marginTop: Spacing.lg,
  },
  // Not eligible state
  notEligible: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  notEligibleTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  notEligibleDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
  },
  backButton: {
    marginTop: Spacing.lg,
  },
});
