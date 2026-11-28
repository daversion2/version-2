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
import { EffortAdds, PredictionMeter, TwoMoments } from './OverrideIllustrations';
import { isTodayAppHidden } from '../../services/hiddenApps';

// ============================================================================
// THE SEVEN ONBOARDING SCREENS (services/onboardingSetup.ts has the order).
//
//   why       resistance is a prediction; acting against it is the override
//   twice     the override used twice: getting started, staying with it
//   practice  the effort is the training (tenacity, learned effort)
//   ratings   the two questions that make it visible; a 3 is never a bad mark
//   apps      the three apps, all on; switch off any you won't use
//   goals     a weekly goal each, and the app to start with
//   reminder  an evening close-out nudge, or none
//
// Presentation only. OnboardingScreen holds the setup and the reminder time
// and writes them when the last screen is done.
// ============================================================================

// The first four beats are the science, in order (founder's pick, 2026-11-20):
// where resistance comes from and what the override is; the two moments it's
// used; why the effort itself is the training; and the two ratings that show
// it. Until 2026-11-20 screens 3–4 promised both ratings would fall; the
// founder dropped that (a few weeks is too little data, and a hard week then
// reads as failing). One idea per
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
        {'That “I don’t want to” is **the pull of comfort.**'}
      </Copy>
    </FadeRise>
    <FadeRise delay={400}>
      <Copy id="onboarding.science.source.body" style={ob.body} boldStyle={ob.bodyStrong}>
        {'Before anything hard, your brain predicts what it will cost, and you feel it as a pull toward the easy option. Your phone, feed and couch are built to make giving in automatic.'}
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

/** 3 — practice: the effort is the training, whatever it feels like. */
export const OnboardingPractice: React.FC = () => (
  <View style={styles.center}>
    <FadeRise>
      <EffortAdds />
      <Copy id="onboarding.science.effort.eyebrow" style={ob.eyebrow}>
        {'What builds it'}
      </Copy>
      <Copy id="onboarding.science.effort.headline" style={ob.headline} boldStyle={ob.headlineAccent}>
        {'The effort **is the training.**'}
      </Copy>
    </FadeRise>
    <FadeRise delay={400}>
      <Copy id="onboarding.science.effort.start" style={ob.body} boldStyle={ob.bodyStrong}>
        {'**Getting started:** each time you begin when you’d rather not, that’s an override.'}
      </Copy>
      <Copy id="onboarding.science.effort.stay" style={ob.body} boldStyle={ob.bodyStrong}>
        {'**Staying with it:** research links a brain region to persistence, and rewarding effort builds tenacity.'}
      </Copy>
      <Copy id="onboarding.science.effort.helper" style={ob.helper}>
        {'The region is the anterior mid-cingulate cortex (aMCC). Some days will feel easy and some won’t. Both count, and the hard ones count more.'}
      </Copy>
    </FadeRise>
  </View>
);

/**
 * 4 — the two ratings: when each is asked, and that a 3 is never a bad mark. Shown,
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
      {/* Two keys so an edit that mentions Meals can't show while Meals is hidden (services/hiddenApps.ts). */}
      {isTodayAppHidden('meals') ? (
        <Copy id="onboarding.science.ratings.effortNoMeals" style={ob.body} boldStyle={ob.bodyStrong}>
          {'**Every tap is a session you did anyway.** Your XP adds up what they cost, and it only goes up.'}
        </Copy>
      ) : (
        <Copy id="onboarding.science.ratings.effort" style={ob.body} boldStyle={ob.bodyStrong}>
          {'**Every tap is a session you did anyway.** Your XP adds up what they cost, and it only goes up. Meals has no single start, so it asks once a day: how hard was it to eat this way today?'}
        </Copy>
      )}
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
        {'Pick numbers you can hit on a slow week. Most of the time is the goal, not every time.'}
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
});
