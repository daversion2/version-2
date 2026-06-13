import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { showAlert } from '../../utils/alert';
import {
  ToolsConfig,
  ToolCategory,
  DEFAULT_TOOLS_CONFIG,
  getToolsConfig,
  saveToolsConfig,
} from '../../services/toolsConfig';
import { useTools } from '../../context/ToolsContext';
import { AdminScreenProps } from '../../types/navigation';

type Props = AdminScreenProps<'AdminCategories'>;

const slugify = (label: string) =>
  label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'category';

export const AdminCategoriesScreen: React.FC<Props> = ({ navigation }) => {
  const { reload } = useTools();
  const [config, setConfig] = useState<ToolsConfig>(DEFAULT_TOOLS_CONFIG);
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const idCounter = useRef(0);

  useEffect(() => {
    (async () => {
      try {
        const cfg = await getToolsConfig();
        setConfig(cfg);
        setCategories(cfg.categories);
      } catch (error: any) {
        showAlert('Error', error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const usageCount = (id: string) => config.tools.filter((t) => t.category === id).length;

  const rename = (id: string, label: string) =>
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)));

  const move = (index: number, dir: -1 | 1) =>
    setCategories((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const add = () =>
    setCategories((prev) => [
      ...prev,
      { id: `cat-${Date.now().toString(36)}-${idCounter.current++}`, label: 'New category' },
    ]);

  const remove = (cat: ToolCategory) => {
    const inUse = usageCount(cat.id);
    if (inUse > 0) {
      showAlert(
        'Category in use',
        `"${cat.label}" is assigned to ${inUse} tool${inUse === 1 ? '' : 's'}. Reassign them first.`
      );
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== cat.id));
  };

  const handleSave = async () => {
    const cleaned = categories
      .map((c) => ({ id: c.id, label: c.label.trim() }))
      .filter((c) => c.label !== '');
    if (cleaned.length === 0) {
      showAlert('No categories', 'Keep at least one category.');
      return;
    }
    // Give freshly added categories a stable, readable id derived from the label.
    const seen = new Set<string>();
    const finalCategories = cleaned.map((c) => {
      let id = c.id.startsWith('cat-') ? slugify(c.label) : c.id;
      while (seen.has(id)) id = `${id}-2`;
      seen.add(id);
      return { id, label: c.label };
    });

    setSaving(true);
    try {
      await saveToolsConfig({ ...config, categories: finalCategories });
      await reload();
      navigation.goBack();
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setSaving(false);
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
          Categories drive the filter chips on the Tools screen. A chip only appears when at least
          one visible tool uses it. You can't delete a category that's still assigned to a tool.
        </Text>

        {categories.map((cat, index) => (
          <View key={cat.id} style={styles.row}>
            <TextInput
              style={styles.input}
              value={cat.label}
              onChangeText={(t) => rename(cat.id, t)}
              placeholder="Category name"
              placeholderTextColor={Colors.gray}
            />
            <Text style={styles.usage}>{usageCount(cat.id)}</Text>
            <TouchableOpacity onPress={() => move(index, -1)} hitSlop={8} disabled={index === 0}>
              <Ionicons name="chevron-up" size={20} color={index === 0 ? Colors.border : Colors.gray} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => move(index, 1)}
              hitSlop={8}
              disabled={index === categories.length - 1}
            >
              <Ionicons
                name="chevron-down"
                size={20}
                color={index === categories.length - 1 ? Colors.border : Colors.gray}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => remove(cat)} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color={Colors.secondary} />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addLink} onPress={add}>
          <Ionicons name="add" size={18} color={Colors.primary} />
          <Text style={styles.addLinkText}>Add category</Text>
        </TouchableOpacity>

        <Button title="Save" onPress={handleSave} loading={saving} />
      </View>
    </ScrollView>
  );
};

export default AdminCategoriesScreen;

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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    backgroundColor: Colors.white,
  },
  usage: {
    width: 22,
    textAlign: 'center',
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
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
});
