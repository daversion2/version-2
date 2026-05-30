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
import { HomeScreenProps } from '../../types/navigation';
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
import { useAuth } from '../../context/AuthContext';
import {
  getWhyProfile,
  initializeWhyProfile,
  saveWhyIterations,
  completeWhyDiscovery,
} from '../../services/whyDiscovery';

type Props = HomeScreenProps<'WhyDiscoveryFlow'>;

/**
 * Standalone Why Discovery flow for existing users.
 * Covers 3 stages: Opening Question, Why Drilling, Why Statement.
 * Accessible from Home CTA and Settings.
 */
export const WhyDiscoveryFlow: React.FC<Props> = ({ navigation }) => {
  const { user, refreshProfile } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const STAGES = ['Your Starting Point', 'Drilling Deeper', 'Your Why'];
  const [currentStage, setCurrentStage] = useState(1);
  const [saving, setSaving] = useState(false);

  // Stage 1: Opening Question
  const [openingAnswer, setOpeningAnswer] = useState('');

  // Stage 2: 5 Whys
  const [whyIterations, setWhyIterations] = useState<{ question: string; answer: string }[]>([]);
  const [currentWhyText, setCurrentWhyText] = useState('');
  const [coreWhyReached, setCoreWhyReached] = useState(false);

  // Stage 3: Why Statement
  const [contributionPart, setContributionPart] = useState('');
  const [impactPart, setImpactPart] = useState('');

  useEffect(() => {
    if (user) {
      initializeWhyProfile(user.uid).catch(console.warn);
      // Load any partial progress
      getWhyProfile(user.uid).then(profile => {
        if (profile) {
          if (profile.why_iterations.length > 0) {
            setWhyIterations(profile.why_iterations.map(w => ({ question: w.question, answer: w.answer })));
            setCoreWhyReached(profile.core_why_reached);
          }
          if (profile.contribution_part) setContributionPart(profile.contribution_part);
          if (profile.impact_part) setImpactPart(profile.impact_part);
          // Resume from where they left off
          if (profile.last_completed_stage >= 1 && profile.last_completed_stage < 3) {
            setCurrentStage(profile.last_completed_stage + 1);
          }
        }
      }).catch(console.warn);
    }
  }, [user]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentStage / STAGES.length,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStage]);

  const handleNext = async () => {
    if (!validateCurrentStage()) return;
    await saveCurrentStageData();

    if (currentStage < STAGES.length) {
      setCurrentStage(prev => prev + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      // Final submit
      setSaving(true);
      try {
        const statement = `To ${contributionPart.trim()} so that ${impactPart.trim()}`;
        await completeWhyDiscovery(user!.uid, statement, contributionPart.trim(), impactPart.trim());
        await refreshProfile();
        navigation.goBack();
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to save.');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStage > 1) {
      setCurrentStage(prev => prev - 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      navigation.goBack();
    }
  };

  const validateCurrentStage = (): boolean => {
    switch (currentStage) {
      case 1:
        if (openingAnswer.trim().length < 5) {
          Alert.alert('Required', 'Please share what brought you here today.');
          return false;
        }
        return true;
      case 2:
        if (whyIterations.length < MIN_WHY_DEPTH && !coreWhyReached) {
          Alert.alert('Keep going', `Try to go at least ${MIN_WHY_DEPTH} layers deep.`);
          return false;
        }
        return true;
      case 3:
        if (contributionPart.trim().length < WHY_STATEMENT_MIN_LENGTH || impactPart.trim().length < WHY_STATEMENT_MIN_LENGTH) {
          Alert.alert('Required', 'Please complete both parts of your Why statement.');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const saveCurrentStageData = async () => {
    if (!user) return;
    try {
      switch (currentStage) {
        case 2:
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
      }
    } catch (e) {
      console.warn('Failed to save stage data:', e);
    }
  };

  // ============================================================================
  // WHY HANDLERS
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
    setWhyIterations(prev => [...prev, { question: getCurrentWhyPrompt(), answer: currentWhyText.trim() }]);
    setCurrentWhyText('');
  };

  const markCoreWhy = () => {
    if (currentWhyText.trim()) submitWhyAnswer();
    setCoreWhyReached(true);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const renderStage1 = () => (
    <View>
      <Text style={styles.stageIntro}>{OPENING_QUESTION_INTRO}</Text>

      <Text style={styles.openingLabel}>Let's start here:</Text>
      <Text style={styles.promptQuestion}>{OPENING_QUESTION}</Text>

      <View style={styles.examples}>
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

  const renderStage2 = () => {
    const canMarkCore = whyIterations.length >= MIN_WHY_DEPTH;
    const atMaxDepth = whyIterations.length >= MAX_WHY_DEPTH;

    return (
      <View>
        <Text style={styles.stageIntro}>
          Now let's drill into what really matters. Each time, we'll ask why that matters until you hit the root.
        </Text>

        {/* Show original answer as context */}
        <View style={styles.originalAnswerCard}>
          <Text style={styles.originalAnswerLabel}>Your starting point:</Text>
          <Text style={styles.originalAnswerText}>"{openingAnswer}"</Text>
        </View>

        {whyIterations.map((iteration, idx) => (
          <View key={idx} style={styles.whyCard}>
            <View style={styles.depthBadge}><Text style={styles.depthText}>{idx + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.whyQuestion}>{iteration.question}</Text>
              <Text style={styles.whyAnswer}>{iteration.answer}</Text>
            </View>
          </View>
        ))}
        {!coreWhyReached && !atMaxDepth && (
          <View style={styles.currentWhyRow}>
            <View style={styles.depthBadge}><Text style={styles.depthText}>{whyIterations.length + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.promptQuestion}>{getCurrentWhyPrompt()}</Text>
              <TextInput
                style={styles.multilineInput}
                value={currentWhyText}
                onChangeText={setCurrentWhyText}
                placeholder={WHY_DRILLING_PROMPTS[Math.min(whyIterations.length, WHY_DRILLING_PROMPTS.length - 1)].placeholder}
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
                <Text style={styles.submitWhyText}>Answer & Go Deeper</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {canMarkCore && !coreWhyReached && (
          <TouchableOpacity style={styles.coreButton} onPress={markCoreWhy}>
            <Ionicons name="checkmark-circle" size={22} color={Colors.white} />
            <Text style={styles.coreButtonText}>This is my core Why</Text>
          </TouchableOpacity>
        )}
        {coreWhyReached && (
          <View style={styles.coreBanner}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
            <Text style={styles.coreBannerText}>Core Why identified</Text>
          </View>
        )}
      </View>
    );
  };

  const renderStage3 = () => {
    const preview = contributionPart.trim() && impactPart.trim()
      ? `To ${contributionPart.trim()} so that ${impactPart.trim()}`
      : '';
    return (
      <View>
        <Text style={styles.stageIntro}>
          Now let's reframe what you discovered into a clear purpose statement.{'\n\n'}
          Your Why follows this format:{'\n'}
          <Text style={{ fontFamily: Fonts.secondaryBold }}>"{WHY_STATEMENT_GUIDE.format}"</Text>
        </Text>
        <View style={styles.examples}>
          <Text style={styles.examplesTitle}>Examples</Text>
          {WHY_STATEMENT_GUIDE.examples.map((ex, idx) => (
            <Text key={idx} style={styles.exampleText}>"{ex}"</Text>
          ))}
        </View>
        <Text style={styles.inputLabel}>To:</Text>
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
        <Text style={styles.inputLabel}>So that:</Text>
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
          <View style={styles.preview}>
            <Text style={styles.previewLabel}>Your Why</Text>
            <Text style={styles.previewText}>"{preview}"</Text>
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

  const isLastStage = currentStage === STAGES.length;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.progressBar}>
        <Animated.View style={[styles.progressFill, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>

      <View style={styles.header}>
        <View style={styles.dots}>
          {STAGES.map((_, idx) => (
            <View key={idx} style={[styles.dot, idx + 1 <= currentStage && styles.dotActive, idx + 1 === currentStage && styles.dotCurrent]} />
          ))}
        </View>
        <Text style={styles.stageTitle}>{STAGES[currentStage - 1]}</Text>
      </View>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {currentStage === 1 && renderStage1()}
        {currentStage === 2 && renderStage2()}
        {currentStage === 3 && renderStage3()}
      </ScrollView>

      <View style={styles.navBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
          <Text style={styles.backText}>{currentStage === 1 ? 'Cancel' : 'Back'}</Text>
        </TouchableOpacity>
        <Button
          title={isLastStage ? 'Complete' : 'Continue'}
          onPress={handleNext}
          loading={saving}
          style={{ minWidth: 130 }}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.white },
  progressBar: { height: 4, backgroundColor: Colors.lightGray },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.lightGray },
  dots: { flexDirection: 'row', gap: 6, marginBottom: Spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.lightGray },
  dotActive: { backgroundColor: Colors.primary, opacity: 0.4 },
  dotCurrent: { opacity: 1, width: 20 },
  stageTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.lightGray },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: Spacing.sm },
  backText: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.primary },

  stageIntro: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark, lineHeight: 24, marginBottom: Spacing.lg },
  promptQuestion: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark, lineHeight: 24, marginBottom: Spacing.sm },
  multilineInput: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, minHeight: 100, textAlignVertical: 'top', backgroundColor: Colors.white },

  // Stage 1: Opening Question
  openingLabel: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: Colors.dark, marginBottom: Spacing.xs },
  examples: { backgroundColor: Colors.lightGray, borderRadius: BorderRadius.sm, padding: Spacing.md, marginBottom: Spacing.lg },
  examplesTitle: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.gray, textTransform: 'uppercase', marginBottom: Spacing.sm },
  exampleText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 20, marginBottom: Spacing.sm, fontStyle: 'italic' },

  // Stage 2: Whys
  originalAnswerCard: { backgroundColor: Colors.primary + '08', borderLeftWidth: 3, borderLeftColor: Colors.primary, borderRadius: BorderRadius.sm, padding: Spacing.md, marginBottom: Spacing.lg },
  originalAnswerLabel: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.gray, textTransform: 'uppercase', marginBottom: Spacing.xs },
  originalAnswerText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, lineHeight: 20, fontStyle: 'italic' },
  whyCard: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  depthBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  depthText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xs, color: Colors.white },
  whyQuestion: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, marginBottom: 4 },
  whyAnswer: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark, backgroundColor: Colors.lightGray, borderRadius: BorderRadius.sm, padding: Spacing.sm, lineHeight: 22 },
  currentWhyRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  submitWhyBtn: { backgroundColor: Colors.lightGray, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, marginTop: Spacing.sm, alignSelf: 'flex-start' },
  submitWhyText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.primary },
  coreButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: Spacing.md, marginTop: Spacing.lg },
  coreButtonText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.white },
  coreBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.lightGray, borderRadius: BorderRadius.md, paddingVertical: Spacing.md, marginTop: Spacing.lg },
  coreBannerText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: Colors.primary },

  // Stage 3: Statement
  inputLabel: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.primary, marginBottom: Spacing.xs, marginTop: Spacing.md },
  statementInput: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.dark, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, minHeight: 60, textAlignVertical: 'top' },
  preview: { backgroundColor: Colors.primary + '10', borderWidth: 1.5, borderColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.lg, marginTop: Spacing.lg },
  previewLabel: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.primary, textTransform: 'uppercase', marginBottom: Spacing.sm },
  previewText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark, lineHeight: 26 },
  tipsSection: { gap: Spacing.sm, marginTop: Spacing.lg },
  tipText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, lineHeight: 20 },
});
