import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../../types/navigation';
import type { PracticeInstance } from '../../../../types';
import type { MealsDay, MealsPrefs, MealsRules } from '../../../../types/meals';
import { DEFAULT_MEALS_PREFS } from '../../../../data/mealGroups';
import { getMealsPrefs, listMealsDays, newMealsId, saveMealsDay, saveMealsPrefs } from '../../../../services/labMeals';
import { emptyDay, rulesOf, weekDates } from '../../../../services/mealsMath';
import { finishSession, isHabitLinkedToMiniApp } from '../../../../services/miniApps';
import { getActiveHabits } from '../../../../services/practices';
import { toLocalDateString } from '../../../../utils/date';
import { showAlert } from '../../../../utils/alert';

const APP = 'meals' as const;

interface MealsContextValue {
  userId: string;
  loading: boolean;
  loadError: string | null;
  reload: () => Promise<void>;

  /** Local YYYY-MM-DD, refreshed when the app comes back to the front. */
  today: string;

  prefs: MealsPrefs;
  rules: MealsRules;
  updatePrefs: (changes: Partial<MealsPrefs>) => Promise<void>;

  /** This week's days, keyed by date. A day nobody has touched is absent. */
  days: Record<string, MealsDay>;
  dayFor: (date: string) => MealsDay;
  /**
   * Save a day. Shown at once, written in the background; a failed write puts
   * the day back and says so. Today's day always carries today's rules; a past
   * day keeps the rules it was first saved under.
   */
  saveDay: (next: MealsDay) => Promise<boolean>;
  newId: () => string;

  habits: PracticeInstance[];
  linkedHabits: PracticeInstance[];
  /** The habit whose button on Today opened the app, if one did. */
  launchHabitId?: string;

  closeApp: () => void;
  /** Close the app and hand the habit back to Today to rate and celebrate. */
  closeAndCheckOff: (habitId: string) => void;
}

const MealsContext = createContext<MealsContextValue | null>(null);

export const useMeals = (): MealsContextValue => {
  const value = useContext(MealsContext);
  if (!value) throw new Error('useMeals must be used inside MealsProvider');
  return value;
};

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export const MealsProvider: React.FC<{
  userId: string;
  launchHabitId?: string;
  rootNavigation: NativeStackNavigationProp<RootStackParamList, 'MealsApp'>;
  children: React.ReactNode;
}> = ({ userId, launchHabitId, rootNavigation, children }) => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [today, setToday] = useState(() => toLocalDateString(new Date()));
  const [prefs, setPrefs] = useState<MealsPrefs>(DEFAULT_MEALS_PREFS);
  const [days, setDays] = useState<Record<string, MealsDay>>({});
  const [habits, setHabits] = useState<PracticeInstance[]>([]);
  const daysRef = useRef(days);
  daysRef.current = days;

  // Left open past midnight, "today" has to move on with the clock.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setToday(toLocalDateString(new Date()));
    });
    return () => sub.remove();
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const week = weekDates(today);
      const [p, d, h] = await Promise.all([
        getMealsPrefs(userId),
        listMealsDays(userId, week[0], week[6]),
        getActiveHabits(userId),
      ]);
      setPrefs(p);
      setDays(d);
      setHabits(h.filter((habit) => !habit.archived_at));
    } catch (e) {
      console.warn('Meals: load failed:', e);
      setLoadError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [userId, today]);

  useEffect(() => {
    reload();
  }, [reload]);

  const rules = useMemo(() => rulesOf(prefs), [prefs]);

  const linkedHabits = useMemo(
    () => habits.filter((h) => isHabitLinkedToMiniApp(APP, h, prefs.linked_habit_ids)),
    [habits, prefs.linked_habit_ids]
  );

  const updatePrefs = useCallback(
    async (changes: Partial<MealsPrefs>) => {
      const before = prefs;
      setPrefs((p) => ({ ...p, ...changes }));
      try {
        await saveMealsPrefs(userId, changes);
      } catch (e) {
        console.warn('Meals: prefs save failed:', e);
        setPrefs(before);
        showAlert("Couldn't save that", 'Check your connection and try again.');
      }
    },
    [userId, prefs]
  );

  const dayFor = useCallback((date: string) => days[date] ?? emptyDay(date), [days]);

  const saveDay = useCallback(
    async (next: MealsDay) => {
      const before = daysRef.current[next.date];
      const withRules: MealsDay = {
        ...next,
        rules: next.date === today ? rules : (next.rules ?? before?.rules ?? rules),
      };
      setDays((d) => ({ ...d, [next.date]: withRules }));
      try {
        await saveMealsDay(userId, withRules);
        return true;
      } catch (e) {
        console.warn('Meals: day save failed:', e);
        setDays((d) => {
          const copy = { ...d };
          if (before) copy[next.date] = before;
          else delete copy[next.date];
          return copy;
        });
        showAlert("Couldn't save that", 'Check your connection and try again.');
        return false;
      }
    },
    [userId, today, rules]
  );

  const newId = useCallback(() => newMealsId(userId), [userId]);

  const closeApp = useCallback(() => rootNavigation.goBack(), [rootNavigation]);

  const closeAndCheckOff = useCallback(
    (habitId: string) => {
      finishSession({ appId: APP, habitId });
      if (launchHabitId) {
        rootNavigation.goBack();
      } else {
        // Opened from the Lab, not Today: land on Today, where the rating and
        // the celebration live. One action, so nothing runs from a closed screen.
        rootNavigation.popTo('Main', { screen: 'Home', params: { screen: 'HomeScreen', pop: true } });
      }
    },
    [rootNavigation, launchHabitId]
  );

  const value: MealsContextValue = {
    userId,
    loading,
    loadError,
    reload,
    today,
    prefs,
    rules,
    updatePrefs,
    days,
    dayFor,
    saveDay,
    newId,
    habits,
    linkedHabits,
    launchHabitId,
    closeApp,
    closeAndCheckOff,
  };

  return <MealsContext.Provider value={value}>{children}</MealsContext.Provider>;
};
