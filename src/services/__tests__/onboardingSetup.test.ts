import { HabitDefinition, getHabitDefinition } from '../../data/practices';
import { RESISTANCE_LEVELS, RESISTANCE_SCALE } from '../../constants/resistance';
import { HabitSchedule } from '../habitSchedule';
import {
  FALLBACK_REMINDER_TIME,
  ONBOARDING_BEATS,
  buildHabitCreationPayload,
  clampAmount,
  defaultDaysForTarget,
  deriveHabitSetupDraft,
  describeCommitment,
  describePromise,
  formatReminderTime,
  isBeatComplete,
  isScheduleValid,
  stepAmount,
  toggleDay,
} from '../onboardingSetup';

/** A plain check-in habit: no template, no commitment, no anchor. */
const plain: HabitDefinition = {
  id: 'test-plain',
  name: 'Make the bed',
  description: 'Make the bed.',
  category_id: 'Body',
  suggested_target_per_week: 7,
};

/** A habit that asks for an amount, with an anchor the catalog suggests. */
const timed: HabitDefinition = {
  id: 'test-timed',
  name: 'One deep focus block',
  description: 'A single uninterrupted block.',
  category_id: 'Focus',
  suggested_target_per_week: 5,
  commitmentKey: 'duration_min',
  tracking: [
    { key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min', min: 10, max: 90, step: 5, default: 20 },
  ],
  action_plan: { anchor: 'have my morning coffee' },
};

describe('ONBOARDING_BEATS', () => {
  it('runs premise → pick → promise → rehearse → land', () => {
    expect(ONBOARDING_BEATS.map((b) => b.key)).toEqual([
      'premise',
      'pick',
      'promise',
      'rehearse',
      'land',
    ]);
  });

  it('gives every gated beat a hint, so a disabled button always says why', () => {
    ONBOARDING_BEATS.forEach((beat) => {
      const gated = !isBeatComplete(beat.key, { definitionId: null, draft: null, resistance: null });
      if (gated) expect(beat.hint && beat.hint.length).toBeTruthy();
    });
  });
});

describe('defaultDaysForTarget', () => {
  it('names the schedules people mean by 5, 6 and 7', () => {
    expect(defaultDaysForTarget(5)).toEqual([1, 2, 3, 4, 5]);
    expect(defaultDaysForTarget(6)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(defaultDaysForTarget(7)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  it('spreads a small target across the week rather than front-loading it', () => {
    // Mon/Wed/Sat is a better 3x-a-week habit than Mon/Tue/Wed.
    const three = defaultDaysForTarget(3);
    expect(three).toHaveLength(3);
    expect(three).toContain(1);
    expect(three).not.toEqual([1, 2, 3]);
  });

  it('always returns the requested number of distinct days', () => {
    for (let n = 1; n <= 7; n++) {
      const days = defaultDaysForTarget(n);
      expect(days).toHaveLength(n);
      expect(new Set(days).size).toBe(n);
    }
  });

  it('clamps nonsense rather than returning an unkeepable schedule', () => {
    expect(defaultDaysForTarget(0)).toHaveLength(1);
    expect(defaultDaysForTarget(-4)).toHaveLength(1);
    expect(defaultDaysForTarget(99)).toHaveLength(7);
  });
});

describe('deriveHabitSetupDraft', () => {
  it('pre-fills every field from the definition, so the path through is tap-to-accept', () => {
    const draft = deriveHabitSetupDraft(timed);
    expect(draft.definitionId).toBe('test-timed');
    expect(draft.amount).toBe(20);
    expect(draft.schedule).toEqual({ kind: 'days', days: [1, 2, 3, 4, 5] });
    expect(draft.anchor).toBe('have my morning coffee');
    // Picked up from the curated anchor rather than asked for.
    expect(draft.reminderTime).toBe('07:30');
    expect(draft.reminderEnabled).toBe(true);
  });

  it('leaves the amount unset for a habit with no natural amount', () => {
    // "Make the bed" has no threshold — adopting it stays one tap, and beat 3
    // must not invent a number to ask about.
    expect(deriveHabitSetupDraft(plain).amount).toBeUndefined();
  });

  it('falls back to a clock time when the anchor has none', () => {
    const draft = deriveHabitSetupDraft({ ...timed, action_plan: { anchor: 'reach a staircase' } });
    expect(draft.reminderTime).toBe(FALLBACK_REMINDER_TIME);
  });

  it('handles a definition with no anchor at all', () => {
    const draft = deriveHabitSetupDraft(plain);
    expect(draft.anchor).toBe('');
    expect(draft.reminderTime).toBe(FALLBACK_REMINDER_TIME);
  });
});

describe('formatReminderTime', () => {
  it('renders a stored time as a clock time', () => {
    // Locale-dependent, so this asserts the parts that hold everywhere rather
    // than pinning a full en-US string.
    const rendered = formatReminderTime('07:30');
    expect(rendered).toContain('7');
    expect(rendered).toContain('30');
  });

  it('returns the raw value rather than throwing on a malformed time', () => {
    expect(formatReminderTime('not-a-time')).toBe('not-a-time');
    expect(formatReminderTime('')).toBe('');
  });
});

describe('amount stepping', () => {
  it('moves by the field step', () => {
    expect(stepAmount(timed, 20, 1)).toBe(25);
    expect(stepAmount(timed, 20, -1)).toBe(15);
  });

  it('never leaves the field bounds', () => {
    expect(stepAmount(timed, 10, -1)).toBe(10);
    expect(stepAmount(timed, 90, 1)).toBe(90);
    expect(clampAmount(timed, 1000)).toBe(90);
    expect(clampAmount(timed, 0)).toBe(10);
  });
});

describe('describeCommitment', () => {
  it('renders the amount with its unit', () => {
    expect(describeCommitment(timed, deriveHabitSetupDraft(timed))).toBe('20 min');
  });

  it('is undefined when the habit has no commitment, so callers omit the clause', () => {
    expect(describeCommitment(plain, deriveHabitSetupDraft(plain))).toBeUndefined();
  });

  it('omits a scale commitment — "5 adherence" reads as nonsense', () => {
    const scaled: HabitDefinition = {
      ...timed,
      commitmentKey: 'grade',
      tracking: [{ key: 'grade', label: 'How well?', type: 'scale', min: 1, max: 5, default: 3 }],
    };
    expect(describeCommitment(scaled, { ...deriveHabitSetupDraft(scaled), amount: 3 })).toBeUndefined();
  });

  it('formats a money commitment as currency and groups large numbers', () => {
    const money: HabitDefinition = {
      ...timed,
      commitmentKey: 'amount',
      tracking: [{ key: 'amount', label: 'How much?', type: 'number', unit: '$', default: 25 }],
    };
    expect(describeCommitment(money, { ...deriveHabitSetupDraft(money), amount: 25 })).toBe('$25');

    const steps: HabitDefinition = {
      ...timed,
      commitmentKey: 'steps',
      tracking: [{ key: 'steps', label: 'How many?', type: 'number', unit: 'steps', default: 8000 }],
    };
    expect(describeCommitment(steps, { ...deriveHabitSetupDraft(steps), amount: 8000 })).toBe('8,000 steps');
  });
});

describe('describePromise', () => {
  it('assembles amount, days and anchor into one sentence', () => {
    expect(describePromise(timed, deriveHabitSetupDraft(timed))).toBe(
      '20 min, weekdays, after I have my morning coffee.'
    );
  });

  it('drops the amount clause for a habit that has none', () => {
    expect(describePromise(plain, deriveHabitSetupDraft(plain))).toBe('every day.');
  });

  it('drops the anchor clause rather than trailing "after I ."', () => {
    const draft = { ...deriveHabitSetupDraft(timed), anchor: '   ' };
    expect(describePromise(timed, draft)).toBe('20 min, weekdays.');
  });

  it('speaks a weekly count when the user chose one instead of days', () => {
    const draft = { ...deriveHabitSetupDraft(timed), schedule: { kind: 'count', target: 4 } as const };
    expect(describePromise(timed, draft)).toBe('20 min, 4× a week, after I have my morning coffee.');
  });
});

describe('toggleDay', () => {
  it('adds a day in Monday-first display order', () => {
    expect(toggleDay([1, 3], 5)).toEqual([1, 3, 5]);
    expect(toggleDay([3, 5], 1)).toEqual([1, 3, 5]);
    // Sunday sorts last, not first — the week starts on Monday here.
    expect(toggleDay([1], 0)).toEqual([1, 0]);
  });

  it('removes a day', () => {
    expect(toggleDay([1, 3, 5], 3)).toEqual([1, 5]);
  });

  it('refuses to empty the set — no days is not a schedule', () => {
    // A habit due on no days is permanently un-due: invisible to pace,
    // impossible to miss, and unfixable from the UI.
    expect(toggleDay([1], 1)).toEqual([1]);
  });
});

describe('isBeatComplete', () => {
  const empty = { definitionId: null, draft: null, resistance: null };

  it('lets the premise and landing beats through unconditionally', () => {
    expect(isBeatComplete('premise', empty)).toBe(true);
    expect(isBeatComplete('land', empty)).toBe(true);
  });

  it('holds the pick beat until a habit is chosen', () => {
    expect(isBeatComplete('pick', empty)).toBe(false);
    expect(isBeatComplete('pick', { ...empty, definitionId: 'test-timed' })).toBe(true);
  });

  it('holds the promise beat on a keepable schedule', () => {
    const draft = deriveHabitSetupDraft(timed);
    expect(isBeatComplete('promise', { ...empty, draft })).toBe(true);
    expect(
      isBeatComplete('promise', { ...empty, draft: { ...draft, schedule: { kind: 'days', days: [] } } })
    ).toBe(false);
    expect(
      isBeatComplete('promise', { ...empty, draft: { ...draft, schedule: { kind: 'count', target: 0 } } })
    ).toBe(false);
  });

  it('holds the rehearsal beat until the resistance question is answered', () => {
    // The whole point of the beat is performing the check-in once. Skipping it
    // would put the user's first-ever rating at their first real rep, which is
    // exactly the surprise this beat exists to remove.
    expect(isBeatComplete('rehearse', empty)).toBe(false);
    RESISTANCE_LEVELS.forEach((level) => {
      expect(isBeatComplete('rehearse', { ...empty, resistance: level.value })).toBe(true);
    });
  });

  it('does not gate on the baseline sliders', () => {
    // They carry middle defaults; a required slider is a question people answer
    // by dragging it anywhere, which poisons the very metric it feeds.
    expect(isBeatComplete('rehearse', { ...empty, resistance: 2 })).toBe(true);
  });
});

describe('isScheduleValid', () => {
  it('rejects a schedule that could never come due', () => {
    expect(isScheduleValid({ kind: 'days', days: [] })).toBe(false);
    expect(isScheduleValid({ kind: 'count', target: 0 })).toBe(false);
    expect(isScheduleValid({ kind: 'days', days: [1] })).toBe(true);
    expect(isScheduleValid({ kind: 'count', target: 1 })).toBe(true);
  });
});

describe('buildHabitCreationPayload', () => {
  it('writes the commitment, the days and the anchor', () => {
    const payload = buildHabitCreationPayload(timed, deriveHabitSetupDraft(timed));
    expect(payload).toMatchObject({
      name: 'One deep focus block',
      practice_id: 'test-timed',
      category_id: 'Focus',
      scheduled_days: [1, 2, 3, 4, 5],
      target_count_per_week: 5,
      metric_goals: { duration_min: 20 },
      action_plan: { anchor: 'have my morning coffee' },
    });
  });

  it('keeps target_count_per_week in agreement with the days', () => {
    // Pace, the weekly pips and the trend chart all read the count, so the two
    // fields disagreeing silently breaks every one of them.
    const schedule: HabitSchedule = { kind: 'days', days: [1, 3, 5] };
    const payload = buildHabitCreationPayload(timed, { ...deriveHabitSetupDraft(timed), schedule });
    expect(payload.scheduled_days).toEqual([1, 3, 5]);
    expect(payload.target_count_per_week).toBe(3);
  });

  it('leaves scheduled_days off a count habit', () => {
    const draft = { ...deriveHabitSetupDraft(timed), schedule: { kind: 'count', target: 4 } as const };
    const payload = buildHabitCreationPayload(timed, draft);
    expect(payload.scheduled_days).toBeUndefined();
    expect(payload.target_count_per_week).toBe(4);
  });

  it('omits metric_goals and action_plan rather than writing empty ones', () => {
    const payload = buildHabitCreationPayload(plain, deriveHabitSetupDraft(plain));
    expect(payload.metric_goals).toBeUndefined();
    expect(payload.action_plan).toBeUndefined();
  });

  it('marks the habit as catalog-authored, not user-written', () => {
    // created_by_user drives isRetiredCurated and the curated matching in
    // ensureCuratedPractices; getting it wrong orphans the instance.
    expect(buildHabitCreationPayload(timed, deriveHabitSetupDraft(timed)).created_by_user).toBe(false);
  });

  it('links back to the catalog so the habit keeps its template and science page', () => {
    expect(buildHabitCreationPayload(plain, deriveHabitSetupDraft(plain)).practice_id).toBe('test-plain');
  });

  describe('the beat-4 guess', () => {
    it('stores the expectation with the scale it was recorded on', () => {
      // A bare 2 is uninterpretable if the scale ever changes again — the old
      // and new ranges overlap. Same reason logs carry resistance_scale.
      const payload = buildHabitCreationPayload(timed, deriveHabitSetupDraft(timed), 3);
      expect(payload.expected_resistance).toBe(3);
      expect(payload.expected_resistance_scale).toBe(RESISTANCE_SCALE);
    });

    it('writes nothing when the guess was never made', () => {
      const draft = deriveHabitSetupDraft(timed);
      [undefined, null].forEach((answer) => {
        const payload = buildHabitCreationPayload(timed, draft, answer);
        expect(payload.expected_resistance).toBeUndefined();
        expect(payload.expected_resistance_scale).toBeUndefined();
      });
    });

    it('keeps the guess out of every field the resistance trend reads', () => {
      // The prediction must never reach a CompletionLog. A curve that opens
      // with a point nobody earned is the failure decision #5 guards against.
      const payload = buildHabitCreationPayload(timed, deriveHabitSetupDraft(timed), 2);
      const keys = Object.keys(payload);
      expect(keys).not.toContain('resistance');
      expect(keys).not.toContain('resistance_scale');
      expect(keys).not.toContain('difficulty');
      expect(payload.metric_goals).toEqual({ duration_min: 20 });
    });
  });
});

describe('against the real catalog', () => {
  it('derives a usable draft for every browsable habit', () => {
    // Onboarding offers the whole library, so a definition that produces an
    // unkeepable schedule or a NaN amount would be a dead end the user picked.
    const ids = ['consistent-bedtime', 'deep-focus-session', 'meditation', 'cold_exposure'];
    ids.forEach((id) => {
      const def = getHabitDefinition(id);
      expect(def).toBeDefined();
      const draft = deriveHabitSetupDraft(def!);
      expect(isScheduleValid(draft.schedule)).toBe(true);
      if (draft.amount !== undefined) expect(Number.isFinite(draft.amount)).toBe(true);
      expect(describePromise(def!, draft).endsWith('.')).toBe(true);
    });
  });
});
