import { ONBOARDING_STEPS } from '../onboarding';

/**
 * These tests deliberately assert STRUCTURE, not copy.
 *
 * The previous version pinned exact sentences and a step count ("Embrace the
 * Suck", "has exactly 4 steps"). Onboarding copy gets rewritten often, so every
 * such edit broke the suite without anything actually being wrong — the tests
 * had drifted several rewrites behind the real content and were failing for
 * that reason alone. What's worth protecting is that each step is renderable
 * and sized for the screen, plus the invariants the interactive steps rely on.
 */
describe('Onboarding Steps', () => {
  it('has at least one step', () => {
    expect(ONBOARDING_STEPS.length).toBeGreaterThan(0);
  });

  it('every step has a non-empty title and body', () => {
    ONBOARDING_STEPS.forEach((step) => {
      expect(typeof step.title).toBe('string');
      expect(step.title.trim().length).toBeGreaterThan(0);

      expect(typeof step.body).toBe('string');
      expect(step.body.trim().length).toBeGreaterThan(0);
    });
  });

  it('body text is sized for mobile display', () => {
    ONBOARDING_STEPS.forEach((step) => {
      expect(step.body.length).toBeGreaterThan(50);
      expect(step.body.length).toBeLessThan(300);
    });
  });

  it('titles are concise for mobile display', () => {
    ONBOARDING_STEPS.forEach((step) => {
      expect(step.title.length).toBeLessThan(30);
    });
  });

  it('only uses known step types', () => {
    const allowed = ['info', 'username', 'rewardMessages'];
    ONBOARDING_STEPS.forEach((step) => {
      if (step.type !== undefined) {
        expect(allowed).toContain(step.type);
      }
    });
  });

  it('has at most one step of each interactive type', () => {
    // The username and reward-message steps write to distinct parts of the
    // profile; two of either would mean the second silently overwrites the first.
    (['username', 'rewardMessages'] as const).forEach((type) => {
      expect(ONBOARDING_STEPS.filter((s) => s.type === type).length).toBeLessThanOrEqual(1);
    });
  });

  it('ends with the interactive steps so info comes first', () => {
    const firstInteractive = ONBOARDING_STEPS.findIndex((s) => s.type && s.type !== 'info');
    if (firstInteractive === -1) return;
    ONBOARDING_STEPS.slice(firstInteractive).forEach((step) => {
      expect(step.type).toBeDefined();
      expect(step.type).not.toBe('info');
    });
  });
});
