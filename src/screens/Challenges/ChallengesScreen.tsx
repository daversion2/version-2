import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { useAuth } from '../../context/AuthContext';
import { getPastChallenges } from '../../services/challenges';
import { getChallengeSummaryStats, ChallengeSummaryStats } from '../../services/challengeStats';
import { Challenge } from '../../types';
import { useWalkthrough, WALKTHROUGH_STEPS } from '../../context/WalkthroughContext';
import { WalkthroughOverlay } from '../../components/walkthrough/WalkthroughOverlay';

export const ChallengesScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { isWalkthroughActive, currentStep, currentStepConfig, nextStep, skipWalkthrough } = useWalkthrough();
  const isMyStep = isWalkthroughActive && currentStepConfig?.screen === 'Challenges';
  const [stats, setStats] = useState<ChallengeSummaryStats>({
    avgDifficulty: 0,
    totalCompleted: 0,
    avgPerWeek: 0,
    successRate: 0,
  });
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      (async () => {
        const [s, c] = await Promise.all([
          getChallengeSummaryStats(user.uid),
          getPastChallenges(user.uid),
        ]);
        setStats(s);
        setChallenges(c);
      })();
    }, [user])
  );

  const renderItem = ({ item }: { item: Challenge }) => {
    const statusColor = item.status === 'completed' ? Colors.success : Colors.fail;
    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('ChallengeDetail', { challengeId: item.id })}
      >
        <Card style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          </View>
          <View style={styles.itemMeta}>
            <Text style={styles.metaText}>
              {item.category_id || 'Uncategorized'}
            </Text>
            <Text style={styles.metaText}>{item.date}</Text>
            <Text style={[styles.metaText, { color: statusColor }]}>
              {item.status === 'completed' ? 'Success' : 'Failed'}
            </Text>
            <Text style={styles.metaText}>
              Diff: {item.difficulty_actual || item.difficulty_expected}
            </Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={challenges}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListHeaderComponent={
        <>
          <View style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{stats.avgDifficulty}</Text>
              <Text style={styles.statLabel}>Avg Difficulty</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalCompleted}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{stats.avgPerWeek}</Text>
              <Text style={styles.statLabel}>Avg Challenges Per Week</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{stats.successRate}%</Text>
              <Text style={styles.statLabel}>Success Rate</Text>
            </Card>
          </View>
          <Text style={styles.sectionTitle}>Past Challenges</Text>
        </>
      }
      ListEmptyComponent={
        <Text style={styles.emptyText}>No completed challenges yet.</Text>
      }
      ListFooterComponent={
        isMyStep ? (
          <WalkthroughOverlay
            visible
            stepText={currentStepConfig?.text || ''}
            stepNumber={currentStep}
            totalSteps={WALKTHROUGH_STEPS.length}
            isLast={currentStep === WALKTHROUGH_STEPS.length - 1}
            onNext={nextStep}
            onSkip={skipWalkthrough}
          />
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
    color: Colors.primary,
  },
  statLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  itemCard: { marginBottom: Spacing.sm },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  itemName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: Spacing.sm,
  },
  itemMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
    flexWrap: 'wrap',
  },
  metaText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});
