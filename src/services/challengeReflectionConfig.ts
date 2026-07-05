/**
 * Admin-configurable reflection prompts — shared by the post-challenge
 * reflection AND the practice Capture flow, so both ask the identical
 * questions.
 *
 * Mirrors microExercisesConfig.ts / toolsConfig.ts: the prompt list lives in
 * the config/challengeReflectionPrompts Firestore document (the historical
 * id, kept for continuity), editable from Admin > Reflection Prompts, with
 * DEFAULT_REFLECTION_PROMPTS as the bundled default and "Reset to defaults"
 * source.
 *
 * The conversational reflection flow renders the enabled prompts
 * one-per-screen; the answers are joined into Challenge.reflection_note /
 * the practice completion log's notes — no Firestore schema change.
 */
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import {
  DEFAULT_REFLECTION_PROMPTS,
  ReflectionPromptDefinition,
  ReflectionInputStyle,
} from '../data/challengeReflectionPrompts';

/** A configurable reflection prompt — a definition plus an enabled flag. */
export interface ReflectionPrompt extends ReflectionPromptDefinition {
  enabled: boolean;
}

export interface ChallengeReflectionConfig {
  prompts: ReflectionPrompt[];
}

export const DEFAULT_CHALLENGE_REFLECTION_CONFIG: ChallengeReflectionConfig = {
  prompts: DEFAULT_REFLECTION_PROMPTS.map((p) => ({ ...p, enabled: true })),
};

const configDocRef = () => doc(db, 'config', 'challengeReflectionPrompts');

const asString = (v: any, fallback = ''): string =>
  typeof v === 'string' ? v : fallback;

const sanitizePrompt = (raw: any, idx: number): ReflectionPrompt | null => {
  if (!raw || typeof raw !== 'object') return null;
  const prompt = asString(raw.prompt).trim();
  if (!prompt) return null; // a blank question has nothing to ask
  const max_length =
    typeof raw.max_length === 'number' && raw.max_length > 0
      ? Math.floor(raw.max_length)
      : undefined;
  const input: ReflectionInputStyle =
    raw.input === 'oneliner' || raw.input === 'choice' ? raw.input : 'text';
  return {
    id: asString(raw.id).trim() || `prompt-${idx}`,
    prompt,
    placeholder: asString(raw.placeholder).trim() || undefined,
    helper_text: asString(raw.helper_text).trim() || undefined,
    max_length,
    input,
    // Choice extras only make sense on a choice prompt; blank labels fall
    // back to Yes/No at render time.
    yes_label: input === 'choice' ? asString(raw.yes_label).trim() || undefined : undefined,
    no_label: input === 'choice' ? asString(raw.no_label).trim() || undefined : undefined,
    followup_prompt:
      input === 'choice' ? asString(raw.followup_prompt).trim() || undefined : undefined,
    followup_placeholder:
      input === 'choice' ? asString(raw.followup_placeholder).trim() || undefined : undefined,
    enabled: raw.enabled !== false,
  };
};

export const sanitizeChallengeReflectionConfig = (
  raw: any
): ChallengeReflectionConfig => {
  const list = Array.isArray(raw?.prompts) ? raw.prompts : [];
  const seen = new Set<string>();
  const prompts: ReflectionPrompt[] = [];
  list.forEach((p: any, idx: number) => {
    const clean = sanitizePrompt(p, idx);
    if (!clean || seen.has(clean.id)) return;
    seen.add(clean.id);
    prompts.push(clean);
  });
  return { prompts };
};

// ---------- Reads ----------

export const getChallengeReflectionConfig =
  async (): Promise<ChallengeReflectionConfig> => {
    try {
      const snap = await getDoc(configDocRef());
      if (!snap.exists()) return DEFAULT_CHALLENGE_REFLECTION_CONFIG;
      const clean = sanitizeChallengeReflectionConfig(snap.data());
      // An empty list would leave the flow with nothing to ask — fall back.
      return clean.prompts.length > 0
        ? clean
        : DEFAULT_CHALLENGE_REFLECTION_CONFIG;
    } catch (err) {
      console.warn('Reflection prompts config fetch failed — using defaults:', err);
      return DEFAULT_CHALLENGE_REFLECTION_CONFIG;
    }
  };

export const getChallengeReflectionConfigWithTimeout = (
  ms = 3000
): Promise<ChallengeReflectionConfig> =>
  Promise.race([
    getChallengeReflectionConfig(),
    new Promise<ChallengeReflectionConfig>((resolve) =>
      setTimeout(() => resolve(DEFAULT_CHALLENGE_REFLECTION_CONFIG), ms)
    ),
  ]);

// ---------- Admin writes ----------

// Firestore rejects `undefined` field values — drop them before writing.
const stripUndefined = (obj: Record<string, any>) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

export const saveChallengeReflectionConfig = async (
  config: ChallengeReflectionConfig
): Promise<void> => {
  await setDoc(configDocRef(), {
    prompts: sanitizeChallengeReflectionConfig(config).prompts.map(stripUndefined),
    updated_at: new Date().toISOString(),
  });
};

export const resetChallengeReflectionConfig = async (): Promise<void> => {
  await deleteDoc(configDocRef());
};

export const newReflectionPrompt = (suffix: string): ReflectionPrompt => ({
  id: `prompt-${suffix}`,
  prompt: '',
  placeholder: '',
  helper_text: '',
  input: 'text',
  enabled: true,
});
