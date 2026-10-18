// =============================================================================
// Breathing patterns, shared by the breath pacer (components/habits/
// PracticeBreathPacer) and the Meditate mini-app.
//
// Each is a sequence of phases the circle animates through, looping until the
// session length is reached. `from`/`to` are the circle's scale at the start/end
// of the phase (1 = contracted, BREATH_FULL = fully inhaled), so re-entering a
// phase (e.g. after a pause) is deterministic and jump-free. The keys match the
// breathwork habit's `technique` tracking values, so the pattern breathed can
// prefill the check-in.
// =============================================================================

/** Fully-inhaled scale of the base circle. */
export const BREATH_FULL = 2;

export type BreathPhaseKind = 'inhale' | 'hold' | 'exhale' | 'rest';

export interface BreathPhase {
  kind: BreathPhaseKind;
  label: string;
  sec: number;
  from: number;
  to: number;
}

export type BreathPatternKey = 'box' | '478' | 'sigh' | 'coherent' | 'extended';

export interface BreathPattern {
  key: BreathPatternKey;
  label: string;
  blurb: string;
  phases: BreathPhase[];
}

export const BREATH_PATTERNS: BreathPattern[] = [
  {
    key: 'box',
    label: 'Box',
    blurb: 'Inhale 4 · hold 4 · exhale 4 · hold 4',
    phases: [
      { kind: 'inhale', label: 'Breathe in', sec: 4, from: 1, to: BREATH_FULL },
      { kind: 'hold', label: 'Hold', sec: 4, from: BREATH_FULL, to: BREATH_FULL },
      { kind: 'exhale', label: 'Breathe out', sec: 4, from: BREATH_FULL, to: 1 },
      { kind: 'hold', label: 'Hold', sec: 4, from: 1, to: 1 },
    ],
  },
  {
    key: '478',
    label: '4-7-8',
    blurb: 'Inhale 4 · hold 7 · exhale 8',
    phases: [
      { kind: 'inhale', label: 'Breathe in', sec: 4, from: 1, to: BREATH_FULL },
      { kind: 'hold', label: 'Hold', sec: 7, from: BREATH_FULL, to: BREATH_FULL },
      { kind: 'exhale', label: 'Breathe out', sec: 8, from: BREATH_FULL, to: 1 },
    ],
  },
  {
    key: 'sigh',
    label: 'Physiological sigh',
    blurb: 'Two inhales · one long exhale',
    phases: [
      { kind: 'inhale', label: 'Breathe in', sec: 2, from: 1, to: 1.7 },
      { kind: 'inhale', label: 'Top up', sec: 1, from: 1.7, to: BREATH_FULL },
      { kind: 'exhale', label: 'Long exhale', sec: 6, from: BREATH_FULL, to: 1 },
      { kind: 'rest', label: 'Rest', sec: 1, from: 1, to: 1 },
    ],
  },
  {
    key: 'coherent',
    label: 'Coherent',
    blurb: 'Inhale 6 · exhale 6',
    phases: [
      { kind: 'inhale', label: 'Breathe in', sec: 6, from: 1, to: BREATH_FULL },
      { kind: 'exhale', label: 'Breathe out', sec: 6, from: BREATH_FULL, to: 1 },
    ],
  },
  {
    key: 'extended',
    label: 'Extended exhale',
    blurb: 'Inhale 4 · exhale 8',
    phases: [
      { kind: 'inhale', label: 'Breathe in', sec: 4, from: 1, to: BREATH_FULL },
      { kind: 'exhale', label: 'Long exhale', sec: 8, from: BREATH_FULL, to: 1 },
    ],
  },
];

/** Never undefined — an unknown key falls back to Box. */
export const getBreathPattern = (key?: string): BreathPattern =>
  BREATH_PATTERNS.find((p) => p.key === key) ?? BREATH_PATTERNS[0];
