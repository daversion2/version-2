import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { useAuth } from '../../context/AuthContext';
import {
  createProgram,
  updateProgram,
  publishProgram,
  archiveProgram,
} from '../../services/coaches';
import { getProgramById } from '../../services/programs';
import { showAlert, showConfirm } from '../../utils/alert';
import { ProgramTemplate } from '../../types';

export const CoachProgramEditScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const mode: 'create' | 'edit' = route.params?.mode || 'create';
  const programId: string | undefined = route.params?.programId;

  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [program, setProgram] = useState<ProgramTemplate | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [icon, setIcon] = useState('fitness');
  const [color, setColor] = useState('#217180');

  useFocusEffect(
    useCallback(() => {
      if (mode === 'edit' && programId) {
        const load = async () => {
          try {
            const p = await getProgramById(programId);
            if (p) {
              setProgram(p);
              setName(p.name);
              setDescription(p.description);
              setCategory(p.category);
              setDurationDays(String(p.duration_days));
              setIcon(p.icon);
              setColor(p.color);
            }
          } catch (err) {
            console.error('Error loading program:', err);
            showAlert('Error', 'Failed to load program.');
          } finally {
            setLoading(false);
          }
        };
        load();
      }
    }, [mode, programId])
  );

  const validate = (): boolean => {
    if (!name.trim()) {
      showAlert('Missing Field', 'Please enter a program name.');
      return false;
    }
    if (!description.trim()) {
      showAlert('Missing Field', 'Please enter a description.');
      return false;
    }
    if (!category.trim()) {
      showAlert('Missing Field', 'Please enter a category.');
      return false;
    }
    const days = parseInt(durationDays, 10);
    if (!days || days < 7 || days > 90) {
      showAlert('Invalid Duration', 'Duration must be between 7 and 90 days.');
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!user || !validate()) return;
    setSaving(true);
    try {
      await createProgram(user.uid, {
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
        duration_days: parseInt(durationDays, 10),
        icon: icon.trim() || 'fitness',
        color: color.trim() || '#217180',
      });
      showAlert('Program Created', 'Your program has been saved as a draft.');
      navigation.goBack();
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to create program.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!user || !programId || !validate()) return;
    setSaving(true);
    try {
      await updateProgram(user.uid, programId, {
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
        duration_days: parseInt(durationDays, 10),
        icon: icon.trim(),
        color: color.trim(),
      });
      showAlert('Saved', 'Program updated successfully.');
      // Refresh local state
      const p = await getProgramById(programId);
      if (p) setProgram(p);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!user || !programId) return;
    setSaving(true);
    try {
      await publishProgram(user.uid, programId);
      showAlert('Published', 'Your program is now live and visible to users.');
      const p = await getProgramById(programId);
      if (p) setProgram(p);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to publish.');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = () => {
    if (!user || !programId) return;
    showConfirm(
      'Archive Program',
      'This will hide the program from new users. Existing enrollments will not be affected.',
      async () => {
        setSaving(true);
        try {
          await archiveProgram(user.uid, programId);
          showAlert('Archived', 'Program has been archived.');
          const p = await getProgramById(programId);
          if (p) setProgram(p);
        } catch (err: any) {
          showAlert('Error', err.message || 'Failed to archive.');
        } finally {
          setSaving(false);
        }
      },
      'Archive'
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
        {/* Status badge for existing programs */}
        {mode === 'edit' && program?.status && (
          <Card style={styles.statusCard}>
            <Text style={styles.statusLabel}>
              Status:{' '}
              <Text
                style={{
                  color:
                    program.status === 'published'
                      ? Colors.primary
                      : program.status === 'draft'
                      ? Colors.secondary
                      : Colors.gray,
                }}
              >
                {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
              </Text>
            </Text>
          </Card>
        )}

        {/* Form Fields */}
        <InputField
          label="Program Name *"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Morning Discipline"
          maxLength={60}
        />

        <Text style={styles.fieldLabel}>Description *</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="What will participants learn and achieve?"
          multiline
          numberOfLines={4}
          maxLength={500}
          textAlignVertical="top"
          placeholderTextColor={Colors.gray}
        />

        <InputField
          label="Category *"
          value={category}
          onChangeText={setCategory}
          placeholder="e.g. Morning Routine, Fitness, Focus"
          maxLength={50}
        />

        <InputField
          label="Duration (days) *"
          value={durationDays}
          onChangeText={setDurationDays}
          placeholder="e.g. 21"
          keyboardType="number-pad"
          maxLength={2}
        />

        <InputField
          label="Icon (Ionicons name)"
          value={icon}
          onChangeText={setIcon}
          placeholder="e.g. fitness, moon, flash"
          autoCapitalize="none"
        />

        <InputField
          label="Color (hex code)"
          value={color}
          onChangeText={setColor}
          placeholder="e.g. #217180"
          autoCapitalize="none"
        />

        {/* Action Buttons */}
        <View style={styles.actions}>
          {mode === 'create' ? (
            <Button
              title="Create Draft"
              onPress={handleCreate}
              variant="primary"
              loading={saving}
              disabled={saving}
            />
          ) : (
            <>
              <Button
                title="Save Changes"
                onPress={handleSave}
                variant="primary"
                loading={saving}
                disabled={saving}
              />

              {program?.status === 'draft' && (
                <Button
                  title="Publish"
                  onPress={handlePublish}
                  variant="secondary"
                  disabled={saving}
                  style={{ marginTop: Spacing.sm }}
                />
              )}

              {program?.status === 'published' && (
                <Button
                  title="Archive"
                  onPress={handleArchive}
                  variant="outline"
                  disabled={saving}
                  style={{ marginTop: Spacing.sm }}
                />
              )}
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  statusCard: {
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  statusLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  fieldLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.xs,
  },
  textArea: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    backgroundColor: Colors.white,
    minHeight: 100,
    marginBottom: Spacing.md,
  },
  actions: {
    marginTop: Spacing.lg,
  },
});
