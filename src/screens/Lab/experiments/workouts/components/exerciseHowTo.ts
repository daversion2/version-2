import type { ImageSourcePropType } from 'react-native';
import { EXERCISE_DEMOS } from '../../../../../data/exerciseDemos';
import { EXERCISE_DEMO_IMAGES } from '../../../../../data/exerciseDemoImages';
import { LIBRARY_EXERCISES } from '../../../../../data/exerciseLibrary';
import { EXERCISE_LIBRARY_IMAGES } from '../../../../../data/exerciseLibraryImages';

export type Frame = { label: string; text: string; image?: ImageSourcePropType };

/** Everything the screens show about how an exercise is done. */
export interface HowTo {
  frames: Frame[];
  /** Short form cues (core exercises). */
  cues: string[];
  /** Numbered steps (library exercises). */
  steps: string[];
  /**
   * Library photos are stock shots in mixed shapes, mostly 3:2, some
   * portrait: shown whole in a 3:2 frame rather than cropped square.
   */
  stock: boolean;
}

const LIBRARY_BY_ID = new Map(LIBRARY_EXERCISES.map((e) => [e.id, e]));

/**
 * The core's hand-written spec and approved art first, then the exercise
 * library's photos and steps. Null for an exercise the user made.
 */
export const howToFor = (exerciseId: string): HowTo | null => {
  const demo = EXERCISE_DEMOS[exerciseId];
  if (demo) {
    const images = EXERCISE_DEMO_IMAGES[exerciseId];
    return {
      frames: demo.end
        ? [
            { label: 'Start', text: demo.start, image: images?.start },
            { label: 'End', text: demo.end, image: images?.end },
          ]
        : [{ label: 'Position', text: demo.start, image: images?.start }],
      cues: demo.cues ?? [],
      steps: [],
      stock: false,
    };
  }
  const lib = LIBRARY_BY_ID.get(exerciseId);
  if (!lib) return null;
  const images = EXERCISE_LIBRARY_IMAGES[exerciseId];
  return {
    frames: [
      { label: 'Start', text: lib.name, image: images?.start },
      { label: 'End', text: lib.name, image: images?.end },
    ],
    cues: [],
    steps: lib.steps,
    stock: true,
  };
};

/** Is there anything to show for this exercise — photos, positions or steps? */
export const hasHowTo = (exerciseId: string): boolean =>
  !!EXERCISE_DEMOS[exerciseId] || LIBRARY_BY_ID.has(exerciseId);

/** The start photo, for a list row's thumbnail. */
export const thumbFor = (exerciseId: string): ImageSourcePropType | undefined =>
  EXERCISE_DEMO_IMAGES[exerciseId]?.start ?? EXERCISE_LIBRARY_IMAGES[exerciseId]?.start;
