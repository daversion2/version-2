/**
 * Seed script to populate the challenge library in Firestore
 *
 * Run with: npx ts-node scripts/seedChallengeLibrary.ts
 *
 * Note: You'll need to have your Firebase credentials configured.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';

// You'll need to add your Firebase config here or import it
const firebaseConfig = {
  // Add your Firebase config from src/services/firebase.ts
  // or use environment variables
};

// Initialize Firebase (only if not already initialized)
// const app = initializeApp(firebaseConfig);
// const db = getFirestore(app);

// For now, export the challenges so they can be imported and used with the existing Firebase instance
export const CHALLENGE_LIBRARY_SEED_DATA = [
  {
    name: 'Cold Water Face Splash',
    category: 'Physical',
    barrier_type: 'comfort-zone',
    difficulty: 2,
    time_required_minutes: 5,
    time_category: 'quick-win',
    action_type: 'complete',
    beginner_friendly: true,
    description: 'Splash cold water on your face for 30 seconds.',
    success_criteria: 'Face is wet with cold water for 30 continuous seconds.',
    why: 'Builds tolerance for discomfort in a safe, controlled way.',
    neuroscience_explanation: "When you choose discomfort, you're training your prefrontal cortex to override your amygdala's fear response. This strengthens your ability to do hard things in all areas of life.",
    psychological_benefit: 'Builds confidence in your ability to handle discomfort.',
    what_youll_learn: "That discomfort is temporary and you're stronger than you think. Your brain will try to convince you it's \"too cold\" but you can choose to do it anyway.",
    common_resistance: [
      "It's too cold",
      "I'll do it tomorrow",
      "This is pointless"
    ],
    real_world_examples: [
      'At the sink after brushing teeth',
      'In the shower before warming up',
      'During lunch break to reset focus'
    ],
    variations: [
      { label: 'Easier', description: '15 seconds' },
      { label: 'Harder', description: '60 seconds' },
      { label: 'Advanced', description: 'See "Cold Shower (Full Body)"' }
    ]
  },
  {
    name: 'No Phone During Meal',
    category: 'Mind',
    barrier_type: 'delayed-gratification',
    difficulty: 2,
    time_required_minutes: 20,
    time_category: 'ritual',
    action_type: 'resist',
    beginner_friendly: true,
    description: 'Eat one meal without looking at your phone or any screens.',
    success_criteria: 'Complete meal from start to finish with no screen usage.',
    why: 'Trains presence and resisting the urge to distract.',
    neuroscience_explanation: 'Your brain craves constant stimulation. By sitting with boredom, you strengthen your prefrontal cortex and reduce dopamine dependency on devices.',
    psychological_benefit: 'Increases mindfulness and reduces compulsive behavior.',
    what_youll_learn: 'That meals can be enjoyable without distraction, and boredom is not an emergency.',
    common_resistance: [
      'I need to check something important',
      "It's boring without my phone",
      "I'll just look at it for a second"
    ],
    real_world_examples: [
      'Breakfast before work',
      'Lunch at your desk (phone in drawer)',
      'Dinner with family'
    ],
    variations: [
      { label: 'Easier', description: 'Phone face-down on table (but present)' },
      { label: 'Harder', description: 'Phone in another room entirely' },
      { label: 'Advanced', description: 'All meals for a full day' }
    ]
  },
  {
    name: 'Take the Stairs All Day',
    category: 'Physical',
    barrier_type: 'discipline',
    difficulty: 2,
    time_required_minutes: 1440,
    time_category: 'all-day',
    action_type: 'complete',
    beginner_friendly: true,
    description: 'Choose stairs over elevator or escalator every opportunity today.',
    success_criteria: 'Used stairs instead of elevator/escalator at every opportunity.',
    why: 'Choosing discomfort when the easy option is available.',
    neuroscience_explanation: 'Each small choice to take the hard path builds neural pathways for discipline. Over time, choosing discomfort becomes automatic.',
    psychological_benefit: 'Builds identity as someone who chooses the harder path.',
    what_youll_learn: 'That small choices compound. The discomfort of stairs is brief, but the discipline carries into other areas.',
    common_resistance: [
      "I'm tired",
      "It's just one elevator ride",
      'No one will know if I take the easy way'
    ],
    real_world_examples: [
      'Office building',
      'Parking garage',
      'Shopping mall',
      'Apartment complex'
    ],
    variations: [
      { label: 'Easier', description: 'Do once' },
      { label: 'Harder', description: 'Do a few times' },
      { label: 'Advanced', description: 'Do this all day' }
    ]
  },
  {
    name: 'Initiate a Conversation with a Stranger',
    category: 'Social',
    barrier_type: 'comfort-zone',
    difficulty: 3,
    time_required_minutes: 5,
    time_category: 'quick-win',
    action_type: 'complete',
    beginner_friendly: false,
    description: "Start a conversation with someone you don't know. Not transactional (not ordering coffee) - a genuine human exchange.",
    success_criteria: 'Had a brief conversation (2+ exchanges) with a stranger.',
    why: 'Trains you to initiate despite social anxiety.',
    neuroscience_explanation: 'Social anxiety is your brain overestimating threat. Each positive interaction rewires your threat detection and builds evidence that connection is safe.',
    psychological_benefit: 'Reduces social anxiety and builds confidence.',
    what_youll_learn: 'That most people are receptive to friendly interaction, and rejection is rarely as bad as anticipated.',
    common_resistance: [
      'They look busy',
      "I don't have anything interesting to say",
      "They'll think I'm weird"
    ],
    real_world_examples: [
      'Comment on something to the person next to you in line',
      'Ask someone at the gym about their workout',
      "Compliment someone's dog at the park"
    ],
    variations: [
      { label: 'Easier', description: 'Ask a stranger for directions or a recommendation' },
      { label: 'Harder', description: 'Initiate with someone who intimidates you' },
      { label: 'Advanced', description: 'Have 3 stranger conversations in one day' }
    ]
  },
  {
    name: 'Sit in Silence',
    category: 'Mind',
    barrier_type: 'discipline',
    difficulty: 1,
    time_required_minutes: 5,
    time_category: 'quick-win',
    action_type: 'complete',
    beginner_friendly: true,
    description: 'Sit in complete silence for 60 seconds or more. No phone, no music, no distractions. Just you and your thoughts.',
    success_criteria: 'Sat in stillness for the required time I set.',
    why: 'Builds tolerance for stillness and trains attention.',
    neuroscience_explanation: 'Your brain is addicted to stimulation. Practicing stillness strengthens your ability to direct attention rather than having it hijacked by impulses.',
    psychological_benefit: 'Increases self-awareness and reduces anxiety.',
    what_youll_learn: "That silence isn't uncomfortable - your resistance to it is. The discomfort fades quickly.",
    common_resistance: [
      "I don't have time for this",
      'This is boring',
      'I should be doing something productive'
    ],
    real_world_examples: [
      'First thing in the morning before checking phone',
      'At your desk before starting work',
      'In your car before going inside'
    ],
    variations: [
      { label: 'Easier', description: '60 seconds' },
      { label: 'Harder', description: '5 minutes' },
      { label: 'Advanced', description: '10 minutes with eyes closed' }
    ]
  },
  {
    name: 'Make Your Bed Immediately Upon Waking',
    category: 'Physical',
    barrier_type: 'energy-drainer',
    difficulty: 1,
    time_required_minutes: 5,
    time_category: 'quick-win',
    action_type: 'complete',
    beginner_friendly: true,
    description: 'Make your bed first thing in the morning, before doing anything else.',
    success_criteria: 'Bed is made within 5 minutes of waking.',
    why: 'Starts the day with a small win and builds momentum.',
    neuroscience_explanation: 'Completing a task releases dopamine and creates momentum. Starting with a win primes your brain for more productive choices.',
    psychological_benefit: 'Creates sense of accomplishment and order.',
    what_youll_learn: 'That small actions create ripple effects. Discipline in one area moves into others.',
    common_resistance: [
      "I'm going to sleep in it again anyway",
      "It doesn't matter",
      "I'll do it later"
    ],
    real_world_examples: [
      'Immediately after getting out of bed',
      'Before using the bathroom',
      'Before checking your phone'
    ]
  },
  {
    name: 'No Complaining for 24 Hours',
    category: 'Mind',
    barrier_type: 'discipline',
    difficulty: 4,
    time_required_minutes: 1440,
    time_category: 'all-day',
    action_type: 'resist',
    beginner_friendly: false,
    description: 'Go 24 hours without complaining - out loud or internally. When you catch yourself, stop and reframe.',
    success_criteria: 'Made it through the day catching and stopping complaints.',
    why: 'Breaks the habit of negativity and trains solution-oriented thinking.',
    neuroscience_explanation: 'Complaining reinforces neural pathways for negativity. Breaking the pattern and consciously reframing builds new pathways for constructive thinking.',
    psychological_benefit: 'Shifts mindset from victim to problem-solver.',
    what_youll_learn: "How often you default to complaint, and that most complaints don't serve you.",
    common_resistance: [
      "I'm just venting",
      'But this is actually annoying',
      "I'm not complaining, I'm stating facts"
    ],
    real_world_examples: [
      'Traffic → "I have time to listen to a podcast"',
      'Bad weather → "I\'ll appreciate the nice days more"',
      'Annoying coworker → Focus on what you can control'
    ],
    variations: [
      { label: 'Easier', description: 'No complaining out loud (internal allowed)' },
      { label: 'Harder', description: 'No complaining for 3 days' },
      { label: 'Advanced', description: 'No complaining for a full week' }
    ]
  },
  {
    name: 'Cold Shower (Full Body)',
    category: 'Physical',
    barrier_type: 'comfort-zone',
    difficulty: 4,
    time_required_minutes: 10,
    time_category: 'quick-win',
    action_type: 'complete',
    beginner_friendly: false,
    description: 'Take a full cold shower. Start to finish, no warm water.',
    success_criteria: 'Completed entire shower with only cold water.',
    why: 'Confronts physical discomfort and trains immediate action despite resistance.',
    neuroscience_explanation: 'Cold exposure activates your sympathetic nervous system and trains you to act despite strong signals to avoid. This transfers to other domains where your body screams "don\'t."',
    psychological_benefit: 'Builds mental toughness and resilience.',
    what_youll_learn: "That you can override your body's protests. The anticipation is worse than the reality.",
    common_resistance: [
      'Maybe just end with cold',
      "It's too early/late for this",
      "I'll do it when it's warmer outside"
    ],
    real_world_examples: [
      'Morning shower to wake up',
      'After workout to recover',
      'Before a challenging day'
    ],
    variations: [
      { label: 'Easier', description: 'End shower with 30 seconds cold' },
      { label: 'Moderate', description: 'Cold shower for 1 minute only' },
      { label: 'Harder', description: '5-minute cold shower' },
      { label: 'Advanced', description: 'Cold shower every day for a week' }
    ]
  },
  {
    name: 'Ask for a Discount',
    category: 'Social',
    barrier_type: 'ego',
    difficulty: 3,
    time_required_minutes: 10,
    time_category: 'quick-win',
    action_type: 'complete',
    beginner_friendly: false,
    description: "Ask for a discount somewhere it's not typically offered. A store, restaurant, or service provider.",
    success_criteria: "Asked for a discount (outcome doesn't matter).",
    why: 'Confronts fear of rejection and looking foolish.',
    neuroscience_explanation: 'Your ego protects you from social rejection. By deliberately risking it, you prove to yourself that rejection is survivable and reduce its power over you.',
    psychological_benefit: 'Reduces fear of rejection and increases assertiveness.',
    what_youll_learn: 'That asking is rarely as awkward as you imagine, and sometimes you actually get the discount.',
    common_resistance: [
      "That's embarrassing",
      "They'll say no anyway",
      "I don't want to be that person"
    ],
    real_world_examples: [
      'Ask for 10% off at a retail store',
      'Ask if there are any current promotions at a restaurant',
      'Ask if a service fee can be waived'
    ]
  },
  {
    name: "Send the Message You've Been Avoiding",
    category: 'Social',
    barrier_type: 'energy-drainer',
    difficulty: 3,
    time_required_minutes: 10,
    time_category: 'quick-win',
    action_type: 'complete',
    beginner_friendly: true,
    description: "Send a message you've been putting off - reaching out to reconnect, responding to something difficult, or having a conversation you've avoided.",
    success_criteria: 'Message sent.',
    why: 'Clears mental weight and builds habit of addressing things directly.',
    neuroscience_explanation: "Avoidance creates ongoing low-level stress. Completing avoided tasks provides relief and trains your brain that action is better than rumination.",
    psychological_benefit: 'Reduces anxiety and builds trust in yourself.',
    what_youll_learn: 'That the anticipation of sending it was worse than actually doing it.',
    common_resistance: [
      "I'll do it when I know what to say",
      "It's been too long, it'll be awkward",
      'I need more time to think'
    ],
    real_world_examples: [
      "Text that friend you've lost touch with",
      "Respond to that email you've been avoiding",
      'Reach out to apologize or clear the air'
    ]
  },
  {
    name: 'Deep Work Block',
    category: 'Mind',
    barrier_type: 'discipline',
    difficulty: 3,
    time_required_minutes: 90,
    time_category: 'deep-work',
    action_type: 'complete',
    beginner_friendly: false,
    description: 'Work on one important task for 90 minutes with zero distractions. Phone off or in another room. No checking email. No "quick" breaks.',
    success_criteria: '90 minutes of focused work on a single task.',
    why: 'Trains sustained attention and deep focus.',
    neuroscience_explanation: 'Your brain needs time to enter flow state. Constant interruption keeps you in shallow work. 90 minutes allows you to reach and sustain deep focus.',
    psychological_benefit: 'Increases productivity and sense of accomplishment.',
    what_youll_learn: 'How much you can accomplish with real focus, and how often you normally self-interrupt.',
    common_resistance: [
      'What if someone needs me',
      "I'll just check this one thing",
      '90 minutes is too long'
    ],
    real_world_examples: [
      'Writing project',
      'Learning a skill',
      'Strategic thinking or planning',
      'Creative work'
    ],
    variations: [
      { label: 'Easier', description: '30 minutes focused' },
      { label: 'Moderate', description: '60 minutes focused' },
      { label: 'Harder', description: '2 hours focused' },
      { label: 'Advanced', description: 'Two 90-minute blocks in one day' }
    ]
  },
  {
    name: 'Say No to Something',
    category: 'Social',
    barrier_type: 'comfort-zone',
    difficulty: 3,
    time_required_minutes: 5,
    time_category: 'quick-win',
    action_type: 'complete',
    beginner_friendly: false,
    description: "Decline a request or invitation that you would normally say yes to out of obligation, guilt, or people-pleasing.",
    success_criteria: "Said no to something you didn't want to do.",
    why: 'Builds boundary-setting and self-respect.',
    neuroscience_explanation: 'People-pleasing is often fear-based. Practicing "no" teaches your brain that maintaining boundaries doesn\'t result in catastrophe.',
    psychological_benefit: 'Increases self-respect and reduces resentment.',
    what_youll_learn: 'That saying no is usually received better than you expect, and your time and energy are valuable.',
    common_resistance: [
      "But they'll be upset",
      "It's not that big a deal",
      "I don't want to seem selfish"
    ],
    real_world_examples: [
      'Decline an optional meeting',
      "Say no to plans you don't want to attend",
      'Turn down a request for your time'
    ]
  },
  {
    name: 'Eat Something Healthy You Dislike',
    category: 'Physical',
    barrier_type: 'comfort-zone',
    difficulty: 2,
    time_required_minutes: 15,
    time_category: 'ritual',
    action_type: 'complete',
    beginner_friendly: true,
    description: "Eat a healthy food you typically avoid because you don't like the taste (not due to allergies or dietary restrictions).",
    success_criteria: 'Ate a full serving of a disliked food.',
    why: 'Trains yourself to do things despite not wanting to.',
    neuroscience_explanation: 'Your preferences aren\'t fixed. By choosing to override them, you demonstrate that "I don\'t feel like it" isn\'t a valid reason to avoid something.',
    psychological_benefit: 'Builds discipline over preference.',
    what_youll_learn: "That preferences are often exaggerated, and you can do things you don't enjoy.",
    common_resistance: [
      "Life's too short to eat things I don't like",
      "There's no point",
      "I'll just eat more of what I do like"
    ],
    real_world_examples: [
      'Vegetables you avoid',
      "A dish you've decided you don't like",
      'Something with a texture that bothers you'
    ]
  },
  {
    name: 'Sit with an Uncomfortable Emotion',
    category: 'Mind',
    barrier_type: 'comfort-zone',
    difficulty: 3,
    time_required_minutes: 15,
    time_category: 'ritual',
    action_type: 'complete',
    beginner_friendly: false,
    description: "When you feel anxiety, frustration, or sadness today, don't distract yourself. Sit with it for at least 5 minutes. Notice where you feel it in your body. Let it be there.",
    success_criteria: 'Sat with an uncomfortable emotion without numbing or distracting.',
    why: 'Builds emotional tolerance and reduces reactivity.',
    neuroscience_explanation: 'Emotions are temporary physiological states. Running from them gives them power. Sitting with them teaches your nervous system they are survivable.',
    psychological_benefit: 'Increases emotional intelligence and reduces emotional avoidance.',
    what_youll_learn: "That emotions pass faster than you think when you don't fight them.",
    common_resistance: [
      'I just need to distract myself',
      'This is too much',
      'Feeling bad is unproductive'
    ],
    real_world_examples: [
      "Anxiety before a meeting - don't check your phone",
      "Frustration from an email - don't vent immediately",
      "Sadness - don't scroll to numb it"
    ],
    variations: [
      { label: 'Easier', description: '2 minutes of sitting with discomfort' },
      { label: 'Harder', description: '10 minutes' },
      { label: 'Advanced', description: 'Journal about the emotion after sitting with it' }
    ]
  },
  {
    name: 'First Thing, Hardest Thing',
    category: 'Mind',
    barrier_type: 'discipline',
    difficulty: 3,
    time_required_minutes: 60,
    time_category: 'deep-work',
    action_type: 'complete',
    beginner_friendly: false,
    description: 'Do your most difficult or dreaded task first thing in the morning, before email, before meetings, before anything else.',
    success_criteria: 'Completed (or made major progress on) hardest task before 10am.',
    why: 'Builds habit of doing hard things when willpower is highest.',
    neuroscience_explanation: 'Willpower depletes throughout the day. Front-loading difficult work takes advantage of your freshest cognitive resources and prevents all-day avoidance.',
    psychological_benefit: 'Reduces procrastination and builds momentum.',
    what_youll_learn: 'That the rest of the day feels easier when the hardest thing is done.',
    common_resistance: [
      'I need to ease into the day',
      'Let me just check email first',
      "I'll have more energy later"
    ],
    real_world_examples: [
      "The project you've been avoiding",
      'The difficult conversation',
      'The creative work that requires deep focus'
    ]
  },
  {
    name: 'Give 3 Genuine Compliments',
    category: 'Social',
    barrier_type: 'ego',
    difficulty: 2,
    time_required_minutes: 1440,
    time_category: 'all-day',
    action_type: 'complete',
    beginner_friendly: true,
    description: 'Give three genuine, specific compliments to people today. Not generic - something you actually noticed and appreciated.',
    success_criteria: 'Delivered 3 genuine compliments.',
    why: 'Builds outward focus and connection.',
    neuroscience_explanation: 'Expressing appreciation activates reward circuits in both giver and receiver. It shifts your attention from internal criticism to external appreciation.',
    psychological_benefit: 'Increases connection and positive affect.',
    what_youll_learn: "That giving compliments feels good, people appreciate specificity, and you notice more good when you're looking for it.",
    common_resistance: [
      'That would be awkward',
      "They'll think I want something",
      "I don't want to seem like a suck-up"
    ],
    real_world_examples: [
      'Tell a coworker specifically what they did well',
      "Compliment someone's approach to a problem",
      'Thank someone for something specific they do'
    ],
    variations: [
      { label: 'Easier', description: '1 genuine compliment' },
      { label: 'Harder', description: '5 compliments, including to a stranger' },
      { label: 'Advanced', description: 'Compliment someone you have tension with' }
    ]
  },
  {
    name: 'No Social Media Until Noon',
    category: 'Mind',
    barrier_type: 'delayed-gratification',
    difficulty: 3,
    time_required_minutes: 720,
    time_category: 'all-day',
    action_type: 'resist',
    beginner_friendly: true,
    description: "Don't check any social media (including YouTube, Reddit, news sites) until after 12pm.",
    success_criteria: 'No social media consumption before noon.',
    why: 'Protects your morning focus and reduces dopamine hijacking.',
    neuroscience_explanation: 'Social media delivers unpredictable rewards, which is highly addictive. Your morning brain is primed for focus - hijacking it with dopamine hits undermines your best hours.',
    psychological_benefit: 'Increases focus and reduces compulsive checking.',
    what_youll_learn: 'How automatic the urge is, and how much more present you feel without the morning scroll.',
    common_resistance: [
      "I'll just check real quick",
      'I might miss something important',
      "It's how I wake up"
    ],
    real_world_examples: [
      'Leave phone charging in another room',
      'Use app blockers until noon',
      'Replace the habit with reading or walking'
    ],
    variations: [
      { label: 'Easier', description: 'No social media for first hour after waking' },
      { label: 'Harder', description: 'No social media until 5pm' },
      { label: 'Advanced', description: 'No social media for entire day' }
    ]
  },
  {
    name: 'Wake Up Without Snooze',
    category: 'Physical',
    barrier_type: 'discipline',
    difficulty: 2,
    time_required_minutes: 5,
    time_category: 'quick-win',
    action_type: 'complete',
    beginner_friendly: true,
    description: 'When your alarm goes off, get out of bed immediately. No snooze, no "five more minutes," no lying there.',
    success_criteria: 'Feet on floor within 10 seconds of alarm.',
    why: 'Starts the day with discipline over comfort.',
    neuroscience_explanation: 'The moment between alarm and action is a willpower battle. Winning it first thing sets the tone for the day and builds the identity of someone who does hard things.',
    psychological_benefit: 'Builds identity as someone who takes action.',
    what_youll_learn: 'That the first decision of the day influences the rest, and you can act before you feel ready.',
    common_resistance: [
      'Just five more minutes',
      "I didn't sleep well",
      'The bed is so comfortable'
    ],
    real_world_examples: [
      'Put alarm across the room',
      'Have a reason to get up ready',
      'Commit the night before'
    ],
    variations: [
      { label: 'Harder', description: 'Wake up 30 minutes earlier than usual' },
      { label: 'Advanced', description: 'Wake up 1 hour earlier than usual' }
    ]
  }
];

// Export a function that can be used to seed the database
export async function seedChallengeLibrary(db: any) {
  const libraryRef = collection(db, 'challengeLibrary');

  console.log('Starting to seed challenge library...');
  console.log(`Adding ${CHALLENGE_LIBRARY_SEED_DATA.length} challenges...`);

  for (const challenge of CHALLENGE_LIBRARY_SEED_DATA) {
    try {
      const docRef = await addDoc(libraryRef, challenge);
      console.log(`Added: ${challenge.name} (${docRef.id})`);
    } catch (error) {
      console.error(`Failed to add ${challenge.name}:`, error);
    }
  }

  console.log('Seeding complete!');
}

// Export a function to clear the library (useful for re-seeding)
export async function clearChallengeLibrary(db: any) {
  const libraryRef = collection(db, 'challengeLibrary');

  console.log('Clearing challenge library...');

  const snap = await getDocs(libraryRef);
  for (const document of snap.docs) {
    await deleteDoc(doc(db, 'challengeLibrary', document.id));
    console.log(`Deleted: ${document.id}`);
  }

  console.log('Library cleared!');
}
