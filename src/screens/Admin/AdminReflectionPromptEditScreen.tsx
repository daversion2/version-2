import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { showAlert } from '../../utils/alert';
import { ReflectionInputStyle } from '../../data/challengeReflectionPrompts';
import {
  ChallengeReflectionConfig,
  ReflectionPrompt,
  DEFAULT_CHALLENGE_REFLECTION_CONFIG,
  getChallengeReflectionConfig,
  saveChallengeReflectionConfig,
  newReflectionPrompt,
} from '../../services/challengeReflectionConfig';
import { useTools } from '../../context/ToolsContext';
import { AdminScreenProps } from '../../types/navigation';

type Props = AdminScreenProps<'AdminReflectionPromptEdit'>;

export const AdminReflectionPromptEditScreen: React.FC<Props> = ({ navigation, route }) => {
  const { mode, promptId } = route.params;
  const { reload } = useTools();

  const [config, setConfig] = useState<ChallengeReflectionConfig>(
    DEFAULT_CHALLENGE_REFLECTION_CONFIG
  );
  const [item, setItem] = useState<ReflectionPrompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const idCounter = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        const cfg = await getChallengeReflectionConfig();
        setConfig(cfg);
        const suffix = `${Date.now().toString(36)}-${idCounter.current++}`;
        const initial =
          mode === 'edit'
            ? cfg.prompts.find((p) => p.id === promptId) ?? newReflectionPrompt(suffix)
            : newReflectionPrompt(suffix);
        setItem(initial);
      } catch (error: any) {
        showAlert('Error', error.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    navigation.setOptions({
      title: mode === 'create' ? 'New Prompt' : 'Edit Prompt',
    });
  }, [mode, navigation]);

  const update = (patch: Partial<ReflectionPrompt>) =>
    setItem((prev) => (prev ? { ...prev, ...patch } : prev));

  const handleSave = async () => {
    if (!item) return;
    if (!item.prompt.trim()) {
      showAlert('Missing question', 'Give the prompt a question.');
      return;
    }

    const exists = config.prompts.some((p) => p.id === item.id);
    const prompts = exists
      ? config.prompts.map((p) => (p.id === item.id ? item : p))
      : [...config.prompts, item];

    setSaving(true);
    try {
      await saveChallengeReflectionConfig({ prompts });
      await reload();
      navigation.goBack();
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !item) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <InputField
          label="Question (shown in the prompt bubble)"
          value={item.prompt}
          onChangeText={(t) => update({ prompt: t })}
          multiline
        />
        <InputField
          label="Placeholder (example answer)"
          value={item.placeholder ?? ''}
          onChangeText={(t) => update({ placeholder: t })}
          multiline
        />
        <InputField
          label="Helper text (optional supporting line)"
          value={item.helper_text ?? ''}
          onChangeText={(t) => update({ helper_text: t })}
          multiline
        />

        <Text style={styles.styleLabel}>Answer input</Text>
        <View style={styles.styleRow}>
          {INPUT_STYLES.map((s) => {
            const active = (item.input ?? 'text') === s.value;
            return (
              <TouchableOpacity
                key={s.value}
                style={[styles.styleChip, active && styles.styleChipActive]}
                onPress={() => update({ input: s.value })}
                activeOpacity={0.8}
              >
                <Text style={[styles.styleChipText, active && styles.styleChipTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.styleHint}>
          {INPUT_STYLES.find((s) => s.value === (item.input ?? 'text'))?.hint}
        </Text>

        {(item.input ?? 'text') === 'choice' && (
          <>
            <InputField
              label='"Yes" button label'
              value={item.yes_label ?? ''}
              onChangeText={(t) => update({ yes_label: t })}
              placeholder="Yes, it was real"
            />
            <InputField
              label='"No" button label'
              value={item.no_label ?? ''}
              onChangeText={(t) => update({ no_label: t })}
              placeholder="No, not really"
            />
            <InputField
              label='Follow-up question (shown after "No"; blank for none)'
              value={item.followup_prompt ?? ''}
              onChangeText={(t) => update({ followup_prompt: t })}
              placeholder="What's the truer thought?"
              multiline
            />
            <InputField
              label="Follow-up placeholder"
              value={item.followup_placeholder ?? ''}
              onChangeText={(t) => update({ followup_placeholder: t })}
              placeholder="The truth is…"
            />
          </>
        )}

        {(item.input ?? 'text') !== 'choice' && (
          <InputField
            label="Max length (optional, leave blank for no limit)"
            value={item.max_length ? String(item.max_length) : ''}
            onChangeText={(t) => {
              const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
              update({ max_length: Number.isFinite(n) && n > 0 ? n : undefined });
            }}
            keyboardType="number-pad"
          />
        )}

        <View style={{ marginTop: Spacing.lg }}>
          <Button title="Save" onPress={handleSave} loading={saving} />
        </View>
      </View>
    </ScrollView>
  );
};

export default AdminReflectionPromptEditScreen;

const INPUT_STYLES: { value: ReflectionInputStyle; label: string; hint: string }[] = [
  { value: 'text', label: 'Text', hint: 'A multiline textarea — the default.' },
  {
    value: 'oneliner',
    label: 'One-liner',
    hint: 'A single line for one concrete takeaway (pair with a short max length).',
  },
  {
    value: 'choice',
    label: 'Yes / No',
    hint: 'Two tap buttons, with an optional follow-up line revealed on "No".',
  },
];

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  styleLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  styleRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  styleChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  styleChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  styleChipText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.dark },
  styleChipTextActive: { color: Colors.white },
  styleHint: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginBottom: Spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center' },
});
