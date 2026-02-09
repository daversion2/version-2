import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { useAuth } from '../../context/AuthContext';
import { getLibraryChallenges } from '../../services/challengeLibrary';
import { createChallenge } from '../../services/challenges';
import { LibraryChallenge } from '../../types';
import { showAlert } from '../../utils/alert';

type Props = NativeStackScreenProps<any, 'ChallengeLibrary'>;

export const ChallengeLibraryScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<LibraryChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLibraryChallenges()
      .then(setChallenges)
      .catch((err) => {
        console.error('Failed to load challenge library:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const useChallenge = async (c: LibraryChallenge) => {
    if (!user) return;
    try {
      await createChallenge(user.uid, {
        name: c.name,
        category_id: c.category,
        date: new Date().toISOString().split('T')[0],
        difficulty_expected: c.difficulty,
        description: c.description,
        success_criteria: c.success_criteria,
        why: c.why,
      });
      navigation.popToTop();
    } catch (e: any) {
      showAlert('Error', e.message);
    }
  };

  const renderItem = ({ item }: { item: LibraryChallenge }) => (
    <TouchableOpacity onPress={() => useChallenge(item)} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
          <View style={styles.difficultyBadge}>
            <Text style={styles.difficultyText}>{item.difficulty}</Text>
          </View>
        </View>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Challenge Library</Text>
      <Text style={styles.subtitle}>
        Tap any challenge to use it as today's challenge
      </Text>

      {challenges.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Coming Soon</Text>
          <Text style={styles.emptyText}>
            The challenge library is being curated. Check back soon for example
            challenges to help inspire your willpower journey.
          </Text>
        </View>
      ) : (
        <FlatList
          data={challenges}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lightGray },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
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
  list: { padding: Spacing.lg },
  card: { marginBottom: Spacing.sm },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  name: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
    flex: 1,
  },
  difficultyBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  difficultyText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xs,
  },
  categoryText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.primary,
  },
  description: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
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
