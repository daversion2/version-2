import type { CardioZone } from '../types/workouts';

// =============================================================================
// Cardio intensity by ventilatory threshold — the three-zone model.
//
// VT1 is where breathing first picks up noticeably (the end of "easy"); VT2 is
// where it turns hard and ragged and can't be held for long. Both are best
// measured in a lab, but the talk test tracks VT1 closely and needs nothing:
// full sentences = below VT1, short phrases = between, a word or two = above
// VT2. So the zone is picked by how talking felt, and a heart rate from
// Settings (if the user knows theirs) is shown alongside, never required.
//
// Toward the weekly 150 (WHO: 150 moderate or 75 vigorous minutes a week), a
// minute below VT1 counts once and a minute above it counts twice.
// =============================================================================

export interface CardioZoneInfo {
  zone: CardioZone;
  /** "Below VT1" */
  label: string;
  /** "Easy" */
  short: string;
  /** The talk test: how talking feels in this zone. */
  talk: string;
  /** Minutes toward the weekly 150 each minute here is worth. */
  weight: 1 | 2;
}

export const CARDIO_ZONES: Record<CardioZone, CardioZoneInfo> = {
  1: { zone: 1, label: 'Below VT1', short: 'Easy', talk: 'Could talk in full sentences', weight: 1 },
  2: { zone: 2, label: 'VT1 – VT2', short: 'Threshold', talk: 'Short phrases only', weight: 2 },
  3: { zone: 3, label: 'Above VT2', short: 'Hard', talk: 'A word or two at most', weight: 2 },
};

export const CARDIO_ZONE_ORDER: CardioZone[] = [1, 2, 3];

/** WHO's weekly guideline, in moderate-equivalent minutes. */
export const CARDIO_WEEKLY_GOAL_MIN = 150;
