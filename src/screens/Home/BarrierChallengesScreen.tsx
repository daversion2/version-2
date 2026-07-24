import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { HomeScreenProps } from '../../types/navigation';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import {
  getChallengesByActionType,
  ChallengeFilters,
} from '../../services/challengeLibrary';
import { createChallenge } from '../../services/challenges';
import { getChallengeAmountSpec, fillChallengeAmount } from '../../utils/challengeAmount';
import { LibraryChallenge, TimeCategory, ActionType } from '../../types';
import { getTodayString } from '../../utils/date';
import { showAlert } from '../../utils/alert';
import {
  ACTION_CATEGORIES,
  LIBRARY_UI_TEXT,
} from '../../constants/challengeLibrary';
import {
  FilterChipBar,
  LibraryChallengeCard,
  ChallengeDetailModal,
} from '../../components/library';

type Props = HomeScreenProps<'ActionChallenges'>;

export const ActionChallengesScreen: React.FC<Props> = ({ route, navigation }) => {
  const { actionType, initialTimeCategory, initialLifeDomain } = route.params;

  const { user } = useAuth();
  // Map action_type to display category
  const categoryKey = actionType === 'complete' ? 'start' : 'stop';
  const categoryConfig = ACTION_CATEGORIES[categoryKey];

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
  const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);

  // Set navigation title
  useEffect(() => {
    navigation.setOptions({
      title: categoryConfig?.name ?? 'Challenges',
    });
  }, [navigation, categoryConfig]);

  // Build current filters object
  const currentFilters: Omit<ChallengeFilters, 'actionType'> = {
    timeCategory: selectedTimeCategory,
    category: selectedLifeDomain,
  };

  // Load data
  const loadData = useCallback(async () => {
    try {
      const result = await getChallengesByActionType(actionType, currentFilters);
      setChallenges(result);
    } catch (err) {
      console.error('Failed to load challenges:', err);
      showAlert('Error', 'Failed to load challenges');
    }
  }, [actionType, selectedTimeCategory, selectedLifeDomain]);

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

  // Handle using a challenge with selected duration (and quantity, if the
  // challenge name carries an "X" placeholder like "Fast for X Hours").
  const handleUseChallenge = async (
    challenge: LibraryChallenge,
    duration: number,
    amount?: number
  ) => {
    if (!user || isCreatingChallenge) return;
    setIsCreatingChallenge(true);
    try {
      const isExtended = duration > 1;

      const spec = getChallengeAmountSpec(challenge.name);
      const resolvedName = spec && amount ? fillChallengeAmount(challenge.name, amount) : challenge.name;
      const resolvedCriteria =
        spec && amount && challenge.success_criteria
          ? fillChallengeAmount(challenge.success_criteria, amount)
          : challenge.success_criteria;

      await createChallenge(user.uid, {
        name: resolvedName,
        date: getTodayString(),
        difficulty_expected: challenge.difficulty,
        description: challenge.description,
        success_criteria: resolvedCriteria,
        why: challenge.why,
        // Challenge type based on duration
        challenge_type: isExtended ? 'extended' : 'daily',
        ...(isExtended ? { duration_days: duration } : {}),
        // Resolved "X" quantity (if any)
        ...(spec && amount ? { target_amount: amount, target_unit: spec.unit } : {}),
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
      setDetailModalVisible(false);
      navigation.popToTop();
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setIsCreatingChallenge(false);
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

  const hasNoResults = challenges.length === 0;

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
        {/* Category Description */}
        {categoryConfig && (
          <Text style={styles.categoryDescription}>
            {categoryConfig.shortDescription}
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
          <View style={styles.challengeSection}>
            <View style={styles.challengeList}>
              {challenges.map((challenge) => (
                <View key={challenge.id} style={styles.challengeCardWrapper}>
                  <LibraryChallengeCard
                    challenge={challenge}
                    onPress={() => handleChallengePress(challenge)}
                    showActionType={false}
                    showDescription
                  />
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Challenge Detail Modal */}
      <ChallengeDetailModal
        visible={detailModalVisible}
        challenge={selectedChallenge}
        onClose={() => setDetailModalVisible(false)}
        onUseChallenge={handleUseChallenge}
        isCreating={isCreatingChallenge}
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
  categoryDescription: {
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

// Keep BarrierChallengesScreen as an alias for backward compatibility
export const BarrierChallengesScreen = ActionChallengesScreen;
