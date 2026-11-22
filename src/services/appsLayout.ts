// =============================================================================
// TODAY'S APPS CARD (2026-11-22): the founder picked four layouts for "Your
// apps" and wants people to swipe between them, like the week card above it.
//   grid   — app icons, four to a row
//   cards  — two-column cards with a status line
//   rows   — roomy rows with an action button
//   upnext — a big card for what's next, the rest as bubbles
// Mockup: https://claude.ai/artifact/KPoxHXiUEDC9rVD7DbjBTd (options 1, 2, 4, 5).
// =============================================================================

export type AppsViewId = 'grid' | 'cards' | 'rows' | 'upnext';

export const APPS_VIEWS: { id: AppsViewId; label: string }[] = [
  { id: 'grid', label: 'Icons' },
  { id: 'cards', label: 'Cards' },
  { id: 'rows', label: 'List' },
  { id: 'upnext', label: 'Up next' },
];

export const appsViewOf = (stored: string | null | undefined): AppsViewId =>
  APPS_VIEWS.find((v) => v.id === stored)?.id ?? 'grid';

/** One app on Today's apps card. */
export interface TodayAppItem {
  id: string;
  title: string;
  /** For tight spots (the icon grid): "Close out", "Cravings". */
  short: string;
  color: string;
  /** Ionicons name. */
  icon: string;
  /** One line of status: "2 of 3 this week", "Tonight". */
  note: string;
  /** Used today. */
  done: boolean;
  /** Last night's plan names it, and it isn't done yet. */
  plan: boolean;
  /** The button word on the rows layout: Start, Log, Ride… */
  action: string;
}

/** The button word for each app on the rows layout. */
export const APP_ACTIONS: Record<string, string> = {
  meditate: 'Start',
  workouts: 'Start',
  meals: 'Log',
  nightly: 'Open',
  craving: 'Ride',
  hotcold: 'Log',
  avoidance: 'Face it',
};

/** The rows order: the plan first, then what's left to do, then what's done today. */
export const actionOrder = (items: readonly TodayAppItem[]): TodayAppItem[] => [
  ...items.filter((i) => i.plan && !i.done),
  ...items.filter((i) => !i.plan && !i.done),
  ...items.filter((i) => i.done),
];

/**
 * Up next: the planned app if it isn't done, else the first app not done
 * today; null when everything is done. The rest keep their order.
 */
export const upNext = (items: readonly TodayAppItem[]): { next: TodayAppItem | null; rest: TodayAppItem[] } => {
  const next = items.find((i) => i.plan && !i.done) ?? items.find((i) => !i.done) ?? null;
  return { next, rest: items.filter((i) => i !== next) };
};
