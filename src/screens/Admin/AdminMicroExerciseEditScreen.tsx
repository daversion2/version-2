import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { Dropdown } from '../../components/common/Dropdown';
import { showAlert } from '../../utils/alert';
import {
  MicroExercisesConfig,
  MicroExerciseConfigItem,
  DEFAULT_MICRO_EXERCISES_CONFIG,
  VALID_TRIGGERS,
  getMicroExercisesConfig,
  saveMicroExercisesConfig,
  newMicroExercise,
} from '../../services/microExercisesConfig';
import { useTools } from '../../context/ToolsContext';
import { MicroExerciseTrigger } from '../../types/worksheets';
import { AdminScreenProps } from '../../types/navigation';

type Props = AdminScreenProps<'AdminMicroExerciseEdit'>;

const TRIGGER_LABELS: Record<MicroExerciseTrigger, string> = {
  comeback: 'Comeback',
  challenge_failure: 'Challenge failure',
  reflection: 'Reflection',
  inactivity: 'Inactivity',
};

export const AdminMicroExerciseEditScreen: React.FC<Props> = ({ navigation, route }) => {
  const { mode, feelingKey } = route.params;
  const { reload, tools } = useTools();

  const [config, setConfig] = useState<MicroExercisesConfig>(DEFAULT_MICRO_EXERCISES_CONFIG);
  const [item, setItem] = useState<MicroExerciseConfigItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const idCounter = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        const cfg = await getMicroExercisesConfig();
        setConfig(cfg);
        const suffix = `${Date.now().toString(36)}-${idCounter.current++}`;
        const initial =
          mode === 'edit'
            ? cfg.exercises.find((e) => e.feeling_key === feelingKey) ?? newMicroExercise(suffix)
            : newMicroExercise(suffix);
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
      title: mode === 'create' ? 'New Micro-Exercise' : 'Edit Micro-Exercise',
    });
  }, [mode, navigation]);

  const update = (patch: Partial<MicroExerciseConfigItem>) =>
    setItem((prev) => (prev ? { ...prev, ...patch } : prev));

  const updateQuestion = (index: 0 | 1 | 2, key: 'prompt' | 'placeholder', value: string) =>
    setItem((prev) => {
      if (!prev) return prev;
      const questions = [...prev.questions] as MicroExerciseConfigItem['questions'];
      questions[index] = { ...questions[index], [key]: value };
      return { ...prev, questions };
    });

  const toggleTrigger = (trigger: MicroExerciseTrigger) =>
    setItem((prev) => {
      if (!prev) return prev;
      const has = prev.default_for_triggers.includes(trigger);
      return {
        ...prev,
        default_for_triggers: has
          ? prev.default_for_triggers.filter((t) => t !== trigger)
          : [...prev.default_for_triggers, trigger],
      };
    });

  const handleSave = async () => {
    if (!item) return;
    if (!item.feeling_label.trim()) {
      showAlert('Missing label', 'Give the micro-exercise a feeling label.');
      return;
    }
    if (item.questions.some((q) => !q.prompt.trim())) {
      showAlert('Missing prompts', 'All three questions need a prompt.');
      return;
    }

    const exists = config.exercises.some((e) => e.feeling_key === item.feeling_key);
    const exercises = exists
      ? config.exercises.map((e) => (e.feeling_key === item.feeling_key ? item : e))
      : [...config.exercises, item];

    setSaving(true);
    try {
      await saveMicroExercisesConfig({ exercises });
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

  const toolOptions = [
    { value: '', label: '— none —' },
    ...tools.map((t) => ({ value: t.id, label: t.name })),
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <InputField
          label="Feeling label (what the user taps)"
          value={item.feeling_label}
          onChangeText={(t) => update({ feeling_label: t })}
        />

        <Text style={styles.fieldLabel}>Linked tool ("go deeper")</Text>
        <Dropdown
          options={toolOptions}
          selected={item.source_template_id}
          onSelect={(id) => update({ source_template_id: id })}
        />

        <Text style={[styles.sectionHeader, { marginTop: Spacing.lg }]}>Questions</Text>
        {[0, 1, 2].map((i) => {
          const idx = i as 0 | 1 | 2;
          const q = item.questions[idx];
          return (
            <View key={idx} style={styles.questionCard}>
              <Text style={styles.questionLabel}>Question {i + 1}</Text>
              <InputField
                label="Prompt"
                value={q.prompt}
                onChangeText={(t) => updateQuestion(idx, 'prompt', t)}
                multiline
              />
              <InputField
                label="Placeholder (example answer)"
                value={q.placeholder}
                onChangeText={(t) => updateQuestion(idx, 'placeholder', t)}
                multiline
              />
            </View>
          );
        })}

        <InputField
          label="Completion affirmation"
          value={item.completion_affirmation}
          onChangeText={(t) => update({ completion_affirmation: t })}
          multiline
          numberOfLines={4}
          style={styles.tallInput}
        />

        <Text style={styles.fieldLabel}>Default for triggers</Text>
        {VALID_TRIGGERS.map((trigger) => {
          const checked = item.default_for_triggers.includes(trigger);
          return (
            <TouchableOpacity
              key={trigger}
              style={styles.triggerRow}
              onPress={() => toggleTrigger(trigger)}
            >
              <Ionicons
                name={checked ? 'checkbox' : 'square-outline'}
                size={20}
                color={checked ? Colors.primary : Colors.gray}
              />
              <Text style={styles.triggerText}>{TRIGGER_LABELS[trigger]}</Text>
            </TouchableOpacity>
          );
        })}

        <View style={{ marginTop: Spacing.lg }}>
          <Button title="Save" onPress={handleSave} loading={saving} />
        </View>
      </View>
    </ScrollView>
  );
};

export default AdminMicroExerciseEditScreen;

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
  sectionHeader: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.xs,
    marginTop: Spacing.xs,
  },
  tallInput: { minHeight: 100, textAlignVertical: 'top' },
  questionCard: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  questionLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
  },
  triggerText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark },
});
