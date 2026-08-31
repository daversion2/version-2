import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreenProps } from '../../types/navigation';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { createHabit } from '../../services/practices';
import { HABIT_CATEGORIES } from '../../data/habitLibrary';
import { HABIT_TEMPLATE_PRESETS } from '../../data/habitTemplates';
import { showAlert } from '../../utils/alert';

type Props = HomeScreenProps<'CreateHabit'>;

const TARGETS = [1, 2, 3, 4, 5, 6, 7];

/**
 * Create a habit of your own.
 *
 * DELIBERATELY MINIMAL: name, category, weekly target, template. The action
 * plan (anchor, environment tweak, obstacle plan) is where the behaviour-change
 * substance lives, but it is five more fields on a form — and a form people
 * abandon creates no habits at all. It is added afterwards from the habit's own
 * detail page, so the commitment here is small and the depth stays optional.
 */
export const CreateHabitScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string>(HABIT_CATEGORIES[0]?.id ?? 'Body');
  const [target, setTarget] = useState(3);
  const [templateId, setTemplateId] = useState<string>('none');
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 0 && !saving;

  const handleCreate = async () => {
    if (!user || !canSave) return;
    setSaving(true);
    try {
      const habitId = await createHabit(user.uid, {
        name: name.trim(),
        category_id: categoryId,
        target_count_per_week: target,
        // 'none' means no template. Storing it would be a lie the completion
        // flow then has to interpret, so it is simply omitted.
        template_id: templateId === 'none' ? undefined : templateId,
        created_by_user: true,
      });
      // Straight to the new habit, so creating it ends somewhere concrete
      // rather than dropping the user back on a list to find it themselves.
      navigation.replace('HabitDetail', { habitId });
    } catch (e: any) {
      showAlert('Could not create habit', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>What's the habit?</Text>
        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Practice guitar"
          placeholderTextColor={Colors.gray}
          autoFocus
          returnKeyType="done"
          maxLength={60}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.chipWrap}>
          {HABIT_CATEGORIES.map((category) => {
            const active = category.id === categoryId;
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.chip,
                  active && { backgroundColor: category.color, borderColor: category.color },
                ]}
                onPress={() => setCategoryId(category.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={category.icon as any}
                  size={14}
                  color={active ? Colors.white : Colors.dark}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>How many times a week?</Text>
        <View style={styles.chipWrap}>
          {TARGETS.map((n) => {
            const active = n === target;
            return (
              <TouchableOpacity
                key={n}
                style={[styles.numChip, active && styles.numChipActive]}
                onPress={() => setTarget(n)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{n}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>What do you want to track?</Text>
        <Text style={styles.hint}>
          Every check-in asks how hard it was to start. This adds one more thing on top.
        </Text>
        <View style={styles.templateList}>
          {HABIT_TEMPLATE_PRESETS.map((preset) => {
            const active = preset.id === templateId;
            return (
              <TouchableOpacity
                key={preset.id}
                style={[styles.templateRow, active && styles.templateRowActive]}
                onPress={() => setTemplateId(preset.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={preset.icon as any}
                  size={18}
                  color={active ? Colors.primary : Colors.gray}
                />
                <View style={styles.templateText}>
                  <Text style={[styles.templateLabel, active && { color: Colors.primary }]}>
                    {preset.label}
                  </Text>
                  <Text style={styles.templateDesc}>{preset.description}</Text>
                </View>
                {active && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <Button
          title="Create habit"
          onPress={handleCreate}
          loading={saving}
          disabled={!canSave}
          style={styles.createBtn}
        />
        <Text style={styles.footnote}>
          You can add an anchor, an obstacle plan and a reminder afterwards.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FBFBFB' },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  label: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  hint: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  nameInput: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  numChip: {
    minWidth: 44,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  numChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark },
  chipTextActive: { color: Colors.white, fontFamily: Fonts.primaryBold },
  templateList: { gap: Spacing.sm },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  templateRowActive: { borderColor: Colors.primary },
  templateText: { flex: 1, gap: 2 },
  templateLabel: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark },
  templateDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    lineHeight: 17,
  },
  createBtn: { marginTop: Spacing.xl },
  footnote: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
