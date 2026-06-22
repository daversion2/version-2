import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { getArenaAdoption, ArenaAdoption } from '../../services/arenaTelemetry';
import { getArenaProgress, ArenaProgress } from '../../services/arenaProgress';
import { getWillpowerStats } from '../../services/willpower';

const pct = (n: number, d: number) => (d === 0 ? 0 : Math.round((n / d) * 100));

/**
 * Phase 3.4 telemetry — per-account adoption signal that gates Phase 4.
 * (Reads the signed-in account only; cross-user aggregate would need a Cloud Function.)
 */
export const AdminArenaAdoptionScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adoption, setAdoption] = useState<ArenaAdoption | null>(null);
  const [arena, setArena] = useState<ArenaProgress | null>(null);
  const [xp, setXp] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [ad, ap, wp] = await Promise.all([
        getArenaAdoption(user.uid),
        getArenaProgress(user.uid),
        getWillpowerStats(user.uid),
      ]);
      setAdoption(ad);
      setArena(ap);
      setXp(wp.totalPoints);
    } catch (err) {
      console.warn('Failed to load arena adoption:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const trainedArenas = arena?.breakdown.filter((a) => a.reps > 0).length ?? 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      {/* Override Score vs XP */}
      <Text style={styles.sectionTitle}>Override Score vs XP</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: Colors.primary }]}>{arena?.weekScore ?? 0}</Text>
          <Text style={styles.statLabel}>Overrides / wk</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{xp}</Text>
          <Text style={styles.statLabel}>Lifetime XP</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{trainedArenas}/{arena?.breakdown.length ?? 0}</Text>
          <Text style={styles.statLabel}>Arenas trained</Text>
        </View>
      </View>
      <Text style={styles.caption}>
        Gate check: does Override Score track growth the XP number doesn't?
      </Text>

      {/* Per-arena reps */}
      <Text style={styles.sectionTitle}>Reps by arena</Text>
      <View style={styles.card}>
        {(arena?.breakdown ?? []).map((a, i) => (
          <View
            key={a.arenaId}
            style={[styles.arenaRow, i > 0 && styles.arenaRowBorder]}
          >
            <Ionicons name={a.icon as any} size={16} color={a.color} />
            <Text style={styles.arenaName}>{a.name}</Text>
            <Text style={styles.arenaReps}>
              {arena?.weekByArena[a.arenaId] ?? 0} this wk · {a.reps} all-time
            </Text>
          </View>
        ))}
      </View>

      {/* Tagging density */}
      <Text style={styles.sectionTitle}>Arena tagging (picker adoption)</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: Colors.primary }]}>
            {pct(adoption?.challenges.storedArena ?? 0, adoption?.challenges.total ?? 0)}%
          </Text>
          <Text style={styles.statLabel}>
            Challenges stored ({adoption?.challenges.storedArena ?? 0}/{adoption?.challenges.total ?? 0})
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: Colors.primary }]}>
            {pct(adoption?.habits.storedArena ?? 0, adoption?.habits.total ?? 0)}%
          </Text>
          <Text style={styles.statLabel}>
            Habits stored ({adoption?.habits.storedArena ?? 0}/{adoption?.habits.total ?? 0})
          </Text>
        </View>
      </View>
      <Text style={styles.caption}>
        Stored = arena set via picker/auto-derive. Resolved (incl. name match):
        challenges {pct(adoption?.challenges.resolved ?? 0, adoption?.challenges.total ?? 0)}% ·
        habits {pct(adoption?.habits.resolved ?? 0, adoption?.habits.total ?? 0)}%. Stored should
        climb toward Resolved as new items are created.
      </Text>

      {/* Baseline coverage */}
      <Text style={styles.sectionTitle}>Baseline coverage</Text>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>
            {adoption?.arenasWithBaseline ?? 0}/{adoption?.totalArenas ?? 0}
          </Text>
          <Text style={styles.statLabel}>Arenas tested</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{adoption?.baselineTests ?? 0}</Text>
          <Text style={styles.statLabel}>Baseline tests</Text>
        </View>
      </View>
      <Text style={styles.caption}>
        Discomfort Shift needs ≥2 tests per arena to show a delta.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.lightGray },
  sectionTitle: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.lg,
    color: Colors.dark,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, color: Colors.dark },
  statLabel: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, marginTop: 2, textAlign: 'center' },
  caption: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.gray,
    marginTop: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  arenaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  arenaRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  arenaName: { flex: 1, fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark },
  arenaReps: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
});
