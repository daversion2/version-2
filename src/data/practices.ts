// =============================================================================
// PRACTICE PROTOCOL (V1) — the concrete, recurring practices users do.
//
// A Practice is a curated, habit-shaped definition: a user "adopts" one and it
// becomes a normal habit (with a weekly target + completion + streak). Practices
// add two things on top of a library habit: a display GROUP (activate/calm/restrain)
// and a default CORE flag (admin-overridable later). Per-practice baselines /
// Discomfort Shift are a LATER iteration — not v1.
//
// See docs/practice-protocol-direction.md
// =============================================================================

export type PracticeGroup = 'activate' | 'calm' | 'restrain';

export interface PracticeGroupDef {
  id: PracticeGroup;
  name: string;
  description: string;
  color: string;
  order: number;
}

export interface Practice {
  id: string;
  name: string;
  group: PracticeGroup;
  /** Default core/optional designation. Admin-overridable (see direction doc, Resolved #1). */
  core: boolean;
  /** Default weekly target (a "process goal"); user-adjustable when adopted. */
  suggested_target_per_week: number;
  /** What it is / how to do it. */
  description: string;
  /** Short "insider knowledge" hook (2–3 sentences). */
  whyItWorks: string;
  /** Ionicons name. */
  icon: string;
  /** For optional practices: why it isn't part of the core. */
  optional_reason?: string;
  order: number;
}

export const PRACTICE_GROUPS: PracticeGroupDef[] = [
  {
    id: 'activate',
    name: 'Activate',
    description: 'Deliberately stress the body — and stay in it.',
    color: '#FF5B02', // orange
    order: 1,
  },
  {
    id: 'calm',
    name: 'Calm',
    description: 'Regulate your state and your attention on command.',
    color: '#217180', // teal
    order: 2,
  },
  {
    id: 'restrain',
    name: 'Restrain',
    description: 'Resist the urge — for stimulation, for the reward, for more.',
    color: '#7B61FF', // purple
    order: 3,
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
      "Sitting with no input trains the prefrontal cortex to regulate the brain's default-mode network. It's the foundational override rep — staying when everything says get up.",
    icon: 'flower-outline',
    order: 1,
  },
  {
    id: 'breathwork',
    name: 'Breathwork',
    group: 'calm',
    core: true,
    suggested_target_per_week: 7,
    description: 'A few minutes of slow, deliberate breathing — longer exhale than inhale.',
    whyItWorks:
      'Breathing is the one autonomic system you can drive on command. Extending the exhale activates the vagus nerve and shifts you from fight-or-flight to rest-and-recover.',
    icon: 'pulse-outline',
    order: 2,
  },
  {
    id: 'reflection',
    name: 'Reflection',
    group: 'calm',
    core: true,
    suggested_target_per_week: 7,
    description: 'A short end-of-day look back: where did you override, and where did you give in?',
    whyItWorks:
      'Naming the moment between the stop signal and your choice sharpens your awareness of it — which is what lets you catch it next time.',
    icon: 'create-outline',
    order: 3,
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
