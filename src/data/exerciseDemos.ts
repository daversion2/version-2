import type { ImageSourcePropType } from 'react-native';

// =============================================================================
// How each built-in exercise is done: the start and end positions, a few form
// cues, and how the demo photos are framed. Keyed by the ids in
// BUILT_IN_EXERCISES (workoutExercises.ts) — name and equipment come from there.
//
// One spec does two jobs. The app shows `start`/`end` as text when an exercise
// has no approved photos, and the cues under the photos when it has them.
// scripts/generateExerciseArt.ts turns the same lines into image prompts.
// See content/exercise-art/README.md.
// =============================================================================

/** Where the camera stands. Fixed for both frames of an exercise. */
export type DemoCamera = 'side' | 'front' | 'three_quarter';

export interface ExerciseDemo {
  camera: DemoCamera;
  /** Props and where they sit: "flat bench", "barbell on the floor". */
  setup?: string;
  /**
   * Make the END photo first and edit it back into the start. For moves where
   * the body rises out of the frame: the model frames a dead hang with the bar
   * at the top edge, and an edit keeps the camera, so a pull-up made start
   * first had nowhere to pull up to (twice, 2026-11-01). Lowering the body
   * from the top position has room.
   */
  reverse?: boolean;
  /** The start position. */
  start: string;
  /** The end position. Left out for holds and carries, which get one photo. */
  end?: string;
  /** Up to three short form cues, drawn by the app under the photos. */
  cues?: string[];
  /**
   * A free-exercise-db entry (labelled Unlicense, but the photos are likely
   * scraped from Bodybuilding.com: see docs/backlog.md) whose 0.jpg / 1.jpg photos show
   * the start / end pose. Used only as a pose reference when generating.
   */
  poseRef?: string;
}

/** Approved, bundled photos — written by scripts/publishExerciseArt.ts. */
export type DemoImages = { start?: ImageSourcePropType; end?: ImageSourcePropType };

/** Built-ins that get no demo: a run needs no picture of how to run. */
export const NO_DEMO = ['run-400m', 'run-mile', 'run-5k'];

/** The first batch: easy and hard moves, before the rest are generated. */
export const PILOT_IDS = [
  'push-up',
  'bodyweight-squat',
  'goblet-squat',
  'db-row',
  'walking-lunge',
  'db-shoulder-press',
  'plank',
  'pull-up',
  'barbell-row',
  'deadlift',
];

export const EXERCISE_DEMOS: Record<string, ExerciseDemo> = {
  // Chest
  'bench-press': {
    camera: 'side',
    setup: 'flat bench in a rack, barbell with plates',
    start: 'Lying on the bench, feet flat on the floor, gripping the bar slightly wider than shoulders, arms straight with the bar over the shoulders',
    end: 'Bar lowered to touch the lower chest, elbows about 45° from the body, feet still flat',
    cues: ['Shoulder blades pinched back', 'Wrists stacked over elbows', 'Bar touches the lower chest'],
    poseRef: 'Barbell_Bench_Press_-_Medium_Grip',
  },
  'incline-db-press': {
    camera: 'side',
    setup: 'bench set to about 30° incline, a pair of dumbbells',
    start: 'Lying back on the incline bench, dumbbells pressed up over the upper chest, arms straight, palms facing forward',
    end: 'Dumbbells lowered to the sides of the upper chest, elbows below the bench line, palms forward',
    cues: ['Back and head on the bench', 'Lower with control', 'Press up and slightly in'],
    poseRef: 'Incline_Dumbbell_Press',
  },
  'db-fly': {
    camera: 'front',
    setup: 'flat bench, a pair of dumbbells',
    start: 'Lying on the flat bench, dumbbells together over the chest, arms almost straight with a slight bend, palms facing each other',
    end: 'Arms opened wide to the sides in an arc, dumbbells level with the chest, elbows still slightly bent',
    cues: ['Keep the elbow bend fixed', 'Stretch, don’t drop', 'Squeeze the chest to close'],
    poseRef: 'Dumbbell_Flyes',
  },
  'cable-crossover': {
    camera: 'front',
    setup: 'cable crossover station with both pulleys set high, single handles',
    start: 'Standing in the middle of the station, one foot slightly forward, leaning forward a little, arms out wide and up holding the handles, elbows slightly bent',
    end: 'Hands brought together in front of the lower chest, elbows still slightly bent, same lean',
    cues: ['Slight forward lean', 'Elbows stay soft', 'Hands meet in front of the chest'],
    poseRef: 'Cable_Crossover',
  },
  'push-up': {
    camera: 'side',
    start: 'High plank: hands flat under the shoulders, arms straight, body in one straight line from head to heels, on the toes, head neutral in line with the spine with the eyes on the floor just ahead of the hands',
    end: 'Bottom of the push-up: chest lowered until it is about an inch above the floor, elbows bent well past 90° and angled about 45° back from the body, body still in one straight line from head to heels, head still neutral with the eyes on the floor',
    cues: ['Head neutral, eyes on the floor', 'Body in one straight line', 'Chest to an inch off the floor'],
    poseRef: 'Pushups',
  },
  dip: {
    camera: 'side',
    setup: 'parallel dip bars',
    start: 'Supported on the dip bars with arms straight, body upright and leaning slightly forward, knees bent with ankles crossed behind',
    end: 'Body lowered until the upper arms are parallel to the floor, elbows pointing back, slight forward lean',
    cues: ['Lean slightly forward', 'Lower until upper arms are level', 'Shoulders down, away from ears'],
    poseRef: 'Dips_-_Chest_Version',
  },

  // Back
  deadlift: {
    camera: 'side',
    setup: 'loaded barbell on the floor',
    start: 'Bar over the middle of the feet, hips hinged and knees bent, back flat, arms straight gripping the bar just outside the legs, shoulders slightly in front of the bar',
    end: 'Standing tall with the bar at the top of the thighs, hips and knees locked out, shoulders back, arms straight',
    cues: ['Flat back the whole way', 'Bar stays against the legs', 'Push the floor away'],
    poseRef: 'Barbell_Deadlift',
  },
  'barbell-row': {
    camera: 'side',
    setup: 'loaded barbell',
    start: 'Hinged forward at the hips to about 45°, knees soft, back flat, arms hanging straight holding the bar below the knees with an overhand grip',
    end: 'Same hinged torso angle, bar pulled into the lower ribs, elbows driven back past the body',
    cues: ['Torso angle stays fixed', 'Flat back, neck neutral', 'Pull to the lower ribs'],
    poseRef: 'Bent_Over_Barbell_Row',
  },
  'db-row': {
    camera: 'side',
    setup: 'flat bench, one dumbbell',
    start: 'One knee and the same-side hand on the bench, back flat and parallel to the floor, other foot on the floor, free arm hanging straight holding the dumbbell',
    end: 'Dumbbell pulled up to the hip, elbow driven back close to the body, back still flat and square',
    cues: ['Back flat and level', 'Pull the elbow to the hip', 'Don’t twist the torso'],
    poseRef: 'One-Arm_Dumbbell_Row',
  },
  'lat-pulldown': {
    camera: 'three_quarter',
    setup: 'lat pulldown machine with a long bar, knee pad',
    start: 'Seated with thighs under the pad, arms straight overhead gripping the bar wider than the shoulders, chest up',
    end: 'Bar pulled down to the upper chest, elbows down and back, chest up, slight lean back',
    cues: ['Chest up to meet the bar', 'Elbows drive down', 'No swinging'],
    poseRef: 'Wide-Grip_Lat_Pulldown',
  },
  'seated-cable-row': {
    camera: 'side',
    setup: 'seated cable row station with a close-grip handle',
    start: 'Seated, feet on the platform with knees slightly bent, torso upright, arms straight reaching for the handle',
    end: 'Handle pulled to the stomach, elbows back past the body, shoulder blades squeezed, torso upright',
    cues: ['Sit tall', 'Squeeze shoulder blades', 'Don’t rock back'],
    poseRef: 'Seated_Cable_Rows',
  },
  'face-pull': {
    camera: 'side',
    setup: 'cable station with a rope attachment at upper-chest height',
    start: 'Standing facing the cable, arms straight in front holding the rope ends with palms facing in',
    end: 'Rope pulled toward the face, hands beside the ears, elbows high and out to the sides',
    cues: ['Elbows high', 'Pull the rope apart', 'Pause at the face'],
    poseRef: 'Face_Pull',
  },
  'pull-up': {
    camera: 'side',
    reverse: true,
    setup: 'pull-up bar overhead',
    start: 'Dead hang: hanging from the bar with arms fully straight, overhand grip slightly wider than the shoulders, feet clearly off the floor, legs straight below',
    end: 'Top of the pull-up: the whole body pulled up high so the chin is clearly ABOVE the bar, elbows fully bent and pointing down beside the ribs, chest close to the bar, feet far off the floor, legs straight — the body is much higher than in the start',
    cues: ['Start from a full hang', 'Chin over the bar', 'No kicking'],
    poseRef: 'Pullups',
  },
  'chin-up': {
    camera: 'side',
    reverse: true,
    setup: 'pull-up bar overhead',
    start: 'Dead hang: hanging from the bar with arms fully straight, underhand grip about shoulder-width, palms facing the body, feet clearly off the floor',
    end: 'Top of the chin-up: the whole body pulled up high so the chin is clearly ABOVE the bar, elbows fully bent and pointing down in front of the ribs, palms still facing the body, feet far off the floor — the body is much higher than in the start',
    cues: ['Palms face you', 'Start from a full hang', 'Chin over the bar'],
    poseRef: 'Chin-Up',
  },

  // Shoulders
  'overhead-press': {
    camera: 'side',
    setup: 'loaded barbell',
    start: 'Standing, feet hip-width, bar resting on the front of the shoulders, hands just outside the shoulders, elbows slightly in front of the bar',
    end: 'Bar pressed straight overhead, arms locked, bar over the middle of the feet, head through the arms',
    cues: ['Squeeze glutes, ribs down', 'Bar travels in a straight line', 'Lock out overhead'],
    poseRef: 'Standing_Military_Press',
  },
  'db-shoulder-press': {
    camera: 'front',
    setup: 'upright bench, a pair of dumbbells',
    start: 'Seated upright, back against the pad, dumbbells at shoulder height, elbows below the hands, palms forward',
    end: 'Dumbbells pressed overhead with arms straight, dumbbells close together but not touching',
    cues: ['Back against the pad', 'Forearms vertical', 'Press up and slightly in'],
    poseRef: 'Dumbbell_Shoulder_Press',
  },
  'lateral-raise': {
    camera: 'front',
    setup: 'a pair of light dumbbells',
    start: 'Standing tall, arms down by the sides holding dumbbells, palms facing in, elbows slightly bent',
    end: 'Arms raised out to the sides to shoulder height, elbows slightly bent, palms facing down',
    cues: ['Lead with the elbows', 'Stop at shoulder height', 'No swinging'],
    poseRef: 'Side_Lateral_Raise',
  },
  'rear-delt-fly': {
    camera: 'front',
    setup: 'a pair of light dumbbells',
    start: 'Hinged forward at the hips with a flat back, chest nearly parallel to the floor, arms hanging down holding dumbbells, palms facing in',
    end: 'Same bent-over position, arms raised out to the sides to shoulder height, elbows slightly bent',
    cues: ['Flat back, chest down', 'Arms move out, not back', 'Squeeze the rear shoulders'],
  },

  // Legs
  'back-squat': {
    camera: 'side',
    setup: 'loaded barbell on the upper back',
    start: 'Standing tall, bar across the upper back below the neck, hands gripping the bar, feet shoulder-width, toes slightly out',
    end: 'Squatted down until the thighs are at least parallel to the floor, chest up, knees tracking over the toes, heels down',
    cues: ['Chest up, back flat', 'Knees follow the toes', 'Thighs at least parallel'],
    poseRef: 'Barbell_Squat',
  },
  'front-squat': {
    camera: 'side',
    setup: 'loaded barbell racked on the front of the shoulders',
    start: 'Standing tall, bar resting on the front of the shoulders, elbows high and pointing forward, fingertips under the bar',
    end: 'Squatted deep with an upright torso, elbows still high, thighs below parallel, heels down',
    cues: ['Elbows high', 'Torso stays upright', 'Heels stay down'],
    poseRef: 'Front_Barbell_Squat',
  },
  'goblet-squat': {
    camera: 'side',
    setup: 'one dumbbell held vertically at the chest',
    start: 'Standing tall, feet a little wider than the shoulders, holding one dumbbell vertically against the chest with both hands cupping the top end',
    end: 'Squatted down with thighs below parallel, torso upright, elbows inside the knees, dumbbell still at the chest',
    cues: ['Dumbbell stays at the chest', 'Elbows inside the knees', 'Heels stay down'],
    poseRef: 'Goblet_Squat',
  },
  'romanian-deadlift': {
    camera: 'side',
    setup: 'loaded barbell',
    start: 'Standing tall holding the bar at the top of the thighs with an overhand grip, arms straight, knees soft',
    end: 'Hips pushed back and torso hinged forward, back flat, bar lowered to just below the knees close to the legs, knees only slightly bent',
    cues: ['Push the hips back', 'Flat back', 'Bar slides down the legs'],
    poseRef: 'Romanian_Deadlift',
  },
  'leg-press': {
    camera: 'side',
    setup: '45° leg press machine',
    start: 'Seated back in the leg press, feet shoulder-width on the platform, legs extended but knees not locked',
    end: 'Platform lowered until the knees are bent to about 90°, lower back still on the pad',
    cues: ['Lower back stays down', 'Knees follow the toes', 'Don’t lock the knees'],
    poseRef: 'Leg_Press',
  },
  'walking-lunge': {
    camera: 'side',
    setup: 'a pair of dumbbells held at the sides',
    start: 'Standing tall, feet together, dumbbells hanging at the sides',
    end: 'Long step forward into a lunge: front thigh parallel to the floor with the knee over the ankle, back knee just above the floor, torso upright, dumbbells at the sides',
    cues: ['Torso upright', 'Front knee over the ankle', 'Back knee nearly touches the floor'],
    poseRef: 'Dumbbell_Lunges',
  },
  'bulgarian-split-squat': {
    camera: 'side',
    setup: 'flat bench behind, a pair of dumbbells',
    start: 'Standing on one leg about two feet in front of a bench, top of the back foot resting on the bench, dumbbells at the sides, torso upright',
    end: 'Lowered down on the front leg until the front thigh is parallel to the floor, back knee near the floor, torso upright',
    cues: ['Most weight on the front foot', 'Torso upright', 'Front knee tracks the toes'],
    poseRef: 'Split_Squat_with_Dumbbells',
  },
  'hip-thrust': {
    camera: 'side',
    setup: 'flat bench, padded barbell across the hips',
    start: 'Upper back against the edge of the bench, seated on the floor, knees bent, feet flat, barbell resting across the hips held by both hands',
    end: 'Hips driven up until the body is flat from shoulders to knees, shins vertical, chin tucked',
    cues: ['Shins vertical at the top', 'Squeeze the glutes', 'Ribs down, chin tucked'],
    poseRef: 'Barbell_Hip_Thrust',
  },
  'leg-curl': {
    camera: 'side',
    setup: 'lying leg curl machine',
    start: 'Lying face down on the machine, the pad behind the ankles, legs straight, holding the handles',
    end: 'Heels curled toward the glutes, knees bent past 90°, hips pressed into the pad',
    cues: ['Hips stay down', 'Curl all the way', 'Lower slowly'],
    poseRef: 'Lying_Leg_Curls',
  },
  'leg-extension': {
    camera: 'side',
    setup: 'leg extension machine',
    start: 'Seated upright, the pad on the front of the lower shins, knees bent about 90°, holding the side handles',
    end: 'Legs extended straight out, thighs still on the seat',
    cues: ['Back against the pad', 'Straighten fully', 'Lower with control'],
    poseRef: 'Leg_Extensions',
  },
  'calf-raise': {
    camera: 'side',
    setup: 'standing calf raise machine with a step platform',
    start: 'Standing under the shoulder pads, balls of the feet on the edge of the platform, heels lowered below the step, legs straight',
    end: 'Up on the toes as high as possible, heels raised well above the step, legs straight',
    cues: ['Full stretch at the bottom', 'Rise as high as you can', 'Knees straight'],
    poseRef: 'Standing_Calf_Raises',
  },
  'bodyweight-squat': {
    camera: 'side',
    start: 'Standing tall, feet shoulder-width, toes slightly out, arms relaxed by the sides',
    end: 'Squatted down until the thighs are at least parallel, chest up, arms reaching forward for balance, heels down',
    cues: ['Chest up', 'Knees follow the toes', 'Heels stay down'],
    poseRef: 'Bodyweight_Squat',
  },
  'box-jump': {
    camera: 'side',
    setup: 'sturdy plyo box about knee height',
    start: 'Standing facing the box about a foot away, crouched in a quarter squat, arms swung back',
    end: 'Landed on top of the box in a soft quarter squat, both feet flat on the box, arms forward',
    cues: ['Swing the arms', 'Land softly on the whole foot', 'Step down, don’t jump down'],
    poseRef: 'Front_Box_Jump',
  },
  'wall-sit': {
    camera: 'side',
    setup: 'a plain wall',
    start: 'Back flat against the wall, sitting as if in an invisible chair, thighs parallel to the floor, knees over the ankles at 90°, arms by the sides',
    cues: ['Thighs parallel', 'Knees over the ankles', 'Back flat on the wall'],
  },

  // Arms
  'barbell-curl': {
    camera: 'side',
    setup: 'barbell',
    start: 'Standing tall, arms straight holding the bar at the thighs with an underhand shoulder-width grip',
    end: 'Bar curled up to the shoulders, elbows still at the sides, wrists straight',
    cues: ['Elbows pinned to the sides', 'No leaning back', 'Lower all the way'],
    poseRef: 'Barbell_Curl',
  },
  'db-curl': {
    camera: 'side',
    setup: 'a pair of dumbbells',
    start: 'Standing tall, arms straight at the sides holding dumbbells, palms facing forward',
    end: 'Both dumbbells curled up to the shoulders, elbows still at the sides, palms facing the shoulders',
    cues: ['Elbows stay still', 'Palms turn up', 'No swinging'],
    poseRef: 'Dumbbell_Bicep_Curl',
  },
  'hammer-curl': {
    camera: 'side',
    setup: 'a pair of dumbbells',
    start: 'Standing tall, arms straight at the sides holding dumbbells, palms facing the body',
    end: 'Dumbbells curled up toward the shoulders with palms still facing in, elbows at the sides',
    cues: ['Palms face in throughout', 'Elbows stay still', 'Lower slowly'],
    poseRef: 'Hammer_Curls',
  },
  'tricep-pushdown': {
    camera: 'side',
    setup: 'cable station with a straight bar at the high pulley',
    start: 'Standing facing the cable, elbows pinned at the sides, forearms up holding the bar at chest height',
    end: 'Bar pushed down until the arms are straight, elbows still at the sides',
    cues: ['Elbows pinned', 'Straighten fully', 'Upper arms don’t move'],
    poseRef: 'Triceps_Pushdown',
  },
  'skull-crusher': {
    camera: 'side',
    setup: 'flat bench, EZ curl bar',
    start: 'Lying on the bench, arms straight up holding the EZ bar over the forehead',
    end: 'Elbows bent to lower the bar to just above the forehead, upper arms still vertical',
    cues: ['Upper arms stay still', 'Elbows point up', 'Lower with control'],
    poseRef: 'EZ-Bar_Skullcrusher',
  },

  // Core
  plank: {
    camera: 'side',
    start: 'Forearm plank: elbows under the shoulders, forearms on the floor, on the toes, body in one straight line from head to heels',
    cues: ['Straight line head to heels', 'Squeeze glutes', 'Don’t let hips sag'],
    poseRef: 'Plank',
  },
  'side-plank': {
    camera: 'front',
    start: 'Side plank on one forearm, elbow under the shoulder, feet stacked, hips lifted so the body is a straight line, top hand on the hip',
    cues: ['Elbow under the shoulder', 'Hips up', 'Straight line head to feet'],
    poseRef: 'Side_Bridge',
  },
  'hanging-leg-raise': {
    camera: 'side',
    setup: 'pull-up bar overhead',
    start: 'Hanging from the bar with arms straight, overhand grip, legs straight down',
    end: 'Straight legs raised in front until they are parallel to the floor, arms still straight, no swinging',
    cues: ['No swinging', 'Legs straight', 'Lower slowly'],
    poseRef: 'Hanging_Leg_Raise',
  },
  'ab-wheel': {
    camera: 'side',
    setup: 'ab wheel, exercise mat',
    start: 'Kneeling on the mat, hands on the ab wheel handles, wheel under the shoulders, arms straight',
    end: 'Rolled forward with arms extended overhead, body in a long straight line from knees to hands, hips not sagging',
    cues: ['Brace the stomach', 'Hips don’t sag', 'Roll back with the abs'],
    poseRef: 'Ab_Roller',
  },
  'russian-twist': {
    camera: 'front',
    setup: 'exercise mat',
    start: 'Seated on the mat, leaning back about 45° with a straight back, knees bent, heels lightly touching the floor, hands clasped in front of the chest',
    end: 'Same lean, torso rotated to one side, clasped hands beside the hip',
    cues: ['Straight back', 'Rotate the chest, not just the arms', 'Feet stay still'],
    poseRef: 'Russian_Twist',
  },
  'dead-bug': {
    camera: 'side',
    setup: 'exercise mat',
    start: 'Lying on the back, arms straight up toward the ceiling, hips and knees bent to 90° with shins parallel to the floor',
    end: 'One arm reaching overhead and the opposite leg extended straight just above the floor, lower back flat on the mat, other limbs unchanged',
    cues: ['Lower back flat on the floor', 'Opposite arm and leg', 'Move slowly'],
    poseRef: 'Dead_Bug',
  },

  // Full body
  'kettlebell-swing': {
    camera: 'side',
    setup: 'one kettlebell',
    start: 'Hinged at the hips with a flat back, kettlebell held in both hands swung back between the thighs, knees slightly bent',
    end: 'Standing tall with hips locked out, arms straight in front holding the kettlebell at chest height',
    // No pose photo: free-exercise-db only has the one-arm swing.
    cues: ['Hinge, don’t squat', 'Snap the hips forward', 'Arms just guide the bell'],
  },
  burpee: {
    camera: 'side',
    start: 'Standing tall, feet shoulder-width, arms by the sides',
    end: 'Bottom of the burpee: chest and thighs on the floor, hands flat under the shoulders, legs straight behind',
    cues: ['Hands down, feet back', 'Chest to the floor', 'Jump up with arms overhead'],
  },
  'mountain-climber': {
    camera: 'side',
    start: 'High plank: hands under the shoulders, body straight, one knee driven forward toward the chest',
    end: 'Still in the high plank, legs switched: the other knee driven toward the chest, first leg extended back',
    cues: ['Hips level', 'Shoulders over hands', 'Drive the knees fast'],
    poseRef: 'Mountain_Climbers',
  },
  'jump-rope': {
    camera: 'front',
    setup: 'jump rope',
    start: 'Standing on the balls of the feet, elbows close to the sides, hands at hip height holding the rope handles, rope behind the heels',
    end: 'Both feet a couple of inches off the floor, rope passing under the feet, elbows still at the sides',
    cues: ['Small jumps', 'Turn the rope with the wrists', 'Land on the balls of the feet'],
    poseRef: 'Rope_Jumping',
  },
  'farmers-carry': {
    camera: 'three_quarter',
    setup: 'a pair of heavy dumbbells',
    start: 'Walking tall mid-stride, a heavy dumbbell in each hand at the sides, arms straight, shoulders back and down',
    cues: ['Stand tall', 'Shoulders back and down', 'Short, steady steps'],
    poseRef: 'Farmers_Walk',
  },
  'row-2000m': {
    camera: 'side',
    setup: 'indoor rowing machine',
    start: 'The catch: seated on the rowing machine, knees bent with shins vertical, arms straight reaching forward holding the handle, torso leaning slightly forward',
    end: 'The finish: legs straight, torso leaning slightly back, handle pulled to the lower ribs, elbows past the body',
    cues: ['Legs, then body, then arms', 'Handle to the lower ribs', 'Reverse the order on the way back'],
    poseRef: 'Rowing_Stationary',
  },
};
