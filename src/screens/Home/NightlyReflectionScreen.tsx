import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { GradeSelector } from '../../components/home/GradeSelector';
import { DailySummaryCard } from '../../components/home/DailySummaryCard';
import { useAuth } from '../../context/AuthContext';
import { DailySummary, ReflectionGrade, DailyReflection } from '../../types';
import { buildDailySummary, saveReflection, getReflection } from '../../services/reflections';
import { showAlert } from '../../utils/alert';

type Props = NativeStackScreenProps<any, 'NightlyReflection'>;

export const NightlyReflectionScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [existingReflection, setExistingReflection] = useState<DailyReflection | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form state
  const [grade, setGrade] = useState<ReflectionGrade | null>(null);
  const [wentWell, setWentWell] = useState('');
  const [hardest, setHardest] = useState('');
  const [tomorrow, setTomorrow] = useState('');

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [dailySummary, existing] = await Promise.all([
        buildDailySummary(user.uid, todayStr),
        getReflection(user.uid, todayStr),
      ]);
      setSummary(dailySummary);

      if (existing) {
        setExistingReflection(existing);
        setGrade(existing.grade);
        setWentWell(existing.prompt_went_well || '');
        setHardest(existing.prompt_hardest || '');
        setTomorrow(existing.prompt_tomorrow || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user, todayStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!user || !grade || !summary) return;
    setSaving(true);
    try {
      await saveReflection(user.uid, {
        user_id: user.uid,
        date: todayStr,
        grade,
        prompt_went_well: wentWell.trim() || undefined,
        prompt_hardest: hardest.trim() || undefined,
        prompt_tomorrow: tomorrow.trim() || undefined,
        daily_summary: summary,
        created_at: new Date().toISOString(),
      });
      showAlert('Reflection Saved', 'Great job reflecting on your day!');
      navigation.goBack();
    } catch (e: any) {
      showAlert('Error', e.message || 'Could not save reflection.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const isReadOnly = existingReflection !== null && !isEditing;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <Text style={styles.dateText}>
        {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </Text>

      {isReadOnly && (
        <View style={styles.readOnlyBanner}>
          <Text style={styles.readOnlyText}>You already reflected today</Text>
          <Button
            title="Edit"
            variant="outline"
            onPress={() => setIsEditing(true)}
            style={styles.editButton}
          />
        </View>
      )}

      {/* Daily Summary */}
      {summary && <DailySummaryCard summary={summary} />}

      {/* Grade Selector */}
      <GradeSelector
        value={grade}
        onChange={isReadOnly ? () => {} : setGrade}
      />

      {/* Prompts */}
      <View style={styles.promptSection}>
        <Text style={styles.promptLabel}>What went well today?</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Celebrate your wins, big or small..."
          placeholderTextColor={Colors.gray}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          value={wentWell}
          onChangeText={isReadOnly ? () => {} : setWentWell}
          editable={!isReadOnly}
        />
      </View>

      <View style={styles.promptSection}>
        <Text style={styles.promptLabel}>What was hardest?</Text>
        <TextInput
          style={styles.textArea}
          placeholder="What challenged you most today?"
          placeholderTextColor={Colors.gray}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          value={hardest}
          onChangeText={isReadOnly ? () => {} : setHardest}
          editable={!isReadOnly}
        />
      </View>

      <View style={styles.promptSection}>
        <Text style={styles.promptLabel}>What will you do differently tomorrow?</Text>
        <TextInput
          style={styles.textArea}
          placeholder="One thing you'll focus on..."
          placeholderTextColor={Colors.gray}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          value={tomorrow}
          onChangeText={isReadOnly ? () => {} : setTomorrow}
          editable={!isReadOnly}
        />
      </View>

      {/* Actions */}
      {!isReadOnly && (
        <>
          <Button
            title={existingReflection ? 'Update Reflection' : 'Save Reflection'}
            onPress={handleSave}
            loading={saving}
            disabled={!grade}
            style={styles.saveButton}
          />
          <Text
            style={styles.skipLink}
            onPress={() => navigation.goBack()}
          >
            Skip for tonight
          </Text>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  dateText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    marginBottom: Spacing.lg,
  },
  readOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  readOnlyText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  editButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  promptSection: {
    marginBottom: Spacing.lg,
  },
  promptLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
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
    minHeight: 80,
  },
  saveButton: {
    marginTop: Spacing.sm,
  },
  skipLink: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.lg,
    textDecorationLine: 'underline',
  },
});
