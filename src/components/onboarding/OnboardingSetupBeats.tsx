import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, BorderRadius, Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { FadeRise } from '../common/FadeRise';
import { Copy } from '../common/Copy';
import { useCopy } from '../../context/CopyContext';
import type { TodayAppId } from '../../services/appCheckins';
import { ALL_APPS, AppSetup } from '../../services/appSetup';
import { CLOSEOUT_TIMES, formatReminderTime } from '../../services/closeOutTimes';
import { APP_ICONS } from '../homeDashboard/DashboardParts';
import { AppGoalRows, AppToggleList } from '../appSetup/AppSetupParts';
import { ob } from './onboardingStyles';

// ============================================================================
// THE FIVE ONBOARDING SCREENS (services/onboardingSetup.ts has the order).
//
//   why       discipline is two skills, and the friction is the training
//   ratings   the two questions: override as you start, push when you finish
//   apps      the three apps, all on; switch off any you won't use
//   goals     a weekly goal each, and the app to start with
//   reminder  an evening close-out nudge, or none
//
// Presentation only. OnboardingScreen holds the setup and the reminder time
// and writes them when the last screen is done.
// ============================================================================

/** 1 — why: discipline is two skills, and the app measures both. */
export const OnboardingWhy: React.FC = () => (
  <View style={styles.center}>
    <FadeRise>
      <View style={styles.tiles} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {ALL_APPS.map((id) => (
          <View key={id} style={[styles.tile, { backgroundColor: AppColors[id] }]}>
            <Ionicons name={APP_ICONS[id] as never} size={26} color={Colors.white} />
          </View>
        ))}
      </View>
      <Copy id="onboarding.why.eyebrow" style={ob.eyebrow}>
        {'How it works'}
      </Copy>
      <Copy id="onboarding.why.headlineTwoSkills" style={ob.headline} boldStyle={ob.headlineAccent}>
        {'Discipline is **two skills.**'}
      </Copy>
    </FadeRise>
    <FadeRise delay={400}>
      <Copy id="onboarding.why.bodyTwoSkills" style={ob.body} boldStyle={ob.bodyStrong}>
        {'**Getting yourself to start**, and **pushing once you’re going.** Most apps only ask whether you did it. Neuro-Nudge measures both, across three apps: Meditate, Workouts and Meals.'}
      </Copy>
      <Copy id="onboarding.why.bodyTraining" style={ob.body} boldStyle={ob.bodyStrong}>
        {'The friction is the training. **The hard days are the ones doing the work.**'}
      </Copy>
    </FadeRise>
  </View>
);

/**
 * 2 — the two ratings: when each is asked and which way it should move. Shown,
 * not asked: the first real rating explains itself (RatingExplainer).
 */
export const OnboardingRatings: React.FC = () => (
  <View style={styles.center}>
    <FadeRise>
      <Copy id="onboarding.ratings.eyebrow" style={ob.eyebrow}>
        {'Two questions'}
      </Copy>
      <Copy id="onboarding.ratings.headline" style={ob.headline} boldStyle={ob.headlineAccent}>
        {'One as you start, **one when you finish.**'}
      </Copy>
    </FadeRise>
    <FadeRise delay={250}>
      <RatingCard
        copyKey="override"
        when="As you start · Override"
        question="How hard is it to start?"
        icon="trending-down"
        direction="Watch it fall. Starting gets easier as it becomes automatic."
      />
      <RatingCard
        copyKey="push"
        when="When you finish · Push"
        question="How hard did you push?"
        icon="trending-up"
        direction="Keep it high. Once you’re going, keep choosing hard work."
      />
    </FadeRise>
    <FadeRise delay={500}>
      <Copy id="onboarding.ratings.car" style={ob.body} boldStyle={ob.bodyStrong}>
        {'Like a car on a cold morning: your **override** is getting the engine to turn over, **push** is how hard you press the accelerator.'}
      </Copy>
      <Copy id="onboarding.ratings.helper" style={ob.helper}>
        {'Each one is 1 to 3. Be honest: a 3 is never a bad mark.'}
      </Copy>
    </FadeRise>
  </View>
);

const RatingCard: React.FC<{
  copyKey: 'override' | 'push';
  when: string;
  question: string;
  icon: 'trending-down' | 'trending-up';
  direction: string;
}> = ({ copyKey, when, question, icon, direction }) => (
  <View style={styles.ratingCard}>
    <Copy id={`onboarding.ratings.${copyKey}.when`} style={styles.ratingWhen}>
      {when}
    </Copy>
    <Copy id={`onboarding.ratings.${copyKey}.question`} style={styles.ratingQuestion}>
      {question}
    </Copy>
    <View style={styles.ratingDirection}>
      <Ionicons name={icon} size={18} color={Colors.primary} />
      <Copy id={`onboarding.ratings.${copyKey}.direction`} style={styles.ratingDirectionText}>
        {direction}
      </Copy>
    </View>
  </View>
);

/** 3 — apps. */
export const OnboardingApps: React.FC<{ hidden: TodayAppId[]; onChange: (hidden: TodayAppId[]) => void }> = ({
  hidden,
  onChange,
}) => (
  <View>
    <FadeRise>
      <Copy id="onboarding.apps.eyebrow" style={ob.eyebrow}>
        {'Your apps'}
      </Copy>
      <Copy id="onboarding.apps.headline" style={ob.headline}>
        {'Keep the ones you’ll use.'}
      </Copy>
      <Copy id="onboarding.apps.body" style={ob.body}>
        {'Each app gets its own section on Today. Switch off any you know you won’t use. Settings can bring it back.'}
      </Copy>
    </FadeRise>
    <FadeRise delay={250}>
      <AppToggleList hidden={hidden} onChange={onChange} />
    </FadeRise>
  </View>
);

/** 4 — goals, and where to start. */
export const OnboardingGoals: React.FC<{ setup: AppSetup; onChange: (setup: AppSetup) => void }> = ({
  setup,
  onChange,
}) => (
  <View>
    <FadeRise>
      <Copy id="onboarding.goals.eyebrow" style={ob.eyebrow}>
        {'Weekly goals'}
      </Copy>
      <Copy id="onboarding.goals.headline" style={ob.headline}>
        {'Start where you can win.'}
      </Copy>
      <Copy id="onboarding.goals.body" style={ob.body}>
        {'Pick numbers you can hit this week, even a slow one. Raise them once they feel easy.'}
      </Copy>
    </FadeRise>
    <FadeRise delay={250}>
      <AppGoalRows
        hidden={setup.hidden}
        goals={setup.goals}
        onGoals={(goals) => onChange({ ...setup, goals })}
        startApp={setup.startApp}
        onStartApp={(startApp) => onChange({ ...setup, startApp })}
      />
      <Copy id="onboarding.goals.helper" style={[ob.helper, styles.helperGap]}>
        {'The one you start with is your first plan on Today.'}
      </Copy>
    </FadeRise>
  </View>
);

/** 5 — the close-out reminder. Null = no reminder. */
export const OnboardingReminder: React.FC<{ time: string | null; onChange: (time: string | null) => void }> = ({
  time,
  onChange,
}) => {
  const t = useCopy();
  const options: (string | null)[] = [...CLOSEOUT_TIMES, null];
  return (
    <View style={styles.center}>
      <FadeRise>
        <Copy id="onboarding.reminder.eyebrow" style={ob.eyebrow}>
          {'One last thing'}
        </Copy>
        <Copy id="onboarding.reminder.headline" style={ob.headline}>
          {'A nudge to close out the day?'}
        </Copy>
        <Copy id="onboarding.reminder.body" style={ob.body}>
          {'Each evening, take a minute: grade the effort, then plan tomorrow’s session. A reminder helps it stick.'}
        </Copy>
      </FadeRise>
      <FadeRise delay={250}>
        <View style={styles.chips}>
          {options.map((opt) => {
            const on = opt === time;
            return (
              <TouchableOpacity
                key={opt ?? 'none'}
                style={[ob.choice, styles.chip, on && ob.choiceOn]}
                onPress={() => onChange(opt)}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {opt ? formatReminderTime(opt) : t('onboarding.reminder.none', 'No reminder')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Copy id="onboarding.reminder.helper" style={[ob.helper, styles.helperGap]}>
          {'Picking a time asks your phone for permission to notify you. You can change it in Settings.'}
        </Copy>
      </FadeRise>
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', paddingVertical: Spacing.md },
  tiles: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  tile: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.md },
  chipText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.md, color: Colors.dark },
  chipTextOn: { color: Colors.primary },
  helperGap: { marginTop: Spacing.md },
  ratingCard: {
    ...ob.choice,
    padding: Spacing.md,
    marginBottom: Spacing.sm + 4,
    gap: 4,
  },
  ratingWhen: {
    fontFamily: Fonts.secondaryBold,
    fontSize: FontSizes.xs,
    color: Colors.primary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  ratingQuestion: { fontFamily: Fonts.primaryBold, fontSize: FontSizes.lg, color: Colors.dark },
  ratingDirection: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, marginTop: 2 },
  ratingDirectionText: { flex: 1, fontFamily: Fonts.secondary, fontSize: FontSizes.sm, color: Colors.gray, lineHeight: 20 },
});
