import {
  REACH_STOPS,
  EDGE_STOP_INDEX,
  reachIndexOf,
  isPastTheEdge,
  GRADE_COLORS,
  GRADE_LABELS,
} from '../comfortZone';
import { ReflectionGrade } from '../../types';

const ALL_GRADES: ReflectionGrade[] = ['A', 'B', 'C', 'D', 'F'];

describe('comfort zone reach scale', () => {
  it('covers every stored grade exactly once', () => {
    // A missing grade would make an old reflection unplottable; a duplicate
    // would make reachIndexOf ambiguous.
    expect(REACH_STOPS).toHaveLength(ALL_GRADES.length);
    expect([...REACH_STOPS.map((s) => s.grade)].sort()).toEqual([...ALL_GRADES].sort());
  });

  it('is ordered worst to best', () => {
    // The slider maps this index to a track position and the weekly radar maps
    // it to a radius, so the ordering is a contract, not a presentation detail.
    expect(REACH_STOPS.map((s) => s.grade)).toEqual(['F', 'D', 'C', 'B', 'A']);
  });

  it('puts the edge dead centre, with two stops either side', () => {
    expect(EDGE_STOP_INDEX).toBe(Math.floor(REACH_STOPS.length / 2));
    expect(EDGE_STOP_INDEX).toBe(REACH_STOPS.length - 1 - EDGE_STOP_INDEX);
  });

  describe('reachIndexOf', () => {
    it('returns the position of each grade', () => {
      expect(reachIndexOf('F')).toBe(0);
      expect(reachIndexOf('C')).toBe(EDGE_STOP_INDEX);
      expect(reachIndexOf('A')).toBe(REACH_STOPS.length - 1);
    });

    it('returns -1 for an unrecognised grade', () => {
      // Callers branch on >= 0 to tell "no answer" from "answered"; a silent 0
      // would plot an unlogged day as "Stayed comfortable".
      expect(reachIndexOf('E' as ReflectionGrade)).toBe(-1);
    });
  });

  describe('isPastTheEdge', () => {
    it('counts only grades beyond the boundary', () => {
      expect(isPastTheEdge('A')).toBe(true);
      expect(isPastTheEdge('B')).toBe(true);
    });

    it('does not count touching the edge as passing it', () => {
      // "Touched the edge" IS the boundary. Counting it would inflate the
      // weekly "days past the edge" stat with days that only reached it.
      expect(isPastTheEdge('C')).toBe(false);
    });

    it('does not count staying inside the zone', () => {
      expect(isPastTheEdge('D')).toBe(false);
      expect(isPastTheEdge('F')).toBe(false);
    });

    it('is false for an unrecognised grade', () => {
      expect(isPastTheEdge('E' as ReflectionGrade)).toBe(false);
    });
  });

  describe('derived lookup maps', () => {
    it('exposes a colour and label for every grade', () => {
      ALL_GRADES.forEach((g) => {
        expect(GRADE_COLORS[g]).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(GRADE_LABELS[g].length).toBeGreaterThan(0);
      });
    });

    it('stays in step with REACH_STOPS', () => {
      // Both maps are derived, so this guards the derivation rather than a
      // hand-maintained copy — the drift that this refactor removed.
      REACH_STOPS.forEach((s) => {
        expect(GRADE_COLORS[s.grade]).toBe(s.color);
        expect(GRADE_LABELS[s.grade]).toBe(s.label);
      });
    });
  });
});
