/**
 * Craving Crusher — static definitions for the urge-surfing timer.
 *
 * The flow reframes a craving as a wave that peaks and passes (typically
 * within 15–20 minutes) rather than a command that must be obeyed. Copy
 * throughout deliberately avoids good/bad moral language — especially around
 * food. The craving is the subject, never the person.
 */

export type CravingTypeId = 'food' | 'phone' | 'alcohol' | 'smoking' | 'spending' | 'other';

export interface CravingTypeDef {
  id: CravingTypeId;
  label: string;
  emoji: string;
  /** Short example line shown under the label on the picker tile. */
  description: string;
}

export const CRAVING_TYPES: CravingTypeDef[] = [
  {
    id: 'food',
    label: 'Food pull',
    emoji: '🍔',
    description: 'Snacks, sugar, fast food',
  },
  {
    id: 'phone',
    label: 'Phone / scroll',
    emoji: '📱',
    description: 'Social media, news, video',
  },
  {
    id: 'alcohol',
    label: 'Alcohol',
    emoji: '🍺',
    description: 'A drink you didn’t plan on',
  },
  {
    id: 'smoking',
    label: 'Smoking / vaping',
    emoji: '🚬',
    description: 'Cigarettes, vapes, nicotine',
  },
  {
    id: 'spending',
    label: 'Impulse buy',
    emoji: '💸',
    description: 'Cart items, one-click orders',
  },
  {
    id: 'other',
    label: 'Something else',
    emoji: '🌊',
    description: 'Name it — any urge counts',
  },
];

export const getCravingType = (id: string): CravingTypeDef =>
  CRAVING_TYPES.find((t) => t.id === id) ?? CRAVING_TYPES[CRAVING_TYPES.length - 1];

/**
 * Timer length scales with reported intensity — stronger waves take longer to
 * break. Grounded in urge-surfing research: most cravings peak and fade
 * within 15–20 minutes.
 */
export const durationForIntensity = (intensity: number): number => {
  if (intensity <= 3) return 10 * 60;
  if (intensity <= 7) return 15 * 60;
  return 20 * 60;
};

// ---------------------------------------------------------------------------
// In-timer content — active cards shown while riding the wave.
// ---------------------------------------------------------------------------

export interface CravingCard {
  kind: 'science' | 'reframe' | 'prompt';
  title: string;
  text: string;
}

const GENERAL_CARDS: CravingCard[] = [
  {
    kind: 'science',
    title: 'Neuroscience',
    text: 'Your dopamine system fired before you touched anything — the craving is a prediction, not a command. Every minute you ride it without acting weakens that prediction.',
  },
  {
    kind: 'science',
    title: 'Neuroscience',
    text: 'Cravings follow a wave shape: they build, peak, and fall — usually inside 20 minutes. Acting on one at its peak is what keeps the wave tall next time.',
  },
  {
    kind: 'reframe',
    title: 'Reframe',
    text: 'You don’t have to make the craving go away. Your only job right now is to not act on it. Those are different jobs, and the second one is much easier.',
  },
  {
    kind: 'reframe',
    title: 'Reframe',
    text: 'Notice where the urge lives in your body — chest, jaw, hands? Watching it like a scientist puts distance between the wave and you.',
  },
  {
    kind: 'prompt',
    title: 'Quick check',
    text: 'What was happening in the two minutes before this hit? Bored, stressed, tired, somewhere specific? That context is the trigger — worth remembering for the log.',
  },
  {
    kind: 'science',
    title: 'Neuroscience',
    text: 'Urges recruit the brain’s alarm circuitry, which is loud but short-winded. Your prefrontal cortex — the part reading this — outlasts it every time you let it.',
  },
  {
    kind: 'reframe',
    title: 'Reframe',
    text: 'This isn’t willpower versus the craving. It’s just time versus the craving — and time always wins if you let the clock run.',
  },
];

const TYPE_CARDS: Record<CravingTypeId, CravingCard[]> = {
  food: [
    {
      kind: 'science',
      title: 'Neuroscience',
      text: 'A food pull is rarely about hunger — it spikes with stress, boredom, and cues like time of day. Real hunger builds slowly; a craving arrives all at once. Which one is this?',
    },
    {
      kind: 'prompt',
      title: 'Quick check',
      text: 'Drink a glass of water and notice how the pull responds. Not as a trick — as data about what this wave actually is.',
    },
  ],
  phone: [
    {
      kind: 'science',
      title: 'Neuroscience',
      text: 'The pull to check your phone is a variable-reward loop — the same mechanism as a slot machine. The urge isn’t about what’s on the screen; it’s about the maybe.',
    },
    {
      kind: 'prompt',
      title: 'Quick check',
      text: 'What were you avoiding when the pull hit? Scrolling is often an exit door from a feeling, not a destination.',
    },
  ],
  alcohol: [
    {
      kind: 'science',
      title: 'Neuroscience',
      text: 'Alcohol cravings peak hard and fall fast — the steepest wave of any craving type. The first five minutes are the whole battle; you’re in them right now.',
    },
    {
      kind: 'prompt',
      title: 'Quick check',
      text: 'What is the drink promising you right now — relief, reward, connection? Naming the promise loosens its grip.',
    },
  ],
  smoking: [
    {
      kind: 'science',
      title: 'Neuroscience',
      text: 'A nicotine urge is one of the shortest waves there is — most pass within 3–5 minutes even without acting. You only have to outlast the first stretch; the timer is longer than the craving needs.',
    },
    {
      kind: 'prompt',
      title: 'Quick check',
      text: 'Where does it live — chest, throat, hands? Smoking urges are half ritual: the reach, the hold, the hand-to-mouth. Give your hands something else to do and notice how much of the pull goes with them.',
    },
  ],
  spending: [
    {
      kind: 'science',
      title: 'Neuroscience',
      text: 'The dopamine hit from buying peaks before checkout, not after delivery. The craving is for the anticipation — which you’re already having, for free.',
    },
    {
      kind: 'prompt',
      title: 'Quick check',
      text: 'Leave it in the cart. If you still want it when this timer ends — or tomorrow — it’ll still be there. Urgency is the sales tactic, not the truth.',
    },
  ],
  other: [],
};

/**
 * Cards for a session: type-specific first (most relevant while the wave is
 * highest), then the general rotation.
 */
export const getCravingCards = (typeId: CravingTypeId): CravingCard[] => [
  ...TYPE_CARDS[typeId],
  ...GENERAL_CARDS,
];

/** How long each card stays up before rotating to the next. */
export const CARD_ROTATION_SECONDS = 45;

// ---------------------------------------------------------------------------
// In-ride activities
// ---------------------------------------------------------------------------

export interface BreathingPhase {
  label: string;
  seconds: number;
  /** Whether the circle grows (inhale) or settles (exhale/hold at size). */
  direction: 'in' | 'hold' | 'out';
}

export interface BreathingCadence {
  id: string;
  label: string;
  detail: string;
  phases: BreathingPhase[];
}

export const BREATHING_CADENCES: BreathingCadence[] = [
  {
    id: '478',
    label: '4-7-8',
    detail: 'calming',
    phases: [
      { label: 'Breathe in', seconds: 4, direction: 'in' },
      { label: 'Hold', seconds: 7, direction: 'hold' },
      { label: 'Breathe out', seconds: 8, direction: 'out' },
    ],
  },
  {
    id: 'box',
    label: 'Box',
    detail: '4-4-4-4',
    phases: [
      { label: 'Breathe in', seconds: 4, direction: 'in' },
      { label: 'Hold', seconds: 4, direction: 'hold' },
      { label: 'Breathe out', seconds: 4, direction: 'out' },
      { label: 'Hold', seconds: 4, direction: 'hold' },
    ],
  },
  {
    id: 'sigh',
    label: 'Sigh',
    detail: '2 in · long out',
    phases: [
      { label: 'Breathe in', seconds: 2, direction: 'in' },
      { label: 'Sip more air', seconds: 1, direction: 'in' },
      { label: 'Long breath out', seconds: 6, direction: 'out' },
    ],
  },
  {
    id: 'slow',
    label: 'Slow',
    detail: '6 in · 6 out',
    phases: [
      { label: 'Breathe in', seconds: 6, direction: 'in' },
      { label: 'Breathe out', seconds: 6, direction: 'out' },
    ],
  },
];

export interface CravingFact {
  kicker: string;
  fact: string;
}

export const CRAVING_FACTS: CravingFact[] = [
  {
    kicker: 'Dopamine',
    fact: 'Dopamine peaks before you act, not after. The craving itself is the main event — consuming usually delivers less than the anticipation promised.',
  },
  {
    kicker: 'The Wave',
    fact: 'Every craving has a shape: sharp rise, brief peak, long fade. Lab studies show most urges fully resolve within 15–20 minutes without any intervention at all.',
  },
  {
    kicker: 'Extinction',
    fact: 'Every time a craving fires and you don\'t act on it, your brain runs "extinction learning" — actively weakening the cue-reward link. The signal gets quieter with every rep.',
  },
  {
    kicker: 'Suppression',
    fact: 'Trying to force a craving away ("don\'t think about it") makes it rebound stronger. Watching it with curiosity — "interesting, it\'s in my chest right now" — does the opposite.',
  },
  {
    kicker: 'Transfer',
    fact: 'Riding out a food craving trains the same neural circuit you\'d use on a scroll urge or an impulse buy. One circuit, many cravings — every rep counts everywhere.',
  },
  {
    kicker: 'Prediction',
    fact: 'A craving is your brain making a prediction, not issuing a command. Predictions can be wrong, and with enough counter-evidence, they get updated — permanently.',
  },
  {
    kicker: 'Stress',
    fact: 'Cortisol lowers the threshold for cravings to fire. The urge you feel after a hard day isn\'t weakness — it\'s biology. The same biology you\'re overriding right now.',
  },
  {
    kicker: 'Your Cortex',
    fact: 'Craving circuitry is fast and loud. Your prefrontal cortex is slower — but has far more stamina. In any contest lasting more than a few minutes, the planner wins.',
  },
  {
    kicker: 'Context',
    fact: "Cravings are wired to places and moments: the couch, 3pm, the walk past the kitchen. That's also why moving to a different room can interrupt one mid-fire.",
  },
  {
    kicker: 'Data',
    fact: 'People who track every outcome — including the sessions they gave in to — show better long-term results than those who only log wins. The data beats the shame spiral.',
  },
  {
    kicker: 'The Forever Feeling',
    fact: 'At peak intensity, most people predict their urge will last for hours. The actual median is under 10 minutes. The "this will never end" sensation is a symptom of the wave, not a fact about it.',
  },
  {
    kicker: 'Variable Ratio',
    fact: 'Social media cravings are especially persistent because they use variable ratio reinforcement — the same schedule that makes slot machines addictive. Unpredictable rewards are the strongest hook.',
  },
  {
    kicker: 'Hunger Hormones',
    fact: "Food cravings are partly driven by ghrelin, which spikes on a schedule even when you've eaten. The 3pm urge often isn't your body needing food — it's a hormone running its clock.",
  },
  {
    kicker: 'Neuroplasticity',
    fact: "Each time you redirect a craving, you're physically pruning the cue-response pathway and reinforcing the override circuit. This structural change is measurable on fMRI.",
  },
  {
    kicker: 'Wanting vs. Having',
    fact: 'In studies, people consistently rate the anticipation of a reward as more pleasurable than receiving it. The wanting is usually more intense than the having.',
  },
  {
    kicker: 'Habituation',
    fact: 'Repeated exposure without reward causes the craving signal to weaken through habituation — the same mechanism behind exposure therapy. The signal fades with reps.',
  },
  {
    kicker: 'Identity',
    fact: 'Framing a craving as "I\'m someone who rides these out" rather than "I\'m resisting this" produces measurably better long-term outcomes in behavior change research.',
  },
  {
    kicker: 'Sleep',
    fact: 'Sleep deprivation amplifies craving intensity and reduces prefrontal override capacity simultaneously. One bad night can make a mild urge feel irresistible.',
  },
  {
    kicker: 'Your Body',
    fact: "The restlessness and elevated heart rate during a craving are your sympathetic nervous system activating. It's designed to be temporary — and it always is.",
  },
  {
    kicker: 'Error Signals',
    fact: 'When the brain predicts a reward and doesn\'t get it, it logs a "prediction error." These errors are what update the model. You\'re generating useful error signals right now.',
  },
  {
    kicker: 'The Peak',
    fact: "The first 3–4 minutes of a craving are the most intense. Past the peak, the trajectory is always down. You're already part of the way through.",
  },
  {
    kicker: 'Urge Surfing',
    fact: '"Urge surfing" was developed by psychologist Alan Marlatt in the 1980s for addiction treatment. Decades of research show it reduces relapse rates significantly compared to suppression alone.',
  },
  {
    kicker: 'Patterns',
    fact: "After logging enough sessions, most people identify 2–3 consistent triggers they weren't consciously aware of. The pattern is invisible until the data reveals it.",
  },
  {
    kicker: 'Compounding',
    fact: 'Craving resistance has a compounding curve: the first few reps are hard, the next few get easier. After enough sessions, many riders describe urges as "background noise."',
  },
  {
    kicker: 'Observation',
    fact: 'Simply paying attention to when and how cravings arise — without any other intervention — reduces their frequency. Observation changes the observed.',
  },
]

export interface GroundStep {
  count: number;
  title: string;
  sub: string;
}

/** 5-4-3-2-1 sensory grounding. */
export const GROUND_STEPS: GroundStep[] = [
  {
    count: 5,
    title: 'Things you can see',
    sub: 'Look around and find five. Actually look — the point is to move attention from the craving loop out into the room.',
  },
  {
    count: 4,
    title: 'Things you can touch',
    sub: 'The chair under you, fabric, a surface. Notice texture and temperature.',
  },
  {
    count: 3,
    title: 'Things you can hear',
    sub: 'Close sounds, far sounds, the quiet under them.',
  },
  {
    count: 2,
    title: 'Things you can smell',
    sub: 'Subtle counts. Move somewhere else if you need to.',
  },
  {
    count: 1,
    title: 'Thing you can taste',
    sub: 'Whatever is there right now — no need to add anything.',
  },
];

export const NAME_IT_PROMPTS: string[] = [
  'What was happening in the two minutes before this hit?',
  'What is the craving promising you right now?',
  'Where were you, and who or what was around?',
  'What feeling showed up just before the pull — bored, stressed, tired, something else?',
];

// ---------------------------------------------------------------------------
// Off-app missions — leave the app, keep the ride going.
// ---------------------------------------------------------------------------

export interface OffAppMission {
  title: string;
  /** The noticing task — gives attention somewhere to go while away. */
  sub: string;
  /** Optional idea list rendered as bullets — for missions that offer choices rather than prescribe one task. */
  ideas?: string[];
}

export interface MissionCategory {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  missions: OffAppMission[];
}

export const MISSION_CATEGORIES: MissionCategory[] = [
  {
    id: 'walk',
    emoji: '🚶',
    label: 'Take a walk',
    desc: 'Around the block or just the hallway',
    missions: [
      {
        title: 'Walk to the end of the street and back',
        sub: 'Don’t take the craving with you — take your senses instead. Notice three things you’ve never noticed on that street before. You’ll be asked what they were.',
      },
      {
        title: 'Do one slow lap of wherever you are',
        sub: 'Half your normal pace. Count doorways, windows, or corners — anything that keeps your eyes out of your head.',
      },
      {
        title: 'Walk until you find something blue',
        sub: 'Then something round. Then something older than you. Simple scavenger rules keep the attention outside.',
      },
    ],
  },
  {
    id: 'hands',
    emoji: '🫖',
    label: 'Hands busy',
    desc: 'Anything tactile — pick one and go slow',
    missions: [
      {
        title: 'Give your hands a job',
        sub: 'Pick whichever one is nearest and do it slowly — the textures and temperatures are the point, not the chore. Busy hands starve the urge of its ritual.',
        ideas: [
          'Make a hot drink — watch it, smell it, hold the warm cup',
          'Tidy exactly one surface — small, finishable, satisfying',
          'Wash a few dishes — warm water on your hands is quietly regulating',
          'Water the plants, fold some laundry, sharpen a pencil',
          'Knead, doodle, or fidget with anything within reach',
        ],
      },
    ],
  },
  {
    id: 'reach',
    emoji: '💬',
    label: 'Reach out',
    desc: 'Call or voice-note someone real',
    missions: [
      {
        title: 'Voice-note someone you’ve been meaning to reply to',
        sub: 'Not text — voice. Thirty seconds of "thinking of you, here’s my week" counts. Connection is the strongest craving-breaker there is.',
      },
      {
        title: 'Call someone for two minutes',
        sub: 'You don’t have to mention the craving. Ask them one real question and actually listen to the answer.',
      },
    ],
  },
  {
    id: 'outside',
    emoji: '🌤',
    label: 'Step outside',
    desc: 'Doorway counts. Sky helps.',
    missions: [
      {
        title: 'Stand outside for a few breaths',
        sub: 'Doorway, balcony, or sidewalk. Find the horizon or the sky and keep your eyes there — wide vision literally calms the alarm system.',
      },
      {
        title: 'Step out and find three sounds',
        sub: 'Nearest sound, farthest sound, and one you can’t identify. Come back when you have all three.',
      },
    ],
  },
];

export const getMissionCategory = (id: string): MissionCategory | undefined =>
  MISSION_CATEGORIES.find((c) => c.id === id);

// ---------------------------------------------------------------------------
// Outcome copy — the tone here is the whole feature. "Gave in" is logged
// without judgment: the log itself is the win.
// ---------------------------------------------------------------------------

export const OUTCOME_COPY = {
  passed: {
    emoji: '⚡',
    headline: 'You rode it out.',
    body:
      'The wave peaked and passed — exactly like the science said it would. That’s one more rep of your brain learning the craving isn’t in charge.',
  },
  gave_in: {
    emoji: '🌊',
    headline: 'The wave won this one.',
    body:
      'Logging it anyway is the move. Every logged craving — either outcome — sharpens the picture of when and why they hit, and that’s what makes the next one easier.',
  },
} as const;
