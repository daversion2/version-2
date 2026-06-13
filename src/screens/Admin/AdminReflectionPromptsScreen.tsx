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
  ChallengeReflectionConfig,
  ReflectionPrompt,
  DEFAULT_CHALLENGE_REFLECTION_CONFIG,
  getChallengeReflectionConfig,
  saveChallengeReflectionConfig,
  resetChallengeReflectionConfig,
} from '../../services/challengeReflectionConfig';
import { useTools } from '../../context/ToolsContext';
import { AdminNavigation } from '../../types/navigation';

export const AdminReflectionPromptsScreen: React.FC = () => {
  const navigation = useNavigation<AdminNavigation>();
  const { reload } = useTools();
  const [config, setConfig] = useState<ChallengeReflectionConfig>(
    DEFAULT_CHALLENGE_REFLECTION_CONFIG
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setConfig(await getChallengeReflectionConfig());
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

  const persist = async (prompts: ReflectionPrompt[]) => {
    const next = { prompts };
    setConfig(next);
    setSaving(true);
    try {
      await saveChallengeReflectionConfig(next);
      await reload();
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = (id: string, value: boolean) =>
    persist(config.prompts.map((p) => (p.id === id ? { ...p, enabled: value } : p)));

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= config.prompts.length) return;
    const next = [...config.prompts];
    [next[index], next[target]] = [next[target], next[index]];
    persist(next);
  };

  const remove = (prompt: ReflectionPrompt) => {
    showConfirm(
      'Delete Prompt',
      `Delete this reflection prompt?`,
      () => persist(config.prompts.filter((p) => p.id !== prompt.id)),
      'Delete'
    );
  };

  const handleReset = () => {
    showConfirm(
      'Reset to Defaults',
      'This deletes all custom reflection prompt edits and restores the built-in set. Continue?',
      async () => {
        setSaving(true);
        try {
          await resetChallengeReflectionConfig();
          await reload();
          setConfig(DEFAULT_CHALLENGE_REFLECTION_CONFIG);
          showAlert('Reset', 'Reflection prompts are back to the built-in defaults.');
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
          These prompts make up the conversational reflection a user walks through after
          completing a challenge. They're shown one per screen, in order. Changes apply to
          everyone on their next app open.
        </Text>

        {config.prompts.map((prompt, index) => (
          <Card
            key={prompt.id}
            style={StyleSheet.flatten([styles.card, !prompt.enabled ? styles.cardDisabled : {}])}
            onPress={() =>
              navigation.navigate('AdminReflectionPromptEdit', {
                mode: 'edit',
                promptId: prompt.id,
              })
            }
          >
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={2}>
                  {prompt.prompt}
                </Text>
                {!prompt.enabled && (
                  <Text style={styles.meta} numberOfLines={1}>
                    hidden
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => move(index, -1)} hitSlop={8} disabled={index === 0}>
                <Ionicons name="chevron-up" size={20} color={index === 0 ? Colors.border : Colors.gray} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => move(index, 1)}
                hitSlop={8}
                disabled={index === config.prompts.length - 1}
              >
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={index === config.prompts.length - 1 ? Colors.border : Colors.gray}
                />
              </TouchableOpacity>
              <Switch
                value={prompt.enabled}
                onValueChange={(v) => toggle(prompt.id, v)}
                trackColor={{ true: Colors.primary, false: Colors.border }}
              />
            </View>
            <TouchableOpacity style={styles.deleteLink} onPress={() => remove(prompt)}>
              <Ionicons name="trash-outline" size={15} color={Colors.secondary} />
              <Text style={styles.deleteLinkText}>Delete</Text>
            </TouchableOpacity>
          </Card>
        ))}

        <TouchableOpacity
          style={styles.addLink}
          onPress={() => navigation.navigate('AdminReflectionPromptEdit', { mode: 'create' })}
        >
          <Ionicons name="add" size={18} color={Colors.primary} />
          <Text style={styles.addLinkText}>Add prompt</Text>
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

export default AdminReflectionPromptsScreen;

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
