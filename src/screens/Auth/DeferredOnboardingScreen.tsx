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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import {
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
import { InputField } from '../../components/common/InputField';
import { useAuth } from '../../context/AuthContext';
import { completeFullOnboarding, saveDeferredOnboardingProgress } from '../../services/users';
import {
  initializeWhyProfile,
  saveWhyIterations,
  completeWhyDiscovery,
} from '../../services/whyDiscovery';
import { getActiveGoals, saveGoalCBTData } from '../../services/goals';
import { HomeScreenProps } from '../../types/navigation';


const STAGES = [
  { id: 1, label: 'Your Starting Point', subtitle: 'What brought you here?' },
  { id: 2, label: 'Drilling Deeper', subtitle: 'Finding the root' },
  { id: 3, label: 'Your Why', subtitle: 'Craft your purpose statement' },
  { id: 4, label: 'Thought Patterns', subtitle: "What's been in your way?" },
  { id: 5, label: 'Safety Net', subtitle: 'Prepare for hard days' },
  { id: 6, label: 'Identity', subtitle: "Who you're becoming" },
];

type Props = HomeScreenProps<'DeferredOnboarding'>;

export const DeferredOnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const { user, userProfile, refreshProfile } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const restoredRef = useRef(false);

  const [currentStage, setCurrentStage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);

  // Stage 1: Opening question
  const [openingAnswer, setOpeningAnswer] = useState('');

  // Stage 2: 5 Whys
  const [whyIterations, setWhyIterations] = useState<{ question: string; answer: string }[]>([]);
  const [currentWhyText, setCurrentWhyText] = useState('');
  const [coreWhyReached, setCoreWhyReached] = useState(false);

  // Stage 3: Why statement
  const [contributionPart, setContributionPart] = useState('');
  const [impactPart, setImpactPart] = useState('');

  // Stage 4: Thought patterns
  const [hasTriedBefore, setHasTriedBefore] = useState<boolean | null>(null);
  const [innerVoiceChallenge, setInnerVoiceChallenge] = useState('');
  const [innerVoiceResponse, setInnerVoiceResponse] = useState('');
  const [negativeStory, setNegativeStory] = useState('');

  // Stage 6: Safety net
  const [minimumAction, setMinimumAction] = useState('');
  const [recoveryPlan, setRecoveryPlan] = useState('');
  const [triggersInput, setTriggersInput] = useState('');
  const [triggers, setTriggers] = useState<string[]>([]);
  const [triggerSubsInput, setTriggerSubsInput] = useState('');
  const [triggerSubs, setTriggerSubs] = useState<string[]>([]);

  // Stage 7: Identity
  const [identityStatement, setIdentityStatement] = useState('');

  useEffect(() => {
    if (user) {
      initializeWhyProfile(user.uid).catch(console.warn);
      getActiveGoals(user.uid)
        .then((goals) => {
          if (goals.length > 0) setActiveGoalId(goals[0].id);
        })
        .catch(console.warn);
    }
  }, [user]);

  useEffect(() => {
    if (!userProfile || restoredRef.current) return;
    restoredRef.current = true;
    const p = userProfile.deferred_onboarding_progress;
    if (!p) return;
    if (p.currentStage) setCurrentStage(p.currentStage);
    if (p.openingAnswer) setOpeningAnswer(p.openingAnswer);
    if (p.whyIterations) setWhyIterations(p.whyIterations);
    if (p.coreWhyReached) setCoreWhyReached(p.coreWhyReached);
    if (p.contributionPart) setContributionPart(p.contributionPart);
    if (p.impactPart) setImpactPart(p.impactPart);
    if (p.hasTriedBefore !== undefined) setHasTriedBefore(p.hasTriedBefore);
    if (p.innerVoiceChallenge) setInnerVoiceChallenge(p.innerVoiceChallenge);
    if (p.innerVoiceResponse) setInnerVoiceResponse(p.innerVoiceResponse);
    if (p.negativeStory) setNegativeStory(p.negativeStory);
    if (p.minimumAction) setMinimumAction(p.minimumAction);
    if (p.recoveryPlan) setRecoveryPlan(p.recoveryPlan);
    if (p.triggers) setTriggers(p.triggers);
    if (p.triggerSubs) setTriggerSubs(p.triggerSubs);
    if (p.identityStatement) setIdentityStatement(p.identityStatement);
  }, [userProfile]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentStage / STAGES.length,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStage]);

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  const goToStage = (stage: number) => {
    setCurrentStage(stage);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleBack = () => {
    if (currentStage > 1) goToStage(currentStage - 1);
    else navigation.goBack();
  };

  const handleNext = async () => {
    if (!validateCurrentStage()) return;
    if (currentStage < STAGES.length) {
      await saveCurrentStageData();
      goToStage(currentStage + 1);
    } else {
      await handleFinalSubmit();
    }
  };

  // ============================================================================
  // VALIDATION
  // ============================================================================

  const validateCurrentStage = (): boolean => {
    switch (currentStage) {
      case 1:
        if (openingAnswer.trim().length < 5) {
          Alert.alert('Required', 'Please share what brought you here.');
          return false;
        }
        return true;
      case 2:
        if (whyIterations.length < MIN_WHY_DEPTH && !coreWhyReached) {
          Alert.alert('Keep going', `Try to go at least ${MIN_WHY_DEPTH} layer deep.`);
          return false;
        }
        return true;
      case 3:
        if (contributionPart.trim().length < WHY_STATEMENT_MIN_LENGTH) {
          Alert.alert('Required', 'Please complete the "To..." part of your Why.');
          return false;
        }
        if (impactPart.trim().length < WHY_STATEMENT_MIN_LENGTH) {
          Alert.alert('Required', 'Please complete the "so that..." part of your Why.');
          return false;
        }
        return true;
      case 4:
        if (hasTriedBefore === null) {
          Alert.alert('Required', "Please answer whether you've tried this before.");
          return false;
        }
        if (hasTriedBefore && (!innerVoiceChallenge.trim() || !innerVoiceResponse.trim())) {
          Alert.alert('Required', 'Please fill in both the inner voice and your response.');
          return false;
        }
        return true;
      case 5:
        if (!minimumAction.trim()) {
          Alert.alert('Required', "Please describe your smallest possible action.");
          return false;
        }
        if (!recoveryPlan.trim()) {
          Alert.alert('Required', 'Please describe your recovery plan.');
          return false;
        }
        return true;
      case 6:
        if (!identityStatement.trim()) {
          Alert.alert('Required', 'Please complete your identity statement.');
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
      if (currentStage === 2 && whyIterations.length > 0) {
        await saveWhyIterations(
          user.uid,
          whyIterations.map((w, i) => ({ id: `why_${i}`, depth: i + 1, question: w.question, answer: w.answer })),
          coreWhyReached
        );
      }
      if (currentStage === 3 && contributionPart.trim() && impactPart.trim()) {
        const ws = `To ${contributionPart.trim()} so that ${impactPart.trim()}`;
        await completeWhyDiscovery(user.uid, ws, contributionPart.trim(), impactPart.trim());
      }
    } catch (e) {
      console.warn('Failed to save stage data:', e);
    }
  };

  const handleFinalSubmit = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (activeGoalId) {
        await saveGoalCBTData(user.uid, activeGoalId, {
          negative_story: negativeStory.trim() || undefined,
          inner_voice_challenge: innerVoiceChallenge.trim() || undefined,
          inner_voice_response: innerVoiceResponse.trim() || undefined,
          minimum_action: minimumAction.trim() || undefined,
          recovery_plan: recoveryPlan.trim() || undefined,
          triggers: triggers.length > 0 ? triggers : undefined,
          trigger_substitutes: triggerSubs.length > 0 ? triggerSubs : undefined,
          identity_statement: identityStatement.trim() || undefined,
        });
      }
      await completeFullOnboarding(user.uid);
      await refreshProfile();
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProgress = async () => {
    if (!user) return;
    setSavingProgress(true);
    try {
      await saveDeferredOnboardingProgress(user.uid, {
        currentStage,
        openingAnswer,
        whyIterations,
        coreWhyReached,
        contributionPart,
        impactPart,
        hasTriedBefore,
        innerVoiceChallenge,
        innerVoiceResponse,
        negativeStory,
        minimumAction,
        recoveryPlan,
        triggers,
        triggerSubs,
        identityStatement,
      });
      await refreshProfile();
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Could not save progress. Please try again.');
    } finally {
      setSavingProgress(false);
    }
  };

  // ============================================================================
  // 5 WHYS HELPERS
  // ============================================================================

  const getCurrentWhyPrompt = (): string => {
    const depth = whyIterations.length + 1;
    const promptDef =
      WHY_DRILLING_PROMPTS.find((p) => p.depth === depth) ||
      WHY_DRILLING_PROMPTS[WHY_DRILLING_PROMPTS.length - 1];
    const prevAnswer = depth === 1 ? openingAnswer : whyIterations[whyIterations.length - 1]?.answer || '';
    const truncated = prevAnswer.length > 60 ? prevAnswer.substring(0, 60) + '...' : prevAnswer;
    return promptDef.template.replace('{previousAnswer}', truncated);
  };

  const submitWhyAnswer = () => {
    if (!currentWhyText.trim()) return;
    const question = getCurrentWhyPrompt();
    setWhyIterations((prev) => [...prev, { question, answer: currentWhyText.trim() }]);
    setCurrentWhyText('');
  };

  const markCoreWhy = () => {
    if (currentWhyText.trim()) submitWhyAnswer();
    setCoreWhyReached(true);
  };

  const addTrigger = () => {
    const t = triggersInput.trim();
    if (!t) return;
    setTriggers((prev) => [...prev, t]);
    setTriggersInput('');
  };

  const addTriggerSub = () => {
    const t = triggerSubsInput.trim();
    if (!t) return;
    setTriggerSubs((prev) => [...prev, t]);
    setTriggerSubsInput('');
  };

  // ============================================================================
  // RENDER STAGES
  // ============================================================================

  const renderStage1 = () => (
    <View style={styles.stageContent}>
      <Text style={styles.stageIntro}>{OPENING_QUESTION_INTRO}</Text>
      <Text style={styles.questionLabel}>Let's start here:</Text>
      <Text style={styles.promptQuestion}>{OPENING_QUESTION}</Text>
      <View style={styles.examplesBox}>
        <Text style={styles.examplesTitle}>Examples</Text>
        {OPENING_QUESTION_EXAMPLES.map((ex, idx) => (
          <Text key={idx} style={styles.exampleText}>"{ex}"</Text>
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

  const renderStage2 = () => {
    const currentDepth = whyIterations.length + 1;
    const canMarkCore = whyIterations.length >= MIN_WHY_DEPTH;
    const atMaxDepth = whyIterations.length >= MAX_WHY_DEPTH;

    return (
      <View style={styles.stageContent}>
        <Text style={styles.stageIntro}>
          Each answer peels back another layer. Keep going until you hit the real root.
        </Text>
        <View style={styles.answerCard}>
          <Text style={styles.answerCardLabel}>Your starting point:</Text>
          <Text style={styles.answerCardText}>"{openingAnswer}"</Text>
        </View>
        {whyIterations.map((iteration, idx) => (
          <View key={idx} style={styles.whyCard}>
            <View style={styles.depthBadge}>
              <Text style={styles.depthBadgeText}>{idx + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.whyQuestion}>{iteration.question}</Text>
              <Text style={styles.whyAnswer}>{iteration.answer}</Text>
            </View>
          </View>
        ))}
        {!coreWhyReached && !atMaxDepth && (
          <View style={styles.whyInputRow}>
            <View style={styles.depthBadge}>
              <Text style={styles.depthBadgeText}>{currentDepth}</Text>
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
              <TouchableOpacity
                style={[styles.submitWhyBtn, !currentWhyText.trim() && { opacity: 0.4 }]}
                onPress={submitWhyAnswer}
                disabled={!currentWhyText.trim()}
              >
                <Text style={styles.submitWhyText}>Go Deeper</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {canMarkCore && !coreWhyReached && (
          <TouchableOpacity style={styles.coreWhyBtn} onPress={markCoreWhy}>
            <Ionicons name="checkmark-circle" size={22} color={Colors.white} />
            <Text style={styles.coreWhyBtnText}>This is my core Why</Text>
          </TouchableOpacity>
        )}
        {coreWhyReached && (
          <View style={styles.coreWhyBanner}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
            <Text style={styles.coreWhyBannerText}>Core Why identified</Text>
          </View>
        )}
      </View>
    );
  };

  const renderStage3 = () => {
    const preview =
      contributionPart.trim() && impactPart.trim()
        ? `To ${contributionPart.trim()} so that ${impactPart.trim()}`
        : '';
    return (
      <View style={styles.stageContent}>
        <Text style={styles.stageIntro}>
          Now reframe what you discovered into a clear purpose statement.{'\n\n'}
          Format:{' '}
          <Text style={{ fontFamily: Fonts.secondaryBold }}>"{WHY_STATEMENT_GUIDE.format}"</Text>
        </Text>
        <View style={styles.examplesBox}>
          <Text style={styles.examplesTitle}>Examples</Text>
          {WHY_STATEMENT_GUIDE.examples.map((ex, idx) => (
            <Text key={idx} style={styles.exampleText}>"{ex}"</Text>
          ))}
        </View>
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
        {preview.length > 0 && (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Your Why</Text>
            <Text style={styles.previewStatement}>"{preview}"</Text>
          </View>
        )}
      </View>
    );
  };

  const renderStage5 = () => (
    <View style={styles.stageContent}>
      <Text style={styles.promptQuestion}>Have you tried working on this before?</Text>
      <View style={styles.yesNoRow}>
        {[true, false].map((val) => (
          <TouchableOpacity
            key={String(val)}
            style={[styles.yesNoBtn, hasTriedBefore === val && styles.yesNoBtnActive]}
            onPress={() => setHasTriedBefore(val)}
          >
            <Text style={[styles.yesNoBtnText, hasTriedBefore === val && styles.yesNoBtnTextActive]}>
              {val ? 'Yes' : 'No'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {hasTriedBefore === true && (
        <>
          <Text style={[styles.promptQuestion, { marginTop: Spacing.lg }]}>
            What story did you tell yourself when it fell apart?
          </Text>
          <InputField
            label=""
            value={negativeStory}
            onChangeText={setNegativeStory}
            placeholder='e.g., "I always give up after a few weeks..."'
            multiline
            numberOfLines={3}
            maxLength={400}
          />

          <Text style={[styles.promptQuestion, { marginTop: Spacing.lg }]}>
            What will your inner voice say this time?
          </Text>
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
        </>
      )}

      {hasTriedBefore === false && (
        <View style={styles.freshStartNote}>
          <Text style={styles.freshStartNoteText}>
            Great — you're starting fresh. Let's build the right system from the start.
          </Text>
        </View>
      )}
    </View>
  );

  const renderStage6 = () => (
    <View style={styles.stageContent}>
      <Text style={styles.stageIntro}>
        Hard days happen. Let's make sure you're ready for them.
      </Text>

      <Text style={styles.promptQuestion}>
        What's the smallest action you could take on your worst day?
      </Text>
      <Text style={styles.requiredBadge}>Required</Text>
      <InputField
        label=""
        value={minimumAction}
        onChangeText={setMinimumAction}
        placeholder='e.g., "Walk for 5 minutes" or "Write one sentence"'
        maxLength={200}
      />

      <Text style={[styles.promptQuestion, { marginTop: Spacing.lg }]}>
        If you miss a day, how will you get back on track?
      </Text>
      <Text style={styles.requiredBadge}>Required</Text>
      <InputField
        label=""
        value={recoveryPlan}
        onChangeText={setRecoveryPlan}
        placeholder={"e.g., \"I'll do double tomorrow\" or \"I'll start fresh without guilt\""}
        multiline
        numberOfLines={3}
        maxLength={400}
      />

      <Text style={[styles.promptQuestion, { marginTop: Spacing.lg }]}>
        What situations or feelings tend to pull you off track? (Optional)
      </Text>
      {triggers.map((t, i) => (
        <View key={i} style={styles.listItem}>
          <Text style={styles.listItemText}>{t}</Text>
          <TouchableOpacity onPress={() => setTriggers((prev) => prev.filter((_, j) => j !== i))}>
            <Ionicons name="close-circle" size={20} color={Colors.gray} />
          </TouchableOpacity>
        </View>
      ))}
      <View style={styles.listAddRow}>
        <TextInput
          style={styles.listAddInput}
          value={triggersInput}
          onChangeText={setTriggersInput}
          placeholder="e.g., Stress at work, feeling tired..."
          placeholderTextColor={Colors.gray}
          onSubmitEditing={addTrigger}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.listAddBtn} onPress={addTrigger}>
          <Ionicons name="add-circle" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {triggers.length > 0 && (
        <>
          <Text style={[styles.promptQuestion, { marginTop: Spacing.lg }]}>
            What will you do instead when those triggers hit? (Optional)
          </Text>
          {triggerSubs.map((t, i) => (
            <View key={i} style={styles.listItem}>
              <Text style={styles.listItemText}>{t}</Text>
              <TouchableOpacity onPress={() => setTriggerSubs((prev) => prev.filter((_, j) => j !== i))}>
                <Ionicons name="close-circle" size={20} color={Colors.gray} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.listAddRow}>
            <TextInput
              style={styles.listAddInput}
              value={triggerSubsInput}
              onChangeText={setTriggerSubsInput}
              placeholder="e.g., Take a walk, do 5 deep breaths..."
              placeholderTextColor={Colors.gray}
              onSubmitEditing={addTriggerSub}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.listAddBtn} onPress={addTriggerSub}>
              <Ionicons name="add-circle" size={28} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );

  const renderStage7 = () => (
    <View style={styles.stageContent}>
      <Text style={styles.stageIntro}>
        Behavior change works best when it's tied to identity — who you're becoming, not just what you're doing.
      </Text>
      <Text style={styles.promptQuestion}>Who are you becoming through this goal?</Text>
      <Text style={styles.requiredBadge}>Required</Text>
      <InputField
        label=""
        value={identityStatement}
        onChangeText={setIdentityStatement}
        placeholder={"e.g., \"I'm becoming someone who keeps promises to themselves\""}
        multiline
        numberOfLines={3}
        maxLength={300}
      />
    </View>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  const stageInfo = STAGES[currentStage - 1];
  const isLastStage = currentStage === STAGES.length;

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
        <View style={styles.stageIndicatorRow}>
          {STAGES.map((s, idx) => (
            <View
              key={s.id}
              style={[
                styles.stageDot,
                idx + 1 <= currentStage && styles.stageDotActive,
                idx + 1 === currentStage && styles.stageDotCurrent,
              ]}
            />
          ))}
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
        {currentStage === 1 && renderStage1()}
        {currentStage === 2 && renderStage2()}
        {currentStage === 3 && renderStage3()}
        {currentStage === 4 && renderStage5()}
        {currentStage === 5 && renderStage6()}
        {currentStage === 6 && renderStage7()}
      </ScrollView>

      <View style={styles.navBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
          <Text style={styles.backText}>{currentStage === 1 ? 'Cancel' : 'Back'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSaveProgress}
          style={styles.saveButton}
          disabled={savingProgress}
        >
          <Ionicons name="bookmark-outline" size={16} color={Colors.gray} />
          <Text style={styles.saveText}>{savingProgress ? 'Saving…' : 'Save & Exit'}</Text>
        </TouchableOpacity>
        <Button
          title={isLastStage ? 'Finish Setup' : 'Continue'}
          onPress={handleNext}
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
  screen: { flex: 1, backgroundColor: Colors.white },
  progressBarContainer: { height: 4, backgroundColor: Colors.lightGray },
  progressBarFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  stageHeader: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.lightGray },
  stageIndicatorRow: { flexDirection: 'row', gap: 6, marginBottom: Spacing.sm },
  stageDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.lightGray },
  stageDotActive: { backgroundColor: Colors.primary, opacity: 0.4 },
  stageDotCurrent: { opacity: 1, width: 16 },
  stageLabel: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
  stageSubtitle: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, marginTop: 2 },
  scrollView: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.lightGray, backgroundColor: Colors.white },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: Spacing.sm },
  backText: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.primary },
  saveButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs },
  saveText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray },
  nextButton: { minWidth: 120 },

  stageContent: { flex: 1 },
  stageIntro: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark, lineHeight: 24, marginBottom: Spacing.lg },
  promptQuestion: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark, marginBottom: Spacing.xs },
  multilineInput: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, minHeight: 90, textAlignVertical: 'top', marginBottom: Spacing.sm },
  requiredBadge: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.secondary, marginBottom: Spacing.sm },

  // Stage 1
  questionLabel: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: Colors.dark, marginBottom: Spacing.xs },
  examplesBox: { backgroundColor: Colors.lightGray, borderRadius: BorderRadius.sm, padding: Spacing.md, marginBottom: Spacing.lg },
  examplesTitle: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.gray, textTransform: 'uppercase', marginBottom: Spacing.sm },
  exampleText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 20, marginBottom: Spacing.xs, fontStyle: 'italic' },

  // Stage 2
  answerCard: { backgroundColor: Colors.primary + '08', borderLeftWidth: 3, borderLeftColor: Colors.primary, borderRadius: BorderRadius.sm, padding: Spacing.md, marginBottom: Spacing.lg },
  answerCardLabel: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.gray, textTransform: 'uppercase', marginBottom: Spacing.xs },
  answerCardText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 20, fontStyle: 'italic' },
  whyCard: { flexDirection: 'row', marginBottom: Spacing.md, gap: Spacing.sm },
  depthBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  depthBadgeText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xs, color: Colors.white },
  whyQuestion: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, marginBottom: 4 },
  whyAnswer: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark, lineHeight: 22, backgroundColor: Colors.lightGray, borderRadius: BorderRadius.sm, padding: Spacing.sm },
  whyInputRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  submitWhyBtn: { backgroundColor: Colors.lightGray, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, alignSelf: 'flex-start', marginTop: Spacing.xs },
  submitWhyText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.primary },
  coreWhyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.md, marginTop: Spacing.lg },
  coreWhyBtnText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.white },
  coreWhyBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.lightGray, borderRadius: BorderRadius.md, paddingVertical: Spacing.md, marginTop: Spacing.lg },
  coreWhyBannerText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: Colors.primary },

  // Stage 3
  statementLabel: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.primary, marginBottom: Spacing.xs, marginTop: Spacing.md },
  statementInput: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, minHeight: 60, textAlignVertical: 'top', marginBottom: Spacing.sm },
  previewCard: { backgroundColor: Colors.primary + '10', borderWidth: 1.5, borderColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.lg, marginTop: Spacing.md },
  previewLabel: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.primary, textTransform: 'uppercase', marginBottom: Spacing.sm },
  previewStatement: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark, lineHeight: 26 },

  // Stage 4 (Thought Patterns)
  yesNoRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm, marginBottom: Spacing.md },
  yesNoBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 2, borderColor: Colors.border, alignItems: 'center' },
  yesNoBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' },
  yesNoBtnText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.gray },
  yesNoBtnTextActive: { color: Colors.primary },
  innerVoiceCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.secondary, padding: Spacing.md, marginBottom: Spacing.sm },
  innerVoiceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  innerVoiceLabel: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.secondary },
  innerVoiceInput: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark, minHeight: 60, textAlignVertical: 'top' },
  freshStartNote: { marginTop: Spacing.md, backgroundColor: Colors.primary + '08', borderRadius: BorderRadius.md, padding: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.primary },
  freshStartNoteText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 20 },

  // Stage 6 lists
  listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.white, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, marginBottom: Spacing.xs, borderWidth: 1, borderColor: Colors.border },
  listItemText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, flex: 1, marginRight: Spacing.sm },
  listAddRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs, marginBottom: Spacing.sm },
  listAddInput: { flex: 1, fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark, backgroundColor: Colors.white, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  listAddBtn: { padding: Spacing.xs },
});
