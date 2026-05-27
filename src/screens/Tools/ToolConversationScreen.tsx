import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  BackHandler,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { WorksheetTemplate } from '../../types';
import { WORKSHEET_TEMPLATES } from '../../data/worksheetTemplates';
import {
  saveWorksheetEntry,
  updateWorksheetEntry,
  getWorksheetEntryById,
} from '../../services/worksheets';
import { useAuth } from '../../context/AuthContext';

import { generateStepsFromTemplate, calculateResumeStepIndex } from './utils/generateSteps';
import { isStepComplete } from './utils/stepValidation';
import { ProgressBar } from './components/ProgressBar';
import { StepTransition } from './components/StepTransition';

import { IntroStep } from './steps/IntroStep';
import { MoodStep } from './steps/MoodStep';
import { SectionIntroStep } from './steps/SectionIntroStep';
import { FieldStep } from './steps/FieldStep';
import { GoalStep } from './steps/GoalStep';
import { CompletionStep } from './steps/CompletionStep';

export const ToolConversationScreen: React.FC<{ navigation: any; route: any }> = ({
  navigation,
  route,
}) => {
  const { templateId, entryId, resumeDraft } = route.params || {};
  const { user } = useAuth();

  const template = WORKSHEET_TEMPLATES.find(
    (t) => t.id === templateId
  ) as WorksheetTemplate;

  // Step generation
  const steps = useMemo(
    () => (template ? generateStepsFromTemplate(template) : []),
    [template]
  );

  // Core state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string | string[]>>({});
  const [moodBefore, setMoodBefore] = useState<number | undefined>();
  const [moodAfter, setMoodAfter] = useState<number | undefined>();
  const [goalIds, setGoalIds] = useState<string[]>([]);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [saving, setSaving] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(entryId || null);
  const [pointsEarned, setPointsEarned] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Hide native header
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Resume draft
  useEffect(() => {
    if (resumeDraft && entryId && user) {
      getWorksheetEntryById(user.uid, entryId).then((entry) => {
        if (entry) {
          setResponses(entry.responses || {});
          setMoodBefore(entry.mood_before);
          setMoodAfter(entry.mood_after);
          setGoalIds(entry.goal_ids || []);
          const resumeIdx = calculateResumeStepIndex(
            steps,
            entry.responses || {},
            entry.mood_before
          );
          setCurrentStepIndex(resumeIdx);
        }
      });
    }
  }, [resumeDraft, entryId, user, steps]);

  // Android back handler
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isCompleted) {
        navigation.goBack();
        return true;
      }
      if (currentStepIndex > 0) {
        goBack();
        return true;
      }
      handleClose();
      return true;
    });
    return () => handler.remove();
  }, [currentStepIndex, isCompleted]);

  // Derived
  const currentStep = steps[currentStepIndex];
  const completionIdx = steps.findIndex((s) => s.type === 'completion');
  const progressSteps = completionIdx > 0 ? completionIdx : steps.length - 1;
  const progress = Math.min(currentStepIndex / progressSteps, 1);

  const canContinue = useMemo(
    () => (currentStep ? isStepComplete(currentStep, responses, moodBefore, moodAfter) : false),
    [currentStep, responses, moodBefore, moodAfter]
  );

  // Navigation
  const goForward = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setDirection('forward');
      setCurrentStepIndex((prev) => prev + 1);
    }
  }, [currentStepIndex, steps.length]);

  const goBack = useCallback(() => {
    let targetIdx = currentStepIndex - 1;
    // Skip section_intro when going back
    if (targetIdx > 0 && steps[targetIdx].type === 'section_intro') {
      targetIdx -= 1;
    }
    if (targetIdx >= 0) {
      setDirection('backward');
      setCurrentStepIndex(targetIdx);
    }
  }, [currentStepIndex, steps]);

  const hasAnyData = () => {
    return (
      moodBefore !== undefined ||
      Object.keys(responses).length > 0 ||
      goalIds.length > 0
    );
  };

  const handleClose = () => {
    if (currentStepIndex > 1 && hasAnyData()) {
      Alert.alert('Save Progress?', 'You can resume this later.', [
        { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
        { text: 'Save Draft', onPress: () => saveDraft().then(() => navigation.goBack()) },
      ]);
    } else {
      navigation.goBack();
    }
  };

  const saveDraft = async () => {
    if (!user) return;
    if (draftId) {
      await updateWorksheetEntry(user.uid, draftId, {
        responses,
        mood_after: moodAfter,
        is_draft: true,
        goal_ids: goalIds,
      });
    } else {
      const result = await saveWorksheetEntry(user.uid, {
        template_id: template.id,
        template_name: template.name,
        responses,
        mood_before: moodBefore,
        mood_after: moodAfter,
        goal_ids: goalIds.length > 0 ? goalIds : undefined,
        is_draft: true,
      });
      setDraftId(result.id);
    }
  };

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let pointsAwarded = 0;
      if (draftId) {
        const result = await updateWorksheetEntry(user.uid, draftId, {
          responses,
          mood_after: moodAfter,
          is_draft: false,
          goal_ids: goalIds,
        });
        pointsAwarded = result.pointsAwarded;
      } else {
        const result = await saveWorksheetEntry(user.uid, {
          template_id: template.id,
          template_name: template.name,
          responses,
          mood_before: moodBefore,
          mood_after: moodAfter,
          goal_ids: goalIds.length > 0 ? goalIds : undefined,
          is_draft: false,
        });
        pointsAwarded = result.pointsAwarded;
      }
      setPointsEarned(pointsAwarded);
      setIsCompleted(true);
      setDirection('forward');
      setCurrentStepIndex(completionIdx);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const handleContinue = () => {
    // If we're on mood_after, trigger completion
    if (currentStep?.type === 'mood_after') {
      handleComplete();
      return;
    }
    goForward();
  };

  const handleResponseChange = (fieldId: string, value: string | string[]) => {
    setResponses((prev) => ({ ...prev, [fieldId]: value }));
  };

  // Render current step content
  const renderStep = () => {
    if (!currentStep) return null;

    switch (currentStep.type) {
      case 'intro':
        return <IntroStep template={template} />;

      case 'mood_before':
        return <MoodStep type="before" value={moodBefore} onChange={setMoodBefore} />;

      case 'mood_after':
        return <MoodStep type="after" value={moodAfter} onChange={setMoodAfter} />;

      case 'section_intro':
        return (
          <SectionIntroStep
            section={currentStep.section!}
            sectionIndex={currentStep.sectionIndex!}
            totalSections={template.sections.length}
            color={template.color}
          />
        );

      case 'field':
        return (
          <FieldStep
            field={currentStep.field!}
            value={responses[currentStep.field!.id]}
            onChange={(val) => handleResponseChange(currentStep.field!.id, val)}
            color={template.color}
          />
        );

      case 'goal_link':
        return <GoalStep selectedGoalIds={goalIds} onChange={setGoalIds} />;

      case 'completion':
        return (
          <CompletionStep
            templateName={template.name}
            pointsAwarded={pointsEarned}
            moodBefore={moodBefore}
            moodAfter={moodAfter}
          />
        );

      default:
        return null;
    }
  };

  // Button label
  const getButtonLabel = () => {
    if (!currentStep) return 'Continue';
    switch (currentStep.type) {
      case 'intro':
        return "Let's begin";
      case 'section_intro':
        return 'Continue';
      case 'mood_before':
        return 'Continue';
      case 'mood_after':
        return saving ? 'Saving...' : 'Complete';
      case 'goal_link':
        return 'Continue';
      case 'completion':
        return 'Done';
      default:
        return 'Continue';
    }
  };

  if (!template) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text>Template not found.</Text>
      </SafeAreaView>
    );
  }

  const showBackButton = currentStepIndex > 0 && !isCompleted;
  const showSkip =
    currentStep?.type === 'mood_before' ||
    currentStep?.type === 'goal_link' ||
    (currentStep?.type === 'field' && !currentStep.field?.required);

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress bar */}
      {!isCompleted && <ProgressBar progress={progress} color={template.color} />}

      {/* Header */}
      <View style={styles.header}>
        {showBackButton ? (
          <TouchableOpacity onPress={goBack} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={22} color={Colors.dark} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButton} />
        )}
        {!isCompleted && (
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Ionicons name="close" size={22} color={Colors.gray} />
          </TouchableOpacity>
        )}
      </View>

      {/* Step content */}
      <View style={styles.stepContainer}>
        <StepTransition stepKey={currentStep?.id || ''} direction={direction}>
          {renderStep()}
        </StepTransition>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {showSkip && !canContinue && (
          <TouchableOpacity onPress={goForward} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.continueButton,
            { backgroundColor: isCompleted ? Colors.primary : template.color },
            !canContinue && !showSkip && styles.continueButtonDisabled,
          ]}
          onPress={isCompleted ? () => navigation.goBack() : handleContinue}
          disabled={!canContinue && !showSkip && !isCompleted}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>{getButtonLabel()}</Text>
          {!isCompleted && currentStep?.type !== 'mood_after' && (
            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ToolConversationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerButton: {
    padding: Spacing.xs,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContainer: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  skipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
  },
  continueButtonDisabled: {
    opacity: 0.4,
  },
  continueButtonText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.white,
  },
});
