import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  Animated,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { InputField } from '../../components/common/InputField';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { createGoalWithActions, getActiveGoals } from '../../services/goals';
import { GOAL_CONSTANTS, ONBOARDING_STAGES, ONBOARDING_PROMPTS, OnboardingPrompt } from '../../constants/goals';
import { Modal } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

type Props = NativeStackScreenProps<any>;

const formatDate = (date: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

const toYYYYMMDD = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const GoalOnboardingFlow: React.FC<Props> = ({ navigation }) => {
  const { user, userProfile } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [currentStage, setCurrentStage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [atCap, setAtCap] = useState(false);
  const [showWhyGuard, setShowWhyGuard] = useState(false);
  const [whyGuardDismissed, setWhyGuardDismissed] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [listData, setListData] = useState<Record<string, string[]>>({
    bonus_actions: [],
    triggers: [],
    trigger_substitutes: [],
  });
  const [habitsInput, setHabitsInput] = useState<{ name: string; frequency: number }[]>([]);
  const [confidenceBaseline, setConfidenceBaseline] = useState(5);
  const [innerVoiceChallenge, setInnerVoiceChallenge] = useState('');
  const [innerVoiceResponse, setInnerVoiceResponse] = useState('');

  // Target date
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // List input temp state
  const [listInputs, setListInputs] = useState<Record<string, string>>({});

  // Stage 2: Thought Patterns gate
  const [hasTriedBefore, setHasTriedBefore] = useState<boolean | null>(null);

  const hasWhyDiscovery = userProfile?.has_completed_why_discovery === true;
  const userWhyStatement = userProfile?.why_statement || '';

  useEffect(() => {
    if (!user) return;
    getActiveGoals(user.uid).then(goals => {
      setAtCap(goals.length >= GOAL_CONSTANTS.MAX_ACTIVE);
    });
    // Show soft guard if user hasn't completed Why Discovery
    if (!hasWhyDiscovery && !whyGuardDismissed) {
      setShowWhyGuard(true);
    }
  }, [user]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentStage / ONBOARDING_STAGES.length,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStage]);

  const stagePrompts = ONBOARDING_PROMPTS.filter(p => p.stage === currentStage);

  const setField = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const addListItem = (key: string) => {
    const input = (listInputs[key] || '').trim();
    if (!input) return;
    setListData(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), input],
    }));
    setListInputs(prev => ({ ...prev, [key]: '' }));
  };

  const removeListItem = (key: string, index: number) => {
    setListData(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter((_, i) => i !== index),
    }));
  };

  // Habit list helpers
  const [habitNameInput, setHabitNameInput] = useState('');
  const [habitFreqInput, setHabitFreqInput] = useState(3);

  const addHabit = () => {
    const name = habitNameInput.trim();
    if (!name) return;
    setHabitsInput(prev => [...prev, { name, frequency: habitFreqInput }]);
    setHabitNameInput('');
    setHabitFreqInput(3);
  };

  const removeHabit = (index: number) => {
    setHabitsInput(prev => prev.filter((_, i) => i !== index));
  };

  const validateStage = (): boolean => {
    // Stage 2: Thought Patterns — gate on hasTriedBefore
    if (currentStage === 2) {
      if (hasTriedBefore === null) {
        Alert.alert('Required', "Please answer whether you've tried this before.");
        return false;
      }
      if (hasTriedBefore === true) {
        if (!innerVoiceChallenge.trim() || !innerVoiceResponse.trim()) {
          Alert.alert('Required', 'Please fill in both the inner voice and your response.');
          return false;
        }
      }
      return true;
    }

    for (const prompt of stagePrompts) {
      if (!prompt.required) continue;

      if (prompt.type === 'slider') continue; // slider always has a value
      if (prompt.type === 'challenge_input') {
        if (!formData[prompt.fieldKey]?.trim()) {
          Alert.alert('Required', 'Please give your challenge a title.');
          return false;
        }
        continue;
      }
      if (prompt.type === 'habit_list') {
        if (habitsInput.length === 0) {
          Alert.alert('Required', 'Please add at least one habit.');
          return false;
        }
        continue;
      }
      if (prompt.type === 'list') {
        if ((listData[prompt.fieldKey] || []).length === 0) {
          Alert.alert('Required', `Please add at least one item for: "${prompt.question}"`);
          return false;
        }
        continue;
      }
      // text / multiline
      const fieldKey = prompt.fieldKey;
      if (fieldKey === 'name') {
        if (!formData.name?.trim()) {
          Alert.alert('Required', 'Please enter a goal name.');
          return false;
        }
      } else if (!formData[fieldKey]?.trim()) {
        Alert.alert('Required', `Please answer: "${prompt.question}"`);
        return false;
      }
    }

    // Stage 1 also needs a valid target date
    if (currentStage === 1) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (endDate <= today) {
        Alert.alert('Invalid Date', 'Target date must be in the future.');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStage()) return;
    if (currentStage < ONBOARDING_STAGES.length) {
      setCurrentStage(prev => prev + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStage > 1) {
      setCurrentStage(prev => prev - 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handleSubmit = async () => {
    if (!user || atCap) return;
    setLoading(true);
    try {
      const habits = habitsInput.map(h => ({
        name: h.name,
        category_id: 'Physical',
        target_count_per_week: h.frequency,
      }));

      const firstChallenge = formData.first_challenge_input?.trim()
        ? {
            name: formData.first_challenge_input.trim(),
            description: formData.first_challenge_input_description?.trim() || undefined,
            category_id: 'Physical',
            difficulty_expected: 3,
          }
        : undefined;

      await createGoalWithActions(
        user.uid,
        {
          name: formData.name.trim(),
          end_date: toYYYYMMDD(endDate),
          deeper_why: formData.deeper_why?.trim(),
          confidence_baseline: confidenceBaseline,
          negative_story: formData.negative_story?.trim(),
          inner_voice_challenge: innerVoiceChallenge.trim() || undefined,
          inner_voice_response: innerVoiceResponse.trim() || undefined,
          minimum_action: formData.minimum_action?.trim(),
          bonus_actions: listData.bonus_actions?.length ? listData.bonus_actions : undefined,
          triggers: listData.triggers?.length ? listData.triggers : undefined,
          trigger_substitutes: listData.trigger_substitutes?.length ? listData.trigger_substitutes : undefined,
          recovery_plan: formData.recovery_plan?.trim(),
          identity_statement: formData.identity_statement?.trim(),
          support_person: formData.support_person?.trim(),
          why_connection: formData.why_connection?.trim() || undefined,
        },
        { habits, firstChallenge }
      );

      navigation.popToTop();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create goal');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setEndDate(date);
  };

  const renderPrompt = (prompt: OnboardingPrompt) => {
    switch (prompt.type) {
      case 'text':
        return (
          <View key={prompt.id} style={styles.promptContainer}>
            <Text style={styles.promptQuestion}>{prompt.question}</Text>
            {prompt.required && <Text style={styles.requiredBadge}>Required</Text>}
            <InputField
              label=""
              value={formData[prompt.fieldKey] || ''}
              onChangeText={(v) => setField(prompt.fieldKey, v)}
              placeholder={prompt.placeholder}
              maxLength={prompt.fieldKey === 'name' ? GOAL_CONSTANTS.NAME_MAX_LENGTH : 300}
            />
          </View>
        );

      case 'multiline':
        return (
          <View key={prompt.id} style={styles.promptContainer}>
            {/* Show Why context banner for the why_connection field */}
            {prompt.fieldKey === 'why_connection' && hasWhyDiscovery && userWhyStatement ? (
              <View style={styles.whyContextBanner}>
                <Ionicons name="compass" size={16} color={Colors.primary} />
                <Text style={styles.whyContextText}>Your Why: "{userWhyStatement}"</Text>
              </View>
            ) : null}
            <Text style={styles.promptQuestion}>{prompt.question}</Text>
            {prompt.required && <Text style={styles.requiredBadge}>Required</Text>}
            <InputField
              label=""
              value={formData[prompt.fieldKey] || ''}
              onChangeText={(v) => setField(prompt.fieldKey, v)}
              placeholder={prompt.placeholder}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>
        );

      case 'slider':
        return (
          <View key={prompt.id} style={styles.promptContainer}>
            <Text style={styles.promptQuestion}>{prompt.question}</Text>
            <View style={styles.sliderRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setConfidenceBaseline(n)}
                  style={[
                    styles.sliderChip,
                    confidenceBaseline === n && styles.sliderChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.sliderChipText,
                      confidenceBaseline === n && styles.sliderChipTextActive,
                    ]}
                  >
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>Not confident</Text>
              <Text style={styles.sliderLabel}>Very confident</Text>
            </View>
          </View>
        );

      case 'inner_voice_pair':
        return (
          <View key={prompt.id} style={styles.promptContainer}>
            <Text style={styles.promptQuestion}>{prompt.question}</Text>
            {prompt.required && <Text style={styles.requiredBadge}>Required</Text>}
            <View style={styles.innerVoiceCard}>
              <View style={styles.innerVoiceRow}>
                <Ionicons name="volume-high" size={18} color={Colors.secondary} />
                <Text style={styles.innerVoiceLabel}>Inner voice says:</Text>
              </View>
              <TextInput
                style={styles.innerVoiceInput}
                value={innerVoiceChallenge}
                onChangeText={setInnerVoiceChallenge}
                placeholder={'"Just skip today, one day won\'t matter"'}
                placeholderTextColor={Colors.gray}
                multiline
                maxLength={300}
              />
            </View>
            <View style={[styles.innerVoiceCard, { borderColor: Colors.primary }]}>
              <View style={styles.innerVoiceRow}>
                <Ionicons name="shield-checkmark" size={18} color={Colors.primary} />
                <Text style={[styles.innerVoiceLabel, { color: Colors.primary }]}>You say back:</Text>
              </View>
              <TextInput
                style={styles.innerVoiceInput}
                value={innerVoiceResponse}
                onChangeText={setInnerVoiceResponse}
                placeholder={'"One day always matters. I\'m building a pattern."'}
                placeholderTextColor={Colors.gray}
                multiline
                maxLength={300}
              />
            </View>
          </View>
        );

      case 'habit_list':
        return (
          <View key={prompt.id} style={styles.promptContainer}>
            <Text style={styles.promptQuestion}>{prompt.question}</Text>
            {prompt.required && <Text style={styles.requiredBadge}>Required</Text>}
            {habitsInput.map((habit, idx) => (
              <View key={idx} style={styles.listItem}>
                <Text style={styles.listItemText}>
                  {habit.name} — {habit.frequency}x/week
                </Text>
                <TouchableOpacity onPress={() => removeHabit(idx)}>
                  <Ionicons name="close-circle" size={20} color={Colors.gray} />
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.habitAddSection}>
              <View style={styles.listAddRow}>
                <TextInput
                  style={styles.listAddInput}
                  value={habitNameInput}
                  onChangeText={setHabitNameInput}
                  placeholder={prompt.placeholder}
                  placeholderTextColor={Colors.gray}
                  onSubmitEditing={addHabit}
                  returnKeyType="done"
                />
                <TouchableOpacity style={styles.listAddButton} onPress={addHabit}>
                  <Ionicons name="add-circle" size={28} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              <Text style={styles.habitFreqLabel}>Times per week</Text>
              <View style={styles.habitFreqRow}>
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <TouchableOpacity
                    key={n}
                    onPress={() => setHabitFreqInput(n)}
                    style={[
                      styles.habitFreqChip,
                      habitFreqInput === n && styles.habitFreqChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.habitFreqChipText,
                        habitFreqInput === n && { color: Colors.white },
                      ]}
                    >
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );

      case 'list':
        return (
          <View key={prompt.id} style={styles.promptContainer}>
            <Text style={styles.promptQuestion}>{prompt.question}</Text>
            {prompt.required && <Text style={styles.requiredBadge}>Required</Text>}
            {(listData[prompt.fieldKey] || []).map((item, idx) => (
              <View key={idx} style={styles.listItem}>
                <Text style={styles.listItemText}>{item}</Text>
                <TouchableOpacity onPress={() => removeListItem(prompt.fieldKey, idx)}>
                  <Ionicons name="close-circle" size={20} color={Colors.gray} />
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.listAddRow}>
              <TextInput
                style={styles.listAddInput}
                value={listInputs[prompt.fieldKey] || ''}
                onChangeText={(v) => setListInputs(prev => ({ ...prev, [prompt.fieldKey]: v }))}
                placeholder={prompt.placeholder}
                placeholderTextColor={Colors.gray}
                onSubmitEditing={() => addListItem(prompt.fieldKey)}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.listAddButton}
                onPress={() => addListItem(prompt.fieldKey)}
              >
                <Ionicons name="add-circle" size={28} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'yes_no':
        return (
          <View key={prompt.id} style={styles.promptContainer}>
            <Text style={styles.promptQuestion}>{prompt.question}</Text>
            <View style={styles.yesNoRow}>
              <TouchableOpacity
                style={[styles.yesNoButton, hasTriedBefore === true && styles.yesNoButtonActive]}
                onPress={() => setHasTriedBefore(true)}
              >
                <Text style={[styles.yesNoButtonText, hasTriedBefore === true && styles.yesNoButtonTextActive]}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.yesNoButton, hasTriedBefore === false && styles.yesNoButtonActive]}
                onPress={() => setHasTriedBefore(false)}
              >
                <Text style={[styles.yesNoButtonText, hasTriedBefore === false && styles.yesNoButtonTextActive]}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'challenge_input':
        return (
          <View key={prompt.id} style={styles.promptContainer}>
            <Text style={styles.promptQuestion}>{prompt.question}</Text>
            {prompt.required && <Text style={styles.requiredBadge}>Required</Text>}
            <View style={styles.challengeExplainer}>
              <Ionicons name="flash" size={16} color={Colors.secondary} />
              <Text style={styles.challengeExplainerText}>
                A challenge is something that gets you outside your comfort zone. You'll reflect on it afterward and grow stronger from the experience.
              </Text>
            </View>
            <Text style={styles.fieldLabel}>Challenge title</Text>
            <InputField
              label=""
              value={formData[prompt.fieldKey] || ''}
              onChangeText={(v) => setField(prompt.fieldKey, v)}
              placeholder={prompt.placeholder}
              maxLength={100}
            />
            <Text style={styles.fieldLabel}>What you'll do (optional)</Text>
            <InputField
              label=""
              value={formData[prompt.fieldKey + '_description'] || ''}
              onChangeText={(v) => setField(prompt.fieldKey + '_description', v)}
              placeholder="Describe specifically what you'll do..."
              multiline
              numberOfLines={3}
              maxLength={300}
            />
          </View>
        );

      default:
        return null;
    }
  };

  const stageInfo = ONBOARDING_STAGES[currentStage - 1];
  const isLastStage = currentStage === ONBOARDING_STAGES.length;

  if (atCap) {
    return (
      <View style={styles.capContainer}>
        <Ionicons name="information-circle" size={48} color={Colors.secondary} />
        <Text style={styles.capTitle}>Goal Limit Reached</Text>
        <Text style={styles.capText}>
          You have {GOAL_CONSTANTS.MAX_ACTIVE} active goals. Complete or archive one to create a new goal.
        </Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} style={{ marginTop: Spacing.lg }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Soft guard modal - encourage Why Discovery first */}
      <Modal visible={showWhyGuard} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="compass-outline" size={40} color={Colors.primary} />
            <Text style={styles.modalTitle}>Discover Your Why First?</Text>
            <Text style={styles.modalBody}>
              Goals are more powerful when connected to your core purpose.
            </Text>
            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={() => {
                setShowWhyGuard(false);
                navigation.replace('WhyDiscoveryFlow');
              }}
            >
              <Text style={styles.modalPrimaryText}>Discover My Why</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSecondaryButton}
              onPress={() => {
                setShowWhyGuard(false);
                setWhyGuardDismissed(true);
              }}
            >
              <Text style={styles.modalSecondaryText}>Create Goal Anyway</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      {/* Stage indicator */}
      <View style={styles.stageHeader}>
        <View style={styles.stageIndicatorRow}>
          {ONBOARDING_STAGES.map((stage, idx) => (
            <View
              key={stage.id}
              style={[
                styles.stageDot,
                idx + 1 <= currentStage && styles.stageDotActive,
                idx + 1 === currentStage && styles.stageDotCurrent,
              ]}
            />
          ))}
        </View>
        <Text style={styles.stageLabel}>
          Stage {stageInfo.id}: {stageInfo.label}
        </Text>
        <Text style={styles.stageSubtitle}>{stageInfo.subtitle}</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Target date (only in Stage 1) */}
        {currentStage === 1 && (
          <View style={styles.promptContainer}>
            <Text style={styles.promptQuestion}>Target Date</Text>
            <TouchableOpacity
              style={styles.dateSelector}
              onPress={() => setShowDatePicker(!showDatePicker)}
            >
              <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
              <Text style={styles.dateSelectorText}>{formatDate(endDate)}</Text>
              <Ionicons name="chevron-down" size={16} color={Colors.gray} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}
          </View>
        )}

        {currentStage === 2 ? (() => {
          const yesNoPrompt = stagePrompts.find(p => p.id === 'past_attempt');
          const conditionalPrompts = stagePrompts.filter(p => p.id !== 'past_attempt');
          return (
            <>
              {yesNoPrompt && renderPrompt(yesNoPrompt)}
              {hasTriedBefore === true && conditionalPrompts.map(renderPrompt)}
              {hasTriedBefore === false && (
                <View style={styles.noAttemptNote}>
                  <Text style={styles.noAttemptNoteText}>
                    Great — you're starting fresh. Let's build the right system from the start.
                  </Text>
                </View>
              )}
            </>
          );
        })() : stagePrompts.map(renderPrompt)}
      </ScrollView>

      {/* Navigation buttons */}
      <View style={styles.navBar}>
        {currentStage > 1 ? (
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={20} color={Colors.primary} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        <Button
          title={isLastStage ? 'Create Goal' : 'Continue'}
          onPress={handleNext}
          loading={loading}
          style={styles.nextButton}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: Colors.border,
  },
  progressBarFill: {
    height: 4,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  stageHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stageIndicatorRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  stageDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  stageDotActive: {
    backgroundColor: Colors.primary,
  },
  stageDotCurrent: {
    backgroundColor: Colors.secondary,
  },
  stageLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
  },
  stageSubtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  promptContainer: {
    marginBottom: Spacing.lg,
  },
  promptQuestion: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.sm,
    lineHeight: 24,
  },
  requiredBadge: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
    marginBottom: Spacing.sm,
  },

  // Slider
  sliderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  sliderChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderChipActive: {
    backgroundColor: Colors.primary,
  },
  sliderChipText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  sliderChipTextActive: {
    color: Colors.white,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  sliderLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },

  // Inner voice pair
  innerVoiceCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.secondary,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  innerVoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  innerVoiceLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
  },
  innerVoiceInput: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    minHeight: 60,
    textAlignVertical: 'top',
  },

  // List input
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  listItemText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    flex: 1,
    marginRight: Spacing.sm,
  },
  listAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  listAddInput: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  listAddButton: {
    padding: Spacing.xs,
  },

  // Date picker
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateSelectorText: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },

  // Nav bar
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  backButtonText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.primary,
  },
  nextButton: {
    minWidth: 140,
  },

  // Cap state
  capContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.lightGray,
  },
  capTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  capText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Habit list
  habitAddSection: {
    marginTop: Spacing.xs,
  },
  habitFreqLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  habitFreqRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  habitFreqChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitFreqChipActive: {
    backgroundColor: Colors.primary,
  },
  habitFreqChipText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  // Why guard modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    gap: Spacing.md,
  },
  modalTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    textAlign: 'center',
  },
  modalBody: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalPrimaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    width: '100%',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  modalPrimaryText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  modalSecondaryButton: {
    paddingVertical: Spacing.sm,
  },
  modalSecondaryText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  // Yes/No buttons
  yesNoRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  yesNoButton: { flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.white },
  yesNoButtonActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  yesNoButtonText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.gray },
  yesNoButtonTextActive: { color: Colors.primary },

  // No-attempt note
  noAttemptNote: { marginTop: Spacing.md, backgroundColor: Colors.primary + '08', borderRadius: BorderRadius.md, padding: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.primary },
  noAttemptNoteText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 20 },

  // Challenge input
  challengeExplainer: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.secondary + '10', borderRadius: BorderRadius.sm, padding: Spacing.md, marginBottom: Spacing.md },
  challengeExplainerText: { flex: 1, fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 20 },
  fieldLabel: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.dark, marginBottom: Spacing.sm, marginTop: Spacing.md },

  // Why context banner
  whyContextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  whyContextText: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
