import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, BorderRadius, Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { useCopy } from '../../context/CopyContext';
import type { TodayAppId } from '../../services/appCheckins';
import { ALL_APPS, GOAL_NOUNS, stepGoal, toggleApp, visibleApps } from '../../services/appSetup';
import { APP_ICONS } from '../homeDashboard/DashboardParts';

// =============================================================================
// APP SETUP PIECES — the app switches and the goal steppers. Onboarding's
// "apps" and "goals" screens use them, and so does AppGoalsSheet (the one-time
// sheet on Today, reopened from Settings), so both always look and behave the
// same. The rules (never all off, 1–7 days) are in services/appSetup.ts.
// =============================================================================

const TITLES: Record<TodayAppId, string> = { meditate: 'Meditate', workouts: 'Workouts', meals: 'Meals' };

const BLURBS: Record<TodayAppId, string> = {
  meditate: 'Timed sits, breathwork and NSDR. Your mind section.',
  workouts: 'Log lifts and runs, with phases and retests. Your movement section.',
  meals: 'Tap the food groups on each plate. The app scores the day.',
};

interface ToggleProps {
  hidden: TodayAppId[];
  onChange: (hidden: TodayAppId[]) => void;
}

/** One row per app with a switch. The last app left on can't be switched off. */
export const AppToggleList: React.FC<ToggleProps> = ({ hidden, onChange }) => {
  const t = useCopy();
  return (
    <View style={styles.list}>
      {ALL_APPS.map((id) => {
        const on = !hidden.includes(id);
        const locked = on && visibleApps(hidden).length === 1;
        return (
          <View key={id} style={[styles.card, !on && styles.cardOff]}>
            <View style={[styles.icon, { backgroundColor: AppColors[id] }]}>
              <Ionicons name={APP_ICONS[id] as never} size={20} color={Colors.white} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.title}>{t(`appSetup.title.${id}`, TITLES[id])}</Text>
              <Text style={styles.blurb}>{t(`appSetup.blurb.${id}`, BLURBS[id])}</Text>
            </View>
            <Switch
              value={on}
              disabled={locked}
              onValueChange={() => onChange(toggleApp(hidden, id))}
              trackColor={{ true: AppColors[id], false: Colors.border }}
              accessibilityLabel={t('appSetup.toggleLabel', 'Use {app}', { app: TITLES[id] })}
            />
          </View>
        );
      })}
    </View>
  );
};

interface GoalProps {
  hidden: TodayAppId[];
  goals: Record<TodayAppId, number>;
  onGoals: (goals: Record<TodayAppId, number>) => void;
  /** With these, each row also offers "Start here" (onboarding only). */
  startApp?: TodayAppId | null;
  onStartApp?: (appId: TodayAppId) => void;
}

/** A − N + stepper per app that's on, with what the number counts. */
export const AppGoalRows: React.FC<GoalProps> = ({ hidden, goals, onGoals, startApp, onStartApp }) => {
  const t = useCopy();
  const step = (id: TodayAppId, by: -1 | 1) => onGoals({ ...goals, [id]: stepGoal(goals[id], by, id) });
  return (
    <View style={styles.list}>
      {visibleApps(hidden).map((id) => {
        const isStart = startApp === id;
        const noun = t(`appSetup.noun.${id}`, GOAL_NOUNS[id]);
        return (
          <View key={id} style={[styles.card, styles.goalCard, isStart && { borderColor: AppColors[id] }]}>
            <View style={styles.goalTop}>
              <View style={[styles.icon, { backgroundColor: AppColors[id] }]}>
                <Ionicons name={APP_ICONS[id] as never} size={20} color={Colors.white} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.title}>{t(`appSetup.title.${id}`, TITLES[id])}</Text>
                <Text style={styles.blurb}>
                  {t('appSetup.goalCaption', '{n} {noun} a week', { n: goals[id], noun })}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => step(id, -1)}
                disabled={goals[id] <= 1}
                accessibilityLabel={t('appSetup.less', 'Fewer {app} days', { app: TITLES[id] })}
              >
                <Text style={[styles.stepGlyph, goals[id] <= 1 && styles.stepGlyphOff]}>−</Text>
              </TouchableOpacity>
              <Text style={styles.goalValue} accessibilityLiveRegion="polite">
                {goals[id]}
              </Text>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => step(id, 1)}
                disabled={goals[id] >= 7}
                accessibilityLabel={t('appSetup.more', 'More {app} days', { app: TITLES[id] })}
              >
                <Text style={[styles.stepGlyph, goals[id] >= 7 && styles.stepGlyphOff]}>+</Text>
              </TouchableOpacity>
            </View>
            {onStartApp && (
              <TouchableOpacity
                style={styles.startRow}
                onPress={() => onStartApp(id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: isStart }}
              >
                <Ionicons
                  name={isStart ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={isStart ? AppColors[id] : Colors.gray}
                />
                <Text style={[styles.startText, isStart && { color: AppColors[id] }]}>
                  {t('appSetup.startHere', 'Start with this one')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  list: { gap: Spacing.sm },
  flex: { flex: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  cardOff: { opacity: 0.55 },
  goalCard: { flexDirection: 'column', alignItems: 'stretch', gap: Spacing.sm },
  goalTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: Colors.dark },
  blurb: { fontFamily: Fonts.secondary, fontSize: FontSizes.xs, color: Colors.gray, lineHeight: 18 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepGlyph: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.lg, color: Colors.dark },
  stepGlyphOff: { color: Colors.border },
  goalValue: {
    fontFamily: Fonts.primaryBold,
    fontSize: FontSizes.xl,
    color: Colors.dark,
    minWidth: 24,
    textAlign: 'center',
  },
  startRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 2 },
  startText: { fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray },
});
