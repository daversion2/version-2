import {
  GRADE_MAX,
  GRADE_MIN,
  GRADE_VALUE_LABELS,
  gradeToNumber,
  numberToGrade,
  scaleLabel,
} from '../gradeScale';
import { HABIT_TEMPLATE_PRESETS } from '../habitTemplates';
import { HABIT_COMMITMENTS } from '../habitCommitments';

describe('the A–F vocabulary', () => {
  it('maps letters to the numbers actually stored', () => {
    expect(gradeToNumber('A')).toBe(5);
    expect(gradeToNumber('B')).toBe(4);
    expect(gradeToNumber('C')).toBe(3);
    expect(gradeToNumber('D')).toBe(2);
    expect(gradeToNumber('F')).toBe(1);
  });

  it('round-trips every letter', () => {
    (['A', 'B', 'C', 'D', 'F'] as const).forEach((g) => {
      expect(numberToGrade(gradeToNumber(g))).toBe(g);
    });
  });

  it('letters a fractional average by ordinary rounding', () => {
    expect(numberToGrade(4.3)).toBe('B');
    expect(numberToGrade(4.5)).toBe('A');
    expect(numberToGrade(2.4)).toBe('D');
  });

  it('skips E, like a school grade', () => {
    expect(Object.values(GRADE_VALUE_LABELS)).not.toContain('E');
    expect(Object.values(GRADE_VALUE_LABELS)).toEqual(['F', 'D', 'C', 'B', 'A']);
  });
});

describe('scaleLabel', () => {
  const graded = { valueLabels: GRADE_VALUE_LABELS };

  it('names each stop', () => {
    expect(scaleLabel(graded, 5)).toBe('A');
    expect(scaleLabel(graded, 3)).toBe('C');
    expect(scaleLabel(graded, 1)).toBe('F');
  });

  it('lands an average on its nearest letter', () => {
    // The Progress screen averages grades; 4.3 has to read as something.
    expect(scaleLabel(graded, 4.3)).toBe('B');
    expect(scaleLabel(graded, 4.5)).toBe('A'); // ties go up, matching numberToGrade
  });

  it('agrees with numberToGrade across the range', () => {
    // Two functions, one scale. If these ever disagree, the same rep reads as a
    // B on one screen and a C on another.
    [1, 1.4, 2.6, 3, 3.5, 4.2, 5].forEach((n) => {
      expect(scaleLabel(graded, n)).toBe(numberToGrade(n));
    });
  });

  it('clamps rather than vanishing outside the range', () => {
    expect(scaleLabel(graded, 9)).toBe('A');
    expect(scaleLabel(graded, -2)).toBe('F');
  });

  it('is null for a field with no named stops, so numbers stay numbers', () => {
    expect(scaleLabel({ valueLabels: undefined }, 42)).toBeNull();
    expect(scaleLabel(undefined, 42)).toBeNull();
  });
});

describe('the fields that grade', () => {
  const gradeTemplate = HABIT_TEMPLATE_PRESETS.find((p) => p.id === 'grade')!;

  it('stores the grade template as a number, and shows it as a letter', () => {
    const field = gradeTemplate.fields[0];
    // 'scale' keeps it numeric in Firestore, which is what lets it trend.
    expect(field.type).toBe('scale');
    expect(field.min).toBe(GRADE_MIN);
    expect(field.max).toBe(GRADE_MAX);
    expect(scaleLabel(field, 5)).toBe('A');
  });

  it('letters adherence too — it is the same question under another name', () => {
    // METRIC_FAMILIES rolls 'grade' and 'adherence' into one Grade family. If
    // only one of them were lettered, that family would show a 4 beside a B.
    (['trad-no-sugar', 'water-only'] as const).forEach((id) => {
      expect(scaleLabel(HABIT_COMMITMENTS[id].field, 4)).toBe('B');
    });
  });
});
