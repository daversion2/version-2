import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { getProgramById, enrollInProgram } from '../../services/programs';
import { ProgramTemplate, ProgramMode, ProgramDay } from '../../types';
import { showAlert } from '../../utils/alert';

type Props = NativeStackScreenProps<any, 'ProgramDetail'>;

export const ProgramDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { programId } = route.params as { programId: string };

  const [program, setProgram] = useState<ProgramTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [selectedMode, setSelectedMode] = useState<ProgramMode | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getProgramById(programId);
        setProgram(data);
        if (data) {
          setSelectedMode(data.recommended_mode);
        }
      } catch (err) {
        console.error('Failed to load program:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [programId]);

  const handleStartProgram = async () => {
    if (!user || !program || !selectedMode) return;

    setEnrolling(true);
    try {
      await enrollInProgram(user.uid, program.id, selectedMode);
      navigation.popToTop();
    } catch (err: any) {
      showAlert('Cannot Start Program', err.message || 'Something went wrong.');
    } finally {
      setEnrolling(false);
    }
  };

  if (loading || !program) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const previewDays = selectedMode === 'cold_turkey'
    ? program.cold_turkey_days.slice(0, 3)
    : program.gradual_build_days.slice(0, 3);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: program.color + '20' }]}>
          <Ionicons name={program.icon as any} size={36} color={program.color} />
        </View>
        <Text style={styles.programName}>{program.name}</Text>
        <View style={styles.metaRow}>
          <View style={[styles.metaBadge, { backgroundColor: Colors.primary + '15' }]}>
            <Ionicons name="calendar-outline" size={13} color={Colors.primary} />
            <Text style={styles.metaBadgeText}>{program.duration_days} days</Text>
          </View>
          <View style={[styles.metaBadge, { backgroundColor: program.color + '15' }]}>
            <Text style={[styles.metaBadgeText, { color: program.color }]}>{program.category}</Text>
          </View>
          <View style={[styles.metaBadge, { backgroundColor: Colors.secondary + '15' }]}>
            <Ionicons name="heart-outline" size={13} color={Colors.secondary} />
            <Text style={[styles.metaBadgeText, { color: Colors.secondary }]}>
              {program.grace_days} grace day{program.grace_days !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.description}>{program.description}</Text>

      {/* Mode Selection */}
      <Text style={styles.sectionTitle}>Choose Your Mode</Text>

      <TouchableOpacity
        style={[
          styles.modeCard,
          selectedMode === 'cold_turkey' && { borderColor: program.color, borderWidth: 2 },
        ]}
        onPress={() => setSelectedMode('cold_turkey')}
        activeOpacity={0.7}
      >
        <View style={styles.modeHeader}>
          <View style={styles.modeIconRow}>
            <Ionicons name="flash" size={20} color={program.color} />
            <Text style={styles.modeName}>Cold Turkey</Text>
          </View>
          {program.recommended_mode === 'cold_turkey' && (
            <View style={[styles.recommendedBadge, { backgroundColor: program.color + '20' }]}>
              <Text style={[styles.recommendedText, { color: program.color }]}>Recommended</Text>
            </View>
          )}
          <View style={[
            styles.radioOuter,
            selectedMode === 'cold_turkey' && { borderColor: program.color },
          ]}>
            {selectedMode === 'cold_turkey' && (
              <View style={[styles.radioInner, { backgroundColor: program.color }]} />
            )}
          </View>
        </View>
        <Text style={styles.modeDesc}>{program.cold_turkey_description}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.modeCard,
          selectedMode === 'gradual_build' && { borderColor: program.color, borderWidth: 2 },
        ]}
        onPress={() => setSelectedMode('gradual_build')}
        activeOpacity={0.7}
      >
        <View style={styles.modeHeader}>
          <View style={styles.modeIconRow}>
            <Ionicons name="trending-up" size={20} color={program.color} />
            <Text style={styles.modeName}>Gradual Build</Text>
          </View>
          {program.recommended_mode === 'gradual_build' && (
            <View style={[styles.recommendedBadge, { backgroundColor: program.color + '20' }]}>
              <Text style={[styles.recommendedText, { color: program.color }]}>Recommended</Text>
            </View>
          )}
          <View style={[
            styles.radioOuter,
            selectedMode === 'gradual_build' && { borderColor: program.color },
          ]}>
            {selectedMode === 'gradual_build' && (
              <View style={[styles.radioInner, { backgroundColor: program.color }]} />
            )}
          </View>
        </View>
        <Text style={styles.modeDesc}>{program.gradual_build_description}</Text>
      </TouchableOpacity>

      {/* Preview Days */}
      {previewDays.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>First 3 Days Preview</Text>
          {previewDays.map((day: ProgramDay) => (
            <View key={day.day_number} style={styles.previewDay}>
              <View style={[styles.dayBadge, { backgroundColor: program.color }]}>
                <Text style={styles.dayBadgeText}>{day.day_number}</Text>
              </View>
              <View style={styles.previewContent}>
                <Text style={styles.previewChallenge}>{day.challenge_name}</Text>
                <Text style={styles.previewDifficulty}>
                  Difficulty: {day.difficulty}/5
                </Text>
              </View>
            </View>
          ))}
        </>
      )}

      {/* What You'll Get */}
      <Text style={styles.sectionTitle}>What You'll Get</Text>
      <Card style={styles.benefitsCard}>
        <BenefitRow icon="checkmark-circle" text={`${program.duration_days} days of prescribed daily challenges`} color={program.color} />
        <BenefitRow icon="book-outline" text="Daily neuroscience insights and tips" color={program.color} />
        <BenefitRow icon="trophy-outline" text={`"${program.completion_badge_name}" badge on completion`} color={program.color} />
        <BenefitRow icon="add-circle-outline" text="Habits you can keep after the program ends" color={program.color} />
        <BenefitRow icon="star-outline" text={`${program.completion_bonus_points} bonus Willpower Points on completion`} color={program.color} />
        <BenefitRow icon="heart-outline" text={`${program.grace_days} grace day${program.grace_days !== 1 ? 's' : ''} if life gets in the way`} color={program.color} />
      </Card>

      {/* Start Button */}
      <Button
        title={enrolling ? 'Starting...' : 'Start Program'}
        onPress={handleStartProgram}
        loading={enrolling}
        disabled={!selectedMode}
        style={styles.startBtn}
      />
    </ScrollView>
  );
};

const BenefitRow: React.FC<{ icon: string; text: string; color: string }> = ({ icon, text, color }) => (
  <View style={benefitStyles.row}>
    <Ionicons name={icon as any} size={20} color={color} />
    <Text style={benefitStyles.text}>{text}</Text>
  </View>
);

const benefitStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  text: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    flex: 1,
    lineHeight: 20,
  },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  programName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  metaBadgeText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },

  // Description
  description: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },

  // Section
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },

  // Mode Selection
  modeCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modeIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  modeName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  recommendedBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  recommendedText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
  },
  modeDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // Preview
  previewDay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
    paddingLeft: Spacing.xs,
  },
  dayBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
  previewContent: {
    flex: 1,
  },
  previewChallenge: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 20,
  },
  previewDifficulty: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },

  // Benefits
  benefitsCard: {
    marginBottom: Spacing.lg,
  },

  // Start
  startBtn: {
    marginTop: Spacing.sm,
  },
});
