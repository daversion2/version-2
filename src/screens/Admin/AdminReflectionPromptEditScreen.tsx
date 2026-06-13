import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Colors, Spacing } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { showAlert } from '../../utils/alert';
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
        <InputField
          label="Max length (optional, leave blank for no limit)"
          value={item.max_length ? String(item.max_length) : ''}
          onChangeText={(t) => {
            const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
            update({ max_length: Number.isFinite(n) && n > 0 ? n : undefined });
          }}
          keyboardType="number-pad"
        />

        <View style={{ marginTop: Spacing.lg }}>
          <Button title="Save" onPress={handleSave} loading={saving} />
        </View>
      </View>
    </ScrollView>
  );
};

export default AdminReflectionPromptEditScreen;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center' },
});
