import { TrackingField } from './practices';

// =============================================================================
// HABIT TEMPLATES (D3)
//
// A template is the set of metrics a habit asks for on completion, on top of the
// always-present resistance rating. Curated library habits carry a bespoke
// template authored into their definition; CUSTOM habits — which have no catalog
// entry — pick one of the presets below at creation.
//
// Deliberately a fixed picker rather than a template builder: six presets cover
// nearly every real habit, cost one screen instead of a month, and every custom
// habit still gets trend charts because each preset's field is numeric (except
// 'none', which is the point of 'none').
// =============================================================================

export type HabitTemplateId = 'none' | 'time' | 'distance' | 'reps' | 'count' | 'grade';

export interface HabitTemplatePreset {
  id: HabitTemplateId;
  /** Shown on the picker chip. */
  label: string;
  /** One line explaining when to choose it. */
  description: string;
  icon: string;
  /** The fields this preset adds. Empty for 'none'. */
  fields: TrackingField[];
}

export const HABIT_TEMPLATE_PRESETS: HabitTemplatePreset[] = [
  {
    id: 'none',
    label: 'Just the check-in',
    description: 'Only asks how hard it was to start. Right for most habits.',
    icon: 'checkmark-circle-outline',
    fields: [],
  },
  {
    id: 'time',
    label: 'Time',
    description: 'How long you spent — reading, practising, meditating.',
    icon: 'timer-outline',
    fields: [
      {
        key: 'duration_min',
        label: 'How long?',
        type: 'duration',
        unit: 'min',
        min: 1,
        max: 120,
        step: 1,
        default: 20,
        record: { label: 'Longest session', icon: 'timer-outline' },
      },
    ],
  },
  {
    id: 'distance',
    label: 'Distance',
    description: 'How far you went — running, walking, cycling.',
    icon: 'map-outline',
    fields: [
      {
        key: 'distance_mi',
        label: 'How far?',
        type: 'number',
        unit: 'mi',
        min: 0,
        max: 30,
        step: 1,
        default: 3,
        record: { label: 'Furthest', icon: 'map-outline' },
      },
    ],
  },
  {
    id: 'reps',
    label: 'Reps or sets',
    description: 'How many you did — push-ups, sets, rounds.',
    icon: 'barbell-outline',
    fields: [
      {
        key: 'reps',
        label: 'How many?',
        type: 'number',
        unit: 'reps',
        min: 1,
        max: 200,
        step: 1,
        default: 20,
        record: { label: 'Most reps', icon: 'barbell-outline' },
      },
    ],
  },
  {
    id: 'count',
    label: 'Count',
    description: 'A simple tally — glasses of water, pages, calls made.',
    icon: 'list-outline',
    fields: [
      {
        key: 'count',
        label: 'How many?',
        type: 'number',
        min: 1,
        max: 50,
        step: 1,
        default: 5,
        record: { label: 'Highest count', icon: 'list-outline' },
      },
    ],
  },
  {
    id: 'grade',
    label: 'Grade',
    description: 'How well you held to it — for habits that aren’t all-or-nothing.',
    icon: 'ribbon-outline',
    fields: [
      {
        key: 'grade',
        label: 'How well did you stick to it?',
        // 'scale', not 'choice' — a grade has to be numeric so it draws a trend
        // line rather than a distribution. See TrackingField in data/practices.ts.
        type: 'scale',
        min: 1,
        max: 5,
        step: 1,
        default: 3,
        labels: { low: 'Fell off it', high: 'Nailed it' },
        record: { label: 'Best day', icon: 'ribbon-outline' },
      },
    ],
  },
];

const BY_ID: Record<string, HabitTemplatePreset> = HABIT_TEMPLATE_PRESETS.reduce(
  (acc, p) => {
    acc[p.id] = p;
    return acc;
  },
  {} as Record<string, HabitTemplatePreset>
);

export const getTemplatePreset = (id?: string | null): HabitTemplatePreset | undefined =>
  id ? BY_ID[id] : undefined;

/**
 * Resolve the tracking fields for a habit instance. Curated habits read their
 * template from the catalog definition; custom habits resolve theirs from the
 * preset they were created with.
 */
export const resolveTemplateFields = (instance: {
  template_id?: string;
}): TrackingField[] => getTemplatePreset(instance.template_id)?.fields ?? [];
