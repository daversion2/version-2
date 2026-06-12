import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { Dropdown } from '../../components/common/Dropdown';
import { showAlert, showConfirm } from '../../utils/alert';
import {
  OnboardingStep,
  DEFAULT_ONBOARDING_CONFIG,
  STEP_TYPE_LABELS,
  getOnboardingConfig,
  saveOnboardingConfig,
  resetOnboardingConfig,
  newTextPageStep,
} from '../../services/onboardingConfig';
import { HABIT_LIBRARY } from '../../data/habitLibrary';

const HABIT_OPTIONS = HABIT_LIBRARY.map((h) => ({ value: h.id, label: h.name }));

/** Welcome and Reveal are structural: fixed position, always enabled. */
const isFixed = (step: OnboardingStep) => step.type === 'welcome' || step.type === 'reveal';

export const AdminOnboardingScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [steps, setSteps] = useState<OnboardingStep[]>(DEFAULT_ONBOARDING_CONFIG.steps);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // Mantra examples edited as one-per-line text, keyed by step id
  const [examplesText, setExamplesText] = useState<Record<string, string>>({});

  const loadSteps = (loaded: OnboardingStep[]) => {
    setSteps(loaded);
    const texts: Record<string, string> = {};
    loaded
      .filter((s) => s.type === 'mantra_picker')
      .forEach((s) => {
        texts[s.id] = ((s.content.examples as string[]) ?? []).join('\n');
      });
    setExamplesText(texts);
  };

  useEffect(() => {
    (async () => {
      try {
        const cfg = await getOnboardingConfig();
        loadSteps(cfg.steps);
      } catch (error: any) {
        showAlert('Error', error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateStep = (id: string, updates: Partial<OnboardingStep>) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));

  const updateContent = (id: string, key: string, value: any) =>
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, content: { ...s.content, [key]: value } } : s))
    );

  const updateNumericContent = (id: string, key: string, text: string) => {
    const n = parseInt(text, 10);
    updateContent(id, key, Number.isNaN(n) ? 0 : n);
  };

  const moveStep = (id: string, direction: -1 | 1) =>
    setSteps((prev) => {
      const index = prev.findIndex((s) => s.id === id);
      const target = index + direction;
      // Keep middle steps strictly between welcome (0) and reveal (last)
      if (index <= 0 || index >= prev.length - 1) return prev;
      if (target <= 0 || target >= prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const removeStep = (step: OnboardingStep) => {
    showConfirm(
      'Delete Step',
      `Delete the "${step.content.headline || STEP_TYPE_LABELS[step.type]}" page?`,
      () => setSteps((prev) => prev.filter((s) => s.id !== step.id)),
      'Delete'
    );
  };

  const addTextPage = () => {
    const step = newTextPageStep(`${Date.now().toString(36)}`);
    setSteps((prev) => [...prev.slice(0, prev.length - 1), step, prev[prev.length - 1]]);
    setExpanded((prev) => ({ ...prev, [step.id]: true }));
  };

  const handleSave = async () => {
    // Fold the one-per-line mantra text back into step content
    const finalSteps = steps.map((s) => {
      if (s.type !== 'mantra_picker') return s;
      const examples = (examplesText[s.id] ?? '')
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean);
      return { ...s, content: { ...s.content, examples } };
    });

    for (const s of finalSteps) {
      if (!s.enabled) continue;
      if (s.type === 'timer' && (s.content.seconds < 5 || s.content.seconds > 600)) {
        showAlert('Invalid Timer', 'Timer must be between 5 and 600 seconds.');
        return;
      }
      if (s.type === 'mantra_picker' && (s.content.examples as string[]).length === 0) {
        showAlert('Missing Mantras', 'Provide at least one example mantra (one per line).');
        return;
      }
      if (
        s.type === 'habit_picker' &&
        (s.content.foundation_target_per_week < 1 || s.content.foundation_target_per_week > 7)
      ) {
        showAlert('Invalid Target', 'Foundation habit target must be 1–7 times per week.');
        return;
      }
      if (!s.next_button.trim()) {
        showAlert('Missing Button Label', `The ${STEP_TYPE_LABELS[s.type]} step needs a button label.`);
        return;
      }
    }

    setSaving(true);
    try {
      await saveOnboardingConfig({ steps: finalSteps });
      showAlert('Saved', 'New signups will see this flow immediately.');
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    showConfirm(
      'Reset to Defaults',
      'This deletes the custom config — onboarding reverts to the built-in 7-step flow. Continue?',
      async () => {
        setSaving(true);
        try {
          await resetOnboardingConfig();
          loadSteps(DEFAULT_ONBOARDING_CONFIG.steps);
          showAlert('Reset', 'Onboarding is back to the built-in defaults.');
        } catch (error: any) {
          showAlert('Error', error.message);
        } finally {
          setSaving(false);
        }
      },
      'Reset'
    );
  };

  // ---------- Per-type content fields ----------

  const renderFields = (step: OnboardingStep) => {
    const set = (key: string) => (t: string) => updateContent(step.id, key, t);
    switch (step.type) {
      case 'welcome':
        return (
          <>
            <InputField label="Title" value={step.content.title} onChangeText={set('title')} multiline />
            <InputField label="Subtitle" value={step.content.subtitle} onChangeText={set('subtitle')} multiline />
            <InputField label="'See why this works' text (blank = hide toggle)" value={step.content.science} onChangeText={set('science')} multiline />
          </>
        );
      case 'settle':
        return (
          <>
            <InputField label="Box title" value={step.content.box_title} onChangeText={set('box_title')} />
            <InputField label="Box body" value={step.content.box_body} onChangeText={set('box_body')} multiline />
            <InputField label="'Why this works' text (blank = hide toggle)" value={step.content.science} onChangeText={set('science')} multiline />
          </>
        );
      case 'timer':
        return (
          <>
            <InputField
              label="Duration (seconds)"
              value={String(step.content.seconds)}
              onChangeText={(t) => updateNumericContent(step.id, 'seconds', t)}
              keyboardType="numeric"
            />
            <InputField label="Before starting" value={step.content.pre_label} onChangeText={set('pre_label')} multiline />
            <InputField label="Below the ring (before starting)" value={step.content.pre_subtext} onChangeText={set('pre_subtext')} multiline />
            <InputField label="While running" value={step.content.active_label} onChangeText={set('active_label')} />
            <InputField label="When done" value={step.content.done_label} onChangeText={set('done_label')} />
            <InputField label="Start button label" value={step.content.start_button} onChangeText={set('start_button')} />
          </>
        );
      case 'bridge':
        return (
          <>
            <InputField label="Headline" value={step.content.headline} onChangeText={set('headline')} multiline />
            <InputField label="Body" value={step.content.body} onChangeText={set('body')} multiline />
            <InputField label="Kicker headline" value={step.content.kicker_headline} onChangeText={set('kicker_headline')} />
            <InputField label="Kicker body" value={step.content.kicker_body} onChangeText={set('kicker_body')} multiline />
          </>
        );
      case 'text_page':
        return (
          <>
            <InputField label="Headline" value={step.content.headline} onChangeText={set('headline')} multiline />
            <InputField label="Body" value={step.content.body} onChangeText={set('body')} multiline />
            <InputField label="'Why this works' text (optional)" value={step.content.science} onChangeText={set('science')} multiline />
          </>
        );
      case 'mantra_picker':
        return (
          <>
            <InputField label="Intro" value={step.content.intro} onChangeText={set('intro')} />
            <InputField label="Subtext" value={step.content.subtext} onChangeText={set('subtext')} multiline />
            <InputField
              label="Example mantras (one per line)"
              value={examplesText[step.id] ?? ''}
              onChangeText={(t) => setExamplesText((prev) => ({ ...prev, [step.id]: t }))}
              multiline
              numberOfLines={6}
              style={styles.tallInput}
            />
            <InputField label="How-to line" value={step.content.howto} onChangeText={set('howto')} multiline />
            <InputField label="'Why mantras work' text" value={step.content.science} onChangeText={set('science')} multiline />
          </>
        );
      case 'habit_picker':
        return (
          <>
            <InputField label="Intro" value={step.content.intro} onChangeText={set('intro')} multiline />
            <InputField label="'+ one more habit' body" value={step.content.section_body} onChangeText={set('section_body')} />
            <Text style={styles.fieldLabel}>Foundation habit (locked, auto-created with Day 1 logged)</Text>
            <Dropdown
              options={HABIT_OPTIONS}
              selected={step.content.foundation_habit_id}
              onSelect={(id) => {
                const habit = HABIT_LIBRARY.find((h) => h.id === id);
                updateContent(step.id, 'foundation_habit_id', id);
                if (habit) {
                  updateContent(step.id, 'foundation_target_per_week', habit.suggested_target_per_week);
                }
              }}
            />
            <InputField
              label="Foundation habit display name"
              value={step.content.foundation_habit_name}
              onChangeText={set('foundation_habit_name')}
            />
            <InputField
              label="Foundation target (times per week)"
              value={String(step.content.foundation_target_per_week)}
              onChangeText={(t) => updateNumericContent(step.id, 'foundation_target_per_week', t)}
              keyboardType="numeric"
            />
            <Text style={styles.fieldLabel}>
              Offered "+ one more habit" choices (none checked = offer all)
            </Text>
            {HABIT_LIBRARY.filter((h) => h.id !== step.content.foundation_habit_id).map((habit) => {
              const offered = (step.content.offered_habit_ids as string[]) ?? [];
              const checked = offered.length === 0 || offered.includes(habit.id);
              return (
                <TouchableOpacity
                  key={habit.id}
                  style={styles.habitToggleRow}
                  onPress={() => {
                    const next = offered.includes(habit.id)
                      ? offered.filter((id) => id !== habit.id)
                      : [...offered, habit.id];
                    updateContent(step.id, 'offered_habit_ids', next);
                  }}
                >
                  <Ionicons
                    name={checked ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={checked ? Colors.primary : Colors.gray}
                  />
                  <Text style={styles.habitToggleText}>{habit.name}</Text>
                </TouchableOpacity>
              );
            })}
          </>
        );
      case 'reveal':
        return (
          <InputField label="Title" value={step.content.title} onChangeText={set('title')} />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <Text style={styles.headerHint}>
          The flow runs top to bottom — reorder middle steps with the arrows, switch them off to
          skip them, or add an info page. Welcome is always first, Reveal always last. Edits
          apply to every NEW signup immediately. Use \n for a line break.
        </Text>

        {steps.map((step, index) => {
          const fixed = isFixed(step);
          const isOpen = expanded[step.id] === true;
          return (
            <Card key={step.id} style={StyleSheet.flatten([styles.stepCard, !step.enabled ? styles.stepCardDisabled : {}])}>
              <TouchableOpacity
                style={styles.stepHeader}
                onPress={() => setExpanded((prev) => ({ ...prev, [step.id]: !isOpen }))}
              >
                <Text style={styles.stepIndex}>{index + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>
                    {STEP_TYPE_LABELS[step.type]}
                    {step.type === 'text_page' && step.content.headline
                      ? ` — ${step.content.headline}`
                      : ''}
                  </Text>
                  {!step.enabled && <Text style={styles.stepDisabledTag}>Skipped</Text>}
                </View>
                {!fixed && (
                  <>
                    <TouchableOpacity onPress={() => moveStep(step.id, -1)} hitSlop={8} disabled={index <= 1}>
                      <Ionicons name="chevron-up" size={20} color={index <= 1 ? Colors.border : Colors.gray} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => moveStep(step.id, 1)} hitSlop={8} disabled={index >= steps.length - 2}>
                      <Ionicons name="chevron-down" size={20} color={index >= steps.length - 2 ? Colors.border : Colors.gray} />
                    </TouchableOpacity>
                    <Switch
                      value={step.enabled}
                      onValueChange={(v) => updateStep(step.id, { enabled: v })}
                      trackColor={{ true: Colors.primary, false: Colors.border }}
                    />
                  </>
                )}
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.gray} />
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.stepBody}>
                  {renderFields(step)}
                  <InputField
                    label={step.type === 'reveal' ? 'Finish button label' : 'Button label'}
                    value={step.next_button}
                    onChangeText={(t) => updateStep(step.id, { next_button: t })}
                  />
                  {step.type === 'text_page' && (
                    <TouchableOpacity style={styles.deleteLink} onPress={() => removeStep(step)}>
                      <Ionicons name="trash-outline" size={16} color={Colors.secondary} />
                      <Text style={styles.deleteLinkText}>Delete this page</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </Card>
          );
        })}

        <TouchableOpacity style={styles.addLink} onPress={addTextPage}>
          <Ionicons name="add" size={18} color={Colors.primary} />
          <Text style={styles.addLinkText}>Add info page</Text>
        </TouchableOpacity>

        <Button title="Save" onPress={handleSave} loading={saving} />
        <TouchableOpacity style={styles.resetLink} onPress={handleReset} disabled={saving}>
          <Ionicons name="refresh-outline" size={16} color={Colors.secondary} />
          <Text style={styles.resetLinkText}>Reset to Defaults</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  headerHint: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.md,
    lineHeight: 19,
  },
  stepCard: {
    marginBottom: Spacing.sm,
  },
  stepCardDisabled: {
    opacity: 0.6,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary + '15',
    color: Colors.primary,
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    lineHeight: 24,
    overflow: 'hidden',
  },
  stepTitle: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  stepDisabledTag: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
  },
  stepBody: {
    marginTop: Spacing.md,
  },
  fieldLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.xs,
    marginTop: Spacing.xs,
  },
  tallInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  habitToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
  },
  habitToggleText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  addLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  addLinkText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  deleteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  deleteLinkText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
  },
  resetLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  resetLinkText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
  },
});
