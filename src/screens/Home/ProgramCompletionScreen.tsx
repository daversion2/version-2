import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { HabitConversionList } from '../../components/program/HabitConversionList';
import { useAuth } from '../../context/AuthContext';
import {
  getEnrollmentById,
  getProgramById,
  convertProgramToHabits,
} from '../../services/programs';
import { ProgramEnrollment, ProgramTemplate } from '../../types';

type Props = NativeStackScreenProps<any, 'ProgramCompletion'>;

export const ProgramCompletionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user } = useAuth();
  const enrollmentId = route.params?.enrollmentId as string;
  const totalPoints = route.params?.totalPoints as number;
  const bonusPoints = route.params?.bonusPoints as number;

  const [enrollment, setEnrollment] = useState<ProgramEnrollment | null>(null);
  const [program, setProgram] = useState<ProgramTemplate | null>(null);
  const [selectedHabits, setSelectedHabits] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user?.uid) return;
      try {
        const enrollmentData = await getEnrollmentById(user.uid, enrollmentId);
        if (!enrollmentData) return;
        setEnrollment(enrollmentData);

        const programData = await getProgramById(enrollmentData.program_id);
        setProgram(programData);

        // Pre-select all habits
        if (programData?.suggested_habits) {
          setSelectedHabits(programData.suggested_habits.map((_, i) => i));
        }
      } catch (err) {
        console.error('Failed to load completion data:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.uid, enrollmentId]);

  const handleToggleHabit = (index: number) => {
    setSelectedHabits(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const handleCreateHabits = async () => {
    if (!user?.uid || !program || !enrollment) return;
    setCreating(true);
    try {
      const habitsToCreate = selectedHabits.map(i => program.suggested_habits[i]);
      await convertProgramToHabits(user.uid, enrollment.id, habitsToCreate);
      navigation.popToTop();
    } catch (err) {
      console.error('Failed to create habits:', err);
      setCreating(false);
    }
  };

  const handleSkip = () => {
    navigation.popToTop();
  };

  if (loading || !enrollment || !program) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const daysSucceeded = enrollment.milestones.filter(m => m.succeeded).length;
  const successRate = Math.round((daysSucceeded / enrollment.duration_days) * 100);
  const programColor = program.color;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Badge / Celebration */}
      <View style={styles.celebrationSection}>
        <View style={[styles.badgeCircle, { backgroundColor: programColor + '20' }]}>
          <Ionicons name="trophy" size={48} color={programColor} />
        </View>
        <Text style={styles.congratsTitle}>Program Complete!</Text>
        <Text style={styles.badgeName}>{program.completion_badge_name}</Text>
        <Text style={styles.programSubtitle}>
          {program.name} · {enrollment.mode === 'cold_turkey' ? 'Cold Turkey' : 'Gradual Build'}
        </Text>
      </View>

      {/* Stats Summary */}
      <Card style={styles.statsCard}>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: programColor }]}>{daysSucceeded}</Text>
            <Text style={styles.statLabel}>Days Succeeded</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: programColor }]}>{successRate}%</Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: programColor }]}>{totalPoints}</Text>
            <Text style={styles.statLabel}>Total Points</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: programColor }]}>{enrollment.grace_days_used}</Text>
            <Text style={styles.statLabel}>Grace Days Used</Text>
          </View>
        </View>
        {bonusPoints > 0 && (
          <View style={[styles.bonusBanner, { backgroundColor: programColor + '10' }]}>
            <Ionicons name="star" size={16} color={programColor} />
            <Text style={[styles.bonusText, { color: programColor }]}>
              +{bonusPoints} bonus points earned!
            </Text>
          </View>
        )}
      </Card>

      {/* Habit Conversion */}
      {program.suggested_habits.length > 0 && (
        <View style={styles.habitsSection}>
          <Text style={styles.habitsTitle}>Continue the Momentum</Text>
          <Text style={styles.habitsSubtitle}>
            Turn your program activities into daily habits to keep your progress going.
          </Text>

          <HabitConversionList
            habits={program.suggested_habits}
            selectedIndices={selectedHabits}
            onToggle={handleToggleHabit}
            programColor={programColor}
          />

          <Button
            title={`Create ${selectedHabits.length} Habit${selectedHabits.length !== 1 ? 's' : ''}`}
            onPress={handleCreateHabits}
            disabled={selectedHabits.length === 0}
            loading={creating}
            style={{ marginTop: Spacing.lg }}
          />
        </View>
      )}

      <Button
        title="Return Home"
        onPress={handleSkip}
        variant="outline"
        style={{ marginTop: Spacing.md }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  celebrationSection: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
  },
  badgeCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  congratsTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  badgeName: {
    fontFamily: Fonts.accent,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  programSubtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  statsCard: {
    marginBottom: Spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statBox: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  statNumber: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    marginBottom: 2,
  },
  statLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  bonusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  bonusText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.sm,
  },
  habitsSection: {
    marginBottom: Spacing.md,
  },
  habitsTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  habitsSubtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
});
