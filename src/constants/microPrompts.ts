/**
 * Short reflection micro-prompts used during habit/challenge/micro-goal completion.
 * A random prompt is shown each time to keep reflections fresh.
 */

export const HABIT_PROMPTS = [
  'What almost stopped you?',
  'How do you feel compared to before?',
  'What did you notice today?',
  'What made this easier or harder than usual?',
  'What would you tell someone who almost skipped this?',
  'Did anything surprise you?',
  'How does doing this connect to who you want to be?',
  'What was different about today?',
];

export const CHALLENGE_PROMPTS = [
  'What was the hardest moment, and what were you telling yourself then?',
  'What helped you push through — or what would have helped?',
  'How do you feel now compared to before?',
  'What did you learn about yourself?',
];

export const MICRO_GOAL_PROMPTS = [
  'Quick win — how does it feel?',
  'What made you actually do it?',
  'Was it easier than you expected?',
];

/**
 * Returns a random prompt from the given pool, optionally
 * seeded by a date string so the same prompt shows for a given day.
 */
export const getRandomPrompt = (pool: string[], seed?: string): string => {
  if (seed) {
    // Simple hash for day-stable rotation
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
    }
    return pool[Math.abs(hash) % pool.length];
  }
  return pool[Math.floor(Math.random() * pool.length)];
};
