import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { InputField } from '../../components/common/InputField';
import { DifficultySelector } from '../../components/common/DifficultySelector';
import { Button } from '../../components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { createChallenge } from '../../services/challenges';
import { getUserTeam } from '../../services/teams';
import { Category, ChallengeType, DEFAULT_CATEGORIES } from '../../types';
import { getUserCategories } from '../../services/categories';
import { TouchableOpacity } from 'react-native';
import { showAlert } from '../../utils/alert';
import { DateTimePicker } from '../../components/common/DateTimePicker';
import { useWalkthrough, WALKTHROUGH_STEPS } from '../../context/WalkthroughContext';
import { WalkthroughOverlay } from '../../components/walkthrough/WalkthroughOverlay';
import { ChallengeTypeSelector } from '../../components/challenge/ChallengeTypeSelector';
import { DurationSelector } from '../../components/challenge/DurationSelector';
import { MilestonePreview } from '../../components/challenge/MilestonePreview';

type Props = NativeStackScreenProps<any, 'CreateChallenge'>;

export const CreateChallengeScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { isWalkthroughActive, currentStep, currentStepConfig, nextStep, skipWalkthrough } = useWalkthrough();
  const isMyStep = isWalkthroughActive && currentStepConfig?.screen === 'CreateChallenge';

  const [name, setName] = useState('');
  const [categoryIdx, setCategoryIdx] = useState(0);
  const [difficulty, setDifficulty] = useState(3);
  const [description, setDescription] = useState('');
  const [successCriteria, setSuccessCriteria] = useState('');
  const [why, setWhy] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [challengeType, setChallengeType] = useState<ChallengeType>('daily');
  const [durationDays, setDurationDays] = useState(7);

  // Core domain names (Physical, Social, Mind)
  const coreDomainNames = DEFAULT_CATEGORIES.map(c => c.name);

  useEffect(() => {
    if (user) {
      getUserCategories(user.uid).then((cats) => {
        // Filter to only show the core three domains (Physical, Social, Mind)
        const coreCats = cats.filter(c => coreDomainNames.includes(c.name));
        setCategories(coreCats);
      });
    }
  }, [user]);

  // Pre-fill fields when in walkthrough mode
  useEffect(() => {
    if (isMyStep) {
      setName('Placeholder challenge name');
      setDescription('Placeholder description');
      setSuccessCriteria('Placeholder success criteria');
      setWhy('Placeholder reason');
      setDifficulty(3);
    }
  }, [isMyStep]);

  const handleCreate = async () => {
    if (!name.trim()) {
      showAlert('Required', 'Please enter a challenge name.');
      return;
    }
    if (!user) return;
    setLoading(true);
    try {
      await createChallenge(user.uid, {
        name: name.trim(),
        category_id: categories[categoryIdx]?.name || 'Uncategorized',
        date: new Date().toISOString().split('T')[0],
        difficulty_expected: difficulty,
        challenge_type: challengeType,
        ...(challengeType === 'extended' ? { duration_days: durationDays } : {}),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(successCriteria.trim() ? { success_criteria: successCriteria.trim() } : {}),
        ...(why.trim() ? { why: why.trim() } : {}),
        // Only include deadline for daily challenges (extended uses end_date automatically)
        ...(challengeType === 'daily' && deadlineDate ? { deadline: new Date(`${deadlineDate}T${deadlineTime || '23:59'}`).toISOString() } : {}),
      });
      navigation.popToTop();
    } catch (e: any) {
      showAlert('Error', e.message || 'Could not create challenge.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>New Challenge</Text>

        <ChallengeTypeSelector
          value={challengeType}
          onChange={setChallengeType}
        />

        {challengeType === 'extended' && (
          <>
            <DurationSelector
              value={durationDays}
              onChange={setDurationDays}
            />
            <MilestonePreview durationDays={durationDays} />
          </>
        )}

        <InputField
          label="Name *"
          value={name}
          onChangeText={setName}
          placeholder={challengeType === 'extended'
            ? "e.g. No social media for 7 days"
            : "e.g. Cold shower for 2 minutes"}
        />

        {/* Category Picker */}
        <Text style={styles.label}>Category *</Text>
        <View style={styles.categoryRow}>
          {categories.map((cat, i) => (
            <TouchableOpacity
              key={cat.name}
              onPress={() => setCategoryIdx(i)}
              style={[
                styles.categoryChip,
                { borderColor: cat.color },
                categoryIdx === i && { backgroundColor: cat.color },
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  categoryIdx === i && { color: Colors.white },
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <DifficultySelector
          label="Expected Difficulty *"
          value={difficulty}
          onChange={setDifficulty}
        />

        <InputField
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="What will you do?"
          multiline
          numberOfLines={3}
        />

        <InputField
          label="Success Criteria (optional)"
          value={successCriteria}
          onChangeText={setSuccessCriteria}
          placeholder="How will you know you succeeded?"
          multiline
          numberOfLines={3}
        />

        <InputField
          label="Why it matters (optional)"
          value={why}
          onChangeText={setWhy}
          placeholder="Why is this important to you?"
          multiline
          numberOfLines={3}
        />

        {/* Only show deadline for daily challenges - extended uses end_date automatically */}
        {challengeType === 'daily' && (
          <DateTimePicker
            label="Deadline (optional)"
            date={deadlineDate}
            time={deadlineTime}
            onDateChange={setDeadlineDate}
            onTimeChange={setDeadlineTime}
          />
        )}

        <Button
          title="Start Challenge"
          onPress={handleCreate}
          loading={loading}
          style={{ marginTop: Spacing.md }}
        />

        <TouchableOpacity
          style={styles.buddyButton}
          onPress={async () => {
            if (!name.trim()) {
              showAlert('Required', 'Please enter a challenge name first.');
              return;
            }
            // Check if user has a team
            if (!user) return;
            const team = await getUserTeam(user.uid);
            if (!team) {
              showAlert('No Team', 'You need to be on a team to do buddy challenges.');
              return;
            }
            navigation.navigate('BuddyPickPartner', {
              challengeData: {
                name: name.trim(),
                category_id: categories[categoryIdx]?.name || 'Uncategorized',
                challenge_type: challengeType,
                difficulty_expected: difficulty,
                ...(challengeType === 'extended' ? { duration_days: durationDays } : {}),
                ...(description.trim() ? { description: description.trim() } : {}),
                ...(successCriteria.trim() ? { success_criteria: successCriteria.trim() } : {}),
                ...(why.trim() ? { why: why.trim() } : {}),
              },
            });
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="people" size={18} color={Colors.primary} />
          <Text style={styles.buddyButtonText}>Do It With a Teammate</Text>
        </TouchableOpacity>
      </ScrollView>

      {isMyStep && (
        <WalkthroughOverlay
          visible
          stepText={currentStepConfig?.text || ''}
          stepNumber={currentStep}
          totalSteps={WALKTHROUGH_STEPS.length}
          isLast={currentStep === WALKTHROUGH_STEPS.length - 1}
          onNext={nextStep}
          onSkip={skipWalkthrough}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.white },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  heading: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    marginBottom: Spacing.lg,
  },
  label: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
  },
  categoryText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  buddyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  buddyButtonText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.primary,
  },
});
