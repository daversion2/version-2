import { HabitPace, sectionFor } from './habitPace';
import { HABIT_SECTIONS, HabitSectionId } from '../data/habitSections';
import type { MiniAppId } from './miniApps';

// =============================================================================
// TODAY SECTIONS — Mind, Movement, Meals.
//
// Each section is one card of rows, built from the same pace list the old
// Today used (habitPace.buildTodayList), so "due", "behind" and "done" mean
// exactly what they meant before. What changed is what is shown:
//
//   apps      the section's app (Meditate, Workouts, Meals) — always shown,
//             whatever its status: the apps are the main thing, habits
//             support underneath (services/appCheckins.ts)
//   rows      habits that need you today: due today, then behind this week
//   weekRows  habits with nothing owed today ("N more this week")
//   doneRows  logged today, or the week's target already met ("N done")
//
// A section with no app and no habits is dropped — no empty headings.
// Pure: the screen passes in how to classify a habit.
// =============================================================================

/**
 * app     — the section's app (an `app:<id>` check-in habit); its card opens the app
 * plain   — the row opens the quick sheet
 *
 * There was a third, 'guided' (a habit with a briefing opened the briefing,
 * then the full capture). The founder found it slowed down exactly the habits
 * people log most, so it went on 2026-10-18; briefings live on the habit page.
 */
export type TodayRowKind = 'app' | 'plain';

export interface TodayRow {
  habitId: string;
  kind: TodayRowKind;
  appId?: MiniAppId;
  pace: HabitPace;
}

export interface TodaySectionView {
  id: HabitSectionId;
  /** The section's app card(s), always first. */
  apps: TodayRow[];
  rows: TodayRow[];
  weekRows: TodayRow[];
  doneRows: TodayRow[];
  /** No habit left to do today (rows is empty). Apps say their own state. */
  allDone: boolean;
  /** No habits at all under the app — the card shows an "Add a habit" link. */
  noHabits: boolean;
}

export interface RowClass {
  section: HabitSectionId;
  kind: TodayRowKind;
  appId?: MiniAppId;
}

export const buildTodaySectionViews = (
  paces: HabitPace[],
  classify: (habitId: string) => RowClass | null
): TodaySectionView[] => {
  const empty = (id: HabitSectionId): TodaySectionView => ({
    id,
    apps: [],
    rows: [],
    weekRows: [],
    doneRows: [],
    allDone: true,
    noHabits: true,
  });
  const views: Record<HabitSectionId, TodaySectionView> = {
    mind: empty('mind'),
    movement: empty('movement'),
    meals: empty('meals'),
  };
  const appRows: Record<HabitSectionId, TodayRow[]> = { mind: [], movement: [], meals: [] };

  // `paces` arrives sorted by pace (buildTodayList), and push keeps that order.
  for (const pace of paces) {
    const c = classify(pace.habitId);
    if (!c) continue;
    const row: TodayRow = { habitId: pace.habitId, kind: c.kind, appId: c.appId, pace };
    const view = views[c.section];
    const status = sectionFor(pace);
    // An app is the section's anchor: always on top, whatever its status.
    if (c.kind === 'app') appRows[c.section].push(row);
    else if (status === 'done') view.doneRows.push(row);
    else if (status === 'open') view.weekRows.push(row);
    else view.rows.push(row);
  }

  return HABIT_SECTIONS.map((s) => {
    const v = views[s.id];
    const habitCount = v.rows.length + v.weekRows.length + v.doneRows.length;
    return { ...v, apps: appRows[s.id], allDone: v.rows.length === 0, noHabits: habitCount === 0 };
  }).filter((v) => v.apps.length + v.rows.length + v.weekRows.length + v.doneRows.length > 0);
};
