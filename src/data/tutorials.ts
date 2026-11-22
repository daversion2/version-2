// In-app tutorial and explainer videos. `storagePath` is the file in Firebase
// Storage. Entries are added by `scripts/video/publish.mjs`; nothing plays them
// yet (see docs/backlog.md, "In-app tutorial and explainer videos").

export type TutorialKind = 'tutorial' | 'explainer';

export interface Tutorial {
  id: string;
  title: string;
  kind: TutorialKind;
  storagePath: string;
  durationSec: number;
  /** The screen whose ⓘ intro offers this video (a `screenIntros` key). */
  screen?: string;
}

export const TUTORIALS: Tutorial[] = [
  // <publish:start>
  // <publish:end>
];
