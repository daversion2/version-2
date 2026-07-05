import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../common/Card';
import { TrainingQuality } from '../../services/practiceProgress';

interface TrainingQualityCardProps {
  quality: TrainingQuality;
}

/**
 * "How hard you trained": hard moments pushed through (from the shared CBT
 * reflection's hitHardMoment) plus the share of practice reps rated
 * "challenging", compared against the previous equal-length period.
 */
export const TrainingQualityCard: React.FC<TrainingQualityCardProps> = ({ quality }) => {
  const { hardMoments, challengingPct, prevChallengingPct } = quality;

  let caption: string | null = null;
  if (challengingPct != null && prevChallengingPct != null) {
    if (challengingPct > prevChallengingPct) {
      caption = `Up from ${prevChallengingPct}% last period — you're training harder.`;
    } else if (challengingPct < prevChallengingPct) {
      caption = `Down from ${prevChallengingPct}% last period.`;
    } else {
      caption = 'Same as last period.';
    }
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>TRAINING QUALITY</Text>
      <View style={styles.heroRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="barbell" size={20} color={Colors.secondary} />
        </View>
        <View>
          <Text style={styles.heroNum}>
            {hardMoments} hard {hardMoments === 1 ? 'moment' : 'moments'}
          </Text>
          <Text style={styles.heroLabel}>pushed through this period</Text>
        </View>
      </View>

      {challengingPct != null && (
        <View style={styles.split}>
          <View style={styles.splitRow}>
            <Text style={styles.splitLabel}>Reps you rated challenging</Text>
            <Text style={styles.splitPct}>{challengingPct}%</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${challengingPct}%` }]} />
          </View>
          {caption && <Text style={styles.caption}>{caption}</Text>}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xs - 1,
    letterSpacing: 1.4,
    color: Colors.gray,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md - 4,
    marginTop: Spacing.md - 4,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF0E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroNum: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    lineHeight: 26,
  },
  heroLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
  },
  split: {
    marginTop: Spacing.md,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs + 2,
  },
  splitLabel: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.dark,
  },
  splitPct: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.lightGray,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: Colors.secondary,
  },
  caption: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: Spacing.xs + 2,
  },
});
