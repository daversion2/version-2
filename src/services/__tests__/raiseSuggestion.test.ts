import {
  buildRaiseSuggestion,
  MIN_LOGS_FOR_RAISE,
  EASY_RESISTANCE,
} from '../raiseSuggestion';
import { CompletionLog } from '../../types';
import { TrackingField } from '../../data/practices';

const FIELD: TrackingField = {
  key: 'water_oz',
  label: 'How much?',
  type: 'number',
  unit: 'oz',
  min: 20,
  max: 160,
  step: 10,
  default: 80,
};

let n = 0;
/** n logs, each with the given amount and resistance level. */
const series = (
  entries: { amount?: number; resistance?: number }[]
): CompletionLog[] =>
  entries.map((e, i) =>
    ({
      id: `l${++n}`,
      user_id: 'u1',
      type: 'nudge',
      reference_id: 'h1',
      points: 1,
      difficulty: 1,
      date: `2026-08-${String(i + 1).padStart(2, '0')}`,
      ...(e.amount === undefined ? {} : { metrics: { water_oz: e.amount } }),
      ...(e.resistance === undefined
        ? {}
        : { resistance: e.resistance, resistance_scale: 3 }),
    }) as CompletionLog
  );

/** The happy path: goal met consistently, and it feels easy now. */
const easyAndHitting = series(
  Array.from({ length: 10 }, () => ({ amount: 90, resistance: 1 }))
);

describe('buildRaiseSuggestion', () => {
  it('offers a higher goal when the amount is met and it has gotten easy', () => {
    const s = buildRaiseSuggestion(easyAndHitting, FIELD, 80)!;
    expect(s).not.toBeNull();
    expect(s.currentGoal).toBe(80);
    expect(s.suggestedGoal).toBeGreaterThan(80);
    expect(s.hitRate).toBe(100);
    expect(s.unit).toBe('oz');
  });

  it('stays silent until there is enough history', () => {
    const thin = series(
      Array.from({ length: MIN_LOGS_FOR_RAISE - 1 }, () => ({ amount: 90, resistance: 1 }))
    );
    expect(buildRaiseSuggestion(thin, FIELD, 80)).toBeNull();
  });

  it('stays silent when the goal is being missed', () => {
    // Consistency first: an easy habit you keep missing needs consistency, not
    // a bigger number.
    const missing = series(
      Array.from({ length: 10 }, (_, i) => ({ amount: i < 5 ? 40 : 90, resistance: 1 }))
    );
    expect(buildRaiseSuggestion(missing, FIELD, 80)).toBeNull();
  });

  it('stays silent while the habit still feels hard', () => {
    // Hitting 80 oz daily while still rating it a 3 means the amount is right
    // and the difficulty is real.
    const stillHard = series(
      Array.from({ length: 10 }, () => ({ amount: 90, resistance: 3 }))
    );
    expect(buildRaiseSuggestion(stillHard, FIELD, 80)).toBeNull();
  });

  it('treats the easiness threshold as inclusive', () => {
    const borderline = series(
      Array.from({ length: 10 }, (_, i) => ({
        amount: 90,
        resistance: i < 5 ? 1 : 2,
      }))
    );
    // Mean of 1.5 — exactly the threshold, which should still qualify.
    expect(EASY_RESISTANCE).toBe(1.5);
    expect(buildRaiseSuggestion(borderline, FIELD, 80)).not.toBeNull();
  });

  it('never suggests past the field ceiling', () => {
    const s = buildRaiseSuggestion(
      series(Array.from({ length: 10 }, () => ({ amount: 160, resistance: 1 }))),
      FIELD,
      160
    );
    // Already at max — there is nothing larger to offer, so it says nothing.
    expect(s).toBeNull();
  });

  it('has nothing to raise for a scale commitment', () => {
    // "How well did you hold to it?" has a fixed ceiling by construction.
    const scaleField: TrackingField = { ...FIELD, key: 'adherence', type: 'scale', max: 5 };
    const logs = series(Array.from({ length: 10 }, () => ({ amount: 5, resistance: 1 }))).map(
      (l) => ({ ...l, metrics: { adherence: 5 } }) as CompletionLog
    );
    expect(buildRaiseSuggestion(logs, scaleField, 5)).toBeNull();
  });

  it('ignores logs with no amount recorded', () => {
    const sparse = series([
      ...Array.from({ length: 4 }, () => ({ resistance: 1 })),
      ...Array.from({ length: 4 }, () => ({ amount: 90, resistance: 1 })),
    ]);
    // Only 4 carry the metric — below the minimum.
    expect(buildRaiseSuggestion(sparse, FIELD, 80)).toBeNull();
  });

  it('says nothing without a field or a goal', () => {
    expect(buildRaiseSuggestion(easyAndHitting, undefined, 80)).toBeNull();
    expect(buildRaiseSuggestion(easyAndHitting, FIELD, undefined)).toBeNull();
    expect(buildRaiseSuggestion(easyAndHitting, FIELD, 0)).toBeNull();
  });
});
