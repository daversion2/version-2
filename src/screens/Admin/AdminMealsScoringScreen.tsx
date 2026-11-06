import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Stepper } from '../../components/common/Stepper';
import { SegmentedControl } from '../../components/common/SegmentedControl';
import { showAlert, showConfirm } from '../../utils/alert';
import { useAuth } from '../../context/AuthContext';
import type { BuiltInGroupId, MealGoalId, MealsModel } from '../../types/meals';
import {
  BUILT_IN_MEALS_MODEL,
  FOOD_SECTIONS,
  MEAL_GOALS,
  QUALITIES,
  SAMPLE_PLATES,
  mealGoal,
  sectionGroups,
} from '../../data/mealGroups';
import { chipReason, goalScores } from '../../services/mealsMath';
import {
  MAX_WEIGHT,
  getMealsModel,
  modelChangeCount,
  onTargetCount,
  previewPlates,
  resetMealsModel,
  saveMealsModel,
  withBase,
  withCeiling,
  withRating,
  withWeight,
} from '../../services/mealsModel';

const CEILING_LABELS = ['Whole', 'Lightly processed', 'Processed', 'Ultra-processed'];

/**
 * Admin → Meals scoring: the model every Meals chip score is worked out from —
 * goal weights, the start, the processing caps and each food group's ratings.
 * Edits stay a draft, previewed on sample plates, until Save sends them to
 * everyone (config/mealsModel, services/mealsModel.ts). Days already logged
 * keep their scores.
 */
export const AdminMealsScoringScreen: React.FC = () => {
  const { user } = useAuth();
  const [live, setLive] = useState<MealsModel>(BUILT_IN_MEALS_MODEL);
  const [draft, setDraft] = useState<MealsModel>(BUILT_IN_MEALS_MODEL);
  const [goal, setGoal] = useState<MealGoalId>('balanced');
  const [open, setOpen] = useState<BuiltInGroupId | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const model = await getMealsModel();
    setLive(model);
    setDraft(model);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const changes = modelChangeCount(live, draft);
  const fromBuiltIn = modelChangeCount(BUILT_IN_MEALS_MODEL, live);
  const plates = useMemo(() => previewPlates(SAMPLE_PLATES, live, draft, goal), [live, draft, goal]);
  const moved = plates.filter((p) => p.before !== p.after);
  const liveScores = goalScores(goal, live);
  const draftScores = goalScores(goal, draft);
  const weights = draft.weights[goal];

  const save = () =>
    showConfirm(
      'Save for everyone?',
      `${changes} ${changes === 1 ? 'change' : 'changes'}. Everyone scores with this from their next app open. Days already logged keep their scores.`,
      async () => {
        if (!user) return;
        setSaving(true);
        try {
          await saveMealsModel(draft, user.uid);
          setLive(draft);
          showAlert('Saved', 'Meals scores are updated for everyone.');
        } catch (error: any) {
          showAlert('Couldn’t save', error?.message ?? 'Check your connection and try again.');
        } finally {
          setSaving(false);
        }
      },
      'Save'
    );

  const reset = () =>
    showConfirm(
      'Reset to built-in?',
      'Everyone goes back to the scores the app ships with, from their next app open. Days already logged keep their scores.',
      async () => {
        setSaving(true);
        try {
          await resetMealsModel();
          setLive(BUILT_IN_MEALS_MODEL);
          setDraft(BUILT_IN_MEALS_MODEL);
          showAlert('Reset', 'Meals scores are back to the built-in model.');
        } catch (error: any) {
          showAlert('Couldn’t reset', error?.message ?? 'Check your connection and try again.');
        } finally {
          setSaving(false);
        }
      },
      'Reset'
    );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const beforeOn = onTargetCount(plates.map((p) => p.before));
  const afterOn = onTargetCount(plates.map((p) => p.after));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <Text style={styles.hint}>
          Every Meals food group starts at the base score, gains or loses points for each rating × its goal’s
          weight, then is capped by how processed it is. Changes stay a draft until you save; then everyone scores
          with them from their next app open. Days already logged keep their scores.
        </Text>
        <Text style={styles.status}>
          {fromBuiltIn === 0 ? 'Live: the built-in model.' : `Live: saved model, ${fromBuiltIn} changes from built-in.`}
          {changes > 0 ? ` Draft: ${changes} unsaved ${changes === 1 ? 'change' : 'changes'}.` : ''}
        </Text>

        <SegmentedControl
          options={MEAL_GOALS.map((g) => ({ value: g.id, label: g.label }))}
          value={goal}
          onChange={setGoal}
          accessibilityLabel="Goal"
          style={styles.seg}
        />

        <Text style={styles.section}>Preview · {mealGoal(goal).label}</Text>
        <Card style={styles.card}>
          <Text style={styles.big}>
            {beforeOn === afterOn ? `${afterOn}` : `${beforeOn} → ${afterOn}`} of {plates.length}
          </Text>
          <Text style={styles.meta}>sample plates on target (70+)</Text>
          {moved.length === 0 ? (
            <Text style={[styles.meta, styles.gapTop]}>No plate changes for this goal.</Text>
          ) : (
            moved.map((p) => (
              <View key={p.name} style={styles.lineRow}>
                <Text style={styles.lineLabel} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.lineValue}>
                  {p.before} → {p.after}
                </Text>
              </View>
            ))
          )}
        </Card>

        <Text style={styles.section}>Weights · {mealGoal(goal).label}</Text>
        <Card style={styles.card}>
          {QUALITIES.map((q, i) => (
            <View key={q.id} style={[styles.row, i > 0 && styles.divider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{q.label}</Text>
                <Text style={styles.meta}>{q.kind === 'plus' ? 'Adds points per rating' : 'Takes points away per rating'}</Text>
              </View>
              <Stepper
                value={weights[q.id]}
                min={0}
                max={MAX_WEIGHT}
                onChange={(n) => setDraft(withWeight(draft, goal, q.id, n))}
                accessibilityLabel={`${q.label} weight`}
                tint={Colors.primary}
              />
            </View>
          ))}
        </Card>

        <Text style={styles.section}>Base and caps · every goal</Text>
        <Card style={styles.card}>
          <View style={styles.row}>
            <Text style={[styles.name, { flex: 1 }]}>Base score</Text>
            <Stepper
              value={draft.base}
              min={0}
              max={100}
              step={5}
              onChange={(n) => setDraft(withBase(draft, n))}
              accessibilityLabel="Base score"
              tint={Colors.primary}
            />
          </View>
          {CEILING_LABELS.map((label, i) => (
            <View key={label} style={[styles.row, styles.divider]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{label}</Text>
                <Text style={styles.meta}>Highest score at processing {i}</Text>
              </View>
              <Stepper
                value={draft.ceilings[i]}
                min={0}
                max={100}
                step={5}
                onChange={(n) => setDraft(withCeiling(draft, i, n))}
                accessibilityLabel={`${label} cap`}
                tint={Colors.primary}
              />
            </View>
          ))}
        </Card>

        {FOOD_SECTIONS.map((section) => (
          <React.Fragment key={section.id}>
            <Text style={styles.section}>{section.label}</Text>
            <Card style={styles.card}>
              {sectionGroups(section.id).map((g, i) => {
                const isOpen = open === g.id;
                const before = liveScores[g.id];
                const after = draftScores[g.id];
                return (
                  <View key={g.id} style={i > 0 && styles.divider}>
                    <TouchableOpacity
                      style={styles.row}
                      onPress={() => setOpen(isOpen ? null : g.id)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isOpen }}
                      accessibilityLabel={`${g.label}, scores ${after}. ${isOpen ? 'Hide' : 'Edit'} ratings.`}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{g.label}</Text>
                        <Text style={styles.meta}>{chipReason(g.id, draft)}</Text>
                      </View>
                      <Text style={styles.score}>{before === after ? after : `${before} → ${after}`}</Text>
                      <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.gray} />
                    </TouchableOpacity>
                    {isOpen &&
                      QUALITIES.map((q) => (
                        <View key={q.id} style={[styles.row, styles.ratingRow]}>
                          <Text style={[styles.meta, { flex: 1 }]}>{q.label}</Text>
                          <Stepper
                            value={draft.profiles[g.id][q.id]}
                            min={0}
                            max={q.max}
                            onChange={(n) => setDraft(withRating(draft, g.id, q.id, n))}
                            accessibilityLabel={`${g.label} ${q.label} rating`}
                            tint={Colors.primary}
                          />
                        </View>
                      ))}
                  </View>
                );
              })}
            </Card>
          </React.Fragment>
        ))}

        <Button
          title={changes === 0 ? 'No changes to save' : `Save ${changes} ${changes === 1 ? 'change' : 'changes'} for everyone`}
          onPress={save}
          disabled={changes === 0 || saving}
          loading={saving}
          style={styles.saveBtn}
        />
        {changes > 0 && (
          <TouchableOpacity style={styles.link} onPress={() => setDraft(live)} disabled={saving}>
            <Text style={styles.linkText}>Discard changes</Text>
          </TouchableOpacity>
        )}
        {fromBuiltIn > 0 && (
          <TouchableOpacity style={styles.link} onPress={reset} disabled={saving}>
            <Ionicons name="refresh-outline" size={16} color={Colors.secondary} />
            <Text style={[styles.linkText, { color: Colors.secondary }]}>Reset to built-in</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.lightGray },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center' },
  hint: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, lineHeight: 19 },
  status: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.dark, marginTop: Spacing.sm },
  seg: { marginTop: Spacing.md },
  section: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  card: { paddingVertical: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, minHeight: 48 },
  ratingRow: { paddingLeft: Spacing.md, paddingVertical: 4, minHeight: 44 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.separator },
  name: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: Colors.dark },
  meta: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, marginTop: 1 },
  gapTop: { marginTop: Spacing.sm },
  score: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: Colors.dark },
  big: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xl, color: Colors.dark, paddingTop: Spacing.xs },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  lineLabel: { flex: 1, fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark },
  lineValue: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.dark },
  saveBtn: { marginTop: Spacing.xl },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    minHeight: 44,
  },
  linkText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.primary },
});
