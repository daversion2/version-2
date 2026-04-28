import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../../constants/theme';
import { Card } from '../../../components/common/Card';
import { ProgressBar } from '../../../components/challenge/ProgressBar';
import { HomeSectionProps } from './types';

export const ProgramSection: React.FC<HomeSectionProps> = ({ data, callbacks }) => {
  const { activeProgram, todaysProgramDay, programDayNumber, programCheckedIn } = data;

  if (activeProgram) {
    return (
      <Card
        style={styles.programActiveCard}
        onPress={() => callbacks.onNavigate('ProgramDashboard', { enrollmentId: activeProgram.id })}
      >
        <View style={styles.programActiveHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.programActiveName}>{activeProgram.program_name}</Text>
            <Text style={styles.programActiveMode}>
              {activeProgram.mode === 'cold_turkey' ? 'Cold Turkey' : 'Gradual Build'} — Day {programDayNumber} of {activeProgram.duration_days}
            </Text>
          </View>
          <View style={styles.programGraceBadge}>
            <Ionicons name="heart" size={14} color={Colors.secondary} />
            <Text style={styles.programGraceText}>
              {activeProgram.grace_days_allowed - activeProgram.grace_days_used}
            </Text>
          </View>
        </View>
        <ProgressBar
          progress={activeProgram.milestones.filter(m => m.completed).length / activeProgram.milestones.length}
          showPercentage={false}
        />
        {todaysProgramDay && (
          <View style={styles.programTodayPreview}>
            <View style={styles.programCheckInStatus}>
              <Ionicons
                name={programCheckedIn ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={programCheckedIn ? Colors.success : Colors.gray}
              />
              <Text style={[styles.programCheckInText, programCheckedIn && { color: Colors.success }]}>
                {programCheckedIn ? 'Checked in today!' : todaysProgramDay.challenge_name}
              </Text>
            </View>
          </View>
        )}
      </Card>
    );
  }

  return (
    <Card
      style={styles.programDiscoveryCard}
      onPress={() => callbacks.onNavigate('ProgramDiscovery')}
    >
      <View style={styles.programDiscoveryRow}>
        <View style={styles.programDiscoveryIcon}>
          <Ionicons name="rocket-outline" size={28} color={Colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.programDiscoveryTitle}>Start a Program</Text>
          <Text style={styles.programDiscoverySubtitle}>
            Structured challenges to build lasting habits
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={Colors.white + '80'} />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  programDiscoveryCard: {
    backgroundColor: Colors.primary,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  programDiscoveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  programDiscoveryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  programDiscoveryTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.white,
  },
  programDiscoverySubtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.white + 'CC',
    marginTop: 2,
  },
  programActiveCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  programActiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  programActiveName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
  },
  programActiveMode: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
  },
  programGraceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.secondary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  programGraceText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
  },
  programTodayPreview: {
    marginTop: Spacing.sm,
  },
  programCheckInStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  programCheckInText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    flex: 1,
  },
});
