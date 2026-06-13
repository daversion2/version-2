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
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { showAlert, showConfirm } from '../../utils/alert';
import {
  ToolsConfig,
  ToolDefinition,
  DEFAULT_TOOLS_CONFIG,
  getToolsConfig,
  saveToolsConfig,
  resetToolsConfig,
} from '../../services/toolsConfig';
import { useTools } from '../../context/ToolsContext';
import { AdminNavigation } from '../../types/navigation';

export const AdminToolsScreen: React.FC = () => {
  const navigation = useNavigation<AdminNavigation>();
  const { reload } = useTools();
  const [config, setConfig] = useState<ToolsConfig>(DEFAULT_TOOLS_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setConfig(await getToolsConfig());
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

  /** Persist a new tools array (categories untouched) and refresh the live app. */
  const persistTools = async (tools: ToolDefinition[]) => {
    const next = { ...config, tools };
    setConfig(next);
    setSaving(true);
    try {
      await saveToolsConfig(next);
      await reload();
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = (id: string, value: boolean) =>
    persistTools(config.tools.map((t) => (t.id === id ? { ...t, enabled: value } : t)));

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= config.tools.length) return;
    const next = [...config.tools];
    [next[index], next[target]] = [next[target], next[index]];
    persistTools(next);
  };

  const remove = (tool: ToolDefinition) => {
    showConfirm(
      'Delete Tool',
      `Delete "${tool.name}"? This removes it from the library. Existing saved entries are unaffected.`,
      () => persistTools(config.tools.filter((t) => t.id !== tool.id)),
      'Delete'
    );
  };

  const handleReset = () => {
    showConfirm(
      'Reset to Defaults',
      'This deletes all custom tool edits and restores the built-in tools and categories. Continue?',
      async () => {
        setSaving(true);
        try {
          await resetToolsConfig();
          await reload();
          setConfig(DEFAULT_TOOLS_CONFIG);
          showAlert('Reset', 'Tools are back to the built-in defaults.');
        } catch (error: any) {
          showAlert('Error', error.message);
        } finally {
          setSaving(false);
        }
      },
      'Reset'
    );
  };

  const categoryLabel = (id: string) =>
    config.categories.find((c) => c.id === id)?.label ?? id;

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
          Reorder tools with the arrows, switch one off to hide it from the library, or tap a tool to
          edit its copy, sections, and fields. Changes apply to everyone on their next app open.
        </Text>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.secondaryLink}
            onPress={() => navigation.navigate('AdminCategories')}
          >
            <Ionicons name="pricetags-outline" size={16} color={Colors.primary} />
            <Text style={styles.secondaryLinkText}>Manage categories</Text>
          </TouchableOpacity>
        </View>

        {config.tools.map((tool, index) => (
          <Card
            key={tool.id}
            style={StyleSheet.flatten([styles.toolCard, !tool.enabled ? styles.toolCardDisabled : {}])}
            onPress={() => navigation.navigate('AdminToolEdit', { mode: 'edit', toolId: tool.id })}
          >
            <View style={styles.toolRow}>
              <View style={[styles.iconBox, { backgroundColor: tool.color + '18' }]}>
                <Ionicons
                  name={tool.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={tool.color}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.toolName} numberOfLines={1}>
                  {tool.name}
                </Text>
                <Text style={styles.toolMeta} numberOfLines={1}>
                  {categoryLabel(tool.category)} · {tool.sections.length} section
                  {tool.sections.length === 1 ? '' : 's'}
                  {tool.enabled ? '' : ' · hidden'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => move(index, -1)} hitSlop={8} disabled={index === 0}>
                <Ionicons
                  name="chevron-up"
                  size={20}
                  color={index === 0 ? Colors.border : Colors.gray}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => move(index, 1)}
                hitSlop={8}
                disabled={index === config.tools.length - 1}
              >
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={index === config.tools.length - 1 ? Colors.border : Colors.gray}
                />
              </TouchableOpacity>
              <Switch
                value={tool.enabled}
                onValueChange={(v) => toggleEnabled(tool.id, v)}
                trackColor={{ true: Colors.primary, false: Colors.border }}
              />
            </View>
            <TouchableOpacity style={styles.deleteLink} onPress={() => remove(tool)}>
              <Ionicons name="trash-outline" size={15} color={Colors.secondary} />
              <Text style={styles.deleteLinkText}>Delete</Text>
            </TouchableOpacity>
          </Card>
        ))}

        <TouchableOpacity
          style={styles.addLink}
          onPress={() => navigation.navigate('AdminToolEdit', { mode: 'create' })}
        >
          <Ionicons name="add" size={18} color={Colors.primary} />
          <Text style={styles.addLinkText}>Add tool</Text>
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

export default AdminToolsScreen;

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
  actionRow: { marginBottom: Spacing.md },
  secondaryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  secondaryLinkText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  toolCard: { marginBottom: Spacing.sm },
  toolCardDisabled: { opacity: 0.6 },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolName: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  toolMeta: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 1,
  },
  deleteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
  deleteLinkText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
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
  resetLinkText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.secondary,
  },
});
