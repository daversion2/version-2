export interface SeedRewardMessage {
  text: string;
  category: 'identity' | 'effort' | 'contrast' | 'general';
}

export const REWARD_MESSAGES_SEED_DATA: SeedRewardMessage[] = [
  // Identity messages — who you're becoming
  { text: "This is who you are now.", category: 'identity' },
  { text: "You're not the person who quits.", category: 'identity' },
  { text: "Every rep builds the person you're becoming.", category: 'identity' },
  { text: "You chose hard. That says everything.", category: 'identity' },

  // Effort messages — acknowledging the work
  { text: "That wasn't easy. You did it anyway.", category: 'effort' },
  { text: "Discipline showed up today.", category: 'effort' },
  { text: "The resistance was real. So was your decision.", category: 'effort' },
  { text: "You didn't need motivation. You had will.", category: 'effort' },

  // Contrast messages — before vs after, old vs new
  { text: "Yesterday's you would have skipped this.", category: 'contrast' },
  { text: "Most people scrolled. You showed up.", category: 'contrast' },
  { text: "Comfort called. You didn't answer.", category: 'contrast' },
  { text: "The old version of you didn't make it here.", category: 'contrast' },

  // General
  { text: "One more proof point.", category: 'general' },
  { text: "Noted. Logged. Earned.", category: 'general' },
  { text: "Brick by brick.", category: 'general' },
];
