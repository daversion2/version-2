import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProgressScreenProps } from '../../types/navigation';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Button } from '../../components/common/Button';
import { Stopwatch } from '../../components/common/Stopwatch';
import { DifficultySelector } from '../../components/common/DifficultySelector';
import { getArena } from '../../constants/arenas';
import { logArenaBaseline } from '../../services/arenaBaselines';
import { useAuth } from '../../context/AuthContext';
import { showAlert } from '../../utils/alert';

// =============================================================================
// BASELINE TEST (Phase 3.3) — records a per-arena baseline measurement. The
// unit (and therefore the input UI) depends on the arena:
//   duration   -> Stopwatch, value = seconds held
//   rating     -> stress before/after selectors, value = before - after
//   completion -> single urge-intensity selector, value = urge (1-5)
// The delta over successive tests is the arena's "Discomfort Shift".
// =============================================================================

type Props = ProgressScreenProps<'BaselineTest'>;

type SavePartial = {
  unit: 'duration' | 'rating' | 'completion';
  value: number;
  value_before?: number;
  value_after?: number;
  note?: string;
};

export const BaselineTestScreen: React.FC<Props> = ({ route, navigation }) => {
  const { arenaId } = route.params;
  const { user } = useAuth();
  const arena = getArena(arenaId);

  // rating inputs
  const [stressBefore, setStressBefore] = useState(3);
  const [stressAfter, setStressAfter] = useState(3);
  // completion input
  const [urge, setUrge] = useState(3);
  const [saving, setSaving] = useState(false);

  if (!arena) {
    return (
      <View style={styles.fallback}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.gray} />
        <Text style={styles.fallbackText}>Arena not found</Text>
      </View>
    );
  }

  const save = async (partial: SavePartial) => {
    if (!user) return;
    setSaving(true);
    try {
      await logArenaBaseline(user.uid, {
        arena_id: arenaId,
        ...partial,
      });
      showAlert(
        'Baseline saved',
        'Your Discomfort Shift will track from here.',
        () => navigation.goBack()
      );
    } catch (err) {
      console.warn('Failed to save baseline:', err);
      showAlert('Could not save', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDuration = (seconds: number) => {
    save({ unit: 'duration', value: seconds });
  };

  const handleRatingSave = () => {
    save({
      unit: 'rating',
      value: stressBefore - stressAfter,
      value_before: stressBefore,
      value_after: stressAfter,
    });
  };

  const handleCompletionSave = () => {
    save({ unit: 'completion', value: urge });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: `${arena.color}1A` }]}>
          <Ionicons name={arena.icon as any} size={32} color={arena.color} />
        </View>
        <Text style={styles.arenaName}>{arena.name}</Text>
        <Text style={[styles.instruction, { color: arena.color }]}>
          {arena.baselineMetric}
        </Text>
        <Text style={styles.neuroscience}>{arena.neuroscience}</Text>
      </View>

      {/* Input — branches on baseline unit */}
      <View style={styles.body}>
        {arena.baselineUnit === 'duration' && (
          <Stopwatch accentColor={arena.color} onComplete={handleDuration} />
        )}

        {arena.baselineUnit === 'rating' && (
          <View style={styles.form}>
            <DifficultySelector
              label="Stress before (1–5)"
              value={stressBefore}
              onChange={setStressBefore}
            />
            <DifficultySelector
              label="Stress after (1–5)"
              value={stressAfter}
              onChange={setStressAfter}
            />
            <Button
              title="Save"
              onPress={handleRatingSave}
              loading={saving}
              style={styles.saveBtn}
            />
          </View>
        )}

        {arena.baselineUnit === 'completion' && (
          <View style={styles.form}>
            <DifficultySelector
              label="How strong was the urge? (1–5)"
              value={urge}
              onChange={setUrge}
            />
            <Button
              title="I did it"
              onPress={handleCompletionSave}
              loading={saving}
              style={styles.saveBtn}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  arenaName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  instruction: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  neuroscience: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  body: {
    marginTop: Spacing.md,
  },
  form: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  saveBtn: {
    marginTop: Spacing.lg,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.lightGray,
  },
  fallbackText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.gray,
    marginTop: Spacing.md,
  },
});
