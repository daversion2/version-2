import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../common/Card';
import { useAuth } from '../../context/AuthContext';
import { canOpenMiniApp } from '../../services/miniApps';
import { listCustomExercises, listPhases, mergeExerciseLibrary } from '../../services/labWorkouts';
import { formatTestValue, phaseHighlight, PhaseHighlight } from '../../services/trainingPhases';
import type { RootStackParamList } from '../../types/navigation';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * The biggest gain from Workouts' training phases, in the same "growing
 * capacity" voice as the rest of Progress. Only for accounts that can open
 * Workouts, and only once a retest has improved something.
 */
export const PhaseHighlightCard: React.FC<{ refreshKey?: unknown }> = ({ refreshKey }) => {
  const { user, userProfile } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [highlight, setHighlight] = useState<PhaseHighlight | null>(null);
  const allowed = !!user && canOpenMiniApp('workouts', userProfile);

  useEffect(() => {
    if (!allowed || !user) return;
    let live = true;
    Promise.all([listPhases(user.uid), listCustomExercises(user.uid)])
      .then(([phases, custom]) => {
        if (!live) return;
        const byId = Object.fromEntries(mergeExerciseLibrary(custom).map((e) => [e.id, e]));
        setHighlight(phaseHighlight(phases, byId));
      })
      .catch((e) => console.warn('Progress: phase highlight failed:', e));
    return () => {
      live = false;
    };
  }, [allowed, user, refreshKey]);

  if (!allowed || !highlight) return null;
  const month = MONTHS[Number(highlight.since.split('-')[1]) - 1];

  return (
    <TouchableOpacity onPress={() => navigation.navigate('WorkoutsApp')} accessibilityRole="button">
      <Card style={styles.card}>
        <Text style={styles.eyebrow}>
          Workouts · {highlight.phases} {highlight.phases === 1 ? 'phase' : 'phases'}
        </Text>
        <Text style={styles.title}>
          {highlight.name}: {formatTestValue(highlight.type, highlight.before)} →{' '}
          {formatTestValue(highlight.type, highlight.after)} since {month}
        </Text>
        <Text style={styles.body}>
          {highlight.type === 'fastest' ? `${highlight.pct}% faster` : `+${highlight.pct}%`} on your retest.
          {highlight.others.length ? ` ${highlight.others.join(', ')}.` : ''}
        </Text>
        <View style={styles.linkRow}>
          <Text style={styles.link}>See your phases →</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { gap: Spacing.xs, borderWidth: 1.5, borderColor: Colors.primary + '55' },
  eyebrow: {
    fontFamily: Fonts.secondaryBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.primary,
  },
  title: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
  body: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray },
  linkRow: { marginTop: Spacing.xs },
  link: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm, color: Colors.primary },
});
