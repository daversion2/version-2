import type { HotColdPrefs, ThermalKind } from '../types/hotcold';

// Hot & Cold's defaults: what a first session prefills, and the settings a
// new user starts on. See docs/micro-apps/hotcold.md ("zero setup").

export const FIRST_SESSION: Record<ThermalKind, { duration_sec: number; temp_c: number }> = {
  cold: { duration_sec: 120, temp_c: 10 },
  heat: { duration_sec: 15 * 60, temp_c: 80 },
};

/** `unit` is overwritten from the phone's region on first load. */
export const DEFAULT_HOTCOLD_PREFS: HotColdPrefs = {
  unit: 'C',
  weekly_goal: 3,
  cold_target_sec: 120,
};

export const KIND_LABEL: Record<ThermalKind, string> = { cold: 'Cold', heat: 'Heat' };

export const SAFETY_LINE = 'Build up gradually. Get out if you feel dizzy, numb or unwell.';
