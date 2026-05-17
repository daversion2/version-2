import React, { useEffect, useRef, useState } from 'react';
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
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import {
  WHY_DISCOVERY_STAGES,
  OPENING_QUESTION_INTRO,
  OPENING_QUESTION,
  OPENING_QUESTION_EXAMPLES,
  WHY_DRILLING_PROMPTS,
  WHY_STATEMENT_GUIDE,
  MIN_WHY_DEPTH,
  MAX_WHY_DEPTH,
  WHY_STATEMENT_MIN_LENGTH,
  GOAL_INTRO_TEXT,
} from '../../constants/whyDiscovery';
import { GOAL_CONSTANTS, ONBOARDING_PROMPTS, ONBOARDING_STAGES, OnboardingPrompt } from '../../constants/goals';
import { InputField } from '../../components/common/InputField';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import {
  markOnboardingComplete,
  saveUsername,
  validateUsername,
  checkUsernameAvailable,
} from '../../services/users';
import { getActiveRewardMessages, RewardMessage } from '../../services/rewardMessages';
import { seedUserRewardMessagesFromGlobals } from '../../services/userRewardMessages';
import {
  initializeWhyProfile,
  saveWhyIterations,
  completeWhyDiscovery,
} from '../../services/whyDiscovery';
import { createGoalWithActions } from '../../services/goals';

const { width } = Dimensions.get('window');

const addDaysToToday = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const formatDate = (date: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

const toYYYYMMDD = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const WhyDiscoveryOnboarding: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [currentStage, setCurrentStage] = useState(1);
  const [saving, setSaving] = useState(false);

  // Stage 1: Welcome + Username
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Stage 2: Opening Question
  const [openingAnswer, setOpeningAnswer] = useState('');

  // Stage 3: 5 Whys
  const [whyIterations, setWhyIterations] = useState<{ question: string; answer: string }[]>([]);
  const [currentWhyText, setCurrentWhyText] = useState('');
  const [coreWhyReached, setCoreWhyReached] = useState(false);

  // Stage 4: Why Statement
  const [contributionPart, setContributionPart] = useState('');
  const [impactPart, setImpactPart] = useState('');

  // Stages 5-9: CBT Goal Onboarding
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
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [listInputs, setListInputs] = useState<Record<string, string>>({});
  const [habitNameInput, setHabitNameInput] = useState('');
  const [habitFreqInput, setHabitFreqInput] = useState(3);

  // Stage 6: Thought Patterns gate
  const [hasTriedBefore, setHasTriedBefore] = useState<boolean | null>(null);

  // Stage 10: Reward Messages
  const [globalMessages, setGlobalMessages] = useState<RewardMessage[]>([]);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getActiveRewardMessages()
      .then(setGlobalMessages)
      .catch((err) => console.warn('Failed to load reward messages:', err));
  }, []);

  useEffect(() => {
    if (user) {
      initializeWhyProfile(user.uid).catch(console.warn);
    }
  }, [user]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentStage / WHY_DISCOVERY_STAGES.length,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStage]);

  // Derived
  const whyStatement = contributionPart.trim() && impactPart.trim()
    ? `To ${contributionPart.trim()} so that ${impactPart.trim()}`
    : '';

  // CBT helpers
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

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setEndDate(date);
  };

  // Maps onboarding stage (5-9) to CBT prompt stage (1-5)
  const getCBTStageNumber = (onboardingStage: number) => onboardingStage - 4;

  const getCBTStagePrompts = (onboardingStage: number) =>
    ONBOARDING_PROMPTS.filter(p => p.stage === getCBTStageNumber(onboardingStage));

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  const saveGoalData = async () => {
    if (!user || !formData.name?.trim()) return;
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
    } catch (e) {
      console.warn('Failed to save goal data:', e);
    }
  };

  const handleSkip = async () => {
    // Save partial progress
    if (user) {
      try {
        if (whyIterations.length > 0) {
          await saveWhyIterations(
            user.uid,
            whyIterations.map((w, i) => ({
              id: `why_${i}`,
              depth: i + 1,
              question: w.question,
              answer: w.answer,
            })),
            coreWhyReached
          );
        }
        // If skipping from a CBT stage after stage 5 and goal data exists, save it
        if (currentStage >= 6 && currentStage <= 9 && formData.name?.trim()) {
          await saveGoalData();
        }
      } catch (e) {
        console.warn('Failed to save partial progress:', e);
      }
    }
    // Skip from any CBT goal stage (5-9) jumps to 10 (reward messages)
    if (currentStage >= 5 && currentStage <= 9) {
      setCurrentStage(10);
    } else {
      setCurrentStage(prev => prev + 1);
    }
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleNext = async () => {
    if (!validateCurrentStage()) return;

    if (currentStage < WHY_DISCOVERY_STAGES.length) {
      await saveCurrentStageData();
      setCurrentStage(prev => prev + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      await handleFinalSubmit();
    }
  };

  const handleBack = () => {
    if (currentStage > 1) {
      setCurrentStage(prev => prev - 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const validateCurrentStage = (): boolean => {
    switch (currentStage) {
      case 1:
        if (username.trim().length < 3) {
          Alert.alert('Required', 'Please enter a username (at least 3 characters).');
          return false;
        }
        return true;
      case 2:
        if (openingAnswer.trim().length < 5) {
          Alert.alert('Required', 'Please share what brought you here today.');
          return false;
        }
        return true;
      case 3:
        if (whyIterations.length < MIN_WHY_DEPTH && !coreWhyReached) {
          Alert.alert('Keep going', `Try to go at least ${MIN_WHY_DEPTH} layers deep.`);
          return false;
        }
        return true;
      case 4:
        if (contributionPart.trim().length < WHY_STATEMENT_MIN_LENGTH) {
          Alert.alert('Required', 'Please complete the "To..." part of your Why statement.');
          return false;
        }
        if (impactPart.trim().length < WHY_STATEMENT_MIN_LENGTH) {
          Alert.alert('Required', 'Please complete the "so that..." part of your Why statement.');
          return false;
        }
        return true;
      case 5:
      case 6:
      case 7:
      case 8:
      case 9: {
        // Stage 6: Thought Patterns — gate on hasTriedBefore
        if (currentStage === 6) {
          if (hasTriedBefore === null) {
            Alert.alert('Required', 'Please answer whether you\'ve tried this before.');
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

        // CBT goal stages — validate required prompts
        const prompts = getCBTStagePrompts(currentStage);
        for (const prompt of prompts) {
          if (!prompt.required) continue;
          if (prompt.type === 'slider') continue; // always has a value
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
          if (prompt.fieldKey === 'name') {
            if (!formData.name?.trim()) {
              Alert.alert('Required', 'Please enter a goal name.');
              return false;
            }
          } else if (!formData[prompt.fieldKey]?.trim()) {
            Alert.alert('Required', `Please answer: "${prompt.question}"`);
            return false;
          }
        }
        // Stage 5 also needs a valid target date
        if (currentStage === 5) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (endDate <= today) {
            Alert.alert('Invalid Date', 'Target date must be in the future.');
            return false;
          }
        }
        return true;
      }
      case 10:
        if (selectedMessageIds.size < 3) {
          Alert.alert('Required', 'Please select at least 3 reward messages.');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  // ============================================================================
  // SAVING
  // ============================================================================

  const saveCurrentStageData = async () => {
    if (!user) return;
    try {
      switch (currentStage) {
        case 1:
          break;
        case 2:
          break;
        case 3:
          await saveWhyIterations(
            user.uid,
            whyIterations.map((w, i) => ({
              id: `why_${i}`,
              depth: i + 1,
              question: w.question,
              answer: w.answer,
            })),
            coreWhyReached
          );
          break;
        case 4:
          if (whyStatement) {
            await completeWhyDiscovery(user.uid, whyStatement, contributionPart.trim(), impactPart.trim());
          }
          break;
        case 9:
          // Save goal + habits + challenge together when leaving the last CBT stage
          await saveGoalData();
          break;
      }
    } catch (e) {
      console.warn('Failed to save stage data:', e);
    }
  };

  const handleFinalSubmit = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (selectedMessageIds.size > 0) {
        await seedUserRewardMessagesFromGlobals(user.uid, Array.from(selectedMessageIds));
      }
      await markOnboardingComplete(user.uid);
      await refreshProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete onboarding');
      setSaving(false);
    }
  };

  // ============================================================================
  // STAGE 1: USERNAME
  // ============================================================================

  const handleUsernameNext = async () => {
    const trimmed = username.trim();
    const validation = validateUsername(trimmed);
    if (!validation.valid) {
      setUsernameError(validation.error || 'Invalid username');
      return;
    }

    setCheckingUsername(true);
    try {
      const available = await checkUsernameAvailable(trimmed);
      if (!available) {
        setUsernameError('This username is already taken');
        return;
      }
      setUsernameError('');
      if (user) {
        await saveUsername(user.uid, trimmed);
      }
      setCurrentStage(2);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch (error) {
      setUsernameError('Error checking username');
    } finally {
      setCheckingUsername(false);
    }
  };

  // ============================================================================
  // STAGE 3: 5 WHYS
  // ============================================================================

  const getCurrentWhyPrompt = (): string => {
    const depth = whyIterations.length + 1;
    const promptDef = WHY_DRILLING_PROMPTS.find(p => p.depth === depth) || WHY_DRILLING_PROMPTS[WHY_DRILLING_PROMPTS.length - 1];
    const prevAnswer = depth === 1
      ? openingAnswer
      : whyIterations[whyIterations.length - 1]?.answer || '';
    const truncated = prevAnswer.length > 60 ? prevAnswer.substring(0, 60) + '...' : prevAnswer;
    return promptDef.template.replace('{previousAnswer}', truncated);
  };

  const submitWhyAnswer = () => {
    if (!currentWhyText.trim()) return;
    const question = getCurrentWhyPrompt();
    setWhyIterations(prev => [...prev, { question, answer: currentWhyText.trim() }]);
    setCurrentWhyText('');
  };

  const markCoreWhy = () => {
    if (currentWhyText.trim()) submitWhyAnswer();
    setCoreWhyReached(true);
  };

  // ============================================================================
  // STAGE 8: REWARD MESSAGES
  // ============================================================================

  const toggleMessageSelection = (id: string) => {
    setSelectedMessageIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ============================================================================
  // RENDER STAGES
  // ============================================================================

  const renderStage1 = () => (
    <View style={styles.stageContent}>
      <Text style={styles.welcomeTitle}>Welcome to Neuro Nudge</Text>
      <Text style={styles.welcomeBody}>
        Before we build your willpower, let's discover what drives you.{'\n\n'}
        Your Why is the foundation everything else stands on.
      </Text>
      <View style={styles.usernameContainer}>
        <TextInput
          style={[styles.usernameInput, usernameError ? styles.usernameInputError : null]}
          placeholder="Choose a username"
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={username}
          onChangeText={(t) => { setUsername(t); setUsernameError(''); }}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
        />
        {checkingUsername && <ActivityIndicator color={Colors.white} style={{ marginTop: Spacing.sm }} />}
        {usernameError ? (
          <Text style={styles.errorText}>{usernameError}</Text>
        ) : (
          <Text style={styles.hintTextWhite}>3-20 characters, letters, numbers, underscores</Text>
        )}
      </View>
    </View>
  );

  const renderStage2 = () => (
    <View style={styles.stageContent}>
      <Text style={styles.stageIntro}>{OPENING_QUESTION_INTRO}</Text>
      <Text style={styles.openingQuestionLabel}>Let's start here:</Text>
      <Text style={styles.promptQuestion}>{OPENING_QUESTION}</Text>
      <View style={styles.examplesSection}>
        <Text style={styles.examplesTitle}>Example answers to get you started:</Text>
        {OPENING_QUESTION_EXAMPLES.map((example, idx) => (
          <Text key={idx} style={styles.exampleText}>"{example}"</Text>
        ))}
      </View>
      <TextInput
        style={styles.multilineInput}
        value={openingAnswer}
        onChangeText={setOpeningAnswer}
        placeholder="Type your answer here..."
        placeholderTextColor={Colors.gray}
        multiline
        numberOfLines={4}
        maxLength={500}
        textAlignVertical="top"
      />
    </View>
  );

  const renderStage3 = () => {
    const currentDepth = whyIterations.length + 1;
    const canMarkCore = whyIterations.length >= MIN_WHY_DEPTH;
    const atMaxDepth = whyIterations.length >= MAX_WHY_DEPTH;

    return (
      <View style={styles.stageContent}>
        <Text style={styles.stageIntro}>
          Now let's drill into what really matters. Each time, we'll ask why that matters until you hit the root — the thing that drives everything else.
        </Text>
        <View style={styles.originalAnswerCard}>
          <Text style={styles.originalAnswerLabel}>Your starting point:</Text>
          <Text style={styles.originalAnswerText}>"{openingAnswer}"</Text>
        </View>
        {whyIterations.map((iteration, idx) => (
          <View key={idx} style={styles.whyIterationCard}>
            <View style={styles.whyDepthBadge}>
              <Text style={styles.whyDepthText}>{idx + 1}</Text>
            </View>
            <View style={styles.whyIterationContent}>
              <Text style={styles.whyIterationQuestion}>{iteration.question}</Text>
              <Text style={styles.whyIterationAnswer}>{iteration.answer}</Text>
            </View>
          </View>
        ))}
        {!coreWhyReached && !atMaxDepth && (
          <View style={styles.currentWhySection}>
            <View style={styles.whyDepthBadge}>
              <Text style={styles.whyDepthText}>{currentDepth}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.promptQuestion}>{getCurrentWhyPrompt()}</Text>
              <TextInput
                style={styles.multilineInput}
                value={currentWhyText}
                onChangeText={setCurrentWhyText}
                placeholder={WHY_DRILLING_PROMPTS[Math.min(currentDepth - 1, WHY_DRILLING_PROMPTS.length - 1)].placeholder}
                placeholderTextColor={Colors.gray}
                multiline
                numberOfLines={3}
                maxLength={500}
                textAlignVertical="top"
              />
              <View style={styles.whyButtonRow}>
                <TouchableOpacity
                  style={[styles.whySubmitButton, !currentWhyText.trim() && { opacity: 0.4 }]}
                  onPress={submitWhyAnswer}
                  disabled={!currentWhyText.trim()}
                >
                  <Text style={styles.whySubmitText}>Answer & Go Deeper</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        {canMarkCore && !coreWhyReached && (
          <TouchableOpacity style={styles.coreWhyButton} onPress={markCoreWhy}>
            <Ionicons name="checkmark-circle" size={22} color={Colors.white} />
            <Text style={styles.coreWhyButtonText}>This is my core Why</Text>
          </TouchableOpacity>
        )}
        {coreWhyReached && (
          <View style={styles.coreWhyReachedBanner}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
            <Text style={styles.coreWhyReachedText}>Core Why identified</Text>
          </View>
        )}
      </View>
    );
  };

  const renderStage4 = () => {
    const previewStatement = contributionPart.trim() && impactPart.trim()
      ? `To ${contributionPart.trim()} so that ${impactPart.trim()}`
      : '';

    return (
      <View style={styles.stageContent}>
        <Text style={styles.stageIntro}>
          Now let's reframe what you discovered into a clear purpose statement.{'\n\n'}
          Your Why follows this format:{'\n'}
          <Text style={{ fontFamily: Fonts.secondaryBold }}>"{WHY_STATEMENT_GUIDE.format}"</Text>
        </Text>
        <View style={styles.examplesSection}>
          <Text style={styles.examplesTitle}>Examples</Text>
          {WHY_STATEMENT_GUIDE.examples.map((ex, idx) => (
            <Text key={idx} style={styles.exampleText}>"{ex}"</Text>
          ))}
        </View>
        <View style={styles.statementInputSection}>
          <Text style={styles.statementLabel}>To:</Text>
          <TextInput
            style={styles.statementInput}
            value={contributionPart}
            onChangeText={setContributionPart}
            placeholder="what you contribute / your action..."
            placeholderTextColor={Colors.gray}
            multiline
            maxLength={200}
            textAlignVertical="top"
          />
          <Text style={styles.statementLabel}>So that:</Text>
          <TextInput
            style={styles.statementInput}
            value={impactPart}
            onChangeText={setImpactPart}
            placeholder="the impact / what changes because of it..."
            placeholderTextColor={Colors.gray}
            multiline
            maxLength={200}
            textAlignVertical="top"
          />
        </View>
        {previewStatement.length > 0 && (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Your Why</Text>
            <Text style={styles.previewStatement}>"{previewStatement}"</Text>
          </View>
        )}
        <View style={styles.tipsSection}>
          {WHY_STATEMENT_GUIDE.tips.map((tip, idx) => (
            <Text key={idx} style={styles.tipText}>{'\u2022'} {tip}</Text>
          ))}
        </View>
      </View>
    );
  };

  // ============================================================================
  // CBT PROMPT RENDERING (mirrors GoalOnboardingFlow)
  // ============================================================================

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
            {prompt.fieldKey === 'why_connection' && whyStatement ? (
              <View style={styles.whyContextBanner}>
                <Ionicons name="compass" size={16} color={Colors.primary} />
                <Text style={styles.whyContextText}>Your Why: "{whyStatement}"</Text>
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

  const renderCBTStage = () => {
    const cbtStageIndex = getCBTStageNumber(currentStage) - 1;
    const cbtStageInfo = ONBOARDING_STAGES[cbtStageIndex];
    const prompts = getCBTStagePrompts(currentStage);

    return (
      <View style={styles.stageContent}>
        {/* Show intro text and Why context on the first CBT stage */}
        {currentStage === 5 && (
          <>
            <Text style={styles.stageIntro}>{GOAL_INTRO_TEXT}</Text>
            {whyStatement.length > 0 && (
              <View style={styles.contextBanner}>
                <Text style={styles.contextBannerLabel}>Your Why:</Text>
                <Text style={styles.contextBannerText}>"{whyStatement}"</Text>
              </View>
            )}
          </>
        )}

        {/* CBT sub-stage header */}
        <View style={styles.cbtSubHeader}>
          <View style={styles.cbtSubDots}>
            {ONBOARDING_STAGES.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.cbtSubDot,
                  idx + 1 <= getCBTStageNumber(currentStage) && styles.cbtSubDotActive,
                  idx + 1 === getCBTStageNumber(currentStage) && styles.cbtSubDotCurrent,
                ]}
              />
            ))}
          </View>
          <Text style={styles.cbtSubLabel}>
            {cbtStageInfo.label}: {cbtStageInfo.subtitle}
          </Text>
        </View>

        {/* Target date (only in CBT stage 1 = onboarding stage 5) */}
        {currentStage === 5 && (
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

        {currentStage === 6 ? (() => {
          const yesNoPrompt = prompts.find(p => p.id === 'past_attempt');
          const conditionalPrompts = prompts.filter(p => p.id !== 'past_attempt');
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
        })() : prompts.map(renderPrompt)}
      </View>
    );
  };

  const renderStage10 = () => (
    <View style={styles.stageContent}>
      <Text style={styles.stageIntro}>
        These messages show up when you complete a challenge. Pick the ones that hit hardest — you can always change them later.
      </Text>
      <Text style={styles.hintText}>
        Pick at least 3 ({selectedMessageIds.size} selected)
      </Text>
      {globalMessages.map((msg) => {
        const isSelected = selectedMessageIds.has(msg.id);
        return (
          <TouchableOpacity
            key={msg.id}
            style={[styles.messageChip, isSelected && styles.messageChipSelected]}
            onPress={() => toggleMessageSelection(msg.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.messageChipText, isSelected && styles.messageChipTextSelected]}>
              {msg.text}
            </Text>
            {isSelected && (
              <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  const stageInfo = WHY_DISCOVERY_STAGES[currentStage - 1];
  const isLastStage = currentStage === WHY_DISCOVERY_STAGES.length;
  const isStage1 = currentStage === 1;

  const isNextDisabled = saving || checkingUsername
    || (currentStage === 1 && username.trim().length < 3)
    || (currentStage === 10 && selectedMessageIds.size < 3);

  if (isStage1) {
    return (
      <View style={styles.welcomeContainer}>
        <View style={styles.welcomeContent}>
          {renderStage1()}
        </View>
        <Button
          title="Continue"
          onPress={handleUsernameNext}
          disabled={isNextDisabled}
          loading={checkingUsername}
          style={styles.welcomeButton}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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

      <View style={styles.stageHeader}>
        <View style={styles.stageHeaderTop}>
          <View style={styles.stageIndicatorRow}>
            {WHY_DISCOVERY_STAGES.map((stage, idx) => (
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
          {stageInfo.skippable && (
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip for now</Text>
              <Ionicons name="arrow-forward" size={14} color={Colors.gray} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.stageLabel}>{stageInfo.label}</Text>
        <Text style={styles.stageSubtitle}>{stageInfo.subtitle}</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {currentStage === 2 && renderStage2()}
        {currentStage === 3 && renderStage3()}
        {currentStage === 4 && renderStage4()}
        {currentStage >= 5 && currentStage <= 9 && renderCBTStage()}
        {currentStage === 10 && renderStage10()}
      </ScrollView>

      <View style={styles.navBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Button
          title={isLastStage ? "Let's Go" : 'Continue'}
          onPress={handleNext}
          disabled={isNextDisabled}
          loading={saving}
          style={styles.nextButton}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Welcome (Stage 1)
  welcomeContainer: { flex: 1, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.lg },
  welcomeContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  welcomeButton: { width: width - Spacing.lg * 2, marginBottom: Spacing.xxl },
  welcomeTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xxl, color: Colors.white, textAlign: 'center', marginBottom: Spacing.md },
  welcomeBody: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.white, textAlign: 'center', opacity: 0.9, lineHeight: 24 },
  usernameContainer: { width: width - Spacing.lg * 2, marginTop: Spacing.xl },
  usernameInput: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontFamily: Fonts.secondary, fontSize: FontSizes.lg, color: Colors.white, textAlign: 'center', borderWidth: 2, borderColor: 'transparent' },
  usernameInputError: { borderColor: '#FF6B6B' },
  errorText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: '#FF6B6B', textAlign: 'center', marginTop: Spacing.sm },
  hintTextWhite: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.white, textAlign: 'center', marginTop: Spacing.sm, opacity: 0.7 },

  // Main flow
  screen: { flex: 1, backgroundColor: Colors.white },
  progressBarContainer: { height: 4, backgroundColor: Colors.lightGray },
  progressBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  stageHeader: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.lightGray },
  stageHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  stageIndicatorRow: { flexDirection: 'row', gap: 6 },
  stageDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.lightGray },
  stageDotActive: { backgroundColor: Colors.primary, opacity: 0.4 },
  stageDotCurrent: { opacity: 1, width: 16 },
  skipButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  skipText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray },
  stageLabel: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
  stageSubtitle: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, marginTop: 2 },
  scrollView: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.lightGray, backgroundColor: Colors.white },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: Spacing.sm },
  backText: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.primary },
  nextButton: { minWidth: 140 },

  // Shared
  stageContent: { flex: 1 },
  stageIntro: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark, lineHeight: 24, marginBottom: Spacing.lg },
  promptQuestion: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark, lineHeight: 24, marginBottom: Spacing.sm },
  multilineInput: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, backgroundColor: Colors.white, minHeight: 100, textAlignVertical: 'top' },
  singleLineInput: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, backgroundColor: Colors.white, marginBottom: Spacing.lg },
  hintText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, textAlign: 'center', marginBottom: Spacing.md },
  fieldLabel: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.dark, marginBottom: Spacing.sm, marginTop: Spacing.md },

  // Stage 2: Opening Question
  openingQuestionLabel: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: Colors.dark, marginBottom: Spacing.xs },
  examplesSection: { backgroundColor: Colors.lightGray, borderRadius: BorderRadius.sm, padding: Spacing.md, marginBottom: Spacing.lg },
  examplesTitle: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.gray, textTransform: 'uppercase', marginBottom: Spacing.sm },
  exampleText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 20, marginBottom: Spacing.sm, fontStyle: 'italic' },

  // Stage 3: Whys
  originalAnswerCard: { backgroundColor: Colors.primary + '08', borderLeftWidth: 3, borderLeftColor: Colors.primary, borderRadius: BorderRadius.sm, padding: Spacing.md, marginBottom: Spacing.lg },
  originalAnswerLabel: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.gray, textTransform: 'uppercase', marginBottom: Spacing.xs },
  originalAnswerText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 20, fontStyle: 'italic' },
  whyIterationCard: { flexDirection: 'row', marginBottom: Spacing.md, gap: Spacing.sm },
  whyDepthBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  whyDepthText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xs, color: Colors.white },
  whyIterationContent: { flex: 1 },
  whyIterationQuestion: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, marginBottom: 4 },
  whyIterationAnswer: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark, lineHeight: 22, backgroundColor: Colors.lightGray, borderRadius: BorderRadius.sm, padding: Spacing.sm },
  currentWhySection: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  whyButtonRow: { flexDirection: 'row', marginTop: Spacing.sm },
  whySubmitButton: { backgroundColor: Colors.lightGray, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  whySubmitText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.primary },
  coreWhyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.md, marginTop: Spacing.lg },
  coreWhyButtonText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.white },
  coreWhyReachedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.lightGray, borderRadius: BorderRadius.md, paddingVertical: Spacing.md, marginTop: Spacing.lg },
  coreWhyReachedText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: Colors.primary },

  // Stage 4: Statement
  statementInputSection: { marginBottom: Spacing.lg },
  statementLabel: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.primary, marginBottom: Spacing.xs, marginTop: Spacing.md },
  statementInput: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, minHeight: 60, textAlignVertical: 'top' },
  previewCard: { backgroundColor: Colors.primary + '10', borderWidth: 1.5, borderColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.lg, marginBottom: Spacing.lg },
  previewLabel: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.primary, textTransform: 'uppercase', marginBottom: Spacing.sm },
  previewStatement: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark, lineHeight: 26 },
  tipsSection: { gap: Spacing.sm },
  tipText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, lineHeight: 20 },

  // CBT Goal Stages (5-9)
  contextBanner: { backgroundColor: Colors.primary + '08', borderLeftWidth: 3, borderLeftColor: Colors.primary, borderRadius: BorderRadius.sm, padding: Spacing.md, marginBottom: Spacing.lg },
  contextBannerLabel: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.primary, textTransform: 'uppercase', marginBottom: Spacing.xs },
  contextBannerText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 20, fontStyle: 'italic' },
  promptContainer: { marginBottom: Spacing.lg },
  requiredBadge: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.secondary, marginBottom: Spacing.sm },
  whyContextBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.primary + '10', borderRadius: BorderRadius.sm, padding: Spacing.md, marginBottom: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.primary },
  whyContextText: { flex: 1, fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, fontStyle: 'italic', lineHeight: 20 },
  cbtSubHeader: { marginBottom: Spacing.lg },
  cbtSubDots: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.sm },
  cbtSubDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  cbtSubDotActive: { backgroundColor: Colors.primary },
  cbtSubDotCurrent: { backgroundColor: Colors.secondary },
  cbtSubLabel: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.gray },

  // Slider
  sliderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.sm },
  sliderChip: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sliderChipActive: { backgroundColor: Colors.primary },
  sliderChipText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.primary },
  sliderChipTextActive: { color: Colors.white },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  sliderLabel: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },

  // Inner voice pair
  innerVoiceCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.secondary, padding: Spacing.md, marginBottom: Spacing.sm },
  innerVoiceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  innerVoiceLabel: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.secondary },
  innerVoiceInput: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark, minHeight: 60, textAlignVertical: 'top' },

  // List input
  listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.white, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, marginBottom: Spacing.xs, borderWidth: 1, borderColor: Colors.border },
  listItemText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, flex: 1, marginRight: Spacing.sm },
  listAddRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs },
  listAddInput: { flex: 1, fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark, backgroundColor: Colors.white, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  listAddButton: { padding: Spacing.xs },

  // Date picker
  dateSelector: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.white, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  dateSelectorText: { flex: 1, fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark },

  // Habit list
  habitAddSection: { marginTop: Spacing.xs },
  habitFreqLabel: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, marginTop: Spacing.sm, marginBottom: Spacing.xs },
  habitFreqRow: { flexDirection: 'row', gap: Spacing.xs },
  habitFreqChip: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  habitFreqChipActive: { backgroundColor: Colors.primary },
  habitFreqChipText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.primary },

  // Yes/No buttons (Thought Patterns gate)
  yesNoRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  yesNoButton: { flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.white },
  yesNoButtonActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  yesNoButtonText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.gray },
  yesNoButtonTextActive: { color: Colors.primary },

  // No-attempt note
  noAttemptNote: { marginTop: Spacing.md, backgroundColor: Colors.primary + '08', borderRadius: BorderRadius.md, padding: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.primary },
  noAttemptNoteText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 20 },

  // Challenge input explainer
  challengeExplainer: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.secondary + '10', borderRadius: BorderRadius.sm, padding: Spacing.md, marginBottom: Spacing.md },
  challengeExplainerText: { flex: 1, fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 20 },

  // Stage 10: Reward Messages
  messageChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.lightGray, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderWidth: 2, borderColor: 'transparent', marginBottom: Spacing.sm },
  messageChipSelected: { backgroundColor: Colors.primary + '10', borderColor: Colors.primary },
  messageChipText: { flex: 1, fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, opacity: 0.8, lineHeight: 20 },
  messageChipTextSelected: { opacity: 1, fontFamily: Fonts.secondaryBold },
});
