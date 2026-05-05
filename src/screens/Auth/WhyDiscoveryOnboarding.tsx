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
import { WhyIteration } from '../../types';

const { width } = Dimensions.get('window');

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

  // Stage 5: Reward Messages
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

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  const handleSkip = async () => {
    // Save partial progress before skipping
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
      } catch (e) {
        console.warn('Failed to save partial Why progress:', e);
      }
    }
    // Jump to reward messages (stage 5)
    setCurrentStage(5);
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
      case 1: // Username
        if (username.trim().length < 3) {
          Alert.alert('Required', 'Please enter a username (at least 3 characters).');
          return false;
        }
        return true;
      case 2: // Opening Question
        if (openingAnswer.trim().length < 5) {
          Alert.alert('Required', 'Please share what brought you here today.');
          return false;
        }
        return true;
      case 3: // 5 Whys
        if (whyIterations.length < MIN_WHY_DEPTH && !coreWhyReached) {
          Alert.alert('Keep going', `Try to go at least ${MIN_WHY_DEPTH} layers deep.`);
          return false;
        }
        return true;
      case 4: // Why Statement
        if (contributionPart.trim().length < WHY_STATEMENT_MIN_LENGTH) {
          Alert.alert('Required', 'Please complete the "To..." part of your Why statement.');
          return false;
        }
        if (impactPart.trim().length < WHY_STATEMENT_MIN_LENGTH) {
          Alert.alert('Required', 'Please complete the "so that..." part of your Why statement.');
          return false;
        }
        return true;
      case 5: // Reward Messages
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
          // Username handled in handleUsernameNext
          break;
        case 2:
          // Opening answer saved as part of why iterations context — no separate save needed
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
          const statement = `To ${contributionPart.trim()} so that ${impactPart.trim()}`;
          await completeWhyDiscovery(user.uid, statement, contributionPart.trim(), impactPart.trim());
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
      // Seed reward messages
      if (selectedMessageIds.size > 0) {
        await seedUserRewardMessagesFromGlobals(user.uid, Array.from(selectedMessageIds));
      }
      // Mark onboarding complete
      await markOnboardingComplete(user.uid);
      await refreshProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete onboarding');
      setSaving(false);
    }
  };

  // ============================================================================
  // STAGE 1: USERNAME HANDLING
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
  // STAGE 3: 5 WHYS HANDLERS
  // ============================================================================

  const getCurrentWhyPrompt = (): string => {
    const depth = whyIterations.length + 1;
    const promptDef = WHY_DRILLING_PROMPTS.find(p => p.depth === depth) || WHY_DRILLING_PROMPTS[WHY_DRILLING_PROMPTS.length - 1];
    // First iteration references the opening answer; subsequent ones reference previous why answer
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
    if (currentWhyText.trim()) {
      submitWhyAnswer();
    }
    setCoreWhyReached(true);
  };

  // ============================================================================
  // STAGE 5: REWARD MESSAGES
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

      {/* Example answers */}
      <View style={styles.examplesSection}>
        <Text style={styles.examplesTitle}>Example answers to get you started:</Text>
        {OPENING_QUESTION_EXAMPLES.map((example, idx) => (
          <Text key={idx} style={styles.exampleText}>"{example}"</Text>
        ))}
      </View>

      {/* Text input */}
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

        {/* Show original answer as context */}
        <View style={styles.originalAnswerCard}>
          <Text style={styles.originalAnswerLabel}>Your starting point:</Text>
          <Text style={styles.originalAnswerText}>"{openingAnswer}"</Text>
        </View>

        {/* Previous iterations */}
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

        {/* Current why input */}
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

        {/* Core Why button */}
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

        {/* Examples */}
        <View style={styles.examplesSection}>
          <Text style={styles.examplesTitle}>Examples</Text>
          {WHY_STATEMENT_GUIDE.examples.map((ex, idx) => (
            <Text key={idx} style={styles.exampleText}>"{ex}"</Text>
          ))}
        </View>

        {/* Input fields */}
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

        {/* Preview */}
        {previewStatement.length > 0 && (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Your Why</Text>
            <Text style={styles.previewStatement}>"{previewStatement}"</Text>
          </View>
        )}

        {/* Tips */}
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
    || (currentStage === 5 && selectedMessageIds.size < 3);

  // Stage 1 has a special primary-bg look
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

      {/* Stage header */}
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
        <Text style={styles.stageLabel}>
          {stageInfo.label}
        </Text>
        <Text style={styles.stageSubtitle}>{stageInfo.subtitle}</Text>
      </View>

      {/* Content */}
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
      </ScrollView>

      {/* Navigation bar */}
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
  // Welcome (Stage 1) - primary bg
  welcomeContainer: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeButton: {
    width: width - Spacing.lg * 2,
    marginBottom: Spacing.xxl,
  },
  welcomeTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  welcomeBody: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.white,
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 24,
  },
  usernameContainer: {
    width: width - Spacing.lg * 2,
    marginTop: Spacing.xl,
  },
  usernameInput: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.lg,
    color: Colors.white,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  usernameInputError: {
    borderColor: '#FF6B6B',
  },
  errorText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  hintTextWhite: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.white,
    textAlign: 'center',
    marginTop: Spacing.sm,
    opacity: 0.7,
  },

  // Main flow (Stages 2-5)
  screen: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: Colors.lightGray,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  stageHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  stageHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  stageIndicatorRow: {
    flexDirection: 'row',
    gap: 6,
  },
  stageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.lightGray,
  },
  stageDotActive: {
    backgroundColor: Colors.primary,
    opacity: 0.4,
  },
  stageDotCurrent: {
    opacity: 1,
    width: 20,
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  skipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
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
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    backgroundColor: Colors.white,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
  },
  backText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.primary,
  },
  nextButton: {
    minWidth: 140,
  },

  // Shared stage content
  stageContent: {
    flex: 1,
  },
  stageIntro: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  promptQuestion: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 24,
    marginBottom: Spacing.sm,
  },
  multilineInput: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  hintText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },

  // Stage 2: Opening Question
  openingQuestionLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  examplesSection: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  examplesTitle: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  exampleText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
    marginBottom: Spacing.sm,
    fontStyle: 'italic',
  },

  // Stage 3: 5 Whys
  originalAnswerCard: {
    backgroundColor: Colors.primary + '08',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  originalAnswerLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  originalAnswerText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  whyIterationCard: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  whyDepthBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  whyDepthText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    color: Colors.white,
  },
  whyIterationContent: {
    flex: 1,
  },
  whyIterationQuestion: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: 4,
  },
  whyIterationAnswer: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    lineHeight: 22,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
  },
  currentWhySection: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  whyButtonRow: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
  },
  whySubmitButton: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  whySubmitText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  coreWhyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  coreWhyButtonText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
  coreWhyReachedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  coreWhyReachedText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.primary,
  },

  // Stage 4: Why Statement
  statementInputSection: {
    marginBottom: Spacing.lg,
  },
  statementLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.primary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  statementInput: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  previewCard: {
    backgroundColor: Colors.primary + '10',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  previewLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  previewStatement: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    lineHeight: 26,
  },
  tipsSection: {
    gap: Spacing.sm,
  },
  tipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
  },

  // Stage 5: Reward Messages
  messageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: Spacing.sm,
  },
  messageChipSelected: {
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary,
  },
  messageChipText: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    opacity: 0.8,
    lineHeight: 20,
  },
  messageChipTextSelected: {
    opacity: 1,
    fontFamily: Fonts.secondaryBold,
  },
});
