import React, { useState, useCallback, useEffect } from 'react';
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
import { Copy } from '../../components/common/Copy';
import { useCopy } from '../../context/CopyContext';
import { GradeSelector } from '../../components/home/GradeSelector';
import { useAuth } from '../../context/AuthContext';
import { ReflectionGrade, DailyReflection } from '../../types';
import { buildDailySummary, saveReflection, getReflection } from '../../services/reflections';
import {
  NightlyCloseData,
  loadNightlyClose,
  isBadDay,
  draftPlan,
} from '../../services/nightlyClose';
import { getTodayString } from '../../utils/date';
import { showAlert } from '../../utils/alert';
import { useScreenIntro } from '../../hooks/useScreenIntro';
import { ScreenIntro, ScreenIntroButton } from '../../components/common/ScreenIntro';

type Props = HomeScreenProps<'NightlyReflection'>;

/** Habit chips offered for tomorrow's plan; more than this is a decision, not a nudge. */
const MAX_PLAN_CHOICES = 4;

/**
 * Closing out the day in three beats: one win the app already knows about, one
 * tap to grade the effort, one if-then for tomorrow. Logic lives in
 * services/nightlyClose.ts; this screen only wires it up.
 */
export const NightlyReflectionScreen: React.FC<Props> = ({ navigation }) => {
  const intro = useScreenIntro('nightly_reflection', {
    navigation,
    side: 'right',
    renderButton: (onPress) => <ScreenIntroButton onPress={onPress} />,
  });
  const { user } = useAuth();
  const t = useCopy();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [close, setClose] = useState<NightlyCloseData | null>(null);
  const [existingReflection, setExistingReflection] = useState<DailyReflection | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [grade, setGrade] = useState<ReflectionGrade | null>(null);
  const [ifThenCue, setIfThenCue] = useState('');
  const [ifThenResponse, setIfThenResponse] = useState('');
  const [planHabitId, setPlanHabitId] = useState<string | undefined>();
  // Once the user types in the plan, stop re-drafting it under them.
  const [planEdited, setPlanEdited] = useState(false);

  const todayStr = getTodayString();
  const today = new Date();

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [closeData, existing] = await Promise.all([
        loadNightlyClose(user.uid, todayStr),
        getReflection(user.uid, todayStr),
      ]);
      setClose(closeData);
      if (existing) {
        setExistingReflection(existing);
        setGrade(existing.grade);
        if (existing.prompt_ifthen_cue || existing.prompt_ifthen_response) {
          setIfThenCue(existing.prompt_ifthen_cue || '');
          setIfThenResponse(existing.prompt_ifthen_response || '');
          setPlanHabitId(existing.plan_habit_id);
          setPlanEdited(true);
        }
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

  const isReadOnly = existingReflection !== null && !isEditing;
  const badDay = close
    ? isBadDay({
        grade,
        loggedToday: close.loggedToday,
        missedScheduledToday: close.missedScheduledToday,
      })
    : false;
  const planChoices = (close?.planCandidates ?? []).slice(0, MAX_PLAN_CHOICES);

  // Draft (and re-draft on a grade flip or a habit switch) until the user types.
  useEffect(() => {
    if (!close || planEdited || isReadOnly) return;
    const habit = close.planCandidates.find((h) => h.id === planHabitId) ?? close.planCandidates[0];
    const draft = draftPlan(habit, badDay);
    setPlanHabitId(draft.habitId);
    setIfThenCue(draft.cue);
    setIfThenResponse(draft.response);
  }, [close, badDay, planHabitId, planEdited, isReadOnly]);

  const choosePlanHabit = (habitId: string) => {
    setPlanHabitId(habitId);
    setPlanEdited(false);
  };

  const editCue = (text: string) => {
    setIfThenCue(text);
    setPlanEdited(true);
  };

  const editResponse = (text: string) => {
    setIfThenResponse(text);
    setPlanEdited(true);
  };

  const handleSave = async () => {
    if (!user || !grade) return;
    setSaving(true);
    try {
      const cue = ifThenCue.trim();
      const response = ifThenResponse.trim();
      const hasPlan = !!(cue || response);
      await saveReflection(user.uid, {
        user_id: user.uid,
        date: todayStr,
        grade,
        prompt_ifthen_cue: cue || undefined,
        prompt_ifthen_response: response || undefined,
        plan_habit_id: hasPlan ? planHabitId : undefined,
        // No longer collected, but saveReflection writes the whole document —
        // re-saving an older day must not erase what it already holds.
        prompt_why_connection: existingReflection?.prompt_why_connection,
        factors: existingReflection?.factors,
        prompt_went_well: existingReflection?.prompt_went_well,
        prompt_hardest: existingReflection?.prompt_hardest,
        prompt_tomorrow: existingReflection?.prompt_tomorrow,
        daily_summary: await buildDailySummary(user.uid, todayStr),
        created_at: new Date().toISOString(),
      });
      showAlert(
        hasPlan ? t('nightly.alert.saved.plan.title', 'Plan set') : t('nightly.alert.saved.noplan.title', 'Saved'),
        hasPlan
          ? t('nightly.alert.saved.plan.message', 'You’ll see it at the top of Today tomorrow.')
          : t('nightly.alert.saved.noplan.message', 'Today is closed out.')
      );
      navigation.goBack();
    } catch (e: any) {
      showAlert(
        t('nightly.alert.error.title', 'Error'),
        e.message || t('nightly.alert.error.message', 'Could not save reflection.')
      );
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

  const win = close?.win ?? null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.dateText}>
        {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </Text>

      {isReadOnly && (
        <View style={styles.readOnlyBanner}>
          <Copy id="nightly.readonly.banner" style={styles.readOnlyText}>
            You already closed out today
          </Copy>
          <Button
            title={t('nightly.readonly.edit', 'Edit')}
            variant="outline"
            onPress={() => setIsEditing(true)}
            style={styles.editButton}
          />
        </View>
      )}

      {/* 1 — One win, named for them. Nothing to type. */}
      {win && (
        <View style={styles.winCard}>
          <Ionicons
            name={win.kind === 'hard' ? 'flame' : 'checkmark-circle'}
            size={22}
            color={Colors.primary}
          />
          <View style={styles.winTextWrap}>
            {win.kind === 'hard' ? (
              <Copy id="nightly.win.hard.title" style={styles.winTitle} vars={{ habit: win.habitName }}>
                {'You did {habit} even though it was hard.'}
              </Copy>
            ) : win.count === 1 ? (
              <Copy id="nightly.win.logged.title.one" style={styles.winTitle} vars={{ count: win.count }}>
                {'You showed up for {count} habit today.'}
              </Copy>
            ) : (
              <Copy id="nightly.win.logged.title.other" style={styles.winTitle} vars={{ count: win.count }}>
                {'You showed up for {count} habits today.'}
              </Copy>
            )}
            {win.kind === 'hard' ? (
              <Copy id="nightly.win.hard.sub" style={styles.winSub}>
                Doing it when it’s hard is what makes it easier next time.
              </Copy>
            ) : (
              <Copy id="nightly.win.logged.sub" style={styles.winSub}>
                Each one makes the next a little more automatic.
              </Copy>
            )}
          </View>
        </View>
      )}

      {/* 2 — Grade the effort. One tap. */}
      <GradeSelector
        value={grade}
        readOnly={isReadOnly}
        onChange={isReadOnly ? () => {} : setGrade}
      />

      {/* 3 — Tomorrow's if-then. Pre-drafted from the toughest habit due tomorrow. */}
      <Copy id="nightly.plan.title" style={styles.sectionTitle}>
        Tomorrow’s plan
      </Copy>
      <Copy id="nightly.plan.hint" style={styles.sectionHint}>
        Deciding exactly when makes you far more likely to follow through.
      </Copy>

      {badDay && !isReadOnly && (
        <View style={styles.badDayNote}>
          <Copy id="nightly.badday.title" style={styles.badDayTitle}>
            Rough day. That’s information, not a verdict.
          </Copy>
          <Copy id="nightly.badday.body" style={styles.badDayText}>
            {'People who go easy on themselves after a slip get back on track sooner. So keep tomorrow small and specific.'}
          </Copy>
        </View>
      )}

      {!isReadOnly && planChoices.length > 1 && (
        <View style={styles.chipRow}>
          {planChoices.map((h) => {
            const active = h.id === planHabitId;
            return (
              <TouchableOpacity
                key={h.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => choosePlanHabit(h.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                  {h.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* "When" / "Then" sit on the first line of their input so the pair reads as
          one sentence — the situation→response pairing is the active ingredient. */}
      <View style={styles.ifThenRow}>
        <Copy id="nightly.plan.when" style={styles.ifThenWord}>
          When
        </Copy>
        <TextInput
          style={[styles.textArea, styles.ifThenInput]}
          placeholder={t('nightly.plan.when.placeholder', 'I finish work for the day')}
          placeholderTextColor={Colors.gray}
          multiline
          textAlignVertical="top"
          value={ifThenCue}
          onChangeText={isReadOnly ? () => {} : editCue}
          editable={!isReadOnly}
        />
      </View>
      <View style={styles.ifThenRow}>
        <Copy id="nightly.plan.then" style={styles.ifThenWord}>
          Then
        </Copy>
        <TextInput
          style={[styles.textArea, styles.ifThenInput]}
          placeholder={t('nightly.plan.then.placeholder', "the specific thing you'll do")}
          placeholderTextColor={Colors.gray}
          multiline
          textAlignVertical="top"
          value={ifThenResponse}
          onChangeText={isReadOnly ? () => {} : editResponse}
          editable={!isReadOnly}
        />
      </View>

      {!isReadOnly && (
        <>
          <Button
            title={
              existingReflection
                ? t('nightly.save.update', 'Update')
                : t('nightly.save.closeout', 'Close out today')
            }
            onPress={handleSave}
            loading={saving}
            disabled={!grade}
            style={styles.saveButton}
          />
          <Copy id="nightly.skip" style={styles.skipLink} onPress={() => navigation.goBack()}>
            Skip for tonight
          </Copy>
        </>
      )}
      <ScreenIntro intro={intro} />
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
  winCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm + 2,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  winTextWrap: { flex: 1 },
  winTitle: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  winSub: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.primary,
    marginTop: Spacing.lg,
  },
  sectionHint: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  badDayNote: {
    backgroundColor: Colors.secondary + '12',
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    marginBottom: Spacing.md,
  },
  badDayTitle: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  badDayText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginTop: 2,
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    maxWidth: '100%',
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  chipTextActive: {
    color: Colors.white,
    fontFamily: Fonts.secondaryBold,
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
  ifThenRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  ifThenWord: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    paddingTop: Spacing.sm + 5,
    minWidth: 46,
  },
  ifThenInput: {
    flex: 1,
    minHeight: 60,
  },
  saveButton: {
    marginTop: Spacing.lg,
  },
  skipLink: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.lg,
    textDecorationLine: 'underline',
  },
});
