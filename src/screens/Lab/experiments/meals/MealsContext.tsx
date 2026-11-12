import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../../types/navigation';
import type { PracticeInstance } from '../../../../types';
import type { MealsDay, MealsModel, MealsPrefs, MealsRules } from '../../../../types/meals';
import { BUILT_IN_MEALS_MODEL, DEFAULT_MEALS_PREFS } from '../../../../data/mealGroups';
import { getMealsPrefs, listMealsDays, newMealsId, saveMealsDay, saveMealsPrefs } from '../../../../services/labMeals';
import { getMealsModelWithTimeout } from '../../../../services/mealsModel';
import { addDays } from '../../../../services/habitSchedule';
import { emptyDay, handoffDate, mergeCustomGroups, rulesOf, weekDates } from '../../../../services/mealsMath';
import { finishSession } from '../../../../services/miniApps';
import { getActiveHabits } from '../../../../services/practices';
import { toLocalDateString } from '../../../../utils/date';
import { showAlert } from '../../../../utils/alert';

const APP = 'meals' as const;
/** How far back Past weeks looks. */
const RECENT_WEEKS = 4;

interface MealsContextValue {
  userId: string;
  loading: boolean;
  loadError: string | null;
  reload: () => Promise<void>;

  /** Local YYYY-MM-DD, refreshed when the app comes back to the front. */
  today: string;

  prefs: MealsPrefs;
  /** What chip scores are worked out from: the one an admin saved, or the built-in one. */
  model: MealsModel;
  rules: MealsRules;
  updatePrefs: (changes: Partial<MealsPrefs>) => Promise<void>;

  /** This week's days, keyed by date. A day nobody has touched is absent. */
  days: Record<string, MealsDay>;
  dayFor: (date: string) => MealsDay;
  /** The four weeks before this one, keyed by date. Read-only: for past weeks. */
  pastDays: Record<string, MealsDay>;
  /**
   * Save a day. Shown at once, written in the background; a failed write puts
   * the day back and says so. Today's day always carries today's rules; a past
   * day keeps the rules it was first saved under.
   */
  saveDay: (next: MealsDay) => Promise<boolean>;
  newId: () => string;

  habits: PracticeInstance[];
  /** The habit whose button on Today opened the app, if one did. */
  launchHabitId?: string;

  closeApp: () => void;
  /**
   * Close the app and hand the closed day back to Today, which rates it as
   * the Meals check-in (services/appCheckins.ts) — for that day, even when the
   * clock has passed midnight since.
   */
  closeAndCheckOff: (date: string, onTarget: boolean) => void;
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
  const [model, setModel] = useState<MealsModel>(BUILT_IN_MEALS_MODEL);
  const [days, setDays] = useState<Record<string, MealsDay>>({});
  // Before this week: read once per load, never edited here.
  const [pastDays, setPastDays] = useState<Record<string, MealsDay>>({});
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
      const [p, d, h, past, m] = await Promise.all([
        getMealsPrefs(userId),
        listMealsDays(userId, week[0], week[6]),
        getActiveHabits(userId),
        // Only feeds Past weeks, so a failure here mustn't block the app.
        listMealsDays(userId, addDays(week[0], -RECENT_WEEKS * 7), addDays(week[0], -1)).catch(
          () => ({}) as Record<string, MealsDay>
        ),
        // Never fails: a missing or slow model is the built-in one.
        getMealsModelWithTimeout(),
      ]);
      setPrefs(p);
      setModel(m);
      setDays(d);
      setPastDays(past);
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

  const rules = useMemo(() => rulesOf(prefs, model), [prefs, model]);


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
      const kept = next.rules ?? before?.rules;
      // A past day keeps its rules, but learns any of your foods it didn't
      // know yet — one may have just been logged on it.
      const pastRules = kept && {
        ...kept,
        custom_groups: mergeCustomGroups(kept.custom_groups, rules.custom_groups),
      };
      const withRules: MealsDay = {
        ...next,
        rules: next.date === today ? rules : (pastRules ?? rules),
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
    (date: string, onTarget: boolean) => {
      const forDay = handoffDate(date, new Date());
      finishSession({ appId: APP, onTarget, ...(forDay ? { date: forDay } : {}) });
      // Land on Today, where the rating and the celebration live — from its
      // card or from the Lab alike. One action, so nothing runs from a closed screen.
      rootNavigation.popTo('Main', { screen: 'Home', params: { screen: 'HomeScreen', pop: true } });
    },
    [rootNavigation]
  );

  const value: MealsContextValue = {
    userId,
    loading,
    loadError,
    reload,
    today,
    prefs,
    model,
    rules,
    updatePrefs,
    days,
    dayFor,
    pastDays,
    saveDay,
    newId,
    habits,
    launchHabitId,
    closeApp,
    closeAndCheckOff,
  };

  return <MealsContext.Provider value={value}>{children}</MealsContext.Provider>;
};
