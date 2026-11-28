import React, { useState } from 'react';
import { Linking } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BreathPatternKey } from '../../../../../data/breathPatterns';
import type {
  GuidedRecording,
  MeditateMode,
  MeditateStackParamList,
  MeditateStyle,
  NsdrLink,
  SitTechnique,
} from '../../../../../types/meditate';
import { PastSessionSheet } from '../../../../../components/miniapps/PastSessionSheet';
import { useOverrideStart } from '../../../../../components/checkin/OverrideStartSheet';
import { newMeditateId, saveMeditateSession } from '../../../../../services/labMeditate';
import { MODE_ORDER, MODES, pastSession } from '../../../../../services/meditateMath';
import { showAlert, showChoice } from '../../../../../utils/alert';
import { withTimeout } from '../../../../../utils/withTimeout';
import { useMeditate } from '../MeditateContext';
import { MEDITATE_ACCENT } from './meditateStyle';
import { useCopy } from '../../../../../context/CopyContext';

/** What Do it starts, from the home's top card or the Create screen. */
export interface StartPlan {
  mode: MeditateMode;
  minutes: number;
  technique?: SitTechnique;
  pattern?: BreathPatternKey;
  breatheStyle?: MeditateStyle;
  nsdrLink?: NsdrLink;
  guided?: GuidedRecording;
}

/**
 * Do it and Done it, the same from every screen that offers them. Render
 * `sheets` once in the screen: the override question and the past-session sheet.
 */
export const useMeditateStart = (navigation: Pick<NativeStackNavigationProp<MeditateStackParamList>, 'navigate'>) => {
  const { begin, session, discardSession, recordFinished, closeAndCheckOff, userId } = useMeditate();
  const t = useCopy();
  // Do it asks the override first; its answer is what starts the session.
  const overrideStart = useOverrideStart('Meditate', MEDITATE_ACCENT);
  const [starting, setStarting] = useState(false);
  const [past, setPast] = useState<{ mode: MeditateMode; minutes: number } | null>(null);
  const [savingPast, setSavingPast] = useState(false);

  const resume = () =>
    navigation.navigate(
      session?.endedAt ? 'MeditateDone' : session?.style === 'guided' ? 'MeditateGuided' : 'MeditateSession'
    );

  const start = async (plan: StartPlan, override: number) => {
    setStarting(true);
    try {
      await begin({ ...plan, override });
      if (plan.guided) {
        navigation.navigate('MeditateGuided');
        return;
      }
      navigation.navigate('MeditateSession');
      if (plan.mode === 'nsdr' && plan.nsdrLink) {
        Linking.openURL(plan.nsdrLink.url).catch(() =>
          showAlert(
            t('meditate.start.openFail.title', "Couldn't open that recording"),
            t('meditate.start.openFail.message', 'The timer is running — open it yourself, or fix the link in settings.'),
          )
        );
      }
    } catch (e) {
      console.warn('Meditate: could not start:', e);
      showAlert(t('meditate.start.fail.title', "Couldn't start"), t('meditate.start.fail.message', 'Something went wrong. Try again.'));
    } finally {
      setStarting(false);
    }
  };

  /** Starting while a session is saved asks first — never silently throws it away. */
  const doIt = (plan: StartPlan) => {
    const go = () => overrideStart.ask((override) => start(plan, override));
    if (!session) return go();
    showChoice(
      t('meditate.start.open.title', 'A session is still open'),
      t('meditate.start.open.message', 'Pick it back up, or throw it away and start this one?'),
      [
      { label: t('meditate.start.open.resume', 'Resume it'), onPress: resume },
      {
        label: t('meditate.start.open.discard', 'Discard and start'),
        onPress: async () => {
          await discardSession();
          go();
        },
      },
    ]);
  };

  const doneIt = (mode: MeditateMode, minutes: number) => setPast({ mode, minutes });

  // Credit only comes through the app, so a sit done without it is entered
  // here: saved to history, then rated on Today. Gives up offline rather than
  // spinning forever, and the sheet stays open so nothing is lost.
  const logPast = async (input: { date: string; minutes: number; mode?: string }) => {
    if (savingPast) return;
    setSavingPast(true);
    const completed = pastSession({
      id: newMeditateId(userId),
      mode: (input.mode as MeditateMode) ?? 'sit',
      date: input.date,
      minutes: input.minutes,
      now: new Date(),
    });
    try {
      await withTimeout(saveMeditateSession(userId, completed), 15000);
    } catch (e) {
      console.warn('Meditate: past session not saved:', e);
      setSavingPast(false);
      showAlert(t('meditate.start.saveFail.title', "Couldn't save that session"), t('meditate.start.saveFail.message', 'Check your connection and try again.'));
      return;
    }
    setSavingPast(false);
    setPast(null);
    recordFinished(completed);
    closeAndCheckOff(completed);
  };

  const sheets = (
    <>
      <PastSessionSheet
        visible={!!past}
        accent={MEDITATE_ACCENT}
        title={t('meditate.start.doneIt', 'Done it')}
        initialMode={past?.mode}
        initialMinutes={past?.minutes}
        minutes={{ min: MODES.sit.minMin, max: MODES.sit.maxMin, step: MODES.sit.stepMin, initial: MODES.sit.defaultMin }}
        modes={MODE_ORDER.map((m) => ({
          value: m,
          label: MODES[m].label,
          minutes: { min: MODES[m].minMin, max: MODES[m].maxMin, step: MODES[m].stepMin, initial: MODES[m].defaultMin },
        }))}
        saving={savingPast}
        onCancel={() => !savingPast && setPast(null)}
        onSave={logPast}
      />
      {overrideStart.sheet}
    </>
  );

  return { starting, resume, doIt, doneIt, sheets };
};
