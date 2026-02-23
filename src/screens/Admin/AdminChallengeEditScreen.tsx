import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import {
  createLibraryChallenge,
  updateLibraryChallenge,
  getLibraryChallengeById,
} from '../../services/admin';
import { LibraryChallenge, TimeCategory, ActionType } from '../../types';
import { TIME_CATEGORIES, ACTION_CATEGORIES, LIFE_DOMAINS } from '../../constants/challengeLibrary';

type RouteParams = {
  AdminChallengeEdit: {
    mode: 'create' | 'edit';
    challengeId?: string;
  };
};

export const AdminChallengeEditScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'AdminChallengeEdit'>>();
  const { mode, challengeId } = route.params;
  const isEditing = mode === 'edit' && challengeId;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('Physical');
  const [difficulty, setDifficulty] = useState(3);
  const [timeCategory, setTimeCategory] = useState<TimeCategory | undefined>();
  const [actionType, setActionType] = useState<ActionType>('complete'); // Default to Start
  const [successCriteria, setSuccessCriteria] = useState('');
  const [why, setWhy] = useState('');
  const [neuroscienceExplanation, setNeuroscienceExplanation] = useState('');
  const [psychologicalBenefit, setPsychologicalBenefit] = useState('');
  const [beginnerFriendly, setBeginnerFriendly] = useState(false);

  useEffect(() => {
    if (isEditing) {
      loadChallenge();
    }
  }, [isEditing]);

  const loadChallenge = async () => {
    if (!challengeId) return;
    try {
      const challenge = await getLibraryChallengeById(challengeId);
      if (challenge) {
        setName(challenge.name);
        setDescription(challenge.description || '');
        setCategory(challenge.category || 'Physical');
        setDifficulty(challenge.difficulty || 3);
        setTimeCategory(challenge.time_category);
        setActionType(challenge.action_type || 'complete');
        setSuccessCriteria(challenge.success_criteria || '');
        setWhy(challenge.why || '');
        setNeuroscienceExplanation(challenge.neuroscience_explanation || '');
        setPsychologicalBenefit(challenge.psychological_benefit || '');
        setBeginnerFriendly(challenge.beginner_friendly || false);
      }
    } catch (error) {
      console.error('Error loading challenge:', error);
      Alert.alert('Error', 'Failed to load challenge');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Challenge name is required');
      return;
    }

    setSaving(true);
    try {
      const challengeData: Omit<LibraryChallenge, 'id'> = {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        difficulty,
        time_category: timeCategory,
        action_type: actionType,
        success_criteria: successCriteria.trim() || undefined,
        why: why.trim() || undefined,
        neuroscience_explanation: neuroscienceExplanation.trim() || undefined,
        psychological_benefit: psychologicalBenefit.trim() || undefined,
        beginner_friendly: beginnerFriendly,
      };

      if (isEditing && challengeId) {
        await updateLibraryChallenge(challengeId, challengeData);
        Alert.alert('Success', 'Challenge updated');
      } else {
        await createLibraryChallenge(challengeData);
        Alert.alert('Success', 'Challenge created');
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      {/* Name */}
      <Text style={styles.label}>Name *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Challenge name"
        placeholderTextColor={Colors.gray}
      />

      {/* Description */}
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Describe the challenge"
        placeholderTextColor={Colors.gray}
        multiline
        numberOfLines={3}
      />

      {/* Category */}
      <Text style={styles.label}>Category</Text>
      <View style={styles.chipRow}>
        {Object.values(LIFE_DOMAINS).map((domain) => (
          <TouchableOpacity
            key={domain.id}
            style={[styles.chip, category === domain.name && styles.chipActive]}
            onPress={() => setCategory(domain.name)}
          >
            <Text style={[styles.chipText, category === domain.name && styles.chipTextActive]}>
              {domain.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Difficulty */}
      <Text style={styles.label}>Difficulty</Text>
      <View style={styles.difficultyRow}>
        {[1, 2, 3, 4, 5].map((level) => (
          <TouchableOpacity
            key={level}
            onPress={() => setDifficulty(level)}
            style={styles.starButton}
          >
            <Ionicons
              name={level <= difficulty ? 'star' : 'star-outline'}
              size={28}
              color={level <= difficulty ? Colors.secondary : Colors.gray}
            />
          </TouchableOpacity>
        ))}
        <Text style={styles.difficultyText}>{difficulty}/5</Text>
      </View>

      {/* Action Type (Start/Stop) - Primary categorization */}
      <Text style={styles.label}>Action Type *</Text>
      <View style={styles.actionTypeRow}>
        {Object.entries(ACTION_CATEGORIES).map(([key, config]) => {
          const actionValue = key === 'start' ? 'complete' : 'resist';
          const isSelected = actionType === actionValue;
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.actionTypeCard,
                isSelected && { backgroundColor: config.color, borderColor: config.accentColor },
              ]}
              onPress={() => setActionType(actionValue as ActionType)}
            >
              <Text style={styles.actionTypeIcon}>{config.icon}</Text>
              <Text style={[styles.actionTypeName, isSelected && { color: config.accentColor }]}>
                {config.name}
              </Text>
              <Text style={[styles.actionTypeDesc, isSelected && { color: config.accentColor }]}>
                {config.shortDescription}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Time Category */}
      <Text style={styles.label}>Time Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
        <TouchableOpacity
          style={[styles.chip, !timeCategory && styles.chipActive]}
          onPress={() => setTimeCategory(undefined)}
        >
          <Text style={[styles.chipText, !timeCategory && styles.chipTextActive]}>None</Text>
        </TouchableOpacity>
        {Object.entries(TIME_CATEGORIES).map(([key, config]) => (
          <TouchableOpacity
            key={key}
            style={[styles.chip, timeCategory === key && styles.chipActive]}
            onPress={() => setTimeCategory(key as TimeCategory)}
          >
            <Text style={[styles.chipText, timeCategory === key && styles.chipTextActive]}>
              {config.shortLabel}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Beginner Friendly */}
      <View style={styles.switchRow}>
        <Text style={styles.label}>Beginner Friendly</Text>
        <Switch
          value={beginnerFriendly}
          onValueChange={setBeginnerFriendly}
          trackColor={{ false: Colors.lightGray, true: Colors.primary + '50' }}
          thumbColor={beginnerFriendly ? Colors.primary : Colors.gray}
        />
      </View>

      {/* Success Criteria */}
      <Text style={styles.label}>Success Criteria</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={successCriteria}
        onChangeText={setSuccessCriteria}
        placeholder="How do you know you've completed it?"
        placeholderTextColor={Colors.gray}
        multiline
        numberOfLines={2}
      />

      {/* Why */}
      <Text style={styles.label}>Why (Motivation)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={why}
        onChangeText={setWhy}
        placeholder="Why is this challenge valuable?"
        placeholderTextColor={Colors.gray}
        multiline
        numberOfLines={2}
      />

      {/* Neuroscience Explanation */}
      <Text style={styles.label}>Neuroscience Explanation</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={neuroscienceExplanation}
        onChangeText={setNeuroscienceExplanation}
        placeholder="What happens in the brain?"
        placeholderTextColor={Colors.gray}
        multiline
        numberOfLines={3}
      />

      {/* Psychological Benefit */}
      <Text style={styles.label}>Psychological Benefit</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={psychologicalBenefit}
        onChangeText={setPsychologicalBenefit}
        placeholder="What mental benefits does this provide?"
        placeholderTextColor={Colors.gray}
        multiline
        numberOfLines={2}
      />

      {/* Save Button */}
      <Button
        title={isEditing ? 'Save Changes' : 'Create Challenge'}
        onPress={handleSave}
        loading={saving}
        disabled={saving}
        style={styles.saveButton}
      />
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
  label: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  scrollRow: {
    marginBottom: Spacing.sm,
  },
  chip: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  chipTextActive: {
    color: Colors.white,
  },
  difficultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  starButton: {
    padding: Spacing.xs,
  },
  difficultyText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginLeft: Spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  actionTypeRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionTypeCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  actionTypeIcon: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  actionTypeName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  actionTypeDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'center',
  },
  saveButton: {
    marginTop: Spacing.xl,
  },
});
