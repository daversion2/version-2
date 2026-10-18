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
//   rows      what needs you today: app habits first, then due today, then
//             behind this week
//   weekRows  habits with nothing owed today ("N more this week")
//   doneRows  logged today, or the week's target already met ("N done")
//
// A section with no habits at all is dropped — no empty headings.
// Pure: the screen passes in how to classify a habit.
// =============================================================================

/**
 * app     — linked to a mini-app; the row opens the app
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
  rows: TodayRow[];
  weekRows: TodayRow[];
  doneRows: TodayRow[];
  /** Nothing left to do today (rows is empty). */
  allDone: boolean;
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
  const views: Record<HabitSectionId, TodaySectionView> = {
    mind: { id: 'mind', rows: [], weekRows: [], doneRows: [], allDone: true },
    movement: { id: 'movement', rows: [], weekRows: [], doneRows: [], allDone: true },
    meals: { id: 'meals', rows: [], weekRows: [], doneRows: [], allDone: true },
  };
  const appRows: Record<HabitSectionId, TodayRow[]> = { mind: [], movement: [], meals: [] };

  // `paces` arrives sorted by pace (buildTodayList), and push keeps that order.
  for (const pace of paces) {
    const c = classify(pace.habitId);
    if (!c) continue;
    const row: TodayRow = { habitId: pace.habitId, kind: c.kind, appId: c.appId, pace };
    const view = views[c.section];
    const status = sectionFor(pace);
    if (status === 'done') view.doneRows.push(row);
    // An app is the section's anchor: it stays on top even on a day it isn't owed.
    else if (c.kind === 'app') appRows[c.section].push(row);
    else if (status === 'open') view.weekRows.push(row);
    else view.rows.push(row);
  }

  return HABIT_SECTIONS.map((s) => {
    const v = views[s.id];
    const rows = [...appRows[s.id], ...v.rows];
    return { ...v, rows, allDone: rows.length === 0 };
  }).filter((v) => v.rows.length + v.weekRows.length + v.doneRows.length > 0);
};
