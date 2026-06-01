import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../constants/theme';
import { Button } from '../../../components/common/Button';
import { GoalProgressDots } from '../../../components/goals/GoalProgressDots';
import { GoalCelebration } from '../../../components/goals/GoalCelebration';
import { VisualizationPromptModal } from '../../../components/goals/VisualizationPromptModal';
import { HabitLinkingModal } from '../../../components/goals/HabitLinkingModal';
import { useAuth } from '../../../context/AuthContext';
import {
  getActiveGoals,
  createGoal,
  createGoalDraft,
  updateGoalDraft,
  commitGoalDraft,
  getGoalById,
  updateGoalTrackingHabit,
} from '../../../services/goals';
import { getActiveHabits } from '../../../services/habits';
import { GOAL_CONSTANTS, CREATION_FLOW_STEPS } from '../../../constants/goals';
import {
  MeasurementType,
  MeasurementConfig,
  GoalObstacle,
  VisualizationSettings,
  Nudge,
  MeasurementConfigDoneByDate,
  MeasurementConfigReachNumber,
  MeasurementConfigHitTotal,
  MeasurementConfigRateSelf,
} from '../../../types';

import { GoalNameStep } from './steps/GoalNameStep';
import { GoalWhyStep } from './steps/GoalWhyStep';
import { GoalMeasurementStep } from './steps/GoalMeasurementStep';
import { GoalObstaclesStep } from './steps/GoalObstaclesStep';
import { GoalCommitStep } from './steps/GoalCommitStep';

interface GoalCreationFlowProps {
  navigation: any;
  route: any;
}

const TOTAL_STEPS = CREATION_FLOW_STEPS.length;

const deriveEndDate = (config?: Partial<MeasurementConfig>): string => {
  if (config) {
    if (config.type === 'done_by_date' && (config as any).target_date) {
      return (config as MeasurementConfigDoneByDate).target_date;
    }
    if (config.type === 'hit_total' && (config as any).deadline) {
      return (config as MeasurementConfigHitTotal).deadline!;
    }
  }
  const d = new Date();
  d.setDate(d.getDate() + GOAL_CONSTANTS.DEFAULT_GOAL_DURATION_DAYS);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const GoalCreationFlow: React.FC<GoalCreationFlowProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [atCap, setAtCap] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(route?.params?.draftId || null);
  const [returnStep, setReturnStep] = useState<number | null>(null);
  const [skippedSteps, setSkippedSteps] = useState<Set<number>>(new Set());

  // Celebration + visualization + habit linking state
  const [showCelebration, setShowCelebration] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);
  const [showHabitLinking, setShowHabitLinking] = useState(false);
  const [activeHabitsForLinking, setActiveHabitsForLinking] = useState<Nudge[]>([]);
  const [createdGoalId, setCreatedGoalId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [deeperWhy, setDeeperWhy] = useState('');
  const [identityStatement, setIdentityStatement] = useState('');
  const [measurementType, setMeasurementType] = useState<MeasurementType | null>(null);
  const [measurementConfig, setMeasurementConfig] = useState<Partial<MeasurementConfig>>({});
  const [obstacles, setObstacles] = useState<GoalObstacle[]>([
    { id: '1', obstacle: '', when_then_plan: '' },
  ]);

  // Load draft if resuming
  useEffect(() => {
    if (!user || !draftId) return;
    (async () => {
      const draft = await getGoalById(user.uid, draftId);
      if (!draft || draft.draft_status !== 'draft') return;

      setName(draft.name || '');
      setDeeperWhy(draft.deeper_why || '');
      setIdentityStatement(draft.identity_statement || '');
      if (draft.measurement_type) setMeasurementType(draft.measurement_type);
      if (draft.measurement_config) setMeasurementConfig(draft.measurement_config);
      if (draft.obstacles && draft.obstacles.length > 0) setObstacles(draft.obstacles);

      // Determine which step to resume on
      if (!draft.name?.trim()) setCurrentStep(1);
      else if (!draft.deeper_why?.trim()) setCurrentStep(2);
      else if (!draft.measurement_type) setCurrentStep(3);
      else setCurrentStep(5); // Skip to commit if most data is filled
    })();
  }, [user, draftId]);

  // Check cap on mount
  useEffect(() => {
    if (!user) return;
    getActiveGoals(user.uid).then((goals) => {
      setAtCap(goals.length >= GOAL_CONSTANTS.MAX_ACTIVE);
    });
  }, [user]);

  const validateStep = (): boolean => {
    switch (currentStep) {
      case 1:
        if (!name.trim()) {
          Alert.alert('Required', 'Please enter a goal name.');
          return false;
        }
        return true;
      case 2:
        if (!deeperWhy.trim()) {
          Alert.alert('Required', 'Please explain why this goal matters to you.');
          return false;
        }
        return true;
      case 3:
        if (!measurementType) {
          Alert.alert('Required', 'Please choose how you\'ll measure success.');
          return false;
        }
        // Per-type validation
        if (measurementType === 'done_by_date') {
          const c = measurementConfig as Partial<MeasurementConfigDoneByDate>;
          if (!c.target_date) {
            Alert.alert('Required', 'Please set a target date.');
            return false;
          }
        } else if (measurementType === 'reach_number') {
          const c = measurementConfig as Partial<MeasurementConfigReachNumber>;
          if (!c.metric_name?.trim()) {
            Alert.alert('Required', 'Please enter what you\'re measuring.');
            return false;
          }
          if (c.starting_value === undefined || c.target_value === undefined) {
            Alert.alert('Required', 'Please enter starting and target values.');
            return false;
          }
          if (!c.direction) {
            Alert.alert('Required', 'Please select a direction (going up or down).');
            return false;
          }
        } else if (measurementType === 'hit_total') {
          const c = measurementConfig as Partial<MeasurementConfigHitTotal>;
          if (!c.target_count || c.target_count <= 0) {
            Alert.alert('Required', 'Please enter a target count greater than 0.');
            return false;
          }
        } else if (measurementType === 'rate_yourself') {
          const c = measurementConfig as Partial<MeasurementConfigRateSelf>;
          if (!c.scale_max) {
            Alert.alert('Required', 'Please choose a rating scale.');
            return false;
          }
          const freq = c.check_in_frequency ?? 'weekly';
          if (freq === 'weekly' && !c.check_in_day) {
            Alert.alert('Required', 'Please choose a check-in day.');
            return false;
          }
          if (!c.reflection_question?.trim()) {
            Alert.alert('Required', 'Please enter a reflection question.');
            return false;
          }
        }
        return true;
      case 4:
        // Optional screen — always valid
        return true;
      case 5:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep()) return;

    // If returning to summary after editing
    if (returnStep !== null) {
      setCurrentStep(returnStep);
      setReturnStep(null);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => prev + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handleBack = () => {
    if (returnStep !== null) {
      // Cancel editing, return to summary
      setCurrentStep(returnStep);
      setReturnStep(null);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    if (currentStep > 1) {
      // Skip back over skipped steps
      let prevStep = currentStep - 1;
      while (prevStep > 0 && skippedSteps.has(prevStep)) {
        prevStep--;
      }
      if (prevStep >= 1) {
        setCurrentStep(prevStep);
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }
    } else {
      navigation.goBack();
    }
  };

  const handleSkip = () => {
    setSkippedSteps((prev) => new Set(prev).add(currentStep));
    setCurrentStep((prev) => prev + 1);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleEditFromSummary = (step: number) => {
    setReturnStep(5);
    setCurrentStep(step);
    // Clear skip status for this step since the user is actively editing it
    setSkippedSteps((prev) => {
      const next = new Set(prev);
      next.delete(step);
      return next;
    });
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const getFormData = () => ({
    name,
    deeper_why: deeperWhy,
    identity_statement: identityStatement,
    measurement_type: measurementType || undefined,
    measurement_config: measurementType ? (measurementConfig as MeasurementConfig) : undefined,
    obstacles: obstacles.filter((o) => o.obstacle.trim()),
  });

  const handleSaveDraft = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = getFormData();
      if (draftId) {
        await updateGoalDraft(user.uid, draftId, data);
      } else {
        const id = await createGoalDraft(user.uid, data);
        setDraftId(id);
      }
      Alert.alert('Draft saved', 'You can continue this goal later from your Goals tab.');
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save draft');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let goalId: string;

      if (draftId) {
        // Update draft with final data, then commit
        const data = getFormData();
        await updateGoalDraft(user.uid, draftId, data);
        await commitGoalDraft(user.uid, draftId);
        goalId = draftId;
      } else {
        // Create new goal directly as committed
        const data = getFormData();
        goalId = await createGoal(user.uid, {
          name: data.name,
          end_date: deriveEndDate(data.measurement_config),
          deeper_why: data.deeper_why,
          identity_statement: data.identity_statement,
          measurement_type: data.measurement_type,
          measurement_config: data.measurement_config,
          obstacles: data.obstacles.length > 0 ? data.obstacles : undefined,
        });
      }

      setCreatedGoalId(goalId);
      setShowCelebration(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create goal');
    } finally {
      setLoading(false);
    }
  };

  const handleCelebrationComplete = async () => {
    setShowCelebration(false);

    // For hit_total goals, show habit linking modal before visualization
    if (measurementType === 'hit_total' && user) {
      try {
        const habits = await getActiveHabits(user.uid);
        setActiveHabitsForLinking(habits);
        setShowHabitLinking(true);
        return;
      } catch {
        // Fall through to visualization if habit fetch fails
      }
    }

    setShowVisualization(true);
  };

  const handleHabitLink = async (habitId: string) => {
    if (user && createdGoalId) {
      try {
        await updateGoalTrackingHabit(user.uid, createdGoalId, habitId);
      } catch {
        // Non-critical — continue to visualization
      }
    }
    setShowHabitLinking(false);
    setShowVisualization(true);
  };

  const handleHabitLinkSkip = () => {
    setShowHabitLinking(false);
    setShowVisualization(true);
  };

  const handleHabitLinkCreateNew = () => {
    setShowHabitLinking(false);
    // Navigate to manage habits, then visualization will show when they return
    // For now, just proceed to visualization
    setShowVisualization(true);
  };

  const handleVisualizationSave = async (settings: VisualizationSettings) => {
    try {
      if (user && createdGoalId) {
        const { updateDoc: firestoreUpdate, doc: firestoreDoc } = await import('firebase/firestore');
        const { db } = await import('../../../services/firebase');
        const ref = firestoreDoc(db, 'users', user.uid, 'goals', createdGoalId);
        await firestoreUpdate(ref, { visualization_settings: settings });
      }
    } catch {
      // Visualization is non-critical — don't block navigation
    }
    setShowVisualization(false);
    navigation.popToTop();
  };

  const handleVisualizationDismiss = () => {
    setShowVisualization(false);
    navigation.popToTop();
  };

  // Check if current step is optional
  const currentStepDef = CREATION_FLOW_STEPS[currentStep - 1];
  const isOptionalStep = currentStepDef && 'optional' in currentStepDef && currentStepDef.optional;
  const isLastStep = currentStep === TOTAL_STEPS;
  const isEditing = returnStep !== null;

  // Cap screen
  if (atCap && !draftId) {
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
      {/* Progress dots */}
      <GoalProgressDots
        totalSteps={TOTAL_STEPS}
        currentStep={currentStep}
        skippedSteps={skippedSteps}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {currentStep === 1 && (
          <GoalNameStep name={name} onChangeName={setName} />
        )}
        {currentStep === 2 && (
          <GoalWhyStep
            deeperWhy={deeperWhy}
            identityStatement={identityStatement}
            onChangeWhy={setDeeperWhy}
            onChangeIdentity={setIdentityStatement}
          />
        )}
        {currentStep === 3 && (
          <GoalMeasurementStep
            measurementType={measurementType}
            measurementConfig={measurementConfig}
            onChangeType={setMeasurementType}
            onChangeConfig={setMeasurementConfig}
          />
        )}
        {currentStep === 4 && (
          <GoalObstaclesStep
            obstacles={obstacles}
            onChangeObstacles={setObstacles}
          />
        )}
        {currentStep === 5 && (
          <GoalCommitStep
            name={name}
            deeperWhy={deeperWhy}
            identityStatement={identityStatement}
            measurementType={measurementType}
            measurementConfig={measurementConfig}
            obstacles={obstacles}
            onEditStep={handleEditFromSummary}
          />
        )}
      </ScrollView>

      {/* Navigation bar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
          <Text style={styles.backButtonText}>
            {isEditing ? 'Cancel' : 'Back'}
          </Text>
        </TouchableOpacity>

        <View style={styles.navRight}>
          {/* Skip button for optional screens */}
          {isOptionalStep && !isEditing && (
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          )}

          {isLastStep && !isEditing ? (
            <View style={styles.commitButtons}>
              <TouchableOpacity style={styles.draftButton} onPress={handleSaveDraft}>
                <Text style={styles.draftButtonText}>Save draft</Text>
              </TouchableOpacity>
              <Button
                title="I'm committing to this"
                onPress={handleCommit}
                loading={loading}
                style={styles.commitButton}
              />
            </View>
          ) : (
            <Button
              title={isEditing ? 'Done' : 'Continue'}
              onPress={handleNext}
              loading={loading}
              style={styles.nextButton}
            />
          )}
        </View>
      </View>

      {/* Celebration overlay */}
      <GoalCelebration visible={showCelebration} onComplete={handleCelebrationComplete} />

      {/* Habit linking modal (hit_total only) */}
      <HabitLinkingModal
        visible={showHabitLinking}
        habits={activeHabitsForLinking}
        onLink={handleHabitLink}
        onCreateNew={handleHabitLinkCreateNew}
        onSkip={handleHabitLinkSkip}
      />

      {/* Visualization prompt modal */}
      <VisualizationPromptModal
        visible={showVisualization}
        onSave={handleVisualizationSave}
        onDismiss={handleVisualizationDismiss}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.lightGray,
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
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  skipButton: {
    padding: Spacing.sm,
  },
  skipButtonText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
  },
  nextButton: {
    minWidth: 120,
  },
  commitButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  draftButton: {
    padding: Spacing.sm,
  },
  draftButtonText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  commitButton: {
    minWidth: 160,
  },
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
});
