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
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { Dropdown } from '../../components/common/Dropdown';
import { showAlert } from '../../utils/alert';
import {
  ToolsConfig,
  ToolDefinition,
  ToolCategory,
  DEFAULT_TOOLS_CONFIG,
  TOOL_ICONS,
  TOOL_COLORS,
  getToolsConfig,
  saveToolsConfig,
  newToolDefinition,
} from '../../services/toolsConfig';
import { useTools } from '../../context/ToolsContext';
import {
  WorksheetSection,
  WorksheetField,
  WorksheetFieldType,
} from '../../types';
import { AdminScreenProps } from '../../types/navigation';

type Props = AdminScreenProps<'AdminToolEdit'>;

const FIELD_TYPE_OPTIONS: { value: WorksheetFieldType; label: string }[] = [
  { value: 'text', label: 'Short text' },
  { value: 'textarea', label: 'Long text' },
  { value: 'mood_scale', label: 'Mood scale (1–10)' },
  { value: 'checklist', label: 'Checklist (multi-select)' },
  { value: 'single_select', label: 'Single choice' },
];

const DIFFICULTY_OPTIONS = [
  { value: '1', label: 'Easy' },
  { value: '2', label: 'Medium' },
  { value: '3', label: 'Hard' },
];

const hasOptions = (t: WorksheetFieldType) => t === 'checklist' || t === 'single_select';

export const AdminToolEditScreen: React.FC<Props> = ({ navigation, route }) => {
  const { mode, toolId } = route.params;
  const { reload } = useTools();

  const [config, setConfig] = useState<ToolsConfig>(DEFAULT_TOOLS_CONFIG);
  const [tool, setTool] = useState<ToolDefinition | null>(null);
  const [tipsText, setTipsText] = useState('');
  const [optionsText, setOptionsText] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const idCounter = useRef(0);

  const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${idCounter.current++}`;

  useEffect(() => {
    (async () => {
      try {
        const cfg = await getToolsConfig();
        setConfig(cfg);
        const initial =
          mode === 'edit'
            ? cfg.tools.find((t) => t.id === toolId) ?? newToolDefinition(uid('tool'))
            : newToolDefinition(uid('tool'));
        setTool(initial);
        setTipsText((initial.tips ?? []).join('\n'));
        const opts: Record<string, string> = {};
        initial.sections.forEach((s) =>
          s.fields.forEach((f) => {
            if (hasOptions(f.field_type)) opts[f.id] = (f.options ?? []).join('\n');
          })
        );
        setOptionsText(opts);
      } catch (error: any) {
        showAlert('Error', error.message);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    navigation.setOptions({ title: mode === 'create' ? 'New Tool' : 'Edit Tool' });
  }, [mode, navigation]);

  // ---------- mutation helpers ----------
  const update = (patch: Partial<ToolDefinition>) =>
    setTool((prev) => (prev ? { ...prev, ...patch } : prev));

  const updateSection = (sid: string, patch: Partial<WorksheetSection>) =>
    setTool((prev) =>
      prev
        ? { ...prev, sections: prev.sections.map((s) => (s.id === sid ? { ...s, ...patch } : s)) }
        : prev
    );

  const updateField = (sid: string, fid: string, patch: Partial<WorksheetField>) =>
    setTool((prev) =>
      prev
        ? {
            ...prev,
            sections: prev.sections.map((s) =>
              s.id === sid
                ? { ...s, fields: s.fields.map((f) => (f.id === fid ? { ...f, ...patch } : f)) }
                : s
            ),
          }
        : prev
    );

  const moveSection = (index: number, dir: -1 | 1) =>
    setTool((prev) => {
      if (!prev) return prev;
      const target = index + dir;
      if (target < 0 || target >= prev.sections.length) return prev;
      const next = [...prev.sections];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, sections: next };
    });

  const addSection = () =>
    setTool((prev) =>
      prev
        ? {
            ...prev,
            sections: [
              ...prev.sections,
              { id: uid('section'), title: `Section ${prev.sections.length + 1}`, fields: [] },
            ],
          }
        : prev
    );

  const removeSection = (sid: string) =>
    setTool((prev) =>
      prev ? { ...prev, sections: prev.sections.filter((s) => s.id !== sid) } : prev
    );

  const addField = (sid: string) => {
    const fid = uid('field');
    setTool((prev) =>
      prev
        ? {
            ...prev,
            sections: prev.sections.map((s) =>
              s.id === sid
                ? {
                    ...s,
                    fields: [
                      ...s.fields,
                      { id: fid, label: 'New field', field_type: 'text', required: false },
                    ],
                  }
                : s
            ),
          }
        : prev
    );
  };

  const removeField = (sid: string, fid: string) =>
    setTool((prev) =>
      prev
        ? {
            ...prev,
            sections: prev.sections.map((s) =>
              s.id === sid ? { ...s, fields: s.fields.filter((f) => f.id !== fid) } : s
            ),
          }
        : prev
    );

  const moveField = (sid: string, index: number, dir: -1 | 1) =>
    setTool((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((s) => {
          if (s.id !== sid) return s;
          const target = index + dir;
          if (target < 0 || target >= s.fields.length) return s;
          const next = [...s.fields];
          [next[index], next[target]] = [next[target], next[index]];
          return { ...s, fields: next };
        }),
      };
    });

  const setNumeric = (key: 'estimated_minutes', t: string) => {
    const n = parseInt(t, 10);
    update({ [key]: Number.isNaN(n) ? 0 : n } as Partial<ToolDefinition>);
  };

  // ---------- save ----------
  const handleSave = async () => {
    if (!tool) return;

    // Fold tips + options edit buffers back into the model.
    const tips = tipsText.split('\n').map((t) => t.trim()).filter(Boolean);
    const sections: WorksheetSection[] = tool.sections.map((s) => ({
      ...s,
      fields: s.fields.map((f) =>
        hasOptions(f.field_type)
          ? {
              ...f,
              options: (optionsText[f.id] ?? '').split('\n').map((o) => o.trim()).filter(Boolean),
            }
          : f
      ),
    }));
    const finalTool: ToolDefinition = { ...tool, tips, sections };

    // Validate.
    if (!finalTool.name.trim()) {
      showAlert('Missing name', 'Give the tool a name.');
      return;
    }
    if (sections.length === 0) {
      showAlert('No sections', 'Add at least one section.');
      return;
    }
    for (const s of sections) {
      if (s.fields.length === 0) {
        showAlert('Empty section', `Section "${s.title}" needs at least one field.`);
        return;
      }
      for (const f of s.fields) {
        if (!f.label.trim()) {
          showAlert('Missing field label', 'Every field needs a label.');
          return;
        }
        if (hasOptions(f.field_type) && (f.options ?? []).length === 0) {
          showAlert('Missing options', `Field "${f.label}" needs at least one option (one per line).`);
          return;
        }
      }
    }

    // Replace or append in the config, then persist.
    const exists = config.tools.some((t) => t.id === finalTool.id);
    const tools = exists
      ? config.tools.map((t) => (t.id === finalTool.id ? finalTool : t))
      : [...config.tools, finalTool];

    setSaving(true);
    try {
      await saveToolsConfig({ ...config, tools });
      await reload();
      navigation.goBack();
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !tool) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const categoryOptions = config.categories.map((c: ToolCategory) => ({
    value: c.id,
    label: c.label,
  }));

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        {/* ---- Card metadata ---- */}
        <Text style={styles.sectionHeader}>Library card</Text>
        <InputField label="Name" value={tool.name} onChangeText={(t) => update({ name: t })} />
        <InputField
          label="Trigger line (first-person moment shown on the card)"
          value={tool.trigger_line}
          onChangeText={(t) => update({ trigger_line: t })}
          multiline
        />
        <InputField
          label="Short description"
          value={tool.short_description}
          onChangeText={(t) => update({ short_description: t })}
          multiline
        />
        <InputField
          label="Long description"
          value={tool.long_description}
          onChangeText={(t) => update({ long_description: t })}
          multiline
          numberOfLines={4}
          style={styles.tallInput}
        />
        <InputField
          label="When to use"
          value={tool.when_to_use}
          onChangeText={(t) => update({ when_to_use: t })}
          multiline
        />
        <InputField
          label="Tips (one per line)"
          value={tipsText}
          onChangeText={setTipsText}
          multiline
          numberOfLines={4}
          style={styles.tallInput}
        />

        <View style={styles.rowFields}>
          <View style={styles.rowItem}>
            <Text style={styles.fieldLabel}>Category</Text>
            <Dropdown
              options={categoryOptions}
              selected={tool.category}
              onSelect={(id) => update({ category: id })}
            />
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.fieldLabel}>Difficulty</Text>
            <Dropdown
              options={DIFFICULTY_OPTIONS}
              selected={String(tool.difficulty)}
              onSelect={(d) => update({ difficulty: parseInt(d, 10) })}
            />
          </View>
        </View>

        <InputField
          label="Estimated minutes"
          value={String(tool.estimated_minutes)}
          onChangeText={(t) => setNumeric('estimated_minutes', t)}
          keyboardType="numeric"
        />

        {/* ---- Icon picker ---- */}
        <Text style={styles.fieldLabel}>Icon</Text>
        <View style={styles.pickerGrid}>
          {TOOL_ICONS.map((ic) => {
            const active = tool.icon === ic;
            return (
              <TouchableOpacity
                key={ic}
                style={[styles.iconChoice, active && { borderColor: tool.color, borderWidth: 2 }]}
                onPress={() => update({ icon: ic })}
              >
                <Ionicons
                  name={ic as keyof typeof Ionicons.glyphMap}
                  size={22}
                  color={active ? tool.color : Colors.gray}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ---- Color picker ---- */}
        <Text style={styles.fieldLabel}>Accent color</Text>
        <View style={styles.pickerGrid}>
          {TOOL_COLORS.map((col) => {
            const active = tool.color === col;
            return (
              <TouchableOpacity
                key={col}
                style={[styles.colorChoice, { backgroundColor: col }, active && styles.colorChoiceActive]}
                onPress={() => update({ color: col })}
              >
                {active && <Ionicons name="checkmark" size={16} color={Colors.white} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ---- Sections ---- */}
        <Text style={[styles.sectionHeader, { marginTop: Spacing.lg }]}>Sections</Text>
        {tool.sections.map((section, sIndex) => (
          <Card key={section.id} style={styles.sectionCard}>
            <View style={styles.sectionCardHeader}>
              <Text style={styles.sectionCardIndex}>{sIndex + 1}</Text>
              <Text style={styles.sectionCardTitle}>Section</Text>
              <TouchableOpacity onPress={() => moveSection(sIndex, -1)} hitSlop={8} disabled={sIndex === 0}>
                <Ionicons name="chevron-up" size={20} color={sIndex === 0 ? Colors.border : Colors.gray} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => moveSection(sIndex, 1)}
                hitSlop={8}
                disabled={sIndex === tool.sections.length - 1}
              >
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={sIndex === tool.sections.length - 1 ? Colors.border : Colors.gray}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeSection(section.id)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={Colors.secondary} />
              </TouchableOpacity>
            </View>

            <InputField
              label="Section title"
              value={section.title}
              onChangeText={(t) => updateSection(section.id, { title: t })}
            />
            <InputField
              label="Section description (optional)"
              value={section.description ?? ''}
              onChangeText={(t) => updateSection(section.id, { description: t })}
              multiline
            />

            {/* Fields */}
            {section.fields.map((field, fIndex) => (
              <View key={field.id} style={styles.fieldCard}>
                <View style={styles.fieldCardHeader}>
                  <Text style={styles.fieldCardTitle}>Field {fIndex + 1}</Text>
                  <TouchableOpacity
                    onPress={() => moveField(section.id, fIndex, -1)}
                    hitSlop={8}
                    disabled={fIndex === 0}
                  >
                    <Ionicons name="chevron-up" size={18} color={fIndex === 0 ? Colors.border : Colors.gray} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveField(section.id, fIndex, 1)}
                    hitSlop={8}
                    disabled={fIndex === section.fields.length - 1}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={fIndex === section.fields.length - 1 ? Colors.border : Colors.gray}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeField(section.id, field.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color={Colors.secondary} />
                  </TouchableOpacity>
                </View>

                <InputField
                  label="Label"
                  value={field.label}
                  onChangeText={(t) => updateField(section.id, field.id, { label: t })}
                />

                <Text style={styles.fieldLabel}>Type</Text>
                <Dropdown
                  options={FIELD_TYPE_OPTIONS}
                  selected={field.field_type}
                  onSelect={(ft) => {
                    updateField(section.id, field.id, { field_type: ft });
                    if (hasOptions(ft) && optionsText[field.id] === undefined) {
                      setOptionsText((prev) => ({ ...prev, [field.id]: '' }));
                    }
                  }}
                />

                {hasOptions(field.field_type) && (
                  <InputField
                    label="Options (one per line)"
                    value={optionsText[field.id] ?? ''}
                    onChangeText={(t) => setOptionsText((prev) => ({ ...prev, [field.id]: t }))}
                    multiline
                    numberOfLines={4}
                    style={styles.tallInput}
                  />
                )}

                {(field.field_type === 'text' || field.field_type === 'textarea') && (
                  <InputField
                    label="Placeholder (optional)"
                    value={field.placeholder ?? ''}
                    onChangeText={(t) => updateField(section.id, field.id, { placeholder: t })}
                  />
                )}

                <InputField
                  label="Helper text (optional)"
                  value={field.helper_text ?? ''}
                  onChangeText={(t) => updateField(section.id, field.id, { helper_text: t })}
                />

                <TouchableOpacity
                  style={styles.requiredRow}
                  onPress={() =>
                    updateField(section.id, field.id, { required: !field.required })
                  }
                >
                  <Ionicons
                    name={field.required ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={field.required ? Colors.primary : Colors.gray}
                  />
                  <Text style={styles.requiredText}>Required</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.addLink} onPress={() => addField(section.id)}>
              <Ionicons name="add" size={16} color={Colors.primary} />
              <Text style={styles.addLinkText}>Add field</Text>
            </TouchableOpacity>
          </Card>
        ))}

        <TouchableOpacity style={styles.addLink} onPress={addSection}>
          <Ionicons name="add" size={18} color={Colors.primary} />
          <Text style={styles.addLinkText}>Add section</Text>
        </TouchableOpacity>

        <Button title="Save" onPress={handleSave} loading={saving} />
      </View>
    </ScrollView>
  );
};

export default AdminToolEditScreen;

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
  rowFields: { flexDirection: 'row', gap: Spacing.md },
  rowItem: { flex: 1 },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  iconChoice: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorChoice: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorChoiceActive: {
    borderWidth: 2,
    borderColor: Colors.dark,
  },
  sectionCard: { marginBottom: Spacing.md },
  sectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionCardIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary + '15',
    color: Colors.primary,
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    textAlign: 'center',
    lineHeight: 22,
    overflow: 'hidden',
  },
  sectionCardTitle: {
    flex: 1,
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  fieldCard: {
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fieldCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  fieldCardTitle: {
    flex: 1,
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  requiredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  requiredText: {
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
});
