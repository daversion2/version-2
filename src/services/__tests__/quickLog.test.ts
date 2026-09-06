import { buildQuickLogInput, quickLogEligibility } from '../quickLog';
import { PracticeInstance } from '../../types';
import { HabitDefinition } from '../../data/practices';

const habit = (over: Partial<PracticeInstance> = {}): PracticeInstance =>
  ({
    id: 'h1',
    user_id: 'u1',
    name: 'Drink water',
    is_active: true,
    created_by_user: false,
    target_count_per_week: 7,
    ...over,
  }) as PracticeInstance;

const definition = (over: Partial<HabitDefinition> = {}): HabitDefinition =>
  ({
    id: 'trad-drink-water',
    name: 'Drink water',
    description: '',
    category_id: 'Body',
    suggested_target_per_week: 7,
    ...over,
  }) as HabitDefinition;

const waterField = {
  key: 'water_oz',
  label: 'How much?',
  type: 'number' as const,
  unit: 'oz',
  default: 80,
};

describe('buildQuickLogInput', () => {
  it('carries the rating the user actually pressed', () => {
    // The entire reason the chips replaced a checkmark. A quick log that
    // guessed the rating would bias the resistance trend toward hard days,
    // because easy days are exactly the ones people tap through.
    const input = buildQuickLogInput(habit(), definition(), 2);
    expect(input.resistance).toBe(2);
    expect(input.difficulty).toBe('challenging');
  });

  it('derives difficulty so XP keeps working untouched', () => {
    expect(buildQuickLogInput(habit(), definition(), 1).difficulty).toBe('easy');
    expect(buildQuickLogInput(habit(), definition(), 3).difficulty).toBe('challenging');
  });

  it('clamps a rating that could never have come from a chip', () => {
    expect(buildQuickLogInput(habit(), definition(), 9).resistance).toBe(3);
    expect(buildQuickLogInput(habit(), definition(), 0).resistance).toBe(1);
  });

  it('marks every quick log with the surface that produced it', () => {
    // Cannot be reconstructed later — the question "do chip taps rate
    // differently from sheet logs?" is unanswerable if this is not written now.
    expect(buildQuickLogInput(habit(), definition(), 2).logged_via).toBe('quick');
  });

  it('fills the metric from the amount the user promised, and says so', () => {
    const def = definition({ commitmentKey: 'water_oz', tracking: [waterField] });
    const input = buildQuickLogInput(habit({ metric_goals: { water_oz: 100 } }), def, 1);

    expect(input.metrics).toEqual({ water_oz: 100 });
    // The flag is the whole point: 100 oz here is a commitment affirmed, not a
    // measurement taken, and a trend should be able to tell those apart.
    expect(input.metrics_assumed).toBe(true);
  });

  it('falls back to the catalog default when the user never chose an amount', () => {
    // The adoption screen showed them this number, so it is still theirs.
    const def = definition({ commitmentKey: 'water_oz', tracking: [waterField] });
    expect(buildQuickLogInput(habit(), def, 1).metrics).toEqual({ water_oz: 80 });
  });

  it('writes no metrics at all for a habit with no commitment', () => {
    // Rather than an empty object or a fabricated zero.
    const input = buildQuickLogInput(habit(), definition(), 1);
    expect(input.metrics).toBeUndefined();
    expect(input.metrics_assumed).toBeUndefined();
  });

  it('writes no metrics for a custom habit with no catalog entry', () => {
    const input = buildQuickLogInput(habit({ created_by_user: true }), undefined, 2);
    expect(input.metrics).toBeUndefined();
    expect(input.logged_via).toBe('quick');
  });
});

describe('quickLogEligibility', () => {
  it('lets a plain check-in habit log in one tap', () => {
    expect(quickLogEligibility(habit(), definition())).toEqual({ kind: 'quick' });
  });

  it('sends a timed practice to the sheet', () => {
    // "How long" is the practice. A guessed duration is worse than none.
    const def = definition({ flow: 'timer' });
    expect(quickLogEligibility(habit(), def)).toEqual({ kind: 'sheet', reason: 'timer' });
  });

  it('allows one tap when the only field IS the commitment', () => {
    const def = definition({ commitmentKey: 'water_oz', tracking: [waterField] });
    expect(quickLogEligibility(habit(), def)).toEqual({ kind: 'quick' });
  });

  it('sends a habit asking for more than its commitment to the sheet', () => {
    // A form needs the sheet; the commitment answers one amount, not several.
    const def = definition({
      commitmentKey: 'water_oz',
      tracking: [waterField, { key: 'temp_f', label: 'How cold?', type: 'number' }],
    });
    expect(quickLogEligibility(habit(), def)).toEqual({ kind: 'sheet', reason: 'multi_metric' });
  });

  it('sends a habit with tracking but no commitment to the sheet', () => {
    const def = definition({ tracking: [{ key: 'reps', label: 'How many?', type: 'number' }] });
    expect(quickLogEligibility(habit(), def)).toEqual({ kind: 'sheet', reason: 'multi_metric' });
  });

  it('resolves a custom habit’s preset rather than assuming it has none', () => {
    // Without the template fallback, a custom habit with a "time" preset would
    // be quick-logged and never asked how long.
    const timed = habit({ created_by_user: true, template_id: 'time' });
    expect(quickLogEligibility(timed, undefined).kind).toBe('sheet');
    expect(quickLogEligibility(habit({ created_by_user: true }), undefined).kind).toBe('quick');
  });
});
