import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { HomeScreenProps } from '../../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { GradeSelector } from '../../components/home/GradeSelector';
import { DailyFactorsSelector } from '../../components/home/DailyFactorsSelector';
import { DailySummaryCard } from '../../components/home/DailySummaryCard';
import { useAuth } from '../../context/AuthContext';
import { DailySummary, ReflectionGrade, DailyReflection, DailyFactors, PracticeInstance } from '../../types';
import { buildDailySummary, saveReflection, getReflection } from '../../services/reflections';
import { getActiveHabits } from '../../services/practices';
import { showAlert } from '../../utils/alert';
import { WHY_REFLECTION_PROMPTS } from '../../constants/whyDiscovery';
import { BadDayModal } from '../../components/home/BadDayModal';

type Props = HomeScreenProps<'NightlyReflection'>;

export const NightlyReflectionScreen: React.FC<Props> = ({ navigation }) => {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [existingReflection, setExistingReflection] = useState<DailyReflection | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [grade, setGrade] = useState<ReflectionGrade | null>(null);
  const [factors, setFactors] = useState<DailyFactors>({});
  const [wentWell, setWentWell] = useState('');
  const [hardest, setHardest] = useState('');
  const [tomorrow, setTomorrow] = useState('');
  const [whyReflection, setWhyReflection] = useState('');
  const [deeperOpen, setDeeperOpen] = useState(false);
  const [badDayModalVisible, setBadDayModalVisible] = useState(false);
  const [badDayShownForGrade, setBadDayShownForGrade] = useState(false);

  // Habit list for the bad-day commit modal
  const [allHabits, setAllHabits] = useState<PracticeInstance[]>([]);

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
      const [dailySummary, existing] = await Promise.all([
        buildDailySummary(user.uid, todayStr),
        getReflection(user.uid, todayStr),
      ]);
      setSummary(dailySummary);

      if (existing) {
        setExistingReflection(existing);
        setGrade(existing.grade);
        setFactors(existing.factors || {});
        setWentWell(existing.prompt_went_well || '');
        setHardest(existing.prompt_hardest || '');
        setTomorrow(existing.prompt_tomorrow || '');
        setWhyReflection(existing.prompt_why_connection || '');
        // Auto-expand the written reflection if this day has any.
        if (
          existing.prompt_went_well ||
          existing.prompt_hardest ||
          existing.prompt_tomorrow ||
          existing.prompt_why_connection
        ) {
          setDeeperOpen(true);
        }
      }

      // Load habits for the bad-day commit modal
      try {
        const habitList = await getActiveHabits(user.uid);
        setAllHabits(habitList);
      } catch (err) {
        console.warn('Habit list load failed:', err);
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

  const handleFactorChange = (factorId: string, optionValue: string) => {
    setFactors(prev => {
      // Tapping the already-selected chip clears it.
      if (prev[factorId] === optionValue) {
        const next = { ...prev };
        delete next[factorId];
        return next;
      }
      return { ...prev, [factorId]: optionValue };
    });
  };

  const handleSave = async () => {
    if (!user || !grade || !summary) return;
    setSaving(true);
    try {
      await saveReflection(user.uid, {
        user_id: user.uid,
        date: todayStr,
        grade,
        factors: Object.keys(factors).length > 0 ? factors : undefined,
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

      {/* Today's Inputs — structured factors for pattern-finding over time */}
      <View style={styles.factorsWrap}>
        <DailyFactorsSelector
          value={factors}
          onChange={handleFactorChange}
          readOnly={isReadOnly}
        />
      </View>

      {/* Grade Selector */}
      <GradeSelector
        value={grade}
        onChange={isReadOnly ? () => {} : (g) => {
          setGrade(g);
          if ((g === 'D' || g === 'F') && !badDayShownForGrade) {
            setBadDayShownForGrade(true);
            setBadDayModalVisible(true);
          }
        }}
      />

      {/* Bad Day Modal — shown once when D or F is selected */}
      <BadDayModal
        visible={badDayModalVisible}
        habits={allHabits}
        onCommit={() => setBadDayModalVisible(false)}
        onDismiss={() => setBadDayModalVisible(false)}
      />

      {/* Go Deeper — optional written reflection, collapsed by default */}
      <View style={styles.deeperHeadRow}>
        <Text style={styles.deeperSectionTitle}>Go Deeper</Text>
        <Text style={styles.deeperSectionHint}>optional</Text>
      </View>
      <TouchableOpacity
        style={styles.collapseHeader}
        onPress={() => setDeeperOpen(o => !o)}
        activeOpacity={0.7}
      >
        <View style={styles.collapseLeft}>
          <Ionicons name="create-outline" size={20} color={Colors.dark} />
          <View style={styles.collapseTextWrap}>
            <Text style={styles.collapseTitle}>Write a reflection</Text>
            <Text style={styles.collapseSub}>
              Override wins, where the urge won, tomorrow's focus
            </Text>
          </View>
        </View>
        <Ionicons
          name={deeperOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={Colors.gray}
        />
      </TouchableOpacity>

      {deeperOpen && (
      <>
      {/* Prompts */}
      <View style={[styles.promptSection, styles.promptSectionFirst]}>
        <Text style={styles.promptLabel}>Where did you override an urge today?</Text>
        <TextInput
          style={styles.textArea}
          placeholder="A moment you chose the hard thing over the easy one..."
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
        <Text style={styles.promptLabel}>Where did the urge win?</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Where you gave in — no judgment, just name it..."
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
      </>
      )}

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
  factorsWrap: {
    marginBottom: Spacing.lg,
  },
  deeperHeadRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  deeperSectionTitle: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.primary,
  },
  deeperSectionHint: {
    fontFamily: Fonts.secondary,
    fontSize: 11,
    color: Colors.gray,
  },
  collapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md - 2,
  },
  collapseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    flex: 1,
  },
  collapseTextWrap: {
    flex: 1,
  },
  collapseTitle: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  collapseSub: {
    fontFamily: Fonts.secondary,
    fontSize: 11,
    color: Colors.gray,
    marginTop: 1,
  },
  promptSection: {
    marginBottom: Spacing.lg,
  },
  promptSectionFirst: {
    marginTop: Spacing.lg,
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
});
