// =============================================================================
// Compose (Lab): the narrators and backgrounds a user can pick.
//
// Mirrors content/meditations/voices.json and content/meditations/ambience/,
// which the Cloud Function uses — a test (composeCatalog.test.ts) fails if the
// two drift. The sample clips are in assets/compose/ (scripts/
// makeComposeSamples.ts) and mapped in screens/Lab/experiments/compose/
// components/sampleAssets.ts. Voice IDs stay server-side.
// =============================================================================

export interface ComposeVoiceOption {
  key: string;
  name: string;
  blurb: string;
}

export interface ComposeBackgroundOption {
  key: string;
  label: string;
  /** Ionicons name. */
  icon: string;
}

export const COMPOSE_VOICES: ComposeVoiceOption[] = [
  { key: 'daisy', name: 'Daisy', blurb: 'Calm, kind and natural. Canadian.' },
  { key: 'regina', name: 'Regina', blurb: 'Smooth and meditative. British.' },
  { key: 'friend', name: 'Best Female Friend', blurb: 'Warm and conversational. British.' },
  { key: 'steffy', name: 'Steffy', blurb: 'Clear and professional. British.' },
  { key: 'tessa', name: 'Tessa', blurb: 'Deep and wise. British.' },
];

export const COMPOSE_BACKGROUNDS: ComposeBackgroundOption[] = [
  { key: 'rain', label: 'Rain', icon: 'rainy-outline' },
  { key: 'ocean', label: 'Ocean', icon: 'water-outline' },
  { key: 'creek', label: 'Creek', icon: 'git-merge-outline' },
  { key: 'forest', label: 'Forest', icon: 'leaf-outline' },
  { key: 'fire', label: 'Fire', icon: 'flame-outline' },
  { key: 'drone', label: 'Warm drone', icon: 'radio-outline' },
  { key: 'brown-noise', label: 'Brown noise', icon: 'pulse-outline' },
  { key: 'pink-noise', label: 'Pink noise', icon: 'pulse-outline' },
];

export const COMPOSE_KNOWN = {
  voices: COMPOSE_VOICES.map((v) => v.key),
  ambience: COMPOSE_BACKGROUNDS.map((b) => b.key),
};
