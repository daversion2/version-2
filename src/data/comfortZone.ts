import { ReflectionGrade } from '../types';

/**
 * The nightly question — "How far did you push past your comfort zone today?" —
 * expressed as positions relative to the edge of the comfort zone.
 *
 * The A–F letters are the STORED value and never change: reflections going back
 * to the first release are saved as letters, and the streaks, grade averages and
 * distribution chart all read them. Only the words and colours here change, which
 * is how this framing could replace two earlier ones ("alignment to purpose",
 * then "how you trained your override") without migrating a single document.
 *
 * Ordered WORST → BEST so an index doubles as a position: index 0 is deepest
 * inside the comfort zone, index 4 is furthest beyond it. The slider maps that
 * index straight to a position on its track, and the weekly radar maps it
 * straight to a radius, so the ordering is a contract both depend on.
 */
export interface ReachStop {
  grade: ReflectionGrade;
  label: string;
  color: string;
}

export const REACH_STOPS: ReachStop[] = [
  { grade: 'F', label: 'Stayed comfortable', color: '#C62828' },
  { grade: 'D', label: 'Backed off', color: '#EF6C00' },
  { grade: 'C', label: 'Touched the edge', color: '#F9A825' },
  { grade: 'B', label: 'Pushed past', color: '#558B2F' },
  { grade: 'A', label: 'Way past it', color: '#2E7D32' },
];

/**
 * The stop that IS the boundary. Two stops sit inside it and two beyond, so the
 * threshold lands dead centre of the slider — which is what lets the dashed line
 * read as a real edge rather than an arbitrary mark.
 */
export const EDGE_STOP_INDEX = 2;

/** Index into REACH_STOPS for a stored grade, or -1 if unrecognised. */
export const reachIndexOf = (grade: ReflectionGrade): number =>
  REACH_STOPS.findIndex((s) => s.grade === grade);

/**
 * Whether the day got PAST the edge, rather than merely to it. "Touched the
 * edge" is the boundary itself and deliberately does not count — the weekly
 * "days past the edge" stat would be flattering nonsense if it did.
 */
export const isPastTheEdge = (grade: ReflectionGrade): boolean =>
  reachIndexOf(grade) > EDGE_STOP_INDEX;

/** Colour per stored grade, derived so it can't drift from REACH_STOPS. */
export const GRADE_COLORS = REACH_STOPS.reduce(
  (acc, s) => ({ ...acc, [s.grade]: s.color }),
  {} as Record<ReflectionGrade, string>
);

/**
 * Single-line label per stored grade, for the places that show a saved grade
 * back to the user (history rows, the home banner, the Progress charts).
 */
export const GRADE_LABELS = REACH_STOPS.reduce(
  (acc, s) => ({ ...acc, [s.grade]: s.label }),
  {} as Record<ReflectionGrade, string>
);
