// =============================================================================
// PRACTICE PROTOCOL — the concrete, recurring practices users do.
//
// A Practice is a curated, habit-shaped definition (adopt one → it becomes a
// normal habit with a weekly target + completion + streak), plus a display GROUP
// (activate/calm/restrain), a default CORE flag (admin-overridable later), and
// rich "learn" content (how-to, science, tips, variations) shown on the detail
// screen — the practice's own version of the per-day content Programs carry.
// Per-practice baselines / Discomfort Shift are a later iteration.
//
// See docs/practice-protocol-direction.md
// =============================================================================

export type PracticeGroup = 'activate' | 'calm' | 'restrain' | 'custom';

export interface PracticeGroupDef {
  id: PracticeGroup;
  name: string;
  description: string;
  color: string;
  order: number;
}

export interface PracticeVariation {
  label: string;
  description: string;
}

/**
 * An optional, per-practice metric the user can log on completion. Rendered by a
 * single generic input in the completion sheet and stored in CompletionLog.metrics
 * under `key`. Numeric fields feed dashboard trends; 'choice' fields feed distributions.
 */
export interface TrackingField {
  /** Stable storage key, written to CompletionLog.metrics. */
  key: string;
  /** Short prompt, e.g. "How long?". */
  label: string;
  type: 'duration' | 'number' | 'choice';
  /** Display unit for number/duration, e.g. 'min', '°F', 'rounds', 'hrs'. */
  unit?: string;
  /** Options for type: 'choice'. */
  options?: { value: string; label: string }[];
  /** Slider bounds + increment for number/duration fields. */
  min?: number;
  max?: number;
  step?: number;
  /** Sensible starting value shown before the user touches the slider. */
  default?: number;
}

export interface Practice {
  id: string;
  name: string;
  group: PracticeGroup;
  /** Default core/optional designation. Admin-overridable. */
  core: boolean;
  /** Default weekly target (a "process goal"); user-adjustable when adopted. */
  suggested_target_per_week: number;
  /** One-line overview of what it is. */
  description: string;
  /** Short "insider knowledge" hook. */
  whyItWorks: string;
  /** Ionicons name. */
  icon: string;
  /** For optional practices: why it isn't part of the core. */
  optional_reason?: string;
  order: number;

  // ---- "Learn" content (shown on the practice detail screen) ----
  /** Concrete steps to do a session. */
  howTo: string[];
  /** The smallest version for a hard day. */
  minimumVersion?: string;
  /** Deeper neuroscience explainer (1–2 short paragraphs). */
  science: string;
  /** Practical pointers + safety cautions. */
  tips: string[];
  /** Named ways to do it. */
  variations?: PracticeVariation[];

  // ---- Post-completion: tracking + override reflection ----
  /**
   * The characteristic resistance moment — the predictable "get-out" urge this
   * practice provokes. Anchors the reflection gate ("Did you hit the moment when
   * ___?"). Omit for practices with no sharp resistance point.
   */
  resistanceMoment?: string;
  /** Optional detailed metrics the user can log for this practice. */
  tracking?: TrackingField[];
}

export const PRACTICE_GROUPS: PracticeGroupDef[] = [
  {
    id: 'activate',
    name: 'Activate',
    description: 'Deliberately stress the body — and stay in it.',
    color: '#FF5B02',
    order: 1,
  },
  {
    id: 'calm',
    name: 'Calm',
    description: 'Regulate your state and your attention on command.',
    color: '#217180',
    order: 2,
  },
  {
    id: 'restrain',
    name: 'Restrain',
    description: 'Resist the urge — for stimulation, for the reward, for more.',
    color: '#7B61FF',
    order: 3,
  },
  {
    // User-authored practices (no catalog entry). Visually neutral to signal
    // "your own / not part of the curated protocol."
    id: 'custom',
    name: 'Custom',
    description: 'Practices you create yourself.',
    color: '#8A8F98',
    order: 4,
  },
];

export const PRACTICES: Practice[] = [
  // ---- Calm ----
  {
    id: 'meditation',
    name: 'Meditation',
    group: 'calm',
    core: true,
    suggested_target_per_week: 5,
    description: 'Sit quietly and observe your mind without acting on every urge to move or escape.',
    whyItWorks:
      "Sitting with no input trains the prefrontal cortex to regulate the brain's default-mode network. The foundational override rep — staying when everything says get up.",
    icon: 'flower-outline',
    order: 1,
    howTo: [
      'Sit upright somewhere quiet — chair or floor, eyes closed.',
      'Pick an anchor: the feeling of your breath, or a word you repeat.',
      'When your mind wanders (it will), notice it and return to the anchor — that return is the rep.',
      'Let the timer run without checking it.',
    ],
    minimumVersion: 'Two minutes watching a single breath in and out.',
    science:
      "Sitting with no input shifts activity away from the default-mode network — the wandering, self-referential chatter — toward the prefrontal and anterior cingulate cortex, the circuits of effortful attention. Every time you notice you've drifted and come back, you do one rep of the same control you use to override any urge.",
    tips: [
      "Wandering isn't failure — noticing it and returning is the entire exercise.",
      'Same time, same spot each day makes it automatic.',
      "Don't chase a 'blank mind'; aim for 'I noticed, and I came back.'",
    ],
    variations: [
      { label: 'Breath focus', description: 'Anchor on the sensation of breathing.' },
      { label: 'Body scan', description: 'Move attention slowly from head to toe.' },
      { label: 'Open awareness', description: 'Notice whatever arises without following it.' },
    ],
    resistanceMoment: 'you noticed you’d drifted and wanted to get up or check the time',
    tracking: [
      { key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min', min: 1, max: 60, step: 1, default: 10 },
      {
        key: 'technique',
        label: 'Technique',
        type: 'choice',
        options: [
          { value: 'breath', label: 'Breath focus' },
          { value: 'body_scan', label: 'Body scan' },
          { value: 'open', label: 'Open awareness' },
        ],
      },
    ],
  },
  {
    id: 'breathwork',
    name: 'Breathwork',
    group: 'calm',
    core: true,
    suggested_target_per_week: 7,
    description: 'A few minutes of slow, deliberate breathing — longer exhale than inhale.',
    whyItWorks:
      'Breathing is the one autonomic system you can drive on command. Extending the exhale activates the vagus nerve and shifts you toward rest-and-recover.',
    icon: 'pulse-outline',
    order: 2,
    howTo: [
      'Sit or lie comfortably.',
      'Breathe through the nose; make the exhale longer than the inhale.',
      'Run your chosen pattern for the set time.',
      'Notice how your state changes from start to finish.',
    ],
    minimumVersion: 'Five slow breaths with a long exhale.',
    science:
      "You can't consciously lower your heart rate — but you can lengthen your exhale, which stimulates the vagus nerve and the parasympathetic 'rest and recover' branch. It's the fastest manual lever you have on your own physiology, and proof you can change your state instead of waiting for it to pass.",
    tips: [
      'A longer exhale than inhale is the active ingredient.',
      'Nasal breathing beats mouth breathing for most patterns.',
      'Lightheaded? Return to normal breathing — never force it.',
    ],
    variations: [
      { label: 'Box (4-4-4-4)', description: 'Inhale 4, hold 4, exhale 4, hold 4. Steady and calming.' },
      { label: '4-7-8', description: 'Inhale 4, hold 7, exhale 8. Strong downshift for sleep or anxiety.' },
      { label: 'Physiological sigh', description: 'Two inhales through the nose, one long exhale. Fastest reset.' },
    ],
    tracking: [
      { key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min', min: 1, max: 20, step: 1, default: 5 },
      {
        key: 'technique',
        label: 'Pattern',
        type: 'choice',
        options: [
          { value: 'box', label: 'Box' },
          { value: '478', label: '4-7-8' },
          { value: 'sigh', label: 'Physiological sigh' },
        ],
      },
    ],
  },
  // ---- Activate ----
  {
    id: 'movement',
    name: 'Movement',
    group: 'activate',
    core: true,
    suggested_target_per_week: 4,
    description: 'Intentional physical effort — a workout, a hard walk, anything that makes the body work.',
    whyItWorks:
      'Choosing effort over ease trains the PFC-over-limbic pathway directly, and the post-effort dopamine and mood lift reinforce the choice.',
    icon: 'barbell-outline',
    order: 4,
    howTo: [
      'Pick something that makes the body work — lift, run, ruck, hard walk.',
      'Warm up briefly.',
      'Push to a point that is genuinely effortful, not just comfortable.',
      'Finish even when the urge to stop shows up early.',
    ],
    minimumVersion: 'Ten minutes of brisk movement, or one hard set.',
    science:
      'Choosing exertion engages the prefrontal-cortex-over-limbic pathway and raises norepinephrine and BDNF — which support focus, mood, and learning. The accomplishment and dopamine afterward reinforce the decision to do hard things.',
    tips: [
      'Consistency over intensity — four solid sessions beat one heroic one.',
      'The urge to stop usually peaks early; ride past it.',
      'Any modality counts; the override is choosing effort.',
    ],
    variations: [
      { label: 'Strength', description: 'Resistance training to real effort.' },
      { label: 'Cardio', description: 'Run, row, bike, or swim.' },
      { label: 'Ruck / hard walk', description: 'Weighted or brisk, ideally outdoors.' },
    ],
    resistanceMoment: 'the effort bit and you wanted to stop',
    tracking: [
      { key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min', min: 5, max: 120, step: 5, default: 30 },
      {
        key: 'type',
        label: 'Type',
        type: 'choice',
        options: [
          { value: 'strength', label: 'Strength' },
          { value: 'cardio', label: 'Cardio' },
          { value: 'ruck', label: 'Ruck / walk' },
        ],
      },
    ],
  },
  {
    id: 'cold_exposure',
    name: 'Cold Exposure',
    group: 'activate',
    core: false,
    suggested_target_per_week: 3,
    description: 'A cold shower or plunge — get in, and stay past the urge to get out.',
    whyItWorks:
      'Cold spikes norepinephrine and (afterward) dopamine. Staying in trains you to act through an acute stress response instead of fleeing it.',
    icon: 'snow-outline',
    optional_reason: 'Needs access to a cold shower or plunge.',
    order: 5,
    howTo: [
      'Start the water cold (or fill the plunge).',
      'Get in deliberately — don’t ease in forever.',
      'Slow your breathing; resist the gasp and the urge to bolt.',
      'Stay for your set time, then warm up naturally.',
    ],
    minimumVersion: '30 seconds of cold at the end of your shower.',
    science:
      "Cold triggers a sharp norepinephrine spike — focus and alertness — and an extended dopamine rise afterward, without the crash other sources cause. Choosing to stay while your body screams 'get out' is a pure rep of acting through stress, and repeated exposure recalibrates what your nervous system counts as a threat (stress inoculation).",
    tips: [
      'Control the breath first — long, slow exhales kill the panic.',
      "It should be cold, not dangerous: warm up after, don't push numbness.",
      'CAUTION: skip or consult a doctor with heart conditions, pregnancy, or Raynaud’s.',
    ],
    variations: [
      { label: 'Cold shower', description: 'End your shower on full cold.' },
      { label: 'Cold plunge / ice bath', description: 'Submerge to the neck.' },
      { label: 'Face dunk', description: 'Bowl of ice water — triggers the dive reflex fast.' },
    ],
    resistanceMoment: 'the cold hit and everything said get out',
    tracking: [
      { key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min', min: 1, max: 12, step: 1, default: 2 },
      { key: 'water_temp_f', label: 'Water temp', type: 'number', unit: '°F', min: 33, max: 70, step: 1, default: 50 },
    ],
  },
  {
    id: 'heat_exposure',
    name: 'Heat Exposure',
    group: 'activate',
    core: false,
    suggested_target_per_week: 2,
    description: 'Sauna or sustained heat — sit with the discomfort and stay calm in it.',
    whyItWorks:
      'Heat stress drives cardiovascular and resilience adaptations; staying composed while your body wants out is the rep.',
    icon: 'flame-outline',
    optional_reason: 'Needs access to a sauna or hot bath.',
    order: 6,
    howTo: [
      'Enter a sauna or hot bath.',
      'Settle in and let the heat build.',
      'Keep your breathing slow; sit with the discomfort instead of fleeing it.',
      'Stay for your set time; hydrate after.',
    ],
    minimumVersion: 'A few minutes of sustained heat, building over time.',
    science:
      'Heat stress raises heart rate and core temperature, driving cardiovascular adaptations similar to light exercise, plus heat-shock proteins and a post-session endorphin lift. The override is staying composed while every instinct says leave.',
    tips: [
      'Hydrate before and after.',
      'Build duration gradually; dizziness means get out.',
      'CAUTION: avoid with heart conditions or pregnancy unless cleared by a doctor.',
    ],
    variations: [
      { label: 'Sauna', description: 'Dry or infrared, ~10–20 min.' },
      { label: 'Hot bath', description: 'A hot soak when no sauna is available.' },
      { label: 'Contrast', description: 'Alternate heat and cold.' },
    ],
    resistanceMoment: 'the heat got intense and you wanted to leave',
    tracking: [
      { key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min', min: 5, max: 45, step: 5, default: 15 },
      { key: 'temp_f', label: 'Temp', type: 'number', unit: '°F', min: 120, max: 220, step: 5, default: 170 },
    ],
  },
  // ---- Restrain ----
  {
    id: 'deliberate_boredom',
    name: 'Deliberate Boredom',
    group: 'restrain',
    core: true,
    suggested_target_per_week: 3,
    description: 'No phone, no input — sit with nothing and let the boredom be there.',
    whyItWorks:
      'Constant stimulation downregulates your dopamine baseline. Resisting the urge for input lets it recover — which is what makes willpower feel possible again.',
    icon: 'phone-portrait-outline',
    order: 7,
    howTo: [
      'Put the phone in another room — not just face-down.',
      'Sit with nothing: no screen, no music, no task.',
      'Let the boredom and the urge to grab something just be there.',
      'Stay for your set time.',
    ],
    minimumVersion: 'Five minutes sitting with no phone and no input.',
    science:
      'A constant stream of novelty keeps dopamine elevated and downregulates your baseline — which is why everything else starts to feel boring and willpower feels impossible. Deliberate boredom lets dopamine receptors recover toward baseline. You’re not wasting time; you’re repairing the reward system that makes hard things doable.',
    tips: [
      'Phone in another room beats willpower every time.',
      "Restlessness is the point — that's the urge you're training against.",
      'Looking out a window counts; a second screen does not.',
    ],
    variations: [
      { label: 'Just sit', description: 'Nothing at all — stare out a window.' },
      { label: 'Single-task', description: 'Do one thing slowly, with no second screen.' },
      { label: 'Phone-free walk', description: 'Walk with no phone or earbuds.' },
    ],
    resistanceMoment: 'you reached for your phone or something to fill the space',
    tracking: [
      { key: 'duration_min', label: 'How long?', type: 'duration', unit: 'min', min: 5, max: 60, step: 5, default: 10 },
    ],
  },
  {
    id: 'fasting',
    name: 'Fasting',
    group: 'restrain',
    core: false,
    suggested_target_per_week: 1,
    description: 'A deliberate fasting window — sit with hunger without acting on it.',
    whyItWorks:
      'Hunger is a clean, recurring urge. Choosing to wait strengthens prefrontal control over immediate reward — the foundation of delayed gratification.',
    icon: 'time-outline',
    optional_reason: 'Skip if you have any medical reason not to fast.',
    order: 8,
    howTo: [
      'Pick a window (e.g. 16 hours) or skip one meal.',
      'When hunger hits, notice it without acting.',
      'Hydrate — water, black coffee, tea.',
      'Break the fast calmly when your window ends.',
    ],
    minimumVersion: 'Push your first meal back by two hours.',
    science:
      "Hunger arrives in waves and passes — it isn't an emergency. Choosing to wait strengthens prefrontal control over immediate reward and builds delay tolerance, the same circuit behind every long-term goal. (Metabolic effects are a bonus; the override is the point.)",
    tips: [
      'Hunger comes in waves — ride one out and it fades.',
      'Hydrate; black coffee blunts appetite.',
      'CAUTION: not for those with a history of disordered eating, diabetes, pregnancy, or who are underweight — check with a doctor.',
    ],
    variations: [
      { label: '16:8', description: '16-hour fast, 8-hour eating window.' },
      { label: 'Skip a meal', description: 'Drop one meal deliberately.' },
      { label: '24-hour', description: 'Advanced: one full day, occasionally.' },
    ],
    resistanceMoment: 'a craving spiked and you wanted to eat',
    tracking: [
      { key: 'duration_hrs', label: 'Fasting window', type: 'duration', unit: 'hrs', min: 12, max: 36, step: 1, default: 16 },
    ],
  },
  {
    id: 'eat_healthy_unenjoyable',
    name: 'Eat Healthy Food I Don’t Enjoy',
    group: 'restrain',
    core: false,
    suggested_target_per_week: 5,
    description: 'Choose the nutritious option over the one you crave — and eat it without doctoring it up.',
    whyItWorks:
      'Every meal is a fork between what’s rewarding and what’s good for you. Picking the plain, healthy option is a rep of overriding the reward circuit in real time.',
    icon: 'nutrition-outline',
    optional_reason: 'A discipline rep — adopt it if food is one of your battlegrounds.',
    order: 9,
    howTo: [
      'Pick a genuinely healthy option you don’t love — not a tasty “healthy” treat.',
      'Decide before you’re hungry, so the choice is made before the craving hits.',
      'Eat it deliberately, without sauces or extras that turn it into something you enjoy.',
      'When the urge to swap it for something tastier shows up, notice it and let it pass.',
    ],
    minimumVersion: 'Swap the most craving-driven item in one meal for something plain and healthy.',
    science:
      'Hyper-palatable food is engineered to hijack the same dopamine reward pathway as any other craving. Deliberately choosing food you don’t enjoy — and eating it anyway — is a direct rep of prefrontal control over the reward system. Done often, the pull of the tastiest option loses some of its grip, because you’ve trained the choice instead of feeding the craving.',
    tips: [
      'Decide before you’re hungry — willpower is weakest at the moment of craving.',
      'Don’t disguise it. The point is to sit with “not enjoyable,” not to make it enjoyable.',
      'Bland and nutritious beats tasty and “healthy” for this rep.',
      'CAUTION: this is discipline, not deprivation — eat enough, and skip it if you have any history of disordered eating.',
    ],
    variations: [
      { label: 'Plain protein + veg', description: 'A simple whole-food meal, minimally seasoned.' },
      { label: 'Swap one item', description: 'Replace the most craving-driven part of a meal with a healthy plain option.' },
      { label: 'No-extras meal', description: 'Eat it without the condiments and add-ons that make it enjoyable.' },
    ],
    resistanceMoment: 'you wanted to swap it for something tastier or reach for what you were craving',
    tracking: [
      {
        key: 'meal',
        label: 'Which meal?',
        type: 'choice',
        options: [
          { value: 'breakfast', label: 'Breakfast' },
          { value: 'lunch', label: 'Lunch' },
          { value: 'dinner', label: 'Dinner' },
          { value: 'snack', label: 'Snack' },
        ],
      },
    ],
  },
];

const PRACTICE_BY_ID: Record<string, Practice> = PRACTICES.reduce((acc, p) => {
  acc[p.id] = p;
  return acc;
}, {} as Record<string, Practice>);

export const getPractice = (id?: string | null): Practice | undefined =>
  id ? PRACTICE_BY_ID[id] : undefined;

export const getPracticesByGroup = (group: PracticeGroup): Practice[] =>
  PRACTICES.filter((p) => p.group === group).sort((a, b) => a.order - b.order);

export const getCorePractices = (): Practice[] => PRACTICES.filter((p) => p.core);

export const getOptionalPractices = (): Practice[] => PRACTICES.filter((p) => !p.core);

/**
 * Resolve the display group for an adopted practice instance.
 * - Curated practices derive their group from the catalog (via practice_id).
 * - Custom (user-authored) practices carry their own `group`; anything missing
 *   one — including legacy custom habits created before this field existed —
 *   falls back to 'custom'. Computed at read time, so no data migration.
 */
export const resolvePracticeGroup = (instance: {
  practice_id?: string;
  group?: PracticeGroup;
}): PracticeGroup => {
  const catalog = getPractice(instance.practice_id);
  if (catalog) return catalog.group;
  return instance.group ?? 'custom';
};
