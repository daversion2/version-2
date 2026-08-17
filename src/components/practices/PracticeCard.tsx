import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, FontSizes, Spacing, BorderRadius } from '../../constants/theme';
import { PracticeInstance, HabitActionPlan } from '../../types';
import { IntensityTierDef } from '../../data/practices';

const FLAME_COLOR = '#FF7A1A';
const MAX_DOTS = 7; // weekly targets are 1–7

// The "game plan" (action plan) fields shown in the My Plan dropdown. Mirrors
// the set used on the old home habit rows.
const PLAN_LABELS: {
  key: keyof HabitActionPlan;
  label: string;
  icon: string;
  fallbackKey?: keyof HabitActionPlan;
}[] = [
  { key: 'anchor', label: 'After I…', icon: 'link-outline', fallbackKey: 'cue' },
  { key: 'pairing', label: 'Pair it with', icon: 'heart-outline' },
  { key: 'environment_change', label: 'Environment tweak', icon: 'home-outline' },
  { key: 'obstacle_plan', label: 'Obstacle plan', icon: 'shield-outline' },
  { key: 'minimum_version', label: 'Minimum version', icon: 'trending-down-outline' },
  { key: 'accountability_person', label: 'Accountability', icon: 'people-outline' },
];

/** Resolve a label's value, falling back to a legacy key (e.g. anchor → cue). */
const planValueFor = (
  plan: HabitActionPlan,
  key: keyof HabitActionPlan,
  fallbackKey?: keyof HabitActionPlan
): string | undefined => plan[key] || (fallbackKey ? plan[fallbackKey] : undefined);

interface PracticeCardProps {
  habit: PracticeInstance;
  /** Banner accent color (resolved from the catalog). */
  color: string;
  /** Intensity tier (label + flame count). */
  tier: IntensityTierDef;
  /** Ionicons name for the practice. */
  icon: string;
  /** Short "why it works" hook. */
  why: string;
  /** Completions logged this week. */
  weeklyDone: number;
  /** Whether this practice was already logged today. */
  doneToday: boolean;
  /** Primary action — start the practice (briefing → session → capture). */
  onPress: () => void;
  /**
   * "I already did it" — jump straight to logging, skipping the briefing and
   * the session beat. Most practices happen away from the phone, so this is
   * the common case, not the exception.
   */
  onLogIt: () => void;
  /**
   * "I did this on an earlier day" — same capture, opened on yesterday. Kept
   * reachable even once the card reads "Done today", because finishing today's
   * rep is unrelated to whether Saturday's is still missing.
   */
  onLogPastDay: () => void;
  /** Open the weekly-goal sheet. */
  onEditGoal: () => void;
  /** Open the game plan (HabitActionPlanScreen) to create/edit the action plan. */
  onOpenPlan: () => void;
  /**
   * Read the pre-practice briefing on its own. Omitted for practices with no
   * briefing content. Makes the briefing reachable without committing to the
   * forward flow — it's content, not a gate.
   */
  onOpenBriefing?: () => void;
}

/**
 * The home "Your Practices" card: a colored banner (per-practice), a 1–3 flame
 * intensity meter, the why-it-works hook, weekly progress dots, an editable
 * weekly-goal chip, and Log it / Start actions. See the home redesign.
 */
export const PracticeCard: React.FC<PracticeCardProps> = React.memo(
  ({
    habit,
    color,
    tier,
    icon,
    why,
    weeklyDone,
    doneToday,
    onPress,
    onLogIt,
    onLogPastDay,
    onEditGoal,
    onOpenPlan,
    onOpenBriefing,
  }) => {
    const [expanded, setExpanded] = useState(false);
    // A weekly target of 0 (or missing) means the user hasn't set a goal yet —
    // the card invites them to instead of assuming a default.
    const hasGoal = (habit.target_count_per_week || 0) >= 1;
    const target = Math.min(habit.target_count_per_week || 0, MAX_DOTS);
    const filled = Math.min(weeklyDone, target);
    const hasPlan =
      !!habit.action_plan &&
      PLAN_LABELS.some(({ key, fallbackKey }) => !!planValueFor(habit.action_plan!, key, fallbackKey));

    return (
      <View style={[styles.card, doneToday && styles.cardDone]}>
        {/* Start-press area: banner + body. The game plan sits outside this so
            tapping/expanding the plan never starts the practice. */}
        <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.cardPressed]}>
        {/* Banner — colored by the practice */}
        <View style={[styles.banner, { backgroundColor: color }]}>
          <View style={styles.meter}>
            <View style={styles.flames}>
              {[0, 1, 2].map((i) => (
                <Ionicons
                  key={i}
                  name="flame"
                  size={13}
                  color={i < tier.flames ? FLAME_COLOR : 'rgba(255,255,255,0.4)'}
                />
              ))}
            </View>
            <Text style={styles.meterLabel}>{tier.label}</Text>
          </View>

          <Text style={styles.name} numberOfLines={1}>
            {habit.name}
          </Text>

          <Ionicons name={icon as any} size={50} color="rgba(255,255,255,0.30)" style={styles.bigIcon} />
        </View>

        {/* Body */}
        <View style={styles.body}>
          {!!why && (
            <Text style={styles.why} numberOfLines={2}>
              {why}
            </Text>
          )}

          {!!onOpenBriefing && (
            <TouchableOpacity
              style={styles.briefingLink}
              onPress={onOpenBriefing}
              hitSlop={8}
              activeOpacity={0.7}
            >
              <Ionicons name="document-text-outline" size={13} color={color} />
              <Text style={[styles.briefingText, { color }]}>Read the briefing</Text>
              <Ionicons name="chevron-forward" size={12} color={color} />
            </TouchableOpacity>
          )}

          <View style={styles.foot}>
            {hasGoal ? (
              <View style={styles.progress}>
                <View style={styles.dots}>
                  {Array.from({ length: target }).map((_, i) => (
                    <View
                      key={i}
                      style={[styles.dot, i < filled && { backgroundColor: color, borderColor: color }]}
                    />
                  ))}
                </View>

                <TouchableOpacity style={styles.goalChip} onPress={onEditGoal} hitSlop={8}>
                  <Ionicons name="repeat-outline" size={13} color={Colors.gray} />
                  <Text style={styles.goalText}>
                    <Text style={[styles.goalDone, { color }]}>{weeklyDone}</Text>
                    {` of ${target}`}
                  </Text>
                  <Text style={styles.goalUnit}> / week</Text>
                  <Ionicons name="chevron-down" size={13} color={Colors.gray} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.setGoal, { borderColor: color }]}
                onPress={onEditGoal}
                hitSlop={8}
              >
                <Ionicons name="add-circle-outline" size={16} color={color} />
                <Text style={[styles.setGoalText, { color }]}>Set a goal</Text>
              </TouchableOpacity>
            )}

            {doneToday ? (
              <View style={styles.donePill}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                <Text style={styles.doneText}>Done today</Text>
              </View>
            ) : (
              <View style={styles.actions}>
                {/* Nested touchable — wins the press over the card's Start
                    Pressable, same as the goal chip above. Long-press jumps
                    straight to yesterday, the overwhelmingly common backfill. */}
                <TouchableOpacity
                  style={styles.logBtn}
                  onPress={onLogIt}
                  onLongPress={onLogPastDay}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark" size={15} color={Colors.dark} />
                  <Text style={styles.logText}>Log it</Text>
                </TouchableOpacity>

                <View style={[styles.startBtn, { backgroundColor: Colors.primary }]}>
                  <Ionicons name="play" size={14} color={Colors.white} />
                  <Text style={styles.startText}>Start</Text>
                </View>
              </View>
            )}
          </View>

          {/* Backfill. Always present: "done today" says nothing about whether
              an earlier day is still missing a rep, and this is the moment the
              user is thinking about this practice — making them find the
              Progress tab's calendar instead is how backfilling got skipped. */}
          <TouchableOpacity
            style={styles.pastDayLink}
            onPress={onLogPastDay}
            hitSlop={8}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={13} color={Colors.gray} />
            <Text style={styles.pastDayText}>Log an earlier day</Text>
          </TouchableOpacity>
        </View>
        </Pressable>

        {/* Game plan (action plan) — outside the start-press area */}
        <View style={styles.planSection}>
          {hasPlan ? (
            <>
              <View style={styles.planToggle}>
                <TouchableOpacity
                  style={styles.planToggleLeft}
                  onPress={() => setExpanded((e) => !e)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="clipboard-outline" size={14} color={Colors.primary} />
                  <Text style={styles.planToggleText}>My Plan</Text>
                  <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={onOpenPlan} hitSlop={8} activeOpacity={0.7}>
                  <Text style={styles.planEditText}>Edit</Text>
                </TouchableOpacity>
              </View>
              {expanded && (
                <View style={styles.planDropdown}>
                  {PLAN_LABELS.map(({ key, label, icon: fieldIcon, fallbackKey }) => {
                    const value = planValueFor(habit.action_plan!, key, fallbackKey);
                    if (!value) return null;
                    return (
                      <View key={key} style={styles.planItem}>
                        <Ionicons name={fieldIcon as any} size={14} color={Colors.primary} style={{ marginTop: 1 }} />
                        <View style={styles.planItemContent}>
                          <Text style={styles.planItemLabel}>{label}</Text>
                          <Text style={styles.planItemValue}>{value}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          ) : (
            <TouchableOpacity style={styles.planToggle} onPress={onOpenPlan} activeOpacity={0.7}>
              <Ionicons name="clipboard-outline" size={14} color={Colors.primary} />
              <Text style={styles.planToggleText}>Create a plan for this practice</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.lg + 4,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  cardDone: { opacity: 0.72 },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },

  banner: {
    height: 96,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md - 2,
    justifyContent: 'space-between',
  },
  meter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.24)',
    paddingVertical: 4,
    paddingLeft: 9,
    paddingRight: 11,
    borderRadius: BorderRadius.full,
  },
  flames: { flexDirection: 'row', gap: 1 },
  meterLabel: {
    fontFamily: Fonts.primaryBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.white,
  },
  name: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg + 1, color: Colors.white },
  bigIcon: { position: 'absolute', right: 10, bottom: 6 },

  body: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  why: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm - 1, color: Colors.gray, lineHeight: 19 },

  foot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: Spacing.md - 2,
  },
  progress: { gap: 6 },
  dots: { flexDirection: 'row', gap: 4 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.lightGray,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
  },
  goalText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.dark },
  goalDone: { fontFamily: Fonts.secondaryBold },
  goalUnit: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },
  setGoal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
  },
  setGoalText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm },

  briefingLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  briefingText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs },

  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  logText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.dark },

  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: BorderRadius.full,
  },
  startText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.white },
  donePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.success + '1F',
  },
  doneText: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.sm, color: Colors.success },

  pastDayLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingTop: Spacing.sm,
    paddingBottom: 2,
  },
  pastDayText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray },

  // Game plan (action plan) section
  planSection: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  planToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  planToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flex: 1 },
  planToggleText: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.primary, flex: 1 },
  planEditText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.primary },
  planDropdown: { marginTop: Spacing.sm, gap: Spacing.sm },
  planItem: { flexDirection: 'row', gap: Spacing.sm },
  planItemContent: { flex: 1 },
  planItemLabel: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.xs, color: Colors.dark, marginBottom: 1 },
  planItemValue: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, lineHeight: 18 },
});
