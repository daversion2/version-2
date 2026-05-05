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
  CHALLENGE_INTRO_TEXT,
  HABIT_INTRO_TEXT,
  GOAL_END_DATE_PRESETS,
  GOAL_CATEGORIES,
} from '../../constants/whyDiscovery';
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

const getTodayStr = () => new Date().toISOString().split('T')[0];
const addDaysToToday = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

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

  // Stage 5: Goal
  const [goalName, setGoalName] = useState('');
  const [goalCategory, setGoalCategory] = useState('Physical');
  const [goalWhyConnection, setGoalWhyConnection] = useState('');
  const [goalEndDatePreset, setGoalEndDatePreset] = useState<number | null>(60);
  const [goalEndDateCustom, setGoalEndDateCustom] = useState('');

  // Stage 6: Challenge
  const [challengeName, setChallengeName] = useState('');
  const [challengeCategory, setChallengeCategory] = useState('Physical');
  const [challengeDifficulty, setChallengeDifficulty] = useState(3);

  // Stage 7: Habit
  const [habitName, setHabitName] = useState('');
  const [habitCategory, setHabitCategory] = useState('Physical');
  const [habitFrequency, setHabitFrequency] = useState(3);

  // Stage 8: Reward Messages
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
  const goalEndDate = goalEndDatePreset
    ? addDaysToToday(goalEndDatePreset)
    : goalEndDateCustom;

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  const saveGoalData = async () => {
    if (!user || !goalName.trim()) return;
    try {
      await createGoalWithActions(user.uid, {
        name: goalName.trim(),
        end_date: goalEndDate || addDaysToToday(60),
        why_connection: goalWhyConnection.trim() || undefined,
      }, {
        habits: habitName.trim()
          ? [{ name: habitName.trim(), category_id: habitCategory, target_count_per_week: habitFrequency }]
          : [],
        firstChallenge: challengeName.trim()
          ? { name: challengeName.trim(), category_id: challengeCategory, difficulty_expected: challengeDifficulty }
          : undefined,
      });
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
        // If skipping from stage 6 or 7, save whatever goal data exists
        if (currentStage >= 6 && goalName.trim()) {
          await saveGoalData();
        }
      } catch (e) {
        console.warn('Failed to save partial progress:', e);
      }
    }
    // Skip from stage 5 jumps to 8 (no goal = can't have challenge/habit)
    // Skip from stage 6 or 7 advances normally
    if (currentStage === 5) {
      setCurrentStage(8);
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
        if (goalName.trim().length < 3) {
          Alert.alert('Required', 'Please name your goal (at least 3 characters).');
          return false;
        }
        if (!goalEndDate) {
          Alert.alert('Required', 'Please set a target date for your goal.');
          return false;
        }
        return true;
      case 6:
        if (challengeName.trim().length < 1) {
          Alert.alert('Required', 'Please name your first challenge.');
          return false;
        }
        return true;
      case 7:
        if (habitName.trim().length < 1) {
          Alert.alert('Required', 'Please name your first habit.');
          return false;
        }
        return true;
      case 8:
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
        case 7:
          // Save goal + challenge + habit together when leaving stage 7
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

  const renderStage5 = () => (
    <View style={styles.stageContent}>
      <Text style={styles.stageIntro}>{GOAL_INTRO_TEXT}</Text>

      {/* Why context */}
      {whyStatement.length > 0 && (
        <View style={styles.contextBanner}>
          <Text style={styles.contextBannerLabel}>Your Why:</Text>
          <Text style={styles.contextBannerText}>"{whyStatement}"</Text>
        </View>
      )}

      {/* Goal Name */}
      <Text style={styles.fieldLabel}>What's your goal?</Text>
      <TextInput
        style={styles.singleLineInput}
        value={goalName}
        onChangeText={setGoalName}
        placeholder="e.g. Get in the best shape of my life"
        placeholderTextColor={Colors.gray}
        maxLength={80}
      />

      {/* Category */}
      <Text style={styles.fieldLabel}>Category</Text>
      <View style={styles.categoryPicker}>
        {GOAL_CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryCard, goalCategory === cat.id && { borderColor: cat.color, backgroundColor: cat.color + '12' }]}
            onPress={() => setGoalCategory(cat.id)}
          >
            <Ionicons name={cat.icon as any} size={22} color={goalCategory === cat.id ? cat.color : Colors.gray} />
            <Text style={[styles.categoryCardText, goalCategory === cat.id && { color: cat.color, fontFamily: Fonts.secondaryBold }]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Why Connection */}
      <Text style={styles.fieldLabel}>How does this goal connect to your Why? (optional)</Text>
      <TextInput
        style={styles.multilineInput}
        value={goalWhyConnection}
        onChangeText={setGoalWhyConnection}
        placeholder="Think about how achieving this serves your deeper purpose..."
        placeholderTextColor={Colors.gray}
        multiline
        numberOfLines={3}
        maxLength={300}
        textAlignVertical="top"
      />

      {/* End Date */}
      <Text style={styles.fieldLabel}>Target deadline</Text>
      <View style={styles.datePresetRow}>
        {GOAL_END_DATE_PRESETS.map(days => (
          <TouchableOpacity
            key={days}
            style={[styles.datePresetChip, goalEndDatePreset === days && styles.datePresetChipSelected]}
            onPress={() => { setGoalEndDatePreset(days); setGoalEndDateCustom(''); }}
          >
            <Text style={[styles.datePresetChipText, goalEndDatePreset === days && styles.datePresetChipTextSelected]}>
              {days} days
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.datePresetChip, goalEndDatePreset === null && styles.datePresetChipSelected]}
          onPress={() => setGoalEndDatePreset(null)}
        >
          <Text style={[styles.datePresetChipText, goalEndDatePreset === null && styles.datePresetChipTextSelected]}>
            Custom
          </Text>
        </TouchableOpacity>
      </View>
      {goalEndDatePreset === null && (
        <TextInput
          style={styles.singleLineInput}
          value={goalEndDateCustom}
          onChangeText={setGoalEndDateCustom}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.gray}
          maxLength={10}
          keyboardType="numbers-and-punctuation"
        />
      )}
    </View>
  );

  const renderStage6 = () => (
    <View style={styles.stageContent}>
      <Text style={styles.stageIntro}>{CHALLENGE_INTRO_TEXT}</Text>

      {/* Challenge Name */}
      <Text style={styles.fieldLabel}>Your first challenge</Text>
      <TextInput
        style={styles.singleLineInput}
        value={challengeName}
        onChangeText={setChallengeName}
        placeholder="e.g. Take a cold shower, No phone for 2 hours"
        placeholderTextColor={Colors.gray}
        maxLength={80}
      />

      {/* Category */}
      <Text style={styles.fieldLabel}>Category</Text>
      <View style={styles.categoryPicker}>
        {GOAL_CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryCard, challengeCategory === cat.id && { borderColor: cat.color, backgroundColor: cat.color + '12' }]}
            onPress={() => setChallengeCategory(cat.id)}
          >
            <Ionicons name={cat.icon as any} size={22} color={challengeCategory === cat.id ? cat.color : Colors.gray} />
            <Text style={[styles.categoryCardText, challengeCategory === cat.id && { color: cat.color, fontFamily: Fonts.secondaryBold }]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Difficulty */}
      <Text style={styles.fieldLabel}>How hard is this? (1 = easy, 5 = brutal)</Text>
      <View style={styles.chipRow}>
        {[1, 2, 3, 4, 5].map(n => (
          <TouchableOpacity
            key={n}
            style={[styles.numberChip, challengeDifficulty === n && styles.numberChipSelected]}
            onPress={() => setChallengeDifficulty(n)}
          >
            <Text style={[styles.numberChipText, challengeDifficulty === n && styles.numberChipTextSelected]}>
              {n}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStage7 = () => (
    <View style={styles.stageContent}>
      <Text style={styles.stageIntro}>{HABIT_INTRO_TEXT}</Text>

      {/* Habit Name */}
      <Text style={styles.fieldLabel}>Your first habit</Text>
      <TextInput
        style={styles.singleLineInput}
        value={habitName}
        onChangeText={setHabitName}
        placeholder="e.g. Exercise, Meditate, Read 20 minutes"
        placeholderTextColor={Colors.gray}
        maxLength={80}
      />

      {/* Category */}
      <Text style={styles.fieldLabel}>Category</Text>
      <View style={styles.categoryPicker}>
        {GOAL_CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryCard, habitCategory === cat.id && { borderColor: cat.color, backgroundColor: cat.color + '12' }]}
            onPress={() => setHabitCategory(cat.id)}
          >
            <Ionicons name={cat.icon as any} size={22} color={habitCategory === cat.id ? cat.color : Colors.gray} />
            <Text style={[styles.categoryCardText, habitCategory === cat.id && { color: cat.color, fontFamily: Fonts.secondaryBold }]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Frequency */}
      <Text style={styles.fieldLabel}>How many times per week?</Text>
      <View style={styles.chipRow}>
        {[1, 2, 3, 4, 5, 6, 7].map(n => (
          <TouchableOpacity
            key={n}
            style={[styles.numberChip, habitFrequency === n && styles.numberChipSelected]}
            onPress={() => setHabitFrequency(n)}
          >
            <Text style={[styles.numberChipText, habitFrequency === n && styles.numberChipTextSelected]}>
              {n}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.chipRowHint}>
        {habitFrequency === 7 ? 'Every day' : `${habitFrequency}x per week`}
      </Text>
    </View>
  );

  const renderStage8 = () => (
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
    || (currentStage === 8 && selectedMessageIds.size < 3);

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
        {currentStage === 5 && renderStage5()}
        {currentStage === 6 && renderStage6()}
        {currentStage === 7 && renderStage7()}
        {currentStage === 8 && renderStage8()}
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

  // Stages 5-7: Goal/Challenge/Habit
  contextBanner: { backgroundColor: Colors.primary + '08', borderLeftWidth: 3, borderLeftColor: Colors.primary, borderRadius: BorderRadius.sm, padding: Spacing.md, marginBottom: Spacing.lg },
  contextBannerLabel: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.primary, textTransform: 'uppercase', marginBottom: Spacing.xs },
  contextBannerText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 20, fontStyle: 'italic' },
  categoryPicker: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  categoryCard: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: BorderRadius.sm, borderWidth: 1.5, borderColor: Colors.border, gap: Spacing.xs },
  categoryCardText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  datePresetRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md, flexWrap: 'wrap' },
  datePresetChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border },
  datePresetChipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary + '12' },
  datePresetChipText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark },
  datePresetChipTextSelected: { fontFamily: Fonts.secondaryBold, color: Colors.primary },
  chipRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  numberChip: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  numberChipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  numberChipText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark },
  numberChipTextSelected: { color: Colors.white },
  chipRowHint: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, marginTop: Spacing.xs },

  // Stage 8: Reward Messages
  messageChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.lightGray, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderWidth: 2, borderColor: 'transparent', marginBottom: Spacing.sm },
  messageChipSelected: { backgroundColor: Colors.primary + '10', borderColor: Colors.primary },
  messageChipText: { flex: 1, fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, opacity: 0.8, lineHeight: 20 },
  messageChipTextSelected: { opacity: 1, fontFamily: Fonts.secondaryBold },
});
