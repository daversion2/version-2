import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PRACTICE_GROUPS, getPracticesByGroup, Practice } from '../../data/practices';
import { PracticesNavigation } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import {
  getActiveHabits,
  getWeeklyCompletionCounts,
  createHabit,
  logHabitCompletion,
} from '../../services/habits';
import { Nudge, HabitDifficulty } from '../../types';
import { HabitCompletionModal } from '../../components/habits/HabitCompletionModal';

const PracticeCard: React.FC<{
  practice: Practice;
  color: string;
  habit?: Nudge;
  weekDone: number;
  busy: boolean;
  onOpen: () => void;
  onAdopt: () => void;
  onCheckoff: () => void;
}> = ({ practice, color, habit, weekDone, busy, onOpen, onAdopt, onCheckoff }) => {
  const adopted = !!habit;
  const target = habit?.target_count_per_week ?? practice.suggested_target_per_week;
  const complete = adopted && weekDone >= target;

  return (
    <TouchableOpacity style={styles.card} onPress={onOpen} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: color + '1A' }]}>
          <Ionicons name={practice.icon as any} size={20} color={color} />
        </View>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle}>{practice.name}</Text>
          <Text style={styles.cardTarget}>
            {adopted ? `${weekDone}/${target} this week` : `${target}×/week`}
          </Text>
        </View>

        {!adopted ? (
          <TouchableOpacity
            style={[styles.addBtn, { borderColor: color }]}
            onPress={onAdopt}
            disabled={busy}
            activeOpacity={0.7}
          >
            {busy ? (
              <ActivityIndicator size="small" color={color} />
            ) : (
              <>
                <Ionicons name="add" size={16} color={color} />
                <Text style={[styles.addBtnText, { color }]}>Add</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.checkBtn, complete ? { backgroundColor: Colors.success } : { backgroundColor: color }]}
            onPress={onCheckoff}
            activeOpacity={0.8}
          >
            <Ionicons name={complete ? 'checkmark' : 'add'} size={20} color={Colors.white} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.cardDesc}>{practice.description}</Text>
      <View style={styles.learnRow}>
        <Text style={[styles.learnLink, { color }]}>Learn how & why</Text>
        <Ionicons name="chevron-forward" size={14} color={color} />
      </View>
      {!practice.core && practice.optional_reason && (
        <Text style={styles.optionalReason}>{practice.optional_reason}</Text>
      )}
    </TouchableOpacity>
  );
};

export const PracticesScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<PracticesNavigation>();
  const [habits, setHabits] = useState<Nudge[]>([]);
  const [weekly, setWeekly] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [completing, setCompleting] = useState<Nudge | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [hs, counts] = await Promise.all([
        getActiveHabits(user.uid),
        getWeeklyCompletionCounts(user.uid),
      ]);
      setHabits(hs);
      setWeekly(counts);
    } catch (err) {
      console.warn('Failed to load practices:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const habitForPractice = (practice: Practice): Nudge | undefined =>
    habits.find((h) => h.practice_id === practice.id) ||
    habits.find((h) => h.name.trim().toLowerCase() === practice.name.toLowerCase());

  const handleAdopt = async (practice: Practice) => {
    if (!user) return;
    setBusyId(practice.id);
    try {
      await createHabit(user.uid, {
        name: practice.name,
        target_count_per_week: practice.suggested_target_per_week,
        practice_id: practice.id,
        created_by_user: false,
      });
      await load();
    } catch (err) {
      console.warn('Failed to adopt practice:', err);
    } finally {
      setBusyId(null);
    }
  };

  const handleSubmitCompletion = async (difficulty: HabitDifficulty, notes?: string) => {
    const habit = completing;
    setCompleting(null);
    if (!user || !habit) return;
    try {
      await logHabitCompletion(user.uid, habit.id, difficulty, undefined, notes);
      await load();
    } catch (err) {
      console.warn('Failed to log practice:', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          Your daily training. Add a practice to start tracking it, then check it off as you go.
        </Text>

        {PRACTICE_GROUPS.map((group) => (
          <View key={group.id} style={styles.group}>
            <View style={styles.groupHeader}>
              <View style={[styles.groupDot, { backgroundColor: group.color }]} />
              <Text style={styles.groupName}>{group.name}</Text>
            </View>
            <Text style={styles.groupDesc}>{group.description}</Text>
            {getPracticesByGroup(group.id).map((practice) => {
              const habit = habitForPractice(practice);
              return (
                <PracticeCard
                  key={practice.id}
                  practice={practice}
                  color={group.color}
                  habit={habit}
                  weekDone={habit ? weekly[habit.id] ?? 0 : 0}
                  busy={busyId === practice.id}
                  onOpen={() => navigation.navigate('PracticeDetail', { practiceId: practice.id })}
                  onAdopt={() => handleAdopt(practice)}
                  onCheckoff={() => habit && setCompleting(habit)}
                />
              );
            })}
          </View>
        ))}
      </ScrollView>

      <HabitCompletionModal
        visible={!!completing}
        habitName={completing?.name ?? ''}
        actionPlan={completing?.action_plan}
        onSubmit={handleSubmitCompletion}
        onCancel={() => setCompleting(null)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.lightGray },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.lightGray },
  intro: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginBottom: Spacing.lg,
  },
  group: { marginBottom: Spacing.xl },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  groupDot: { width: 12, height: 12, borderRadius: 6 },
  groupName: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.xl, color: Colors.dark },
  groupDesc: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.sm,
    color: Colors.gray,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cardTitleWrap: { flex: 1 },
  cardTitle: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.md, color: Colors.dark },
  cardTarget: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, marginTop: 1 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    minWidth: 64,
    justifyContent: 'center',
  },
  addBtnText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs },
  checkBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cardDesc: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.dark, marginTop: Spacing.sm },
  learnRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: Spacing.sm },
  learnLink: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs },
  optionalReason: {
    fontFamily: Fonts.secondary,
    fontSize: FontSizes.xs,
    color: Colors.secondary,
    marginTop: Spacing.xs,
  },
});
