import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import {
  getChallengesByBarrier,
  groupChallengesByDifficulty,
  ChallengeFilters,
} from '../../services/challengeLibrary';
import { createChallenge } from '../../services/challenges';
import { LibraryChallenge, TimeCategory, BarrierType } from '../../types';
import { showAlert } from '../../utils/alert';
import {
  BARRIER_TYPES,
  LIBRARY_UI_TEXT,
} from '../../constants/challengeLibrary';
import {
  FilterChipBar,
  LibraryChallengeCard,
  ChallengeDetailModal,
} from '../../components/library';

type Props = NativeStackScreenProps<any, 'BarrierChallenges'>;

export const BarrierChallengesScreen: React.FC<Props> = ({ route, navigation }) => {
  const { barrierType, initialTimeCategory, initialLifeDomain } = route.params as {
    barrierType: BarrierType;
    initialTimeCategory?: TimeCategory | null;
    initialLifeDomain?: string | null;
  };

  const { user } = useAuth();
  const barrierConfig = BARRIER_TYPES[barrierType];

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [challenges, setChallenges] = useState<LibraryChallenge[]>([]);

  // Filter states (inherit from previous screen if available)
  const [selectedTimeCategory, setSelectedTimeCategory] = useState<TimeCategory | null>(
    initialTimeCategory ?? null
  );
  const [selectedLifeDomain, setSelectedLifeDomain] = useState<string | null>(
    initialLifeDomain ?? null
  );

  // Detail modal state
  const [selectedChallenge, setSelectedChallenge] = useState<LibraryChallenge | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Set navigation title
  useEffect(() => {
    navigation.setOptions({
      title: barrierConfig?.name ?? 'Challenges',
    });
  }, [navigation, barrierConfig]);

  // Build current filters object
  const currentFilters: Omit<ChallengeFilters, 'barrierType'> = {
    timeCategory: selectedTimeCategory,
    category: selectedLifeDomain,
  };

  // Load data
  const loadData = useCallback(async () => {
    try {
      const result = await getChallengesByBarrier(barrierType, currentFilters);
      setChallenges(result);
    } catch (err) {
      console.error('Failed to load challenges:', err);
      showAlert('Error', 'Failed to load challenges');
    }
  }, [barrierType, selectedTimeCategory, selectedLifeDomain]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Handle using a challenge with selected duration
  const handleUseChallenge = async (challenge: LibraryChallenge, duration: number) => {
    if (!user) return;
    try {
      const isExtended = duration > 1;

      await createChallenge(user.uid, {
        name: challenge.name,
        category_id: challenge.category,
        date: new Date().toISOString().split('T')[0],
        difficulty_expected: challenge.difficulty,
        description: challenge.description,
        success_criteria: challenge.success_criteria,
        why: challenge.why,
        // Challenge type based on duration
        challenge_type: isExtended ? 'extended' : 'daily',
        ...(isExtended ? { duration_days: duration } : {}),
        // Library metadata
        library_challenge_id: challenge.id,
        barrier_type: challenge.barrier_type,
        action_type: challenge.action_type,
        time_category: challenge.time_category,
        // Educational content
        neuroscience_explanation: challenge.neuroscience_explanation,
        psychological_benefit: challenge.psychological_benefit,
        what_youll_learn: challenge.what_youll_learn,
        common_resistance: challenge.common_resistance,
      });
      navigation.popToTop();
    } catch (e: any) {
      showAlert('Error', e.message);
    }
  };

  // Handle tapping a challenge card
  const handleChallengePress = (challenge: LibraryChallenge) => {
    setSelectedChallenge(challenge);
    setDetailModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Group challenges by difficulty
  const grouped = groupChallengesByDifficulty(challenges);
  const hasNoResults = challenges.length === 0;

  const renderChallengeSection = (
    title: string,
    sectionChallenges: LibraryChallenge[]
  ) => {
    if (sectionChallenges.length === 0) return null;

    return (
      <View style={styles.challengeSection}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.challengeList}>
          {sectionChallenges.map((challenge) => (
            <View key={challenge.id} style={styles.challengeCardWrapper}>
              <LibraryChallengeCard
                challenge={challenge}
                onPress={() => handleChallengePress(challenge)}
                showBarrierType={false}
                showDescription
              />
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Barrier Description */}
        {barrierConfig && (
          <Text style={styles.barrierDescription}>
            {barrierConfig.shortDescription}
          </Text>
        )}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Filters */}
        <View style={styles.filtersSection}>
          <Text style={styles.filterLabel}>Filter by:</Text>
          <FilterChipBar
            selectedTimeCategory={selectedTimeCategory}
            selectedLifeDomain={selectedLifeDomain}
            onTimeCategoryChange={setSelectedTimeCategory}
            onLifeDomainChange={setSelectedLifeDomain}
          />
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {hasNoResults ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>{LIBRARY_UI_TEXT.emptyStateTitle}</Text>
            <Text style={styles.emptyText}>{LIBRARY_UI_TEXT.emptyStateMessage}</Text>
          </View>
        ) : (
          <>
            {/* Beginner Section */}
            {renderChallengeSection(
              LIBRARY_UI_TEXT.difficultyBeginnerHeader,
              grouped.beginner
            )}

            {/* Moderate Section */}
            {renderChallengeSection(
              LIBRARY_UI_TEXT.difficultyModerateHeader,
              grouped.moderate
            )}

            {/* Advanced Section */}
            {renderChallengeSection(
              LIBRARY_UI_TEXT.difficultyAdvancedHeader,
              grouped.advanced
            )}
          </>
        )}
      </ScrollView>

      {/* Challenge Detail Modal */}
      <ChallengeDetailModal
        visible={detailModalVisible}
        challenge={selectedChallenge}
        onClose={() => setDetailModalVisible(false)}
        onUseChallenge={handleUseChallenge}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  barrierDescription: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
  },
  filtersSection: {
    marginBottom: Spacing.sm,
  },
  filterLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  challengeSection: {
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  challengeList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  challengeCardWrapper: {
    marginBottom: Spacing.xs,
  },
  emptyContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    lineHeight: 24,
  },
});
