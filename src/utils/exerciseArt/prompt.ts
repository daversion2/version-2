import type { DemoCamera, ExerciseDemo } from '../../data/exerciseDemos';
import type { Exercise } from '../../types/workouts';
import { EQUIPMENT_LABELS } from '../../data/workoutExercises';

// =============================================================================
// The prompt template for exercise demo photos. Everything that has to look
// the same in every photo — the athlete, clothes, gym, light, framing — is
// fixed here. Only the exercise's own lines (data/exerciseDemos.ts) change.
// Change these and every photo made before no longer matches: regenerate.
// =============================================================================

export const ATHLETE =
  'a fit, athletic adult in their early thirties with a healthy, natural build (strong but not a bodybuilder), short or tied-back hair, a calm focused expression';
export const CLOTHING =
  'a plain charcoal-grey fitted t-shirt, plain black training shorts that end above the knee, white ankle socks and plain black training shoes; no logos or writing anywhere';
export const SETTING =
  'a clean, modern, uncluttered gym with matte light-grey walls and dark rubber flooring; only the equipment the exercise needs is in the foreground, the background is softly out of focus';
export const LIGHTING = 'soft, even studio lighting from the front-left, gentle shadows, no harsh highlights';
export const FRAMING =
  'square 1:1 photo, the whole body and all equipment in frame with some space around them, camera at hip height, natural 50mm lens look with no distortion';

const CAMERA: Record<DemoCamera, string> = {
  side: 'the camera is directly side-on to the athlete (a profile view), so the spine angle and joint angles are clearly visible',
  front: 'the camera is directly in front of the athlete',
  three_quarter: 'the camera is at a 45-degree front three-quarter angle to the athlete',
};

const RULES = [
  'Photorealistic, like a professional fitness coaching photo.',
  'Textbook-correct form. The head stays neutral, in line with the spine (not looking up), unless the pose says otherwise. Full range of motion exactly as described — no half reps. Hands hold the equipment naturally with five fingers each; feet are placed exactly as described.',
  'Equipment is realistic and correctly proportioned, and the athlete is actually holding or touching it where described.',
  'Exactly one person. No text, labels, arrows, numbers, logos or watermarks.',
].join(' ');

/** The one-off master photo every exercise photo is made from. */
export const referencePrompt = (): string =>
  [
    'A photorealistic fitness photograph for an exercise-demonstration app.',
    `One athlete: ${ATHLETE}.`,
    `Wearing ${CLOTHING}.`,
    'Standing relaxed and upright, arms by the sides, facing the camera at a slight angle, full body visible from head to toe.',
    `Setting: ${SETTING}.`,
    `Lighting: ${LIGHTING}.`,
    `Framing: ${FRAMING}.`,
    'Exactly one person. No text, logos or watermarks.',
  ].join('\n');

const equipmentLine = (exercise: Exercise, demo: ExerciseDemo): string => {
  const equipment = exercise.equipment ? EQUIPMENT_LABELS[exercise.equipment] : null;
  return [equipment, demo.setup].filter(Boolean).join(': ') || 'none';
};

const cuesLine = (demo: ExerciseDemo): string[] =>
  demo.cues?.length ? [`Form cues to show: ${demo.cues.join('; ')}.`] : [];

const noteLine = (note?: string): string[] =>
  note ? [`A previous attempt had these problems — avoid them: ${note}.`] : [];

/**
 * The first photo of a pair, made fresh: the start, or the end for a
 * `reverse` exercise. Images sent with it, in order: 1 the master athlete
 * photo, 2 (optional) a pose photo of someone else in that position.
 */
export const leadPrompt = (
  exercise: Exercise,
  demo: ExerciseDemo,
  opts: { frame: 'start' | 'end'; hasPoseRef: boolean; note?: string }
): string => {
  const word = opts.frame === 'start' ? 'START' : 'END';
  const pose = opts.frame === 'start' ? demo.start : demo.end;
  if (!pose) throw new Error(`${exercise.id} has one photo only — no end position`);
  return [
    'Image 1 is the reference athlete. Make a new photo of this exact same person — same face, hair, build, clothing and shoes — in the same gym with the same lighting.',
    `Exercise: ${exercise.name}. Equipment: ${equipmentLine(exercise, demo)}.`,
    `Pose — the ${word} position: ${pose}.`,
    `Camera: ${CAMERA[demo.camera]}. ${FRAMING}.`,
    ...(opts.hasPoseRef
      ? [
          `Image 2 shows a different person in the ${opts.frame} position of this exercise. Copy ONLY their body position, joint angles, grip and equipment placement. Do not copy that person, their clothes, logos, gym, background or camera angle.`,
        ]
      : []),
    ...cuesLine(demo),
    ...noteLine(opts.note),
    RULES,
  ].join('\n');
};

/**
 * The second photo of a pair, made by editing the first — the only image
 * sent. `frame` is the photo being made: the end normally, the start for a
 * `reverse` exercise. What the push-up test (2026-11-01) showed:
 * - Sending the master athlete photo too pulled the edit back to standing.
 * - Sending a pose photo too got the pose photo copied, gym and all.
 * - Leading with "keep everything identical" got the photo back unchanged.
 * So it leads with the movement. gemini-2.5-flash-image returned the photo
 * unchanged however it was asked; the Pro model does it.
 */
export const followPrompt = (
  exercise: Exercise,
  demo: ExerciseDemo,
  opts: { frame: 'start' | 'end'; note?: string }
): string => {
  if (!demo.end) throw new Error(`${exercise.id} has one photo only — nothing to edit into`);
  const [when, word, pose] =
    opts.frame === 'end' ? ['a moment later', 'END', demo.end] : ['a moment earlier', 'START', demo.start];
  return [
    `Show the athlete in image 1 ${when}, in the ${word} position of the ${exercise.name.toLowerCase()}.`,
    `Move the body into this position: ${pose}.`,
    'The body must be clearly in a different position from image 1 — this is a different moment of the exercise, not the same photo.',
    'Everything else stays the same: the same person, face, hair, clothing, equipment, gym, lighting, camera position and framing.',
    ...cuesLine(demo),
    ...noteLine(opts.note),
    RULES,
  ].join('\n');
};
