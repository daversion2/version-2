// Daily Check-in factors — the structured "inputs" logged each night alongside
// the day grade. Kept deliberately small and fixed so the data stays consistent
// enough to correlate against outcomes (practices completed, overrides, grade)
// over time. See docs/mockups/reflection-checkin.html for the design.

export type FactorType = 'binary' | 'scale';

// Whether the factor describes last night (a lagged input that affects *today's*
// outcomes, e.g. sleep) or something about today itself. Stored on each answer
// so the future insights engine can align factors to the right day's outcomes.
export type FactorTiming = 'last_night' | 'today';

export interface FactorOption {
  value: string; // stored value (stable; never change once shipped)
  label: string; // display text
}

export interface FactorDefinition {
  id: string; // stable key stored in Firestore; never rename once shipped
  label: string;
  emoji: string;
  type: FactorType;
  timing: FactorTiming;
  // Ordered low → high for scales, [negative, positive] for binary.
  options: FactorOption[];
}

const BINARY: FactorOption[] = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
];

const LOW_MED_HIGH: FactorOption[] = [
  { value: 'low', label: 'Low' },
  { value: 'med', label: 'Med' },
  { value: 'high', label: 'High' },
];

export const DAILY_FACTORS: FactorDefinition[] = [
  {
    id: 'sleep',
    label: 'Sleep',
    emoji: '😴',
    type: 'scale',
    timing: 'last_night',
    options: [
      { value: 'low', label: 'Poor' },
      { value: 'med', label: 'OK' },
      { value: 'high', label: 'Great' },
    ],
  },
  {
    id: 'ate_healthy',
    label: 'Ate healthy',
    emoji: '🥗',
    type: 'binary',
    timing: 'today',
    options: BINARY,
  },
  {
    id: 'exercised',
    label: 'Exercised / trained',
    emoji: '🏋️',
    type: 'binary',
    timing: 'today',
    options: BINARY,
  },
  {
    id: 'stress',
    label: 'Stress',
    emoji: '💫',
    type: 'scale',
    timing: 'today',
    options: LOW_MED_HIGH,
  },
  {
    id: 'energy',
    label: 'Energy',
    emoji: '⚡',
    type: 'scale',
    timing: 'today',
    options: LOW_MED_HIGH,
  },
  {
    id: 'alcohol',
    label: 'Alcohol',
    emoji: '🍷',
    type: 'binary',
    timing: 'today',
    options: BINARY,
  },
];

const FACTORS_BY_ID: Record<string, FactorDefinition> = Object.fromEntries(
  DAILY_FACTORS.map(f => [f.id, f])
);

export function getFactorDefinition(id: string): FactorDefinition | undefined {
  return FACTORS_BY_ID[id];
}

// Human-readable label for a stored (factorId, value) pair — used when rendering
// past check-ins. Returns null if the factor or value is no longer recognized.
export function getFactorOptionLabel(id: string, value: string): string | null {
  const def = FACTORS_BY_ID[id];
  if (!def) return null;
  return def.options.find(o => o.value === value)?.label ?? null;
}
