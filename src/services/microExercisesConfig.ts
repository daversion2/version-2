/**
 * Admin-configurable Micro-Exercises — the short, triggered interventions.
 * Mirrors toolsConfig.ts / onboardingConfig.ts: the list lives in the
 * config/microExercises Firestore document, editable from Admin >
 * Micro-Exercises, with the hardcoded MICRO_EXERCISES array as the bundled
 * default and "Reset to defaults" source.
 *
 * Each micro-exercise links to a tool via source_template_id. That link is
 * NOT validated here (a tool may legitimately be loading) — the consumer
 * (ToolsContext / the "Go Deeper" button) resolves it against the live tool
 * list and degrades gracefully when the tool is missing or disabled.
 */
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { MICRO_EXERCISES } from '../data/microExercises';
import {
  MicroExerciseDefinition,
  MicroExerciseQuestion,
} from '../types/microExercise';
import { MicroExerciseTrigger } from '../types/worksheets';

/** A configurable micro-exercise — a definition plus an enabled flag. */
export interface MicroExerciseConfigItem extends MicroExerciseDefinition {
  enabled: boolean;
}

export interface MicroExercisesConfig {
  exercises: MicroExerciseConfigItem[];
}

export const VALID_TRIGGERS: MicroExerciseTrigger[] = [
  'comeback',
  'challenge_failure',
  'reflection',
  'inactivity',
];

export const DEFAULT_MICRO_EXERCISES_CONFIG: MicroExercisesConfig = {
  exercises: MICRO_EXERCISES.map((ex) => ({ ...ex, enabled: true })),
};

const configDocRef = () => doc(db, 'config', 'microExercises');

const asString = (v: any, fallback = ''): string =>
  typeof v === 'string' ? v : fallback;

const emptyQuestion = (idx: number): MicroExerciseQuestion => ({
  id: `q${idx + 1}`,
  prompt: '',
  placeholder: '',
});

const sanitizeQuestion = (raw: any, idx: number): MicroExerciseQuestion => {
  if (!raw || typeof raw !== 'object') return emptyQuestion(idx);
  return {
    id: asString(raw.id) || `q${idx + 1}`,
    prompt: asString(raw.prompt),
    placeholder: asString(raw.placeholder),
  };
};

/** Force the questions array to exactly three (the type is a 3-tuple). */
const sanitizeQuestions = (
  raw: any
): [MicroExerciseQuestion, MicroExerciseQuestion, MicroExerciseQuestion] => {
  const list = Array.isArray(raw) ? raw : [];
  return [0, 1, 2].map((i) => sanitizeQuestion(list[i], i)) as [
    MicroExerciseQuestion,
    MicroExerciseQuestion,
    MicroExerciseQuestion
  ];
};

const sanitizeTriggers = (raw: any): MicroExerciseTrigger[] => {
  if (!Array.isArray(raw)) return [];
  return raw.filter((t): t is MicroExerciseTrigger => VALID_TRIGGERS.includes(t));
};

const sanitizeExercise = (raw: any, idx: number): MicroExerciseConfigItem | null => {
  if (!raw || typeof raw !== 'object') return null;
  const feeling_key = asString(raw.feeling_key).trim() || `feeling-${idx}`;
  const feeling_label = asString(raw.feeling_label).trim();
  if (!feeling_label) return null;
  return {
    feeling_key,
    feeling_label,
    source_template_id: asString(raw.source_template_id),
    default_for_triggers: sanitizeTriggers(raw.default_for_triggers),
    questions: sanitizeQuestions(raw.questions),
    completion_affirmation: asString(raw.completion_affirmation),
    enabled: raw.enabled !== false,
  };
};

export const sanitizeMicroExercisesConfig = (raw: any): MicroExercisesConfig => {
  const list = Array.isArray(raw?.exercises) ? raw.exercises : [];
  const seen = new Set<string>();
  const exercises: MicroExerciseConfigItem[] = [];
  list.forEach((ex: any, idx: number) => {
    const clean = sanitizeExercise(ex, idx);
    if (!clean || seen.has(clean.feeling_key)) return;
    seen.add(clean.feeling_key);
    exercises.push(clean);
  });
  return { exercises };
};

// ---------- Reads ----------

export const getMicroExercisesConfig = async (): Promise<MicroExercisesConfig> => {
  try {
    const snap = await getDoc(configDocRef());
    if (!snap.exists()) return DEFAULT_MICRO_EXERCISES_CONFIG;
    const clean = sanitizeMicroExercisesConfig(snap.data());
    // An empty list would leave triggers with no exercise to show — fall back.
    return clean.exercises.length > 0 ? clean : DEFAULT_MICRO_EXERCISES_CONFIG;
  } catch (err) {
    console.warn('Micro-exercises config fetch failed — using defaults:', err);
    return DEFAULT_MICRO_EXERCISES_CONFIG;
  }
};

export const getMicroExercisesConfigWithTimeout = (
  ms = 3000
): Promise<MicroExercisesConfig> =>
  Promise.race([
    getMicroExercisesConfig(),
    new Promise<MicroExercisesConfig>((resolve) =>
      setTimeout(() => resolve(DEFAULT_MICRO_EXERCISES_CONFIG), ms)
    ),
  ]);

// ---------- Admin writes ----------

export const saveMicroExercisesConfig = async (
  config: MicroExercisesConfig
): Promise<void> => {
  await setDoc(configDocRef(), {
    exercises: sanitizeMicroExercisesConfig(config).exercises,
    updated_at: new Date().toISOString(),
  });
};

export const resetMicroExercisesConfig = async (): Promise<void> => {
  await deleteDoc(configDocRef());
};

export const newMicroExercise = (suffix: string): MicroExerciseConfigItem => ({
  feeling_key: `feeling-${suffix}`,
  feeling_label: 'New feeling',
  source_template_id: '',
  default_for_triggers: [],
  questions: [
    { id: 'q1', prompt: '', placeholder: '' },
    { id: 'q2', prompt: '', placeholder: '' },
    { id: 'q3', prompt: '', placeholder: '' },
  ],
  completion_affirmation: '',
  enabled: true,
});
