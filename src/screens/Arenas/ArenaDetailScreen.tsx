import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { getArena, BaselineUnit } from '../../constants/arenas';
import { getArenaProgress, ArenaStat } from '../../services/arenaProgress';
import { getDiscomfortShift, DiscomfortShift } from '../../services/arenaBaselines';
import { ProgressScreenProps, ProgressNavigation } from '../../types/navigation';

type Props = ProgressScreenProps<'ArenaDetail'>;

// -----------------------------------------------------------------------------
// Baseline value formatting (interpreted by the arena's unit).
//   duration   -> seconds held               -> "2:05" (mm:ss)
//   rating     -> stress reduction (before-after) -> "−3 stress"
//   completion -> urge intensity faced 1-5    -> "urge 4/5"
// -----------------------------------------------------------------------------
const formatDuration = (totalSeconds: number): string => {
  const s = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const formatBaselineValue = (value: number, unit: BaselineUnit): string => {
  switch (unit) {
    case 'duration':
      return formatDuration(value);
    case 'rating':
      // value is a reduction (before − after); show it as a negative stress delta
      return `−${value} stress`;
    case 'completion':
      return `urge ${value}/5`;
    default:
      return `${value}`;
  }
};

export const ArenaDetailScreen: React.FC<Props> = ({ route }) => {
  const { arenaId } = route.params;
  const { user } = useAuth();
  const navigation = useNavigation<ProgressNavigation>();

  const arena = getArena(arenaId);

  const [loading, setLoading] = useState(true);
  const [stat, setStat] = useState<ArenaStat | null>(null);
  const [weekReps, setWeekReps] = useState(0);
  const [shift, setShift] = useState<DiscomfortShift | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user || !arena) return;
      let active = true;
      (async () => {
        setLoading(true);
        try {
          const [progress, discomfort] = await Promise.all([
            getArenaProgress(user.uid),
            getDiscomfortShift(user.uid, arenaId, arena.baselineUnit),
          ]);
          if (!active) return;
          setStat(progress.breakdown.find((s) => s.arenaId === arenaId) ?? null);
          setWeekReps(progress.weekByArena[arenaId] ?? 0);
          setShift(discomfort);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [user, arena, arenaId])
  );

  // Unknown / missing arena fallback
  if (!arena) {
    return (
      <View style={styles.center}>
        <Ionicons name="help-circle-outline" size={40} color={Colors.gray} />
        <Text style={styles.notFoundText}>Arena not found</Text>
      </View>
    );
  }

  const allTimeReps = stat?.reps ?? 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: arena.color + '1A' }]}>
          <Ionicons name={arena.icon as any} size={30} color={arena.color} />
        </View>
        <Text style={styles.name}>{arena.name}</Text>
        {arena.subtitle ? <Text style={styles.subtitle}>{arena.subtitle}</Text> : null}
        <Text style={styles.stopSignal}>"{arena.stopSignal}"</Text>
        <Text style={styles.neuroscience}>{arena.neuroscience}</Text>
      </View>

      {/* Override reps */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Override reps</Text>
        <Text style={styles.sectionSubtitle}>
          Times you overrode the stop signal in this arena.
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text style={[styles.statValue, { color: arena.color }]}>{allTimeReps}</Text>
            <Text style={styles.statLabel}>All time</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBlock}>
            <Text style={[styles.statValue, { color: arena.color }]}>{weekReps}</Text>
            <Text style={styles.statLabel}>This week</Text>
          </View>
        </View>
      </Card>

      {/* Discomfort Shift */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Discomfort Shift</Text>
        <Text style={styles.sectionSubtitle}>{arena.baselineMetric}</Text>

        {loading && shift === null ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={arena.color} />
          </View>
        ) : shift && shift.count === 0 ? (
          <>
            <Text style={styles.emptyShift}>
              No baseline yet. Take one to start tracking your Discomfort Shift.
            </Text>
            <Button
              title="Take baseline test"
              variant="primary"
              onPress={() => navigation.navigate('BaselineTest', { arenaId })}
              style={styles.baselineButton}
            />
          </>
        ) : shift ? (
          <>
            {/* Latest baseline */}
            <View style={styles.latestRow}>
              <Text style={styles.latestLabel}>Latest</Text>
              <Text style={[styles.latestValue, { color: arena.color }]}>
                {formatBaselineValue(shift.latest ?? 0, arena.baselineUnit)}
              </Text>
            </View>

            {/* Trend (needs 2+ tests) */}
            {shift.count >= 2 && (
              <>
                <View style={styles.trendRow}>
                  <Text style={styles.trendValue}>
                    {formatBaselineValue(shift.first ?? 0, arena.baselineUnit)}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={14}
                    color={Colors.gray}
                    style={styles.trendArrow}
                  />
                  <Text style={styles.trendValue}>
                    {formatBaselineValue(shift.latest ?? 0, arena.baselineUnit)}
                  </Text>
                  <ShiftBadge shift={shift} />
                </View>
                <Text style={styles.trendCaption}>
                  Across {shift.count} baseline tests
                </Text>
              </>
            )}

            {shift.count === 1 && (
              <Text style={styles.trendCaption}>
                Retest later to see your shift over time.
              </Text>
            )}

            <Button
              title="Retest baseline"
              variant="secondary"
              onPress={() => navigation.navigate('BaselineTest', { arenaId })}
              style={styles.baselineButton}
            />
          </>
        ) : null}
      </Card>
    </ScrollView>
  );
};

// Direction-aware badge. `improved` already accounts for the unit's direction.
const ShiftBadge: React.FC<{ shift: DiscomfortShift }> = ({ shift }) => {
  if (shift.improved === null) return null;

  let label: string;
  if (shift.unit === 'duration') {
    label = shift.improved ? '↑ longer' : '↓ shorter';
  } else if (shift.unit === 'completion') {
    label = shift.improved ? '↓ easier' : '↑ harder';
  } else {
    // rating — bigger reduction is better
    label = shift.improved ? '↑ calmer' : '↓ less';
  }

  const color = shift.improved ? Colors.success : Colors.gray;
  return (
    <View style={[styles.shiftBadge, { backgroundColor: color + '1A' }]}>
      <Text style={[styles.shiftBadgeText, { color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    gap: Spacing.sm,
  },
  notFoundText: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
  },

  // Header
  header: { marginBottom: Spacing.lg },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  name: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
  },
  subtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: 2,
  },
  stopSignal: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.md,
    color: Colors.gray,
    fontStyle: 'italic',
    marginTop: Spacing.md,
  },
  neuroscience: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.dark,
    lineHeight: 21,
    marginTop: Spacing.sm,
  },

  // Cards
  card: { marginBottom: Spacing.md },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  sectionSubtitle: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: 2,
    marginBottom: Spacing.md,
  },

  // Override reps
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBlock: { flex: 1, alignItems: 'center' },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: Colors.border,
  },
  statValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xxl,
  },
  statLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: Spacing.xs,
  },

  // Discomfort Shift
  loadingBox: { paddingVertical: Spacing.lg, alignItems: 'center' },
  emptyShift: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    lineHeight: 20,
  },
  latestRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  latestLabel: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
  },
  latestValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  trendValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.md,
    color: Colors.dark,
  },
  trendArrow: { marginHorizontal: 2 },
  trendCaption: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: Spacing.sm,
  },
  shiftBadge: {
    marginLeft: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  shiftBadgeText: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
  },

  baselineButton: { marginTop: Spacing.lg },
});
