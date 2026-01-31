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
import { getPastChallenges, createChallenge } from '../../services/challenges';
import { Challenge } from '../../types';
import { showAlert } from '../../utils/alert';

type Props = NativeStackScreenProps<any, 'PastChallenges'>;

export const PastChallengesScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getPastChallenges(user.uid)
      .then(setChallenges)
      .finally(() => setLoading(false));
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

  const renderItem = ({ item }: { item: Challenge }) => (
    <TouchableOpacity onPress={() => reuse(item)} activeOpacity={0.7}>
      <Card style={styles.card}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>
          {item.category_id} — Difficulty: {item.difficulty_expected}
        </Text>
      </Card>
    </TouchableOpacity>
  );

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
  empty: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
});
