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
// THE FOUR ONBOARDING SCREENS (services/onboardingSetup.ts has the order).
//
//   why       the friction is the training, in one screen
//   apps      the three apps, all on; switch off any you won't use
//   goals     a weekly goal each, and the app to start with
//   reminder  an evening close-out nudge, or none
//
// Presentation only. OnboardingScreen holds the setup and the reminder time
// and writes them when the last screen is done.
// ============================================================================

/** 1 — why. Replaces the old premise / neurons / thesis screens. */
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
      <Copy id="onboarding.why.headline" style={ob.headline} boldStyle={ob.headlineAccent}>
        {'The friction is **the training.**'}
      </Copy>
    </FadeRise>
    <FadeRise delay={400}>
      <Copy id="onboarding.why.bodyTwoRatings" style={ob.body} boldStyle={ob.bodyStrong}>
        {'Three apps: Meditate, Workouts and Meals. As you start a session you rate your **override**, from 1 to 3: how hard is it to start? When you finish, you rate how hard you **pushed**.'}
      </Copy>
      <Copy id="onboarding.why.body2" style={ob.body} boldStyle={ob.bodyStrong}>
        {'The hard days are the ones doing the work. Keep showing up and you’ll watch them get easier. **That’s the capacity you’re building.**'}
      </Copy>
    </FadeRise>
  </View>
);

/** 2 — apps. */
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

/** 3 — goals, and where to start. */
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

/** 4 — the close-out reminder. Null = no reminder. */
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
});
