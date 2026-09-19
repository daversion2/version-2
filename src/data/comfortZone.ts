import { ReflectionGrade } from '../types';

/**
 * The nightly question — "How hard did you push today?" — as five escalating
 * answers.
 *
 * Each label names a CHOICE, not a feeling. That distinction is the whole point:
 * rating strain would make this scale decay exactly as the app works, because
 * effort dropping is the signature of a habit forming. Someone six months in
 * whose practices have gone automatic should not be sliding toward "took the
 * easy way" every night. "Did you take the harder option when it was your call"
 * stays answerable forever; "how tired are you" does not.
 *
 * The A–F letters are the STORED value and never change: reflections going back
 * to the first release are saved as letters, and the streaks, grade averages and
 * distribution chart all read them. Only the words and colours here change, which
 * is how this framing could replace three earlier ones ("alignment to purpose",
 * "how you trained your override", then "past your comfort zone") without
 * migrating a single document.
 *
 * Ordered WORST → BEST so an index doubles as a position: index 0 is the easiest
 * day, index 4 the hardest. The slider maps that index straight to a position on
 * its track, and the weekly radar maps it straight to a radius, so the ordering
 * is a contract both depend on.
 */
export interface ReachStop {
  grade: ReflectionGrade;
  label: string;
  color: string;
}

export const REACH_STOPS: ReachStop[] = [
  { grade: 'F', label: 'Took the easy way', color: '#C62828' },
  { grade: 'D', label: 'Did the minimum', color: '#EF6C00' },
  { grade: 'C', label: 'Showed up', color: '#F9A825' },
  { grade: 'B', label: 'Pushed myself', color: '#558B2F' },
  { grade: 'A', label: 'Left nothing in the tank', color: '#2E7D32' },
];

/**
 * The middle stop. The slider no longer draws a threshold — the colour ramp and
 * the labels carry the gradient, so there is nothing left for a boundary to mean
 * — but this is still the centre index, and OnboardingThesis draws its figure
 * around it.
 *
 * `isPastTheEdge` below has no caller in app code (the weekly radar moved off the
 * nightly grade). Both are kept because onboarding imports this one and the test
 * suite pins both; retire them with the onboarding rework, not before.
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
