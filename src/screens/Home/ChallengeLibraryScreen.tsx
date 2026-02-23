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
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import {
  getLibraryChallenges,
  getActionTypeCounts,
  getBeginnerChallenges,
  ChallengeFilters,
} from '../../services/challengeLibrary';
import { createChallenge } from '../../services/challenges';
import { LibraryChallenge, TimeCategory, ActionType } from '../../types';
import { showAlert } from '../../utils/alert';
import {
  ACTION_CATEGORIES_LIST,
  LIBRARY_UI_TEXT,
} from '../../constants/challengeLibrary';
import {
  FilterChipBar,
  ActionCategoryCard,
  LibraryChallengeCard,
  ChallengeDetailModal,
} from '../../components/library';

type Props = NativeStackScreenProps<any, 'ChallengeLibrary'>;

export const ChallengeLibraryScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();

  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [allChallenges, setAllChallenges] = useState<LibraryChallenge[]>([]);
  const [beginnerChallenges, setBeginnerChallenges] = useState<LibraryChallenge[]>([]);
  const [actionCounts, setActionCounts] = useState<Record<string, number>>({});

  // Filter states
  const [selectedTimeCategory, setSelectedTimeCategory] = useState<TimeCategory | null>(null);
  const [selectedLifeDomain, setSelectedLifeDomain] = useState<string | null>(null);

  // Detail modal state
  const [selectedChallenge, setSelectedChallenge] = useState<LibraryChallenge | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);

  // Build current filters object
  const currentFilters: ChallengeFilters = {
    timeCategory: selectedTimeCategory,
    category: selectedLifeDomain,
  };

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [challenges, counts, beginners] = await Promise.all([
        getLibraryChallenges(currentFilters),
        getActionTypeCounts(currentFilters),
        getBeginnerChallenges(currentFilters),
      ]);

      setAllChallenges(challenges);
      setActionCounts(counts);
      setBeginnerChallenges(beginners.slice(0, 5)); // Limit to 5 beginner challenges
    } catch (err) {
      console.error('Failed to load challenge library:', err);
      showAlert('Error', 'Failed to load challenge library');
    }
  }, [selectedTimeCategory, selectedLifeDomain]);

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
    if (!user || isCreatingChallenge) return;
    setIsCreatingChallenge(true);
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

  // Handle tapping an action category card (Start/Stop)
  const handleActionCategoryPress = (actionType: ActionType) => {
    navigation.navigate('ActionChallenges', {
      actionType,
      initialTimeCategory: selectedTimeCategory,
      initialLifeDomain: selectedLifeDomain,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const hasNoResults = allChallenges.length === 0;

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
        {/* Header */}
        <Text style={styles.heading}>{LIBRARY_UI_TEXT.screenTitle}</Text>
        <Text style={styles.subtitle}>{LIBRARY_UI_TEXT.screenSubtitle}</Text>

        {/* Quick Filters */}
        <View style={styles.filtersSection}>
          <Text style={styles.filterLabel}>{LIBRARY_UI_TEXT.quickFiltersLabel}</Text>
          <FilterChipBar
            selectedTimeCategory={selectedTimeCategory}
            selectedLifeDomain={selectedLifeDomain}
            onTimeCategoryChange={setSelectedTimeCategory}
            onLifeDomainChange={setSelectedLifeDomain}
          />
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Action Category Cards Section (Start/Stop) */}
        <Text style={styles.sectionTitle}>{LIBRARY_UI_TEXT.actionSectionTitle}</Text>
        <View style={styles.actionGrid}>
          {ACTION_CATEGORIES_LIST.map((category) => (
            <View key={category.id} style={styles.actionCardWrapper}>
              <ActionCategoryCard
                category={category}
                count={actionCounts[category.id] || 0}
                onPress={() => handleActionCategoryPress(category.id === 'start' ? 'complete' : 'resist')}
              />
            </View>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Browse All Link */}
        <Text style={styles.browseAllText}>{LIBRARY_UI_TEXT.browseAllLink}</Text>

        {/* Beginner Friendly Section */}
        {beginnerChallenges.length > 0 && (
          <View style={styles.challengeSection}>
            <Text style={styles.sectionTitle}>{LIBRARY_UI_TEXT.beginnerSectionTitle}</Text>
            <View style={styles.challengeList}>
              {beginnerChallenges.map((challenge) => (
                <View key={challenge.id} style={styles.challengeCardWrapper}>
                  <LibraryChallengeCard
                    challenge={challenge}
                    onPress={() => handleChallengePress(challenge)}
                    showDescription
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* All Challenges Section */}
        <View style={styles.challengeSection}>
          <Text style={styles.sectionTitle}>
            {LIBRARY_UI_TEXT.allChallengesTitle} ({allChallenges.length})
          </Text>

          {hasNoResults ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>{LIBRARY_UI_TEXT.emptyStateTitle}</Text>
              <Text style={styles.emptyText}>{LIBRARY_UI_TEXT.emptyStateMessage}</Text>
            </View>
          ) : (
            <View style={styles.challengeList}>
              {allChallenges.map((challenge) => (
                <View key={challenge.id} style={styles.challengeCardWrapper}>
                  <LibraryChallengeCard
                    challenge={challenge}
                    onPress={() => handleChallengePress(challenge)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
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
  heading: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  filtersSection: {
    marginBottom: Spacing.md,
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
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  actionCardWrapper: {
    width: '48%',
    marginBottom: Spacing.xs,
  },
  browseAllText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  challengeSection: {
    marginTop: Spacing.sm,
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
