import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
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

  const handleInviteBuddy = (c: Challenge) => {
    if (!user) return;
    if (!user.team_id) {
      showAlert('No Team', 'Join or create a team first to invite a teammate.');
      return;
    }
    const challengeType = c.challenge_type || 'daily';
    navigation.navigate('BuddyPickPartner', {
      challengeData: {
        name: c.name,
        category_id: c.category_id,
        challenge_type: challengeType,
        difficulty_expected: c.difficulty_expected,
        ...(challengeType === 'extended' && c.duration_days ? { duration_days: c.duration_days } : {}),
        description: c.description,
        success_criteria: c.success_criteria,
        why: c.why,
      },
    });
  };

  const renderItem = ({ item }: { item: Challenge }) => {
    const stats = repeatStatsMap[item.name.toLowerCase().trim()];
    const completionCount = stats?.total_completions || 0;

    return (
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
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.reuseBtn}
            onPress={() => reuse(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.reuseBtnText}>Start Solo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.buddyBtn}
            onPress={() => handleInviteBuddy(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="people" size={14} color={Colors.primary} />
            <Text style={styles.buddyBtnText}>With Teammate</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Past Challenges</Text>
      <Text style={styles.subtitle}>Re-use a past challenge solo or with a teammate</Text>
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
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  reuseBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  reuseBtnText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.white,
  },
  buddyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  buddyBtnText: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.primary,
  },
  empty: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
});
