import { WALKTHROUGH_STEPS, MOCK_CHALLENGE } from '../walkthrough';

describe('WalkthroughContext', () => {
  describe('WALKTHROUGH_STEPS', () => {
    it('has exactly 10 steps', () => {
      expect(WALKTHROUGH_STEPS).toHaveLength(10);
    });

    it('each step has required screen and text properties', () => {
      WALKTHROUGH_STEPS.forEach((step, index) => {
        expect(step.screen).toBeDefined();
        expect(typeof step.screen).toBe('string');
        expect(step.screen.length).toBeGreaterThan(0);

        expect(step.text).toBeDefined();
        expect(typeof step.text).toBe('string');
        expect(step.text.length).toBeGreaterThan(0);
      });
    });

    it('covers all required screens', () => {
      const screens = WALKTHROUGH_STEPS.map(step => step.screen);
      expect(screens).toContain('HomeScreen');
      expect(screens).toContain('StartChallenge');
      expect(screens).toContain('CreateChallenge');
      expect(screens).toContain('CompleteChallenge');
      expect(screens).toContain('ManageHabits');
      expect(screens).toContain('Challenges');
      expect(screens).toContain('Progress');
      expect(screens).toContain('Settings');
    });

    it('has correct step order', () => {
      expect(WALKTHROUGH_STEPS[0].screen).toBe('HomeScreen');
      expect(WALKTHROUGH_STEPS[1].screen).toBe('StartChallenge');
      expect(WALKTHROUGH_STEPS[2].screen).toBe('CreateChallenge');
      expect(WALKTHROUGH_STEPS[3].screen).toBe('CompleteChallenge');
      expect(WALKTHROUGH_STEPS[8].screen).toBe('Progress');
      expect(WALKTHROUGH_STEPS[9].screen).toBe('Settings');
    });

    it('mentions Willpower Points in relevant steps', () => {
      const completeStep = WALKTHROUGH_STEPS.find(s => s.screen === 'CompleteChallenge');
      expect(completeStep?.text).toContain('Willpower Points');

      const habitStep = WALKTHROUGH_STEPS.find(s => s.screen === 'HomeScreen' && s.target === 'habitArea');
      expect(habitStep?.text).toContain('Willpower Points');
    });

    it('mentions Willpower Bank and Suck Factor in Progress step', () => {
      const progressStep = WALKTHROUGH_STEPS.find(s => s.screen === 'Progress');
      expect(progressStep?.text).toContain('Willpower Bank');
      expect(progressStep?.text).toContain('Suck Factor');
      expect(progressStep?.text).toContain('streak');
    });

    it('has spotlight targets for HomeScreen steps', () => {
      const homeSteps = WALKTHROUGH_STEPS.filter(s => s.screen === 'HomeScreen');
      expect(homeSteps.length).toBe(3);

      const targets = homeSteps.map(s => s.target).filter(Boolean);
      expect(targets).toContain('challengeBtn');
      expect(targets).toContain('habitsAdd');
      expect(targets).toContain('habitArea');
    });
  });

  describe('MOCK_CHALLENGE', () => {
    it('has all required challenge properties', () => {
      expect(MOCK_CHALLENGE.id).toBe('walkthrough-mock');
      expect(MOCK_CHALLENGE.name).toBeDefined();
      expect(MOCK_CHALLENGE.category_id).toBeDefined();
      expect(MOCK_CHALLENGE.difficulty_expected).toBeDefined();
      expect(MOCK_CHALLENGE.status).toBe('active');
    });

    it('has valid difficulty value', () => {
      expect(MOCK_CHALLENGE.difficulty_expected).toBeGreaterThanOrEqual(1);
      expect(MOCK_CHALLENGE.difficulty_expected).toBeLessThanOrEqual(5);
    });
  });
});
