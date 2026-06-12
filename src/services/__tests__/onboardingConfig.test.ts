import {
  sanitizeSteps,
  DEFAULT_ONBOARDING_CONFIG,
  STEP_CONTENT_DEFAULTS,
} from '../onboardingConfig';

describe('sanitizeSteps', () => {
  it('returns the default 7-step flow unchanged', () => {
    const result = sanitizeSteps(DEFAULT_ONBOARDING_CONFIG.steps);
    expect(result.map((s) => s.type)).toEqual([
      'welcome', 'settle', 'timer', 'bridge', 'mantra_picker', 'habit_picker', 'reveal',
    ]);
  });

  it('forces welcome first and reveal last, always enabled', () => {
    const result = sanitizeSteps([
      { type: 'reveal', enabled: false },
      { type: 'settle' },
      { type: 'welcome', enabled: false },
    ]);
    expect(result[0].type).toBe('welcome');
    expect(result[0].enabled).toBe(true);
    expect(result[result.length - 1].type).toBe('reveal');
    expect(result[result.length - 1].enabled).toBe(true);
    expect(result.map((s) => s.type)).toEqual(['welcome', 'settle', 'reveal']);
  });

  it('injects welcome and reveal when missing', () => {
    const result = sanitizeSteps([{ type: 'bridge' }]);
    expect(result.map((s) => s.type)).toEqual(['welcome', 'bridge', 'reveal']);
  });

  it('drops unknown step types and dedupes singletons, keeping text pages', () => {
    const result = sanitizeSteps([
      { type: 'welcome' },
      { type: 'hologram' },
      { type: 'timer' },
      { type: 'timer' },
      { type: 'text_page', id: 'a' },
      { type: 'text_page', id: 'b' },
      { type: 'reveal' },
    ]);
    expect(result.map((s) => s.type)).toEqual([
      'welcome', 'timer', 'text_page', 'text_page', 'reveal',
    ]);
  });

  it('merges content over per-type defaults with type checks', () => {
    const [, timer] = sanitizeSteps([
      { type: 'welcome' },
      {
        type: 'timer',
        content: { seconds: 120, pre_label: 'Custom label', active_label: 42 },
      },
      { type: 'reveal' },
    ]);
    expect(timer.content.seconds).toBe(120);
    expect(timer.content.pre_label).toBe('Custom label');
    // Wrong-typed value falls back to the default
    expect(timer.content.active_label).toBe(STEP_CONTENT_DEFAULTS.timer.active_label);
    // Untouched fields keep defaults
    expect(timer.content.done_label).toBe(STEP_CONTENT_DEFAULTS.timer.done_label);
  });

  it('rejects non-positive timer seconds', () => {
    const [, timer] = sanitizeSteps([
      { type: 'welcome' },
      { type: 'timer', content: { seconds: -10 } },
      { type: 'reveal' },
    ]);
    expect(timer.content.seconds).toBe(STEP_CONTENT_DEFAULTS.timer.seconds);
  });

  it('falls back to default next_button when blank and preserves disabled middle steps', () => {
    const result = sanitizeSteps([
      { type: 'welcome' },
      { type: 'settle', enabled: false, next_button: '   ' },
      { type: 'reveal' },
    ]);
    expect(result[1].enabled).toBe(false);
    expect(result[1].next_button).toBe("I'm ready");
  });
});
