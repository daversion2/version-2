// Avoidance Training (Lab): a short list of the things you keep putting off,
// one rep a day. Spec: docs/micro-apps/avoidance.md.

export type Level = 1 | 2 | 3;

/** users/{uid}/lab_avoidance_tasks/{id} */
export interface AvoidanceTask {
  id: string;
  text: string;
  /** ISO: when it was added. */
  created_at: string;
  /** YYYY-MM-DD, local: gives "avoided for N days". */
  created_date: string;
  /** How hard starting is expected to be — the same scale as friction. */
  forecast?: Level;
  status: 'open' | 'done';
  /** YYYY-MM-DD, local. */
  done_date?: string;
  /** ISO: orders the cleared log. */
  done_at?: string;
  /** How hard starting actually was ("How hard was it to start?"). */
  resistance?: Level;
  resistance_scale?: 3;
  /** Its id in the old users/{uid}/avoidanceTasks, when brought over. */
  imported_from?: string;
}

/** users/{uid}/lab_avoidance_prefs/main */
export interface AvoidancePrefs {
  /** Tasks cleared a week. */
  weekly_goal: number;
}

export type AvoidanceStackParamList = {
  AvoidanceHome: undefined;
  AvoidanceCleared: undefined;
  AvoidanceSettings: undefined;
};
