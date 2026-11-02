// Hot & Cold (Lab): cold plunges and sauna sessions, each with a time and a
// temperature. Spec: docs/micro-apps/hotcold.md.

export type ThermalKind = 'cold' | 'heat';
export type TempUnit = 'C' | 'F';

/** users/{uid}/lab_hotcold_sessions/{id} */
export interface HotColdSession {
  id: string;
  kind: ThermalKind;
  /** YYYY-MM-DD, local: the day it happened. */
  date: string;
  /** ISO: when it was saved. Orders a day's sessions. */
  logged_at: string;
  duration_sec: number;
  /** Always °C in storage, one decimal. Shown in the user's unit. */
  temp_c: number;
  /** Came from the in-app timer. */
  timed?: boolean;
  /** "How hard was it to start?" — constants/resistance.ts. */
  resistance?: 1 | 2 | 3;
  resistance_scale?: 3;
}

/** users/{uid}/lab_hotcold_prefs/main */
export interface HotColdPrefs {
  unit: TempUnit;
  /** Sessions a week, cold and heat together. */
  weekly_goal: number;
  /** Where the cold timer's bell rings. */
  cold_target_sec: number;
}

/** The in-progress timer, kept in miniAppDrafts so a killed app resumes it. */
export interface HotColdTimerDraft {
  kind: ThermalKind;
  startedAt: string;
  /** Bell time in seconds; absent = no bell. */
  targetSec?: number;
  bellId?: string;
  /**
   * Set when Done is tapped: the time to log. The draft stays until that log
   * is saved or the user chooses to discard it, so a dismissed sheet, a failed
   * save or a killed app never loses a timed session.
   */
  stoppedSec?: number;
}

export type HotColdStackParamList = {
  HotColdHome: undefined;
  HotColdTimer: { kind: ThermalKind };
  HotColdHistory: undefined;
  HotColdSettings: undefined;
};
