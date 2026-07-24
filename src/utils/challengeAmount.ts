// Some library challenges carry a quantity placeholder in their name — e.g.
// "Fast for X Hours", "Do X Burpees", "Read for X Minutes". Historically that
// "X" was never filled in, so users started challenges literally named
// "Fast for X Hours". This resolves the placeholder into a concrete number the
// user picks, detecting the need (and its unit) straight from the name — so it
// works against the existing Firestore library data with no migration.

export interface ChallengeAmountSpec {
  /** Normalized unit key. */
  unit: string;
  /** Display label shown to the user, e.g. "hours", "burpees". */
  unitLabel: string;
  /** Quick-pick amounts. */
  presets: number[];
  /** Preselected amount. */
  default: number;
}

// Quick-pick values per normalized unit.
const UNIT_CONFIG: Record<string, { presets: number[]; default: number }> = {
  hours: { presets: [12, 16, 24], default: 16 },
  minutes: { presets: [15, 30, 45, 60], default: 30 },
  miles: { presets: [1, 2, 3, 5], default: 2 },
  reps: { presets: [20, 50, 100], default: 50 },
};

// The raw unit word that follows the placeholder → normalized unit + label.
const UNIT_ALIASES: Record<string, { unit: string; label: string }> = {
  hour: { unit: 'hours', label: 'hours' },
  hours: { unit: 'hours', label: 'hours' },
  min: { unit: 'minutes', label: 'minutes' },
  mins: { unit: 'minutes', label: 'minutes' },
  minute: { unit: 'minutes', label: 'minutes' },
  minutes: { unit: 'minutes', label: 'minutes' },
  mile: { unit: 'miles', label: 'miles' },
  miles: { unit: 'miles', label: 'miles' },
  burpee: { unit: 'reps', label: 'burpees' },
  burpees: { unit: 'reps', label: 'burpees' },
};

// A quantity placeholder = a standalone "X" (or "{amount}") followed by a unit
// word. Requiring the trailing unit keeps this from matching an "X" that isn't
// a placeholder (e.g. the platform "X" in a description).
const PLACEHOLDER_UNIT_RE = /\b(?:X|\{amount\})\s+([A-Za-z]+)/;

/** The placeholder token itself, used for substitution. */
const PLACEHOLDER_TOKEN_RE = /\b(?:X|\{amount\})\b/g;

/**
 * If the name contains a fillable quantity placeholder, return how to prompt
 * for it (unit + suggested amounts). Otherwise null.
 */
export const getChallengeAmountSpec = (name: string): ChallengeAmountSpec | null => {
  const match = name.match(PLACEHOLDER_UNIT_RE);
  if (!match) return null;
  const alias = UNIT_ALIASES[match[1].toLowerCase()];
  if (!alias) return null;
  const cfg = UNIT_CONFIG[alias.unit];
  return { unit: alias.unit, unitLabel: alias.label, presets: cfg.presets, default: cfg.default };
};

/** Replace the quantity placeholder in a string with a concrete number. */
export const fillChallengeAmount = (text: string, amount: number): string =>
  text.replace(PLACEHOLDER_TOKEN_RE, String(amount));
