import { WorksheetTemplate } from '../types';

export const WORKSHEET_TEMPLATES: WorksheetTemplate[] = [
  // =========================================================================
  // 1. THOUGHT RECORD (ABC MODEL)
  // =========================================================================
  {
    id: 'thought_record',
    name: 'Challenge That Thought',
    short_description: 'Catch a negative thought and see how much of it is actually true',
    long_description:
      'When a thought feels like a fact, writing it down changes everything. This exercise helps you slow down, look at what actually happened, and find a version of the story that\'s more accurate — not more positive, just more honest.',
    category: 'thoughts',
    difficulty: 1,
    estimated_minutes: 10,
    icon: 'document-text',
    color: '#217180',
    when_to_use:
      'When a negative thought is stuck in your head, or a strong emotion just hit out of nowhere.',
    tips: [
      'Try to capture the thought as close to word-for-word as possible',
      'Rate emotions on a 0-100% intensity scale',
      "The balanced thought doesn't have to be positive — just more accurate",
    ],
    sections: [
      {
        id: 'situation',
        title: 'The Situation',
        description: 'What happened? Where were you? Who was involved?',
        fields: [
          {
            id: 'situation_description',
            label: 'Describe the situation',
            placeholder:
              "e.g., My boss didn't respond to my email for two days...",
            field_type: 'textarea',
            required: true,
            max_length: 500,
          },
          {
            id: 'situation_when',
            label: 'When did this happen?',
            placeholder: 'e.g., Tuesday afternoon at work',
            field_type: 'text',
            required: false,
            max_length: 100,
          },
        ],
      },
      {
        id: 'automatic_thoughts',
        title: 'Automatic Thoughts',
        description: 'What went through your mind? What did you tell yourself?',
        fields: [
          {
            id: 'hot_thought',
            label: 'The "hot thought" (most distressing)',
            placeholder:
              "e.g., I'm going to get fired. He hates my work.",
            field_type: 'textarea',
            required: true,
            helper_text: 'The thought that carries the most emotional charge',
            max_length: 300,
          },
          {
            id: 'thought_belief_rating',
            label: 'How much do you believe this thought? (0-100%)',
            placeholder: 'e.g., 85',
            field_type: 'text',
            required: true,
            max_length: 3,
          },
        ],
      },
      {
        id: 'emotions',
        title: 'Emotions',
        description: 'What emotions did you feel? How intense were they?',
        fields: [
          {
            id: 'emotions_felt',
            label: 'Emotions experienced',
            placeholder:
              'e.g., Anxious (80%), Ashamed (60%), Frustrated (40%)',
            field_type: 'textarea',
            required: true,
            helper_text: 'Name each emotion and rate its intensity 0-100%',
            max_length: 300,
          },
        ],
      },
      {
        id: 'evidence',
        title: 'Examine the Evidence',
        description:
          'Look at the facts — not feelings — for and against the thought.',
        fields: [
          {
            id: 'evidence_for',
            label: 'Evidence that supports this thought',
            placeholder: 'e.g., He usually replies within a few hours...',
            field_type: 'textarea',
            required: true,
            max_length: 500,
          },
          {
            id: 'evidence_against',
            label: 'Evidence that contradicts this thought',
            placeholder:
              'e.g., He told me last week my report was excellent...',
            field_type: 'textarea',
            required: true,
            max_length: 500,
          },
        ],
      },
      {
        id: 'balanced_thought',
        title: 'Balanced Thought',
        description:
          'Based on ALL the evidence, what is a more balanced perspective?',
        fields: [
          {
            id: 'balanced_thought_text',
            label: 'A more balanced thought',
            placeholder:
              "e.g., He might just be busy. One slow reply doesn't mean he's unhappy with my work.",
            field_type: 'textarea',
            required: true,
            max_length: 500,
          },
          {
            id: 'new_belief_rating',
            label:
              'How much do you believe the original thought NOW? (0-100%)',
            placeholder: 'e.g., 40',
            field_type: 'text',
            required: true,
            max_length: 3,
          },
        ],
      },
    ],
  },

  // =========================================================================
  // 2. COGNITIVE DISTORTIONS IDENTIFIER
  // =========================================================================
  {
    id: 'cognitive_distortions',
    name: 'Name Your Thinking Trap',
    short_description: 'Identify the mental patterns that make things feel worse than they are',
    long_description:
      'Your brain runs patterns on autopilot — and some of those patterns distort reality in predictable ways. This exercise helps you name which one is running so you can catch it faster next time.',
    category: 'thoughts',
    difficulty: 1,
    estimated_minutes: 8,
    icon: 'warning',
    color: '#FF5B02',
    when_to_use:
      'When you\'re spiraling, catastrophizing, or stuck in the same negative thought loop.',
    tips: [
      "Most thoughts contain multiple distortions — that's normal",
      'Naming the distortion creates distance from it',
      'Over time you\'ll notice your "favorite" distortions',
    ],
    sections: [
      {
        id: 'the_thought',
        title: 'The Thought',
        description:
          'Write down the negative or unhelpful thought you want to examine.',
        fields: [
          {
            id: 'original_thought',
            label: 'The thought',
            placeholder:
              'e.g., I always mess things up. Nothing I do ever works out.',
            field_type: 'textarea',
            required: true,
            max_length: 400,
          },
          {
            id: 'trigger_situation',
            label: 'What triggered this thought?',
            placeholder: 'e.g., Made a small mistake in my presentation',
            field_type: 'textarea',
            required: false,
            max_length: 300,
          },
        ],
      },
      {
        id: 'identify_distortions',
        title: 'Identify the Distortions',
        description:
          'Which thinking traps are present in this thought? Select all that apply.',
        fields: [
          {
            id: 'distortions_present',
            label: 'Distortions present',
            field_type: 'checklist',
            required: true,
            options: [
              'All-or-Nothing Thinking (black and white)',
              'Overgeneralization (one event = always/never)',
              'Mental Filter (focusing only on the negative)',
              'Disqualifying the Positive (dismissing good things)',
              'Jumping to Conclusions (mind reading / fortune telling)',
              'Magnification / Minimization (blowing up or shrinking)',
              'Emotional Reasoning (feeling it so it must be true)',
              'Should Statements (rigid rules for self/others)',
              'Labeling (attaching a fixed label)',
              'Personalization (blaming yourself for everything)',
            ],
          },
        ],
      },
      {
        id: 'challenge',
        title: 'Challenge & Reframe',
        description:
          "Now that you've named the distortions, how could you think about this differently?",
        fields: [
          {
            id: 'why_distorted',
            label: 'Why is the original thought distorted?',
            placeholder:
              'e.g., I\'m overgeneralizing from one mistake to "always" and "nothing ever"...',
            field_type: 'textarea',
            required: true,
            max_length: 500,
          },
          {
            id: 'reframed_thought',
            label: 'A more realistic version of this thought',
            placeholder:
              "e.g., I made one mistake in an otherwise solid presentation. That's human.",
            field_type: 'textarea',
            required: true,
            max_length: 500,
          },
        ],
      },
    ],
  },

  // =========================================================================
  // 3. BEHAVIORAL EXPERIMENT PLANNER
  // =========================================================================
  {
    id: 'behavioral_experiment',
    name: 'Put It to the Test',
    short_description: 'Design a small real-world experiment to challenge a limiting belief',
    long_description:
      'You can\'t think your way out of a belief — you have to act your way out. This exercise helps you make a specific prediction, take an action, and see what actually happens. Evidence beats rumination every time.',
    category: 'behavior',
    difficulty: 2,
    estimated_minutes: 12,
    icon: 'flask',
    color: '#7B1FA2',
    when_to_use:
      'When a belief about yourself or the world is holding you back from taking action.',
    tips: [
      'Start with experiments where the stakes feel manageable',
      "Be specific about what you'll do and when",
      'Record results as soon as possible after the experiment',
    ],
    sections: [
      {
        id: 'belief',
        title: 'The Belief to Test',
        description:
          'What belief or prediction do you want to put to the test?',
        fields: [
          {
            id: 'belief_to_test',
            label: 'The belief I want to test',
            placeholder:
              "e.g., If I speak up in the meeting, people will think I'm stupid.",
            field_type: 'textarea',
            required: true,
            max_length: 400,
          },
          {
            id: 'belief_strength',
            label: 'How strongly do I believe this? (0-100%)',
            placeholder: 'e.g., 75',
            field_type: 'text',
            required: true,
            max_length: 3,
          },
        ],
      },
      {
        id: 'experiment_design',
        title: 'Design the Experiment',
        description: 'What will you actually DO to test this belief?',
        fields: [
          {
            id: 'experiment_action',
            label: 'What I will do',
            placeholder:
              "e.g., I will ask one question or make one comment in tomorrow's team meeting.",
            field_type: 'textarea',
            required: true,
            max_length: 400,
          },
          {
            id: 'when_where',
            label: 'When and where',
            placeholder: 'e.g., Tuesday 10am standup meeting',
            field_type: 'text',
            required: true,
            max_length: 200,
          },
          {
            id: 'prediction',
            label: 'My prediction (what I think will happen)',
            placeholder:
              'e.g., People will look confused or annoyed. My voice will shake.',
            field_type: 'textarea',
            required: true,
            max_length: 400,
          },
          {
            id: 'safety_behaviors',
            label: 'Safety behaviors I will drop',
            placeholder:
              "e.g., I won't rehearse my comment 10 times first or apologize before speaking.",
            field_type: 'textarea',
            required: false,
            helper_text:
              'Safety behaviors prevent you from fully testing the belief',
            max_length: 300,
          },
        ],
      },
      {
        id: 'results',
        title: 'Results',
        description: 'After the experiment, record what actually happened.',
        fields: [
          {
            id: 'what_happened',
            label: 'What actually happened?',
            placeholder:
              'e.g., I asked a question. Two people nodded. My manager said "good point."',
            field_type: 'textarea',
            required: false,
            max_length: 500,
          },
          {
            id: 'prediction_accuracy',
            label: 'Was my prediction accurate?',
            field_type: 'single_select',
            required: false,
            options: [
              'Not at all — the opposite happened',
              'Slightly — a small part was true',
              'Partially — some of it happened',
              'Mostly accurate',
              'Completely accurate',
            ],
          },
          {
            id: 'what_i_learned',
            label: 'What did I learn?',
            placeholder:
              'e.g., People actually welcomed my input. The fear was worse than the reality.',
            field_type: 'textarea',
            required: false,
            max_length: 500,
          },
          {
            id: 'new_belief_strength',
            label:
              'How strongly do I believe the original thought NOW? (0-100%)',
            placeholder: 'e.g., 30',
            field_type: 'text',
            required: false,
            max_length: 3,
          },
        ],
      },
    ],
  },

  // =========================================================================
  // 4. CORE BELIEF DOWNWARD ARROW
  // =========================================================================
  {
    id: 'core_belief_arrow',
    name: 'Find the Root',
    short_description: 'Trace a surface worry down to the deeper belief actually driving it',
    long_description:
      'Most recurring thoughts aren\'t really about what they appear to be about. This exercise asks "what would that mean?" again and again until you hit the belief underneath — the one that keeps generating the same thought patterns.',
    category: 'beliefs',
    difficulty: 2,
    estimated_minutes: 10,
    icon: 'arrow-down-circle',
    color: '#1565C0',
    when_to_use:
      'When the same fear or thought pattern keeps showing up across different situations in your life.',
    tips: [
      'Keep asking "what would that mean about me?" until you hit something that feels core',
      'Core beliefs are usually short, absolute statements (I am... People are... The world is...)',
      "You may feel emotional when you hit the core belief — that's a sign you've found it",
    ],
    sections: [
      {
        id: 'surface_thought',
        title: 'Starting Thought',
        description:
          'What is the automatic thought or worry on the surface?',
        fields: [
          {
            id: 'surface_thought_text',
            label: 'The surface thought',
            placeholder: "e.g., I shouldn't have said that at dinner.",
            field_type: 'textarea',
            required: true,
            max_length: 300,
          },
        ],
      },
      {
        id: 'downward_arrow',
        title: 'The Downward Arrow',
        description:
          'For each answer, ask: "If that were true, what would it mean about me / my life?"',
        fields: [
          {
            id: 'arrow_1',
            label: 'If that were true, what would it mean?',
            placeholder: "e.g., It means people think I'm awkward...",
            field_type: 'textarea',
            required: true,
            max_length: 300,
          },
          {
            id: 'arrow_2',
            label: 'And if THAT were true, what would it mean?',
            placeholder:
              "e.g., It means I'll never fit in or be liked...",
            field_type: 'textarea',
            required: true,
            max_length: 300,
          },
          {
            id: 'arrow_3',
            label: 'And what would THAT mean about you?',
            placeholder: 'e.g., I am fundamentally unlovable.',
            field_type: 'textarea',
            required: true,
            max_length: 300,
          },
          {
            id: 'arrow_4',
            label: 'Go deeper if needed — what would that mean?',
            placeholder: "(Leave blank if you've reached the core)",
            field_type: 'textarea',
            required: false,
            max_length: 300,
          },
        ],
      },
      {
        id: 'core_belief_identified',
        title: 'The Core Belief',
        description: 'What is the deepest belief you uncovered?',
        fields: [
          {
            id: 'core_belief_text',
            label: 'My core belief',
            placeholder:
              'e.g., I am unlovable / I am not good enough / I am a failure',
            field_type: 'textarea',
            required: true,
            helper_text:
              'Core beliefs are usually short, absolute "I am..." statements',
            max_length: 200,
          },
          {
            id: 'belief_origin',
            label: 'Where might this belief have come from?',
            placeholder:
              'e.g., Being criticized frequently as a child...',
            field_type: 'textarea',
            required: false,
            max_length: 400,
          },
          {
            id: 'compassionate_response',
            label:
              'What would you say to a friend who believed this about themselves?',
            placeholder:
              "e.g., That's not true. One awkward moment doesn't define your worth.",
            field_type: 'textarea',
            required: true,
            max_length: 400,
          },
        ],
      },
    ],
  },

  // =========================================================================
  // 5. SMART ACTION PLAN
  // =========================================================================
  {
    id: 'smart_action_plan',
    name: "Turn 'I Should' Into a Plan",
    short_description:
      "Convert a vague intention into a concrete action you'll actually follow through on",
    long_description:
      "Avoidance thrives on vagueness. 'I should exercise more' is impossible to execute. 'I will walk for 20 minutes on Tuesday at 7am' is not. This exercise takes what you know you want to do and makes it specific enough to actually happen.",
    category: 'behavior',
    difficulty: 1,
    estimated_minutes: 8,
    icon: 'checkbox',
    color: '#2E7D32',
    when_to_use:
      "When you keep saying 'I should do this' but never start — or when overwhelm is keeping you stuck.",
    tips: [
      'Start with the smallest possible first step',
      'If it feels too big, break it down further',
      'Schedule it in your calendar immediately after completing this worksheet',
    ],
    sections: [
      {
        id: 'the_intention',
        title: 'The Vague Intention',
        description:
          'What is the thing you keep telling yourself you "should" do?',
        fields: [
          {
            id: 'vague_intention',
            label: 'I keep telling myself I should...',
            placeholder:
              'e.g., I should start exercising more / I should have that difficult conversation',
            field_type: 'textarea',
            required: true,
            max_length: 300,
          },
          {
            id: 'avoidance_reason',
            label: 'What has been stopping me?',
            placeholder:
              "e.g., It feels too overwhelming / I don't know where to start",
            field_type: 'textarea',
            required: true,
            max_length: 300,
          },
        ],
      },
      {
        id: 'smart_breakdown',
        title: 'SMART Breakdown',
        description:
          'Make it Specific, Measurable, Achievable, Relevant, and Time-bound.',
        fields: [
          {
            id: 'specific_action',
            label: 'Specific: What exactly will I do?',
            placeholder:
              'e.g., Walk for 20 minutes around my neighborhood',
            field_type: 'textarea',
            required: true,
            max_length: 300,
          },
          {
            id: 'measurable',
            label: 'Measurable: How will I know I did it?',
            placeholder:
              'e.g., I completed 20 minutes of walking (timer on phone)',
            field_type: 'textarea',
            required: true,
            max_length: 300,
          },
          {
            id: 'achievable',
            label:
              'Achievable: Is this realistic for me right now? (1-10 confidence)',
            placeholder:
              'e.g., 8 — I can definitely walk for 20 minutes',
            field_type: 'text',
            required: true,
            max_length: 100,
          },
          {
            id: 'relevant',
            label:
              'Relevant: How does this connect to what matters to me?',
            placeholder:
              'e.g., Physical health is key to my energy and mood goals',
            field_type: 'textarea',
            required: true,
            max_length: 300,
          },
          {
            id: 'time_bound',
            label: 'Time-bound: When exactly will I do this?',
            placeholder:
              'e.g., Tomorrow (Wednesday) at 7:00 AM before work',
            field_type: 'text',
            required: true,
            max_length: 200,
          },
        ],
      },
      {
        id: 'obstacles',
        title: 'Anticipate Obstacles',
        description:
          'What could get in the way, and how will you handle it?',
        fields: [
          {
            id: 'potential_obstacle',
            label: 'The most likely obstacle',
            placeholder:
              "e.g., I'll feel tired and want to sleep in",
            field_type: 'textarea',
            required: true,
            max_length: 300,
          },
          {
            id: 'if_then_plan',
            label: 'My IF-THEN plan',
            placeholder:
              "e.g., IF I feel too tired, THEN I'll put on shoes and walk for just 5 minutes",
            field_type: 'textarea',
            required: true,
            helper_text:
              'IF [obstacle happens], THEN I will [specific response]',
            max_length: 300,
          },
        ],
      },
    ],
  },
];
