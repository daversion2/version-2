import { ONBOARDING_STEPS } from '../onboarding';

describe('Onboarding Steps', () => {
  it('has exactly 4 steps', () => {
    expect(ONBOARDING_STEPS).toHaveLength(4);
  });

  it('each step has required title and body properties', () => {
    ONBOARDING_STEPS.forEach((step, index) => {
      expect(step.title).toBeDefined();
      expect(typeof step.title).toBe('string');
      expect(step.title.length).toBeGreaterThan(0);

      expect(step.body).toBeDefined();
      expect(typeof step.body).toBe('string');
      expect(step.body.length).toBeGreaterThan(0);
    });
  });

  it('has correct step titles in order', () => {
    expect(ONBOARDING_STEPS[0].title).toBe('Challenge Yourself Daily');
    expect(ONBOARDING_STEPS[1].title).toBe('Build Habits That Stick');
    expect(ONBOARDING_STEPS[2].title).toBe('Grow Your Willpower Bank');
    expect(ONBOARDING_STEPS[3].title).toBe('Embrace the Suck');
  });

  it('first step introduces daily challenges', () => {
    const step = ONBOARDING_STEPS[0];
    expect(step.body).toContain('challenge');
    expect(step.body).toContain('comfort zone');
  });

  it('second step introduces habits', () => {
    const step = ONBOARDING_STEPS[1];
    expect(step.body).toContain('habits');
    expect(step.body).toContain('discipline');
  });

  it('third step introduces Willpower Bank gamification', () => {
    const step = ONBOARDING_STEPS[2];
    expect(step.body).toContain('Willpower Points');
    expect(step.body).toContain('Level up');
    expect(step.body).toContain('Beginner Mind');
    expect(step.body).toContain('Willpower Legend');
    expect(step.body).toContain('streak');
    expect(step.body).toContain('multipliers');
  });

  it('fourth step introduces Suck Factor', () => {
    const step = ONBOARDING_STEPS[3];
    expect(step.body).toContain('Suck Factor');
    expect(step.body).toContain('Comfort Zone');
    expect(step.body).toContain('Challenge Seeker');
    expect(step.body).toContain('Limit Pusher');
  });

  it('body text is reasonably sized for mobile display', () => {
    ONBOARDING_STEPS.forEach((step) => {
      // Body should be concise but informative (between 50-300 chars)
      expect(step.body.length).toBeGreaterThan(50);
      expect(step.body.length).toBeLessThan(300);
    });
  });

  it('titles are concise for mobile display', () => {
    ONBOARDING_STEPS.forEach((step) => {
      // Titles should be short (under 30 chars)
      expect(step.title.length).toBeLessThan(30);
    });
  });
});
