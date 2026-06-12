import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { Dropdown } from '../../components/common/Dropdown';
import { showAlert, showConfirm } from '../../utils/alert';
import {
  OnboardingConfig,
  DEFAULT_ONBOARDING_CONFIG,
  getOnboardingConfig,
  saveOnboardingConfig,
  resetOnboardingConfig,
} from '../../services/onboardingConfig';
import { HABIT_LIBRARY } from '../../data/habitLibrary';

const HABIT_OPTIONS = HABIT_LIBRARY.map((h) => ({ value: h.id, label: h.name }));

export const AdminOnboardingScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<OnboardingConfig>(DEFAULT_ONBOARDING_CONFIG);
  // Mantra examples edited as one-per-line text
  const [mantraExamplesText, setMantraExamplesText] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const cfg = await getOnboardingConfig();
        setConfig(cfg);
        setMantraExamplesText(cfg.mantra_examples.join('\n'));
      } catch (error: any) {
        showAlert('Error', error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = <K extends keyof OnboardingConfig>(key: K, value: OnboardingConfig[K]) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  const setNumeric = (key: 'timer_seconds' | 'foundation_target_per_week', text: string) => {
    const n = parseInt(text, 10);
    set(key, (Number.isNaN(n) ? 0 : n) as any);
  };

  const toggleOfferedHabit = (habitId: string) => {
    setConfig((prev) => {
      const offered = prev.offered_habit_ids.includes(habitId)
        ? prev.offered_habit_ids.filter((id) => id !== habitId)
        : [...prev.offered_habit_ids, habitId];
      return { ...prev, offered_habit_ids: offered };
    });
  };

  const handleSave = async () => {
    const mantraExamples = mantraExamplesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (mantraExamples.length === 0) {
      showAlert('Missing Mantras', 'Provide at least one example mantra (one per line).');
      return;
    }
    if (config.timer_seconds < 5 || config.timer_seconds > 600) {
      showAlert('Invalid Timer', 'Timer must be between 5 and 600 seconds.');
      return;
    }
    if (config.foundation_target_per_week < 1 || config.foundation_target_per_week > 7) {
      showAlert('Invalid Target', 'Foundation habit target must be 1–7 times per week.');
      return;
    }
    const requiredText: (keyof OnboardingConfig)[] = [
      'welcome_title', 'welcome_subtitle', 'welcome_button', 'settle_title', 'settle_body',
      'bridge_headline', 'bridge_body', 'mantra_intro', 'habit_intro', 'reveal_title',
    ];
    for (const key of requiredText) {
      if (String(config[key]).trim() === '') {
        showAlert('Missing Text', `"${key.replace(/_/g, ' ')}" can't be empty.`);
        return;
      }
    }

    setSaving(true);
    try {
      await saveOnboardingConfig({ ...config, mantra_examples: mantraExamples });
      showAlert('Saved', 'New signups will see this content immediately.');
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    showConfirm(
      'Reset to Defaults',
      'This deletes the custom config — onboarding reverts to the built-in content. Continue?',
      async () => {
        setSaving(true);
        try {
          await resetOnboardingConfig();
          setConfig(DEFAULT_ONBOARDING_CONFIG);
          setMantraExamplesText(DEFAULT_ONBOARDING_CONFIG.mantra_examples.join('\n'));
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
          Edits apply to every NEW signup immediately — existing users never see onboarding
          again. Use \n in a field for a line break. "Reset to Defaults" restores the built-in
          content.
        </Text>

        {/* Screen 1 */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>1 · Welcome</Text>
          <InputField label="Title" value={config.welcome_title} onChangeText={(t) => set('welcome_title', t)} multiline />
          <InputField label="Subtitle" value={config.welcome_subtitle} onChangeText={(t) => set('welcome_subtitle', t)} multiline />
          <InputField label="'See why this works' text" value={config.welcome_science} onChangeText={(t) => set('welcome_science', t)} multiline />
          <InputField label="Button label" value={config.welcome_button} onChangeText={(t) => set('welcome_button', t)} />
        </Card>

        {/* Screen 2 */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>2 · Settle</Text>
          <InputField label="Box title" value={config.settle_title} onChangeText={(t) => set('settle_title', t)} />
          <InputField label="Box body" value={config.settle_body} onChangeText={(t) => set('settle_body', t)} multiline />
          <InputField label="'Why this works' text" value={config.settle_science} onChangeText={(t) => set('settle_science', t)} multiline />
        </Card>

        {/* Screen 3 */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>3 · Timer</Text>
          <InputField
            label="Duration (seconds)"
            value={String(config.timer_seconds)}
            onChangeText={(t) => setNumeric('timer_seconds', t)}
            keyboardType="numeric"
          />
          <InputField label="Before starting" value={config.timer_pre_label} onChangeText={(t) => set('timer_pre_label', t)} multiline />
          <InputField label="Below the ring (before starting)" value={config.timer_pre_subtext} onChangeText={(t) => set('timer_pre_subtext', t)} multiline />
          <InputField label="While running" value={config.timer_active_label} onChangeText={(t) => set('timer_active_label', t)} />
          <InputField label="When done" value={config.timer_done_label} onChangeText={(t) => set('timer_done_label', t)} />
        </Card>

        {/* Screen 4 */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>4 · Bridge</Text>
          <InputField label="Headline" value={config.bridge_headline} onChangeText={(t) => set('bridge_headline', t)} multiline />
          <InputField label="Body" value={config.bridge_body} onChangeText={(t) => set('bridge_body', t)} multiline />
          <InputField label="Kicker headline" value={config.bridge_kicker_headline} onChangeText={(t) => set('bridge_kicker_headline', t)} />
          <InputField label="Kicker body" value={config.bridge_kicker} onChangeText={(t) => set('bridge_kicker', t)} multiline />
        </Card>

        {/* Screen 5 */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>5 · Mantra</Text>
          <InputField label="Intro" value={config.mantra_intro} onChangeText={(t) => set('mantra_intro', t)} />
          <InputField label="Subtext" value={config.mantra_subtext} onChangeText={(t) => set('mantra_subtext', t)} multiline />
          <InputField
            label="Example mantras (one per line)"
            value={mantraExamplesText}
            onChangeText={setMantraExamplesText}
            multiline
            numberOfLines={6}
            style={styles.tallInput}
          />
          <InputField label="How-to line" value={config.mantra_howto} onChangeText={(t) => set('mantra_howto', t)} multiline />
          <InputField label="'Why mantras work' text" value={config.mantra_science} onChangeText={(t) => set('mantra_science', t)} multiline />
        </Card>

        {/* Screen 6 */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>6 · Habits</Text>
          <InputField label="Intro" value={config.habit_intro} onChangeText={(t) => set('habit_intro', t)} multiline />
          <InputField label="'+ one more habit' body" value={config.habit_section_body} onChangeText={(t) => set('habit_section_body', t)} />
          <Text style={styles.fieldLabel}>Foundation habit (locked, auto-created with Day 1 logged)</Text>
          <Dropdown
            options={HABIT_OPTIONS}
            selected={config.foundation_habit_id}
            onSelect={(id) => {
              const habit = HABIT_LIBRARY.find((h) => h.id === id);
              setConfig((prev) => ({
                ...prev,
                foundation_habit_id: id,
                foundation_target_per_week: habit?.suggested_target_per_week ?? prev.foundation_target_per_week,
              }));
            }}
          />
          <InputField
            label="Foundation habit display name"
            value={config.foundation_habit_name}
            onChangeText={(t) => set('foundation_habit_name', t)}
          />
          <InputField
            label="Foundation target (times per week)"
            value={String(config.foundation_target_per_week)}
            onChangeText={(t) => setNumeric('foundation_target_per_week', t)}
            keyboardType="numeric"
          />
          <Text style={styles.fieldLabel}>
            Offered "+ one more habit" choices ({config.offered_habit_ids.length === 0 ? 'all' : config.offered_habit_ids.length} selected — none checked = offer all)
          </Text>
          {HABIT_LIBRARY.filter((h) => h.id !== config.foundation_habit_id).map((habit) => {
            const checked =
              config.offered_habit_ids.length === 0 || config.offered_habit_ids.includes(habit.id);
            const explicit = config.offered_habit_ids.includes(habit.id);
            return (
              <TouchableOpacity
                key={habit.id}
                style={styles.habitToggleRow}
                onPress={() => toggleOfferedHabit(habit.id)}
              >
                <Ionicons
                  name={checked ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={explicit || config.offered_habit_ids.length === 0 ? Colors.primary : Colors.gray}
                />
                <Text style={styles.habitToggleText}>{habit.name}</Text>
              </TouchableOpacity>
            );
          })}
        </Card>

        {/* Screen 7 */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>7 · Reveal</Text>
          <InputField label="Title" value={config.reveal_title} onChangeText={(t) => set('reveal_title', t)} />
        </Card>

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
  section: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.sm,
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
