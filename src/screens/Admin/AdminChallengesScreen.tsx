import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { getAllLibraryChallenges, deleteLibraryChallenge } from '../../services/admin';
import { LibraryChallenge, ActionType } from '../../types';
import { ACTION_CATEGORIES } from '../../constants/challengeLibrary';

export const AdminChallengesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [challenges, setChallenges] = useState<LibraryChallenge[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedActionType, setSelectedActionType] = useState<ActionType | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await getAllLibraryChallenges();
      setChallenges(data);
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleDelete = (challenge: LibraryChallenge) => {
    Alert.alert(
      'Delete Challenge',
      `Are you sure you want to delete "${challenge.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLibraryChallenge(challenge.id);
              setChallenges((prev) => prev.filter((c) => c.id !== challenge.id));
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  // Get unique categories
  const categories = Array.from(new Set(challenges.map((c) => c.category))).filter(Boolean);

  // Filter challenges
  const filteredChallenges = challenges.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || c.category === selectedCategory;
    const matchesActionType = !selectedActionType || c.action_type === selectedActionType;
    return matchesSearch && matchesCategory && matchesActionType;
  });

  // Sort by name
  const sortedChallenges = [...filteredChallenges].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Search and Filters */}
      <View style={styles.filterContainer}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={20} color={Colors.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search challenges..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Colors.gray}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.gray} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
          <TouchableOpacity
            style={[styles.filterChip, !selectedCategory && styles.filterChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.filterText, !selectedCategory && styles.filterTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
              onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            >
              <Text style={[styles.filterText, selectedCategory === cat && styles.filterTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Challenge List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.countText}>
          {sortedChallenges.length} challenge{sortedChallenges.length !== 1 ? 's' : ''}
        </Text>

        {sortedChallenges.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="search-outline" size={48} color={Colors.gray} />
            <Text style={styles.emptyText}>No challenges found</Text>
          </Card>
        ) : (
          sortedChallenges.map((challenge) => (
            <Card
              key={challenge.id}
              style={styles.challengeCard}
              onPress={() =>
                navigation.navigate('AdminChallengeEdit', {
                  mode: 'edit',
                  challengeId: challenge.id,
                })
              }
            >
              <View style={styles.challengeHeader}>
                <View style={styles.badges}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{challenge.category}</Text>
                  </View>
                  {challenge.action_type && (
                    <View style={[
                      styles.actionTypeBadge,
                      {
                        backgroundColor: ACTION_CATEGORIES[challenge.action_type === 'complete' ? 'start' : 'stop']?.color,
                      },
                    ]}>
                      <Text style={[
                        styles.actionTypeText,
                        { color: ACTION_CATEGORIES[challenge.action_type === 'complete' ? 'start' : 'stop']?.accentColor },
                      ]}>
                        {ACTION_CATEGORIES[challenge.action_type === 'complete' ? 'start' : 'stop']?.icon}{' '}
                        {ACTION_CATEGORIES[challenge.action_type === 'complete' ? 'start' : 'stop']?.name}
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(challenge)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={20} color={Colors.secondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.challengeName}>{challenge.name}</Text>
              {challenge.description && (
                <Text style={styles.challengeDesc} numberOfLines={2}>
                  {challenge.description}
                </Text>
              )}

              <View style={styles.metaRow}>
                <View style={styles.difficultyRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= challenge.difficulty ? 'star' : 'star-outline'}
                      size={14}
                      color={star <= challenge.difficulty ? Colors.secondary : Colors.gray}
                    />
                  ))}
                </View>
                {challenge.beginner_friendly && (
                  <View style={styles.beginnerBadge}>
                    <Text style={styles.beginnerText}>Beginner</Text>
                  </View>
                )}
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AdminChallengeEdit', { mode: 'create' })}
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  filterContainer: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  filtersRow: {
    marginTop: Spacing.sm,
  },
  filterChip: {
    backgroundColor: Colors.lightGray,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
  },
  filterTextActive: {
    color: Colors.white,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  countText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    marginTop: Spacing.sm,
  },
  challengeCard: {
    marginBottom: Spacing.md,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  categoryBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },
  actionTypeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  actionTypeText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
  },
  challengeName: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  challengeDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: 2,
  },
  beginnerBadge: {
    backgroundColor: Colors.success + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  beginnerText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.success,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
