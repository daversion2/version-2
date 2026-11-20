import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../../types/navigation';
import type { PainDay, PainPlan, PainPrefs } from '../../../../types/pain';
import { DEFAULT_PAIN_PREFS } from '../../../../data/painPlan';
import {
  deletePainDay,
  getPainPrefs,
  listPainDays,
  listPainPlans,
  newPainPlanId,
  savePainDay,
  savePainPlan,
  savePainPrefs,
} from '../../../../services/labPain';
import { activePlan } from '../../../../services/painMath';
import { toLocalDateString } from '../../../../utils/date';
import { showAlert } from '../../../../utils/alert';

interface PainContextValue {
  userId: string;
  loading: boolean;
  loadError: string | null;
  reload: () => Promise<void>;
  /** Local YYYY-MM-DD, refreshed when the app comes back to the front. */
  today: string;

  prefs: PainPrefs;
  updatePrefs: (changes: Partial<PainPrefs>) => Promise<void>;

  /** Every check-in, any order. */
  days: PainDay[];
  /**
   * Shown at once, written in the background; a failed write puts things back
   * and says so. Resolves to whether it saved.
   */
  saveDay: (day: PainDay) => Promise<boolean>;
  deleteDay: (date: string) => Promise<void>;

  /** Every plan, any order. */
  plans: PainPlan[];
  /** The plan running now, if any. */
  plan: PainPlan | undefined;
  savePlan: (plan: PainPlan) => Promise<boolean>;
  newPlanId: () => string;

  closeApp: () => void;
}

const PainContext = createContext<PainContextValue | null>(null);

export const usePain = (): PainContextValue => {
  const value = useContext(PainContext);
  if (!value) throw new Error('usePain must be used inside PainProvider');
  return value;
};

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export const PainProvider: React.FC<{
  userId: string;
  rootNavigation: NativeStackNavigationProp<RootStackParamList, 'PainApp'>;
  children: React.ReactNode;
}> = ({ userId, rootNavigation, children }) => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [today, setToday] = useState(() => toLocalDateString(new Date()));
  const [prefs, setPrefs] = useState<PainPrefs>(DEFAULT_PAIN_PREFS);
  const [days, setDays] = useState<PainDay[]>([]);
  const daysRef = useRef(days);
  daysRef.current = days;
  const [plans, setPlans] = useState<PainPlan[]>([]);
  const plansRef = useRef(plans);
  plansRef.current = plans;

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
      const [p, d, pl] = await Promise.all([getPainPrefs(userId), listPainDays(userId), listPainPlans(userId)]);
      setPrefs(p);
      setDays(d);
      setPlans(pl);
    } catch (e) {
      console.warn('Back Pain: load failed:', e);
      setLoadError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const updatePrefs = useCallback(
    async (changes: Partial<PainPrefs>) => {
      const before = prefs;
      setPrefs((p) => ({ ...p, ...changes }));
      try {
        await savePainPrefs(userId, changes);
      } catch (e) {
        console.warn('Back Pain: prefs save failed:', e);
        setPrefs(before);
        showAlert("Couldn't save that", 'Check your connection and try again.');
      }
    },
    [userId, prefs]
  );

  const saveDay = useCallback(
    async (day: PainDay) => {
      const before = daysRef.current;
      setDays([...before.filter((d) => d.date !== day.date), day]);
      try {
        await savePainDay(userId, day);
        return true;
      } catch (e) {
        console.warn('Back Pain: check-in save failed:', e);
        setDays(before);
        showAlert("Couldn't save that", 'Check your connection and try again.');
        return false;
      }
    },
    [userId]
  );

  const deleteDay = useCallback(
    async (date: string) => {
      const before = daysRef.current;
      setDays(before.filter((d) => d.date !== date));
      try {
        await deletePainDay(userId, date);
      } catch (e) {
        console.warn('Back Pain: delete failed:', e);
        setDays(before);
        showAlert("Couldn't delete that", 'Check your connection and try again.');
      }
    },
    [userId]
  );

  const savePlan = useCallback(
    async (plan: PainPlan) => {
      const before = plansRef.current;
      setPlans([...before.filter((p) => p.id !== plan.id), plan]);
      try {
        await savePainPlan(userId, plan);
        return true;
      } catch (e) {
        console.warn('Back Pain: plan save failed:', e);
        setPlans(before);
        showAlert("Couldn't save that", 'Check your connection and try again.');
        return false;
      }
    },
    [userId]
  );

  const newPlanId = useCallback(() => newPainPlanId(userId), [userId]);
  const plan = useMemo(() => activePlan(plans), [plans]);
  const closeApp = useCallback(() => rootNavigation.goBack(), [rootNavigation]);

  const value: PainContextValue = {
    userId,
    loading,
    loadError,
    reload,
    today,
    prefs,
    updatePrefs,
    days,
    saveDay,
    deleteDay,
    plans,
    plan,
    savePlan,
    newPlanId,
    closeApp,
  };

  return <PainContext.Provider value={value}>{children}</PainContext.Provider>;
};
