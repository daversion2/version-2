import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { useAuth } from '../../context/AuthContext';
import { getChallengeById } from '../../services/challenges';
import { getUserCategories } from '../../services/categories';
import { Challenge, Category } from '../../types';

type Props = NativeStackScreenProps<any, 'ChallengeDetail'>;

export const ChallengeDetailScreen: React.FC<Props> = ({ route }) => {
  const { challengeId } = route.params as { challengeId: string };
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [categoryName, setCategoryName] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      (async () => {
        const c = await getChallengeById(user.uid, challengeId);
        setChallenge(c);
        if (c) {
          const cats = await getUserCategories(user.uid);
          const cat = cats.find((ct: Category) => ct.id === c.category_id);
          setCategoryName(cat?.name || 'Unknown');
        }
      })();
    }, [user, challengeId])
  );

  if (!challenge) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Loading...</Text>
      </View>
    );
  }

  const statusColor = challenge.status === 'completed' ? Colors.success : Colors.fail;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.name}>{challenge.name}</Text>

      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: statusColor }]}>
          <Text style={styles.badgeText}>
            {challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1)}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{categoryName}</Text>
        </View>
      </View>

      <Card style={styles.card}>
        <Row label="Date" value={challenge.date} />
        {challenge.completed_at && (
          <Row label="Completed" value={challenge.completed_at.split('T')[0]} />
        )}
        {challenge.deadline && (
          <Row label="Deadline" value={new Date(challenge.deadline).toLocaleDateString()} />
        )}
      </Card>

      <Card style={styles.card}>
        <Row label="Expected Difficulty" value={`${challenge.difficulty_expected} / 5`} />
        {challenge.difficulty_actual != null && (
          <Row label="Actual Difficulty" value={`${challenge.difficulty_actual} / 5`} />
        )}
        {challenge.points_awarded != null && (
          <Row label="Points Awarded" value={`${challenge.points_awarded}`} />
        )}
      </Card>

      {challenge.description ? (
        <Card style={styles.card}>
          <Text style={styles.fieldLabel}>Description</Text>
          <Text style={styles.fieldValue}>{challenge.description}</Text>
        </Card>
      ) : null}

      {challenge.success_criteria ? (
        <Card style={styles.card}>
          <Text style={styles.fieldLabel}>Success Criteria</Text>
          <Text style={styles.fieldValue}>{challenge.success_criteria}</Text>
        </Card>
      ) : null}

      {challenge.why ? (
        <Card style={styles.card}>
          <Text style={styles.fieldLabel}>Why It Matters</Text>
          <Text style={styles.fieldValue}>{challenge.why}</Text>
        </Card>
      ) : null}

      {challenge.reflection_note ? (
        <Card style={styles.card}>
          <Text style={styles.fieldLabel}>Reflection</Text>
          <Text style={styles.fieldValue}>{challenge.reflection_note}</Text>
        </Card>
      ) : null}
    </ScrollView>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontFamily: Fonts.secondary, fontSize: FontSizes.md, color: Colors.gray },
  name: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    marginBottom: Spacing.sm,
  },
  badgeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  badge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  badgeText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.white },
  card: { marginBottom: Spacing.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLabel: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray },
  rowValue: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.dark },
  fieldLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    marginBottom: Spacing.xs,
  },
  fieldValue: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
  },
});
