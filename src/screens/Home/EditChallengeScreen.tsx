import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { InputField } from '../../components/common/InputField';
import { DifficultySelector } from '../../components/common/DifficultySelector';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { updateChallenge } from '../../services/challenges';
import { Category, Challenge, DEFAULT_CATEGORIES } from '../../types';
import { getUserCategories } from '../../services/categories';
import { showAlert } from '../../utils/alert';
import { DateTimePicker } from '../../components/common/DateTimePicker';
import { DurationSelector } from '../../components/challenge/DurationSelector';
import { MilestonePreview } from '../../components/challenge/MilestonePreview';

type Props = NativeStackScreenProps<any, 'EditChallenge'>;

export const EditChallengeScreen: React.FC<Props> = ({ route, navigation }) => {
  const { user } = useAuth();
  const challenge = route.params?.challenge as Challenge;

  // Core domain names (Physical, Social, Mind)
  const coreDomainNames = DEFAULT_CATEGORIES.map(c => c.name);

  // Initialize state from the challenge being edited
  const [name, setName] = useState(challenge?.name || '');
  const [categoryIdx, setCategoryIdx] = useState(0);
  const [difficulty, setDifficulty] = useState(challenge?.difficulty_expected || 3);
  const [description, setDescription] = useState(challenge?.description || '');
  const [successCriteria, setSuccessCriteria] = useState(challenge?.success_criteria || '');
  const [why, setWhy] = useState(challenge?.why || '');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [durationDays, setDurationDays] = useState(challenge?.duration_days || 7);

  const isExtended = challenge?.challenge_type === 'extended';
  const completedMilestones = challenge?.milestones?.filter(m => m.completed).length || 0;

  useEffect(() => {
    if (user) {
      getUserCategories(user.uid)
        .then((cats) => {
          // Filter to only show the core three domains (Physical, Social, Mind)
          const coreCats = cats.filter(c => coreDomainNames.includes(c.name));
          setCategories(coreCats);

          // Set initial category index based on challenge's category
          if (challenge?.category_id) {
            const idx = coreCats.findIndex(c => c.name === challenge.category_id);
            if (idx >= 0) setCategoryIdx(idx);
          }
        })
        .catch((err) => {
          console.error('Failed to load categories:', err);
          showAlert('Error', 'Failed to load categories. Please try again.');
        });
    }
  }, [user, challenge?.category_id]);

  // Parse deadline into date and time components
  useEffect(() => {
    if (challenge?.deadline) {
      try {
        const deadline = new Date(challenge.deadline);
        setDeadlineDate(deadline.toISOString().split('T')[0]);
        setDeadlineTime(
          deadline.toTimeString().split(' ')[0].substring(0, 5)
        );
      } catch {
        // Invalid deadline, leave empty
      }
    }
  }, [challenge?.deadline]);

  const handleSave = async () => {
    if (!name.trim()) {
      showAlert('Required', 'Please enter a challenge name.');
      return;
    }
    if (!user || !challenge) return;

    setLoading(true);
    try {
      const updates: Parameters<typeof updateChallenge>[2] = {
        name: name.trim(),
        category_id: categories[categoryIdx]?.name || challenge.category_id,
        difficulty_expected: difficulty,
        description: description.trim() || undefined,
        success_criteria: successCriteria.trim() || undefined,
        why: why.trim() || undefined,
      };

      // Handle deadline for daily challenges
      if (!isExtended) {
        if (deadlineDate) {
          updates.deadline = new Date(
            `${deadlineDate}T${deadlineTime || '23:59'}`
          ).toISOString();
        } else {
          updates.deadline = null; // Remove deadline
        }
      }

      // Handle duration for extended challenges
      if (isExtended) {
        updates.duration_days = durationDays;
      }

      await updateChallenge(user.uid, challenge.id, updates);
      navigation.goBack();
    } catch (e: any) {
      showAlert('Error', e.message || 'Could not update challenge.');
    } finally {
      setLoading(false);
    }
  };

  if (!challenge) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Challenge not found</Text>
      </View>
    );
  }

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
        <Text style={styles.heading}>Edit Challenge</Text>

        {/* Show challenge type badge (read-only) */}
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>
            {isExtended ? 'Extended Challenge' : 'Daily Challenge'}
          </Text>
        </View>

        {/* Duration selector for extended challenges */}
        {isExtended && (
          <>
            <DurationSelector
              value={durationDays}
              onChange={setDurationDays}
              minDays={completedMilestones > 0 ? completedMilestones : 3}
            />
            {completedMilestones > 0 && (
              <Text style={styles.hint}>
                {completedMilestones} day{completedMilestones !== 1 ? 's' : ''} already completed
              </Text>
            )}
            <MilestonePreview durationDays={durationDays} />
          </>
        )}

        <InputField
          label="Name *"
          value={name}
          onChangeText={setName}
          placeholder={isExtended
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

        {/* Only show deadline for daily challenges */}
        {!isExtended && (
          <DateTimePicker
            label="Deadline (optional)"
            date={deadlineDate}
            time={deadlineTime}
            onDateChange={setDeadlineDate}
            onTimeChange={setDeadlineTime}
          />
        )}

        {/* Show library source if applicable */}
        {challenge.library_challenge_id && (
          <View style={styles.libraryNote}>
            <Text style={styles.libraryNoteText}>
              Originally from Challenge Library
            </Text>
          </View>
        )}

        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={loading}
          style={{ marginTop: Spacing.md }}
        />

        <Button
          title="Cancel"
          variant="outline"
          onPress={() => navigation.goBack()}
          style={{ marginTop: Spacing.sm }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.white },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    marginBottom: Spacing.md,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.lg,
  },
  typeBadgeText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
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
  hint: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  libraryNote: {
    backgroundColor: Colors.lightGray,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  libraryNoteText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
  },
});
