import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Fonts, FontSizes, Spacing } from '../../constants/theme';
import { FadeRise } from '../common/FadeRise';
import { Copy } from '../common/Copy';
import { useCopy } from '../../context/CopyContext';
import type { TodayAppId } from '../../services/appCheckins';
import { AppSetup } from '../../services/appSetup';
import { CLOSEOUT_TIMES, formatReminderTime } from '../../services/closeOutTimes';
import { AppGoalRows, AppToggleList } from '../appSetup/AppSetupParts';
import { ob } from './onboardingStyles';
import { BothFall, PredictionMeter, TwoMoments } from './OverrideIllustrations';

// ============================================================================
// THE SEVEN ONBOARDING SCREENS (services/onboardingSetup.ts has the order).
//
//   why       resistance is a prediction; acting against it is the override
//   twice     the override used twice: getting started, staying with it
//   practice  why both get easier (habit system; tenacity, learned effort)
//   ratings   the two questions that make it visible, and that both should fall
//   apps      the three apps, all on; switch off any you won't use
//   goals     a weekly goal each, and the app to start with
//   reminder  an evening close-out nudge, or none
//
// Presentation only. OnboardingScreen holds the setup and the reminder time
// and writes them when the last screen is done.
// ============================================================================

// The first four beats are the science, in order (founder's pick, 2026-11-20):
// where resistance comes from and what the override is; the two moments it's
// used; why both get easier; and the two ratings that show it. One idea per
// screen: a bold headline that carries it alone, a picture, two short lines.
// The names are the founder's: "Getting started" and "Staying with it".

/** 1 — why: resistance is a prediction, and acting against it is the override. */
export const OnboardingWhy: React.FC = () => (
  <View style={styles.center}>
    <FadeRise>
      <PredictionMeter />
      <Copy id="onboarding.science.source.eyebrow" style={ob.eyebrow}>
        {'The science'}
      </Copy>
      <Copy id="onboarding.science.source.headline" style={ob.headline} boldStyle={ob.headlineAccent}>
        {'That “I don’t want to” has **a source.**'}
      </Copy>
    </FadeRise>
    <FadeRise delay={400}>
      <Copy id="onboarding.science.source.body" style={ob.body} boldStyle={ob.bodyStrong}>
        {'Before anything hard, your brain predicts what it will cost. The resistance you feel is that prediction.'}
      </Copy>
      <Copy id="onboarding.science.source.override" style={ob.body} boldStyle={ob.bodyStrong}>
        {'You can act against it. **That’s your override.**'}
      </Copy>
    </FadeRise>
  </View>
);

/** 2 — twice: getting started, and staying with it. */
export const OnboardingTwice: React.FC = () => (
  <View style={styles.center}>
    <FadeRise>
      <TwoMoments />
      <Copy id="onboarding.science.twice.eyebrow" style={ob.eyebrow}>
        {'One skill, two moments'}
      </Copy>
      <Copy id="onboarding.science.twice.headline" style={ob.headline} boldStyle={ob.headlineAccent}>
        {'You use it **twice.**'}
      </Copy>
    </FadeRise>
    <FadeRise delay={400}>
      <Copy id="onboarding.science.twice.start" style={ob.body} boldStyle={ob.bodyStrong}>
        {'**Getting started:** overriding the urge not to begin.'}
      </Copy>
      <Copy id="onboarding.science.twice.stay" style={ob.body} boldStyle={ob.bodyStrong}>
        {'**Staying with it:** overriding the urge to stop. The “this sucks” halfway through a workout. The “I’ll stop early” in a meditation.'}
      </Copy>
    </FadeRise>
  </View>
);

/** 3 — practice: why each one gets easier. */
export const OnboardingPractice: React.FC = () => (
  <View style={styles.center}>
    <FadeRise>
      <BothFall />
      <Copy id="onboarding.science.practice.eyebrow" style={ob.eyebrow}>
        {'What practice changes'}
      </Copy>
      <Copy id="onboarding.science.practice.headline" style={ob.headline} boldStyle={ob.headlineAccent}>
        {'Both get **easier with practice.**'}
      </Copy>
    </FadeRise>
    <FadeRise delay={400}>
      <Copy id="onboarding.science.practice.start" style={ob.body} boldStyle={ob.bodyStrong}>
        {'**Getting started:** repetition hands the start to your brain’s habit system, so it takes less deciding.'}
      </Copy>
      <Copy id="onboarding.science.practice.stay" style={ob.body} boldStyle={ob.bodyStrong}>
        {'**Staying with it:** keeping going works a brain region linked to tenacity, and with practice, effort itself feels less unpleasant.'}
      </Copy>
      <Copy id="onboarding.science.practice.helper" style={ob.helper}>
        {'The region is the anterior mid-cingulate cortex. Studies find a start takes weeks to months to become automatic, so the hard days are the ones doing the work.'}
      </Copy>
    </FadeRise>
  </View>
);

/**
 * 4 — the two ratings: when each is asked, and that both should fall. Shown,
 * not asked: the first real rating explains itself (RatingExplainer).
 */
export const OnboardingRatings: React.FC = () => (
  <View style={styles.center}>
    <FadeRise>
      <Copy id="onboarding.science.ratings.eyebrow" style={ob.eyebrow}>
        {'How it’s measured'}
      </Copy>
      <Copy id="onboarding.science.ratings.headline" style={ob.headline} boldStyle={ob.headlineAccent}>
        {'Two taps make it **visible.**'}
      </Copy>
    </FadeRise>
    <FadeRise delay={250}>
      <RatingCard
        copyKey="start"
        when="As you start · Getting started"
        question="How hard is it to start?"
        color={Colors.primary}
      />
      <RatingCard
        copyKey="stay"
        when="When you finish · Staying with it"
        question="How hard was it to keep going?"
        color={Colors.secondary}
      />
    </FadeRise>
    <FadeRise delay={500}>
      <Copy id="onboarding.science.ratings.direction" style={ob.body} boldStyle={ob.bodyStrong}>
        {'**Watch both fall.** That’s your override getting stronger. Meals has no single start, so it asks once a day: how hard was it to eat this way today?'}
      </Copy>
      <Copy id="onboarding.science.ratings.helper" style={ob.helper}>
        {'Each one is 1 to 3. Be honest: a 3 is never a bad mark.'}
      </Copy>
    </FadeRise>
  </View>
);

/** A rating as it will look: the moment, the question, and its three answers. */
const RatingCard: React.FC<{
  copyKey: 'start' | 'stay';
  when: string;
  question: string;
  color: string;
}> = ({ copyKey, when, question, color }) => (
  <View style={styles.ratingCard}>
    <Copy id={`onboarding.science.ratings.${copyKey}.when`} style={[styles.ratingWhen, { color }]}>
      {when}
    </Copy>
    <Copy id={`onboarding.science.ratings.${copyKey}.question`} style={styles.ratingQuestion}>
      {question}
    </Copy>
    <View style={styles.ratingDots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[1, 2, 3].map((n) => (
        <View key={n} style={[styles.ratingDot, { borderColor: color }]}>
          <Text style={[styles.ratingDotText, { color }]}>{n}</Text>
        </View>
      ))}
      <Ionicons name="trending-down" size={18} color={color} style={styles.ratingTrend} />
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
  ratingDots: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs },
  ratingDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingDotText: { fontFamily: Fonts.secondaryBold, fontSize: FontSizes.sm },
  ratingTrend: { marginLeft: 'auto' },
});
