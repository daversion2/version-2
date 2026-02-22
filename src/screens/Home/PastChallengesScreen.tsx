import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { useAuth } from '../../context/AuthContext';
import { getPastChallenges, createChallenge, getChallengeRepeatStats } from '../../services/challenges';
import { Challenge, ChallengeRepeatStats } from '../../types';
import { showAlert } from '../../utils/alert';

type Props = NativeStackScreenProps<any, 'PastChallenges'>;

export const PastChallengesScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [repeatStatsMap, setRepeatStatsMap] = useState<Record<string, ChallengeRepeatStats>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const pastChallenges = await getPastChallenges(user.uid);
      setChallenges(pastChallenges);

      // Fetch repeat stats for unique challenge names
      const uniqueNames = [...new Set(pastChallenges.map(c => c.name))];
      const statsMap: Record<string, ChallengeRepeatStats> = {};

      await Promise.all(
        uniqueNames.map(async (name) => {
          const stats = await getChallengeRepeatStats(user.uid, name);
          if (stats) {
            statsMap[name.toLowerCase().trim()] = stats;
          }
        })
      );

      setRepeatStatsMap(statsMap);
      setLoading(false);
    })();
  }, [user]);

  const reuse = async (c: Challenge) => {
    if (!user) return;
    try {
      await createChallenge(user.uid, {
        name: c.name,
        category_id: c.category_id,
        date: new Date().toISOString().split('T')[0],
        difficulty_expected: c.difficulty_expected,
        description: c.description,
        success_criteria: c.success_criteria,
        why: c.why,
      });
      navigation.popToTop();
    } catch (e: any) {
      showAlert('Error', e.message);
    }
  };

  const renderItem = ({ item }: { item: Challenge }) => {
    const stats = repeatStatsMap[item.name.toLowerCase().trim()];
    const completionCount = stats?.total_completions || 0;

    return (
      <TouchableOpacity onPress={() => reuse(item)} activeOpacity={0.7}>
        <Card style={styles.card}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.meta}>
            {item.category_id} — Difficulty: {item.difficulty_expected}
          </Text>
          {completionCount > 0 && (
            <Text style={styles.repeatCount}>
              Completed {completionCount} time{completionCount !== 1 ? 's' : ''}
            </Text>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Past Challenges</Text>
      <Text style={styles.subtitle}>Tap to re-use as today's challenge</Text>
      {!loading && challenges.length === 0 ? (
        <Text style={styles.empty}>No past challenges yet.</Text>
      ) : (
        <FlatList
          data={challenges}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.lightGray },
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
  name: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  meta: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: Spacing.xs,
  },
  repeatCount: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.primary,
    marginTop: Spacing.xs,
  },
  empty: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
});
