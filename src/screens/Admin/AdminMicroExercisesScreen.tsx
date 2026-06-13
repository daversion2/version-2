import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { showAlert, showConfirm } from '../../utils/alert';
import {
  MicroExercisesConfig,
  MicroExerciseConfigItem,
  DEFAULT_MICRO_EXERCISES_CONFIG,
  getMicroExercisesConfig,
  saveMicroExercisesConfig,
  resetMicroExercisesConfig,
} from '../../services/microExercisesConfig';
import { useTools } from '../../context/ToolsContext';
import { AdminNavigation } from '../../types/navigation';

export const AdminMicroExercisesScreen: React.FC = () => {
  const navigation = useNavigation<AdminNavigation>();
  const { reload, getToolById } = useTools();
  const [config, setConfig] = useState<MicroExercisesConfig>(DEFAULT_MICRO_EXERCISES_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setConfig(await getMicroExercisesConfig());
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const persist = async (exercises: MicroExerciseConfigItem[]) => {
    const next = { exercises };
    setConfig(next);
    setSaving(true);
    try {
      await saveMicroExercisesConfig(next);
      await reload();
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: string, value: boolean) =>
    persist(config.exercises.map((e) => (e.feeling_key === key ? { ...e, enabled: value } : e)));

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= config.exercises.length) return;
    const next = [...config.exercises];
    [next[index], next[target]] = [next[target], next[index]];
    persist(next);
  };

  const remove = (ex: MicroExerciseConfigItem) => {
    showConfirm(
      'Delete Micro-Exercise',
      `Delete "${ex.feeling_label}"?`,
      () => persist(config.exercises.filter((e) => e.feeling_key !== ex.feeling_key)),
      'Delete'
    );
  };

  const handleReset = () => {
    showConfirm(
      'Reset to Defaults',
      'This deletes all custom micro-exercise edits and restores the built-in set. Continue?',
      async () => {
        setSaving(true);
        try {
          await resetMicroExercisesConfig();
          await reload();
          setConfig(DEFAULT_MICRO_EXERCISES_CONFIG);
          showAlert('Reset', 'Micro-exercises are back to the built-in defaults.');
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
          Micro-exercises are the short, in-the-moment interventions surfaced after a setback or on
          inactivity. Each links to a full tool for "go deeper". Changes apply to everyone on their
          next app open.
        </Text>

        {config.exercises.map((ex, index) => {
          const linked = getToolById(ex.source_template_id);
          return (
            <Card
              key={ex.feeling_key}
              style={StyleSheet.flatten([styles.card, !ex.enabled ? styles.cardDisabled : {}])}
              onPress={() =>
                navigation.navigate('AdminMicroExerciseEdit', {
                  mode: 'edit',
                  feelingKey: ex.feeling_key,
                })
              }
            >
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {ex.feeling_label}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {linked ? `→ ${linked.name}` : '⚠ no linked tool'}
                    {ex.default_for_triggers.length > 0
                      ? ` · ${ex.default_for_triggers.join(', ')}`
                      : ''}
                    {ex.enabled ? '' : ' · hidden'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => move(index, -1)} hitSlop={8} disabled={index === 0}>
                  <Ionicons name="chevron-up" size={20} color={index === 0 ? Colors.border : Colors.gray} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => move(index, 1)}
                  hitSlop={8}
                  disabled={index === config.exercises.length - 1}
                >
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color={index === config.exercises.length - 1 ? Colors.border : Colors.gray}
                  />
                </TouchableOpacity>
                <Switch
                  value={ex.enabled}
                  onValueChange={(v) => toggle(ex.feeling_key, v)}
                  trackColor={{ true: Colors.primary, false: Colors.border }}
                />
              </View>
              <TouchableOpacity style={styles.deleteLink} onPress={() => remove(ex)}>
                <Ionicons name="trash-outline" size={15} color={Colors.secondary} />
                <Text style={styles.deleteLinkText}>Delete</Text>
              </TouchableOpacity>
            </Card>
          );
        })}

        <TouchableOpacity
          style={styles.addLink}
          onPress={() => navigation.navigate('AdminMicroExerciseEdit', { mode: 'create' })}
        >
          <Ionicons name="add" size={18} color={Colors.primary} />
          <Text style={styles.addLinkText}>Add micro-exercise</Text>
        </TouchableOpacity>

        {saving && (
          <View style={styles.savingRow}>
            <ActivityIndicator size="small" color={Colors.gray} />
            <Text style={styles.savingText}>Saving…</Text>
          </View>
        )}

        <TouchableOpacity style={styles.resetLink} onPress={handleReset} disabled={saving}>
          <Ionicons name="refresh-outline" size={16} color={Colors.secondary} />
          <Text style={styles.resetLinkText}>Reset to Defaults</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default AdminMicroExercisesScreen;

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
  headerHint: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.md,
    lineHeight: 19,
  },
  card: { marginBottom: Spacing.sm },
  cardDisabled: { opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  name: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: Colors.dark },
  meta: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, marginTop: 1 },
  deleteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
  deleteLinkText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.secondary },
  addLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  addLinkText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.primary },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  savingText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  resetLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  resetLinkText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.secondary },
});
