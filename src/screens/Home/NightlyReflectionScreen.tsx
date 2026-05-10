import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { GradeSelector } from '../../components/home/GradeSelector';
import { DailySummaryCard } from '../../components/home/DailySummaryCard';
import { useAuth } from '../../context/AuthContext';
import { DailySummary, ReflectionGrade, DailyReflection, Goal } from '../../types';
import { buildDailySummary, saveReflection, getReflection } from '../../services/reflections';
import { getActiveGoals } from '../../services/goals';
import { showAlert } from '../../utils/alert';
import { WHY_REFLECTION_PROMPTS } from '../../constants/whyDiscovery';

type Props = NativeStackScreenProps<any, 'NightlyReflection'>;

export const NightlyReflectionScreen: React.FC<Props> = ({ navigation }) => {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [existingReflection, setExistingReflection] = useState<DailyReflection | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [grade, setGrade] = useState<ReflectionGrade | null>(null);
  const [wentWell, setWentWell] = useState('');
  const [hardest, setHardest] = useState('');
  const [tomorrow, setTomorrow] = useState('');
  const [whyReflection, setWhyReflection] = useState('');
  const [goalCBT, setGoalCBT] = useState<Goal | null>(null);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Rotate Why-connection prompt daily (stable per day)
  const todaysWhyPrompt = useMemo(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    return WHY_REFLECTION_PROMPTS[dayOfYear % WHY_REFLECTION_PROMPTS.length];
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [dailySummary, existing, activeGoals] = await Promise.all([
        buildDailySummary(user.uid, todayStr),
        getReflection(user.uid, todayStr),
        getActiveGoals(user.uid),
      ]);
      setSummary(dailySummary);

      // Load first goal with CBT data for self-compassion prompts
      const cbtGoal = activeGoals.find(
        (g) => g.recovery_plan || g.identity_statement || g.inner_voice_response
      );
      if (cbtGoal) setGoalCBT(cbtGoal);

      if (existing) {
        setExistingReflection(existing);
        setGrade(existing.grade);
        setWentWell(existing.prompt_went_well || '');
        setHardest(existing.prompt_hardest || '');
        setTomorrow(existing.prompt_tomorrow || '');
        setWhyReflection(existing.prompt_why_connection || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user, todayStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!user || !grade || !summary) return;
    setSaving(true);
    try {
      await saveReflection(user.uid, {
        user_id: user.uid,
        date: todayStr,
        grade,
        prompt_went_well: wentWell.trim() || undefined,
        prompt_hardest: hardest.trim() || undefined,
        prompt_tomorrow: tomorrow.trim() || undefined,
        prompt_why_connection: whyReflection.trim() || undefined,
        daily_summary: summary,
        created_at: new Date().toISOString(),
      });
      showAlert('Reflection Saved', 'Great job reflecting on your day!');
      navigation.goBack();
    } catch (e: any) {
      showAlert('Error', e.message || 'Could not save reflection.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const isReadOnly = existingReflection !== null && !isEditing;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <Text style={styles.dateText}>
        {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </Text>

      {/* Why Statement Banner */}
      {userProfile?.why_statement ? (
        <View style={styles.whyBanner}>
          <Ionicons name="compass-outline" size={18} color={Colors.primary} />
          <Text style={styles.whyBannerText}>{userProfile.why_statement}</Text>
        </View>
      ) : null}

      {isReadOnly && (
        <View style={styles.readOnlyBanner}>
          <Text style={styles.readOnlyText}>You already reflected today</Text>
          <Button
            title="Edit"
            variant="outline"
            onPress={() => setIsEditing(true)}
            style={styles.editButton}
          />
        </View>
      )}

      {/* Daily Summary */}
      {summary && <DailySummaryCard summary={summary} />}

      {/* Grade Selector */}
      <GradeSelector
        value={grade}
        onChange={isReadOnly ? () => {} : setGrade}
      />

      {/* Self-Compassion Prompt — shown on low-grade days (D or F) */}
      {grade && (grade === 'D' || grade === 'F') && !isReadOnly && (
        <View style={styles.selfCompassionBanner}>
          <Ionicons name="heart-outline" size={18} color={Colors.secondary} />
          <View style={styles.selfCompassionContent}>
            <Text style={styles.selfCompassionText}>
              What would you say to a friend who had this day?
            </Text>
            {goalCBT?.recovery_plan && (
              <Text style={styles.selfCompassionPlan}>
                Your plan for days like this: "{goalCBT.recovery_plan}"
              </Text>
            )}
            {goalCBT?.minimum_action && (
              <Text style={styles.selfCompassionMinAction}>
                Tomorrow's worst-day win: "{goalCBT.minimum_action}"
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Prompts */}
      <View style={styles.promptSection}>
        <Text style={styles.promptLabel}>What went well today?</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Celebrate your wins, big or small..."
          placeholderTextColor={Colors.gray}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          value={wentWell}
          onChangeText={isReadOnly ? () => {} : setWentWell}
          editable={!isReadOnly}
        />
      </View>

      <View style={styles.promptSection}>
        <Text style={styles.promptLabel}>What was hardest?</Text>
        <TextInput
          style={styles.textArea}
          placeholder="What challenged you most today?"
          placeholderTextColor={Colors.gray}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          value={hardest}
          onChangeText={isReadOnly ? () => {} : setHardest}
          editable={!isReadOnly}
        />
      </View>

      <View style={styles.promptSection}>
        <Text style={styles.promptLabel}>What will you do differently tomorrow?</Text>
        <TextInput
          style={styles.textArea}
          placeholder="One thing you'll focus on..."
          placeholderTextColor={Colors.gray}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          value={tomorrow}
          onChangeText={isReadOnly ? () => {} : setTomorrow}
          editable={!isReadOnly}
        />
      </View>

      {/* Why Connection Prompt (rotating daily) */}
      {userProfile?.why_statement ? (
        <View style={styles.promptSection}>
          <View style={styles.whyPromptHeader}>
            <Ionicons name="compass-outline" size={16} color={Colors.primary} />
            <Text style={styles.whyPromptLabel}>{todaysWhyPrompt}</Text>
          </View>
          <TextInput
            style={styles.textArea}
            placeholder="Connect today back to your purpose..."
            placeholderTextColor={Colors.gray}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            value={whyReflection}
            onChangeText={isReadOnly ? () => {} : setWhyReflection}
            editable={!isReadOnly}
          />
        </View>
      ) : null}

      {/* Actions */}
      {!isReadOnly && (
        <>
          <Button
            title={existingReflection ? 'Update Reflection' : 'Save Reflection'}
            onPress={handleSave}
            loading={saving}
            disabled={!grade}
            style={styles.saveButton}
          />
          <Text
            style={styles.skipLink}
            onPress={() => navigation.goBack()}
          >
            Skip for tonight
          </Text>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  dateText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    marginBottom: Spacing.lg,
  },
  readOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  readOnlyText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  editButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  promptSection: {
    marginBottom: Spacing.lg,
  },
  promptLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  textArea: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    backgroundColor: Colors.white,
    minHeight: 80,
  },
  saveButton: {
    marginTop: Spacing.sm,
  },
  skipLink: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.lg,
    textDecorationLine: 'underline',
  },
  whyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.primary + '10',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
  whyBannerText: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontStyle: 'italic',
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
  },
  whyPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  whyPromptLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
    flex: 1,
  },
  // Self-compassion styles
  selfCompassionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.secondary + '10',
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
  },
  selfCompassionContent: {
    flex: 1,
  },
  selfCompassionText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  selfCompassionPlan: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    fontStyle: 'italic',
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
  selfCompassionMinAction: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
});
