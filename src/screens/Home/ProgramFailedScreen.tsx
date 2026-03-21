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
import { useAuth } from '../../context/AuthContext';
import {
  getEnrollmentById,
  getProgramById,
  enrollInProgram,
} from '../../services/programs';
import { ProgramEnrollment, ProgramTemplate } from '../../types';

type Props = NativeStackScreenProps<any, 'ProgramFailed'>;

export const ProgramFailedScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user } = useAuth();
  const enrollmentId = route.params?.enrollmentId as string;

  const [enrollment, setEnrollment] = useState<ProgramEnrollment | null>(null);
  const [program, setProgram] = useState<ProgramTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user?.uid) return;
      try {
        const enrollmentData = await getEnrollmentById(user.uid, enrollmentId);
        if (!enrollmentData) return;
        setEnrollment(enrollmentData);

        const programData = await getProgramById(enrollmentData.program_id);
        setProgram(programData);
      } catch (err) {
        console.error('Failed to load program data:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.uid, enrollmentId]);

  const handleTryAgain = async () => {
    if (!user?.uid || !enrollment || !program) return;
    setRetrying(true);
    try {
      const newEnrollmentId = await enrollInProgram(
        user.uid,
        enrollment.program_id,
        enrollment.mode
      );
      navigation.replace('ProgramDashboard', { enrollmentId: newEnrollmentId });
    } catch (err) {
      console.error('Failed to re-enroll:', err);
      setRetrying(false);
    }
  };

  const handleGoHome = () => {
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
  const daysCompleted = enrollment.milestones.filter(m => m.completed).length;
  const programColor = program.color;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerSection}>
        <View style={[styles.iconCircle, { backgroundColor: Colors.secondary + '15' }]}>
          <Ionicons name="heart-outline" size={44} color={Colors.secondary} />
        </View>
        <Text style={styles.title}>Program Ended</Text>
        <Text style={styles.subtitle}>
          You've used all your grace days for {program.name}. That's okay — building willpower is a process, not a straight line.
        </Text>
      </View>

      {/* What You Accomplished */}
      <Card style={styles.statsCard}>
        <Text style={styles.sectionLabel}>WHAT YOU ACCOMPLISHED</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: programColor }]}>{daysCompleted}</Text>
            <Text style={styles.statLabel}>Days Completed</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: programColor }]}>{daysSucceeded}</Text>
            <Text style={styles.statLabel}>Days Succeeded</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: programColor }]}>{enrollment.total_points_earned}</Text>
            <Text style={styles.statLabel}>Points Earned</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: programColor }]}>{enrollment.grace_days_used}</Text>
            <Text style={styles.statLabel}>Grace Days Used</Text>
          </View>
        </View>
      </Card>

      {/* Encouragement */}
      <Card style={styles.encourageCard}>
        <Ionicons name="bulb-outline" size={20} color={programColor} />
        <Text style={styles.encourageText}>
          Every day you showed up counts. The neural pathways you've started building don't disappear — they just need more reinforcement. Consider trying again with Gradual Build mode if Cold Turkey felt too intense.
        </Text>
      </Card>

      {/* Actions */}
      <Button
        title="Try Again"
        onPress={handleTryAgain}
        loading={retrying}
        style={{ marginTop: Spacing.lg }}
      />

      <Button
        title="Return Home"
        onPress={handleGoHome}
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
  headerSection: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
  },
  statsCard: {
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
    textAlign: 'center',
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
  encourageCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  encourageText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 22,
    flex: 1,
  },
});
