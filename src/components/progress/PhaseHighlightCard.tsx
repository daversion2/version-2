import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { Card } from '../common/Card';
import { Copy } from '../common/Copy';
import { useCopy } from '../../context/CopyContext';
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
  const t = useCopy();
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
        <Copy
          id={highlight.phases === 1 ? 'progress.phase.eyebrow.one' : 'progress.phase.eyebrow.other'}
          style={styles.eyebrow}
          vars={{ n: highlight.phases }}
        >
          {highlight.phases === 1 ? 'Workouts · {n} phase' : 'Workouts · {n} phases'}
        </Copy>
        <Copy
          id="progress.phase.title"
          style={styles.title}
          vars={{
            name: highlight.name,
            before: formatTestValue(highlight.type, highlight.before),
            after: formatTestValue(highlight.type, highlight.after),
            month,
          }}
        >
          {'{name}: {before} → {after} since {month}'}
        </Copy>
        <Copy
          id={highlight.type === 'fastest' ? 'progress.phase.body.faster' : 'progress.phase.body.gain'}
          style={styles.body}
          vars={{
            pct: highlight.pct,
            others: highlight.others.length ? ` ${highlight.others.join(', ')}.` : '',
          }}
        >
          {highlight.type === 'fastest'
            ? '{pct}% faster on your retest.{others}'
            : '+{pct}% on your retest.{others}'}
        </Copy>
        <View style={styles.linkRow}>
          <Copy id="progress.phase.link" style={styles.link}>
            See your phases →
          </Copy>
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
