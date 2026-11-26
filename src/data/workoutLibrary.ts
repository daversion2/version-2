import type {
  LibraryBlock,
  LibraryFocus,
  LibraryGear,
  LibraryLevel,
  LibraryOption,
  LibrarySlot,
  LibraryWorkout,
  SetValues,
} from '../types/workouts';

// =============================================================================
// WORKOUT LIBRARY — premade workouts by level that fit the equipment someone
// has. Built on the training principles of Mark Verstegen (Exos), Mike Boyle
// and Gray Cook; docs/workout-library.md has the reasoning and the founder's
// review notes.
//
// The shape every session follows (Exos' session order):
//   1. Movement prep — breathing, mobility, activation (Cook: mobility before
//      stability, stability before strength).
//   2. Power — jumps and throws while fresh (intermediate and up).
//   3. Strength — paired as Boyle-style supersets or tri-sets: a main lift, a
//      contrasting lift, and a core or mobility filler in the rest.
//   4. Pillar and carries — anti-extension, anti-rotation, loaded carries.
//
// Each slot lists options best first. The first one the person's equipment
// covers is used (services/workoutLibrary.ts resolveLibraryWorkout), so one
// template fits a full gym and a hotel room. Ordering is a coaching call:
// Boyle-style choices first (single-leg, trap bar, goblet, front squat,
// dumbbells and push-ups over machines), bodyweight last.
//
// Single-arm and single-leg numbers are EACH SIDE. Ids are stored on users'
// copies (Workout.library_id): never rename one.
// =============================================================================

export const LIBRARY_LEVELS: { value: LibraryLevel; label: string; hint: string }[] = [
  {
    value: 'beginner',
    label: 'Beginner',
    hint: 'New to strength training, or back after a long break. Learn the patterns, own your bodyweight, leave a couple of reps in the tank.',
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    hint: 'Six months or more of steady training. You can do a goblet squat, push-ups and a hip hinge with good form. Adds jumps, throws and heavier pairs.',
  },
  {
    value: 'advanced',
    label: 'Advanced',
    hint: 'Years of training and solid technique under load. Heavier, more power work, harder single-leg and bodyweight progressions.',
  },
];

export const LIBRARY_GEAR_LABELS: Record<LibraryGear, string> = {
  dumbbells: 'Dumbbells',
  kettlebells: 'Kettlebells',
  barbell: 'Barbell & rack',
  trap_bar: 'Trap bar',
  bench: 'Bench',
  pullup_bar: 'Pull-up bar',
  bands: 'Bands',
  suspension: 'Suspension trainer (TRX)',
  cable: 'Cable machine',
  med_ball: 'Medicine ball',
  box: 'Plyo box or step',
  sled: 'Sled',
};

export const LIBRARY_GEAR_ORDER: LibraryGear[] = [
  'dumbbells',
  'kettlebells',
  'bands',
  'pullup_bar',
  'bench',
  'suspension',
  'barbell',
  'trap_bar',
  'cable',
  'med_ball',
  'box',
  'sled',
];

export const LIBRARY_FOCUS_LABELS: Record<LibraryFocus, string> = {
  full_body: 'Full body',
  lower: 'Lower body',
  upper: 'Upper body',
  power: 'Power',
  conditioning: 'Conditioning',
  mobility: 'Mobility',
};

/**
 * Left out on purpose: crunch and sit-up variations and loaded spinal
 * rotation (Boyle and McGill's case against repeated flexion and twisting),
 * upright rows (shoulder impingement), machine isolation and Smith machine work
 * (no stability demand), and high-rep or chaotic moves that train fatigue over
 * quality. Bilateral back squats too: Boyle replaced them with front squats,
 * goblet squats and single-leg work. A test keeps them out of every template.
 */
export const LIBRARY_EXCLUDED_EXERCISES: string[] = [
  'crunch',
  'sit-up',
  'reverse-crunch',
  'bicycle-crunch',
  'oblique-crunch',
  'decline-crunch',
  'jackknife-sit-up',
  'heel-touch',
  'cable-crunch',
  'ab-crunch-machine',
  'stability-ball-crunch',
  'russian-twist',
  'db-side-bend',
  'flutter-kicks',
  'upright-row',
  'db-upright-row',
  'leg-extension',
  'single-leg-extension',
  'hip-abduction-machine',
  'hip-adduction-machine',
  'smith-bench-press',
  'smith-incline-press',
  'smith-squat',
  'smith-shoulder-press',
  'back-squat',
  'good-morning',
  'burpee',
  'tire-flip',
  'sledgehammer-swing',
  'muscle-up',
];

// --- Builders ---------------------------------------------------------------

const reps = (n: number): SetValues => ({ reps: n });
const secs = (n: number): SetValues => ({ seconds: n });
const opt = (exerciseId: string, target: SetValues, ...needs: LibraryGear[]): LibraryOption =>
  needs.length ? { exerciseId, target, needs } : { exerciseId, target };
const slot = (...options: LibraryOption[]): LibrarySlot => ({ options });
const fixed = (exerciseId: string, target: SetValues): LibrarySlot => slot(opt(exerciseId, target));

const circuit = (name: string, rounds: number, restSec: number, ...slots: LibrarySlot[]): LibraryBlock => ({
  type: slots.length > 1 ? 'circuit' : 'single',
  ...(slots.length > 1 ? { name } : {}),
  slots,
  rounds,
  restSec,
});

/** Every minute on the minute (or every `sec`): the work, then whatever's left is rest. */
const onTheClock = (name: string, rounds: number, sec: number, ...slots: LibrarySlot[]): LibraryBlock => ({
  ...circuit(name, rounds, 0, ...slots),
  intervalSec: sec,
});

// --- Slot families (best option first, bodyweight last) ---------------------

const gobletSquat = (n: number) =>
  slot(opt('goblet-squat', reps(n), 'dumbbells'), opt('goblet-squat', reps(n), 'kettlebells'), opt('bodyweight-squat', reps(n)));

const frontSquat = (n: number) =>
  slot(
    opt('front-squat', reps(n), 'barbell'),
    opt('double-kb-front-squat', reps(n), 'kettlebells'),
    opt('goblet-squat', reps(n), 'dumbbells'),
    opt('bw-bulgarian-split-squat', reps(n + 2))
  );

const hingeLearn = (n: number) =>
  slot(
    opt('kb-deadlift', reps(n), 'kettlebells'),
    opt('db-stiff-leg-deadlift', reps(n), 'dumbbells'),
    opt('cable-pull-through', reps(n), 'cable'),
    opt('glute-bridge', reps(n + 2))
  );

const hingeStrength = (n: number) =>
  slot(
    opt('trap-bar-deadlift', reps(n), 'trap_bar'),
    opt('romanian-deadlift', reps(n + 2), 'barbell'),
    opt('kb-deadlift', reps(n + 2), 'kettlebells'),
    opt('db-stiff-leg-deadlift', reps(n + 2), 'dumbbells'),
    opt('single-leg-glute-bridge', reps(10))
  );

const splitSquat = (n: number) =>
  slot(
    opt('goblet-split-squat', reps(n), 'dumbbells'),
    opt('goblet-split-squat', reps(n), 'kettlebells'),
    opt('split-squat', reps(n))
  );

const rfess = (n: number) =>
  slot(
    opt('bulgarian-split-squat', reps(n), 'dumbbells'),
    opt('bulgarian-split-squat', reps(n), 'kettlebells'),
    opt('bw-bulgarian-split-squat', reps(n + 4))
  );

const singleLegHinge = (n: number) =>
  slot(
    opt('db-single-leg-rdl', reps(n), 'dumbbells'),
    opt('single-leg-kb-deadlift', reps(n), 'kettlebells'),
    opt('bw-single-leg-rdl', reps(n + 2))
  );

const lateralLunge = (n: number) =>
  slot(
    opt('goblet-lateral-lunge', reps(n), 'dumbbells'),
    opt('goblet-lateral-lunge', reps(n), 'kettlebells'),
    opt('lateral-lunge', reps(n))
  );

const benchPress = (n: number) =>
  slot(
    opt('db-bench-press', reps(n), 'dumbbells', 'bench'),
    opt('db-floor-press', reps(n), 'dumbbells'),
    opt('push-up', reps(n + 2))
  );

const heavyPress = (n: number) =>
  slot(
    opt('bench-press', reps(n), 'barbell', 'bench'),
    opt('db-bench-press', reps(n), 'dumbbells', 'bench'),
    opt('db-floor-press', reps(n), 'dumbbells'),
    opt('feet-elevated-push-up', reps(n + 4))
  );

const row = (n: number) =>
  slot(
    opt('db-row', reps(n), 'dumbbells'),
    opt('kb-row', reps(n), 'kettlebells'),
    opt('suspension-row', reps(n), 'suspension'),
    opt('single-arm-cable-row', reps(n), 'cable'),
    opt('band-row', reps(n + 4), 'bands'),
    opt('inverted-row', reps(n))
  );

const pullUpLearn = (n: number) =>
  slot(
    opt('band-assisted-pull-up', reps(n), 'pullup_bar', 'bands'),
    opt('chin-up-negative', reps(Math.max(3, n - 3)), 'pullup_bar'),
    opt('lat-pulldown', reps(n + 2), 'cable'),
    opt('suspension-row', reps(n + 2), 'suspension'),
    opt('inverted-row', reps(n))
  );

const chinUp = (n: number) =>
  slot(
    opt('chin-up', reps(n), 'pullup_bar'),
    opt('lat-pulldown', reps(n + 2), 'cable'),
    opt('suspension-row', reps(n + 4), 'suspension'),
    opt('inverted-row', reps(n + 2))
  );

const overheadPress = (n: number) =>
  slot(
    opt('half-kneeling-db-press', reps(n), 'dumbbells'),
    opt('kb-overhead-press', reps(n), 'kettlebells'),
    opt('landmine-press', reps(n), 'barbell'),
    opt('band-shoulder-press', reps(n + 4), 'bands'),
    opt('feet-elevated-push-up', reps(n))
  );

const antiRotation = (n: number, holdSec: number) =>
  slot(
    opt('pallof-press', reps(n), 'cable'),
    opt('band-pallof-press', reps(n), 'bands'),
    opt('side-plank', secs(holdSec))
  );

const chop = (n: number, holdSec: number) =>
  slot(
    opt('half-kneeling-cable-chop', reps(n), 'cable'),
    opt('half-kneeling-band-chop', reps(n), 'bands'),
    opt('side-plank', secs(holdSec))
  );

const carry = (sec: number) =>
  slot(
    opt('farmers-carry', secs(sec), 'dumbbells'),
    opt('farmers-carry', secs(sec), 'kettlebells'),
    opt('bear-crawl', secs(Math.min(sec, 40)))
  );

const suitcase = (sec: number) =>
  slot(
    opt('suitcase-carry', secs(sec), 'dumbbells'),
    opt('suitcase-carry', secs(sec), 'kettlebells'),
    opt('bear-crawl', secs(Math.min(sec, 40)))
  );

const shoulderHealth = (n: number) =>
  slot(opt('face-pull', reps(n), 'cable'), opt('band-pull-apart', reps(n), 'bands'), opt('wall-slide', reps(10)));

const lateralSidePlank = (sec: number) =>
  slot(opt('copenhagen-plank', secs(sec), 'bench'), opt('side-plank', secs(sec + 10)));

const jump = (n: number) => slot(opt('box-jump', reps(n), 'box'), opt('broad-jump', reps(n)));

const upperPower = (n: number) =>
  slot(opt('med-ball-chest-pass', reps(n), 'med_ball'), opt('plyo-push-up', reps(n)));

const rotationalPower = (n: number) =>
  slot(opt('med-ball-rotational-throw', reps(n), 'med_ball'), opt('lateral-bound', reps(n)));

const swing = (n: number) =>
  slot(
    opt('kettlebell-swing', reps(n), 'kettlebells'),
    opt('cable-pull-through', reps(n), 'cable'),
    opt('mountain-climber', secs(30))
  );

const sledOrCrawl = () =>
  slot(opt('sled-push', reps(1), 'sled'), opt('bear-crawl', secs(30)));

// --- Movement prep ------------------------------------------------------------

/** Beginner prep: breathing first (Cook), then the hips, upper back and glutes. */
const prepFoundations = (): LibraryBlock =>
  circuit(
    'Movement prep',
    1,
    0,
    fixed('crocodile-breathing', secs(60)),
    fixed('worlds-greatest-stretch', reps(3)),
    fixed('half-kneeling-hip-flexor-stretch', secs(30)),
    fixed('quadruped-t-spine-rotation', reps(6)),
    fixed('glute-bridge', reps(10)),
    fixed('inchworm', reps(4))
  );

/**
 * Intermediate and advanced prep: mobility, activation, then elastic work to
 * wake up the legs. `bodyweight`: no mini-band, for the no-equipment templates.
 */
const prepAthletic = (bodyweight = false): LibraryBlock =>
  circuit(
    'Movement prep',
    1,
    0,
    fixed('worlds-greatest-stretch', reps(3)),
    fixed('quadruped-t-spine-rotation', reps(6)),
    fixed('glute-bridge', reps(10)),
    bodyweight ? fixed('lateral-lunge', reps(5)) : slot(opt('monster-walk', reps(10), 'bands'), opt('lateral-lunge', reps(5))),
    fixed('inchworm', reps(4)),
    fixed('wall-slide', reps(8)),
    fixed('pogo-hop', reps(20))
  );

const EACH_SIDE = 'Single-arm and single-leg numbers are each side.';
const PICK_WEIGHT =
  'Pick a weight you could lift two more times than asked. When every set feels that way two sessions running, go up.';

// --- The templates ------------------------------------------------------------

export const WORKOUT_LIBRARY: LibraryWorkout[] = [
  // ---------------------------------------------------------------- Beginner
  {
    id: 'lib_foundations_a',
    name: 'Foundations A',
    level: 'beginner',
    focus: 'full_body',
    minutes: 40,
    summary: 'Squat, push, hinge, pull and carry: the whole body, learned well.',
    notes: [
      'Do the movement prep every time. It’s part of the workout, not a warm-up to skip.',
      'Each pair is done back to back; the stretch or core move in it is your rest.',
      PICK_WEIGHT,
      EACH_SIDE,
      'Alternate with Foundations B, two or three days a week.',
    ],
    blocks: [
      prepFoundations(),
      circuit('Squat + push', 3, 60, gobletSquat(10), fixed('incline-push-up', reps(8)), fixed('active-leg-lowering', reps(5))),
      circuit('Hinge + pull', 3, 60, hingeLearn(10), row(10), fixed('ankle-rock', reps(8))),
      circuit('Pillar + carry', 2, 45, fixed('dead-bug', reps(6)), fixed('side-plank', secs(20)), carry(30)),
    ],
  },
  {
    id: 'lib_foundations_b',
    name: 'Foundations B',
    level: 'beginner',
    focus: 'full_body',
    minutes: 40,
    summary: 'Single-leg strength, pulling and pressing, and a core that resists movement.',
    notes: [
      'Split squats before lunges: own the bottom position before adding steps.',
      'On pull-ups, use whatever help you need. Slow lowers build the strength to pull.',
      PICK_WEIGHT,
      EACH_SIDE,
      'Alternate with Foundations A, two or three days a week.',
    ],
    blocks: [
      prepFoundations(),
      circuit('Split squat + pull', 3, 60, splitSquat(8), pullUpLearn(5), fixed('wall-slide', reps(8))),
      circuit('Bridge + press', 3, 60, fixed('single-leg-glute-bridge', reps(8)), overheadPress(8), fixed('quadruped-t-spine-rotation', reps(6))),
      circuit('Pillar + carry', 2, 45, fixed('bird-dog', reps(6)), antiRotation(8, 20), suitcase(30)),
    ],
  },
  {
    id: 'lib_bodyweight_basics',
    name: 'Bodyweight Basics',
    level: 'beginner',
    focus: 'full_body',
    minutes: 30,
    summary: 'No equipment at all. Squat, push, bridge, split squat, row and crawl.',
    notes: [
      'Inverted rows: lie under a sturdy table, grip the edge and pull your chest up to it. Bend your knees to make it easier.',
      'If push-ups on a bench or counter are easy for 12, lower the hands until they aren’t.',
      EACH_SIDE,
    ],
    blocks: [
      prepFoundations(),
      circuit('Squat + push + bridge', 3, 60, fixed('bodyweight-squat', reps(12)), fixed('incline-push-up', reps(10)), fixed('glute-bridge', reps(12))),
      circuit('Split squat + row', 3, 60, fixed('split-squat', reps(8)), fixed('inverted-row', reps(8)), fixed('bird-dog', reps(6))),
      circuit('Pillar', 2, 45, fixed('dead-bug', reps(8)), fixed('side-plank', secs(20)), fixed('bear-crawl', secs(20))),
    ],
  },
  {
    id: 'lib_mobility_reset',
    name: 'Mobility & Pillar Reset',
    level: 'beginner',
    focus: 'mobility',
    minutes: 20,
    summary: 'Breathing, hips, ankles and upper back, then the core that holds it together. Good on any day.',
    notes: [
      'Mobility first, then stability: the first block opens things up, the second teaches you to control the new range.',
      'Nothing here should hurt. Move to the edge of comfortable range, breathe, and stay there.',
      'Works on rest days, as a warm-up, or after sitting all day.',
      EACH_SIDE,
    ],
    blocks: [
      circuit(
        'Breathe and open up',
        2,
        0,
        fixed('crocodile-breathing', secs(60)),
        fixed('active-leg-lowering', reps(6)),
        fixed('quadruped-t-spine-rotation', reps(6)),
        fixed('half-kneeling-hip-flexor-stretch', secs(30)),
        fixed('ankle-rock', reps(10))
      ),
      circuit(
        'Move and hold',
        2,
        30,
        fixed('worlds-greatest-stretch', reps(3)),
        fixed('wall-slide', reps(8)),
        fixed('bird-dog', reps(6)),
        fixed('glute-bridge', reps(10)),
        fixed('side-plank', secs(20))
      ),
    ],
  },

  // ------------------------------------------------------------ Intermediate
  {
    id: 'lib_total_strength_a',
    name: 'Total Body Strength A',
    level: 'intermediate',
    focus: 'full_body',
    minutes: 50,
    summary: 'Jumps and throws, then a heavy hinge, a press, single-leg work and carries.',
    notes: [
      'Power comes first while you’re fresh. Every jump and throw is all-out; stop the set when they slow down.',
      'Land jumps quietly and step down from the box.',
      PICK_WEIGHT,
      EACH_SIDE,
      'Alternate with Total Body Strength B, two to four days a week.',
    ],
    blocks: [
      prepAthletic(),
      circuit('Power', 3, 60, jump(5), upperPower(5)),
      circuit('Hinge + push', 4, 90, hingeStrength(6), benchPress(8), fixed('half-kneeling-hip-flexor-stretch', secs(30))),
      circuit('Single leg + pull', 3, 60, rfess(8), row(10), antiRotation(10, 30)),
      circuit('Carry + pillar', 2, 45, carry(40), fixed('side-plank', secs(30))),
    ],
  },
  {
    id: 'lib_total_strength_b',
    name: 'Total Body Strength B',
    level: 'intermediate',
    focus: 'full_body',
    minutes: 50,
    summary: 'Lateral power and rotation, a front-loaded squat, chin-ups, single-leg hinge and press.',
    notes: [
      'Bound side to side and stick each landing for a count of two.',
      'Front-loaded squats keep you upright and are kinder to the back than a bar on the shoulders.',
      PICK_WEIGHT,
      EACH_SIDE,
      'Alternate with Total Body Strength A, two to four days a week.',
    ],
    blocks: [
      prepAthletic(),
      circuit('Power', 3, 60, fixed('lateral-bound', reps(4)), rotationalPower(5)),
      circuit('Squat + pull', 4, 90, frontSquat(6), chinUp(6), fixed('ankle-rock', reps(8))),
      circuit('Hinge + press', 3, 60, singleLegHinge(8), overheadPress(8), fixed('quadruped-t-spine-rotation', reps(6))),
      circuit('Pillar + carry', 2, 45, chop(8, 30), lateralSidePlank(20), suitcase(40)),
    ],
  },
  {
    id: 'lib_lower_strength',
    name: 'Lower Body Strength',
    level: 'intermediate',
    focus: 'lower',
    minutes: 45,
    summary: 'Jumps, a heavy hinge, rear-foot split squats and lateral lunges, with core between.',
    notes: [
      'Single-leg work is the heart of this day. Your back foot is only there for balance.',
      'Rest fully between hinge sets: the goal is strength, not breathlessness.',
      PICK_WEIGHT,
      EACH_SIDE,
      'Pair with Upper Body Strength for a four-day split.',
    ],
    blocks: [
      prepAthletic(),
      circuit('Power', 3, 60, jump(5), fixed('pogo-hop', reps(15))),
      circuit('Hinge', 4, 120, hingeStrength(5), fixed('dead-bug', reps(8))),
      circuit('Single leg', 3, 75, rfess(8), lateralLunge(6)),
      circuit('Hips + pillar', 2, 45, fixed('single-leg-glute-bridge', reps(10)), lateralSidePlank(20), carry(40)),
    ],
  },
  {
    id: 'lib_upper_strength',
    name: 'Upper Body Strength',
    level: 'intermediate',
    focus: 'upper',
    minutes: 45,
    summary: 'Throws, then balanced pressing and pulling, shoulder health work and a carry.',
    notes: [
      'For every press there’s a pull. Shoulders stay healthy when the back keeps up with the chest.',
      'Overhead pressing is half-kneeling so the core, not the lower back, holds you up.',
      PICK_WEIGHT,
      EACH_SIDE,
      'Pair with Lower Body Strength for a four-day split.',
    ],
    blocks: [
      prepAthletic(),
      circuit('Power', 3, 60, upperPower(5)),
      circuit('Press + row', 4, 90, benchPress(8), row(10)),
      circuit('Pull + press', 3, 75, chinUp(6), overheadPress(8)),
      circuit('Shoulders + pillar', 2, 45, shoulderHealth(12), antiRotation(10, 30), carry(40)),
    ],
  },
  {
    id: 'lib_bodyweight_strength',
    name: 'Bodyweight Strength',
    level: 'intermediate',
    focus: 'full_body',
    minutes: 40,
    summary: 'No equipment, still hard: rear-foot split squats, skater squats, elevated push-ups and rows.',
    notes: [
      'Bodyweight gets harder by going single-leg and slowing down, not by doing more reps. Take three seconds on the way down.',
      'Rear foot on a couch or chair for split squats. Feet on it for push-ups.',
      'Inverted rows under a sturdy table, or a bar if you have one.',
      EACH_SIDE,
    ],
    blocks: [
      prepAthletic(true),
      circuit('Power', 3, 60, fixed('broad-jump', reps(4)), fixed('lateral-bound', reps(4))),
      circuit('Split squat + push', 3, 75, fixed('bw-bulgarian-split-squat', reps(10)), fixed('feet-elevated-push-up', reps(10)), fixed('quadruped-t-spine-rotation', reps(6))),
      circuit('Hinge + row', 3, 75, fixed('bw-single-leg-rdl', reps(8)), fixed('inverted-row', reps(10)), fixed('bird-dog', reps(6))),
      circuit('Single leg + pillar', 2, 45, fixed('skater-squat', reps(5)), fixed('side-plank', secs(30)), fixed('bear-crawl', secs(30))),
    ],
  },
  {
    id: 'lib_power_conditioning',
    name: 'Power & Conditioning',
    level: 'intermediate',
    focus: 'conditioning',
    minutes: 30,
    summary: 'Jumps, swings on the minute, then pushes and carries. Fitness without junk volume.',
    notes: [
      'On the clock: start each round at the top of the minute and rest for whatever’s left.',
      'Swings are a hip snap, not a squat or a front raise. The bell floats to chest height.',
      'Quality over exhaustion: if form slips, stop the round early.',
    ],
    blocks: [
      prepAthletic(),
      circuit('Power', 3, 60, jump(5), upperPower(5)),
      onTheClock('Swings on the minute', 10, 60, swing(15)),
      circuit('Push + carry', 3, 60, sledOrCrawl(), carry(40)),
    ],
  },

  // ---------------------------------------------------------------- Advanced
  {
    id: 'lib_adv_lower',
    name: 'Strength & Power: Lower',
    level: 'advanced',
    focus: 'lower',
    minutes: 55,
    summary: 'Heavy hinge, loaded rear-foot split squats, Nordics and power contrasts.',
    notes: [
      'Hinge sets are heavy, about two reps short of your limit. Rest fully.',
      'Nordics: anchor your heels under something solid and lower as slowly as you can. Push back up with your hands.',
      PICK_WEIGHT,
      EACH_SIDE,
      'Pair with Strength & Power: Upper.',
    ],
    blocks: [
      prepAthletic(),
      circuit('Power', 4, 75, jump(3), fixed('lateral-bound', reps(3))),
      circuit('Hinge', 4, 150, hingeStrength(5), fixed('ankle-rock', reps(8))),
      circuit('Single leg', 3, 90, rfess(6), lateralSidePlank(25)),
      circuit('Hamstrings', 3, 75, fixed('nordic-curl', reps(4)), singleLegHinge(8)),
      circuit('Carry', 2, 45, suitcase(40), fixed('dead-bug', reps(8))),
    ],
  },
  {
    id: 'lib_adv_upper',
    name: 'Strength & Power: Upper',
    level: 'advanced',
    focus: 'upper',
    minutes: 50,
    summary: 'Explosive throws, heavy press and chin-ups, rows, half-kneeling press and shoulder work.',
    notes: [
      'Chin-ups: when 8 clean reps are easy, add weight with a belt or a dumbbell between the feet.',
      'Keep a two-to-one ratio of pulling to pressing across the week.',
      PICK_WEIGHT,
      EACH_SIDE,
      'Pair with Strength & Power: Lower.',
    ],
    blocks: [
      prepAthletic(),
      circuit('Power', 4, 60, upperPower(4), rotationalPower(4)),
      circuit('Press + pull', 4, 120, heavyPress(5), chinUp(5)),
      circuit('Row + press', 3, 75, row(8), overheadPress(6)),
      circuit('Shoulders + pillar', 2, 45, shoulderHealth(15), chop(10, 30), carry(45)),
    ],
  },
  {
    id: 'lib_adv_total_power',
    name: 'Total Body Power',
    level: 'advanced',
    focus: 'power',
    minutes: 55,
    summary: 'Hang cleans or heavy swings, front squats, chin-ups, single-leg hinge and get-ups.',
    notes: [
      'Cleans only if you’ve been coached on them. Heavy swings give most of the same benefit.',
      'Turkish get-ups are slow and deliberate. Eyes on the weight the whole way.',
      PICK_WEIGHT,
      EACH_SIDE,
    ],
    blocks: [
      prepAthletic(),
      circuit(
        'Power',
        4,
        120,
        slot(opt('hang-clean', reps(3), 'barbell'), opt('kettlebell-swing', reps(10), 'kettlebells'), opt('broad-jump', reps(3))),
        upperPower(4)
      ),
      circuit('Squat + pull', 4, 120, frontSquat(5), chinUp(5)),
      circuit('Hinge + push', 3, 75, singleLegHinge(6), heavyPress(8)),
      circuit(
        'Get-up + pillar',
        2,
        60,
        slot(opt('turkish-get-up', reps(2), 'kettlebells'), opt('turkish-get-up', reps(2), 'dumbbells'), opt('bear-crawl', secs(40))),
        lateralSidePlank(25)
      ),
    ],
  },
  {
    id: 'lib_adv_bodyweight',
    name: 'Advanced Bodyweight',
    level: 'advanced',
    focus: 'full_body',
    minutes: 45,
    summary: 'Hard bodyweight progressions: skater squats, Nordics, pull-ups, plyo push-ups.',
    notes: [
      'Skater squats: hold light weights out front to counterbalance if you need to. Lower the knee pad as you get stronger.',
      'No bar? Swap pull-ups for inverted rows with your feet up on a chair.',
      EACH_SIDE,
    ],
    blocks: [
      prepAthletic(true),
      circuit('Power', 3, 75, fixed('broad-jump', reps(4)), fixed('plyo-push-up', reps(5)), fixed('lateral-bound', reps(4))),
      circuit(
        'Single leg + push',
        3,
        90,
        fixed('skater-squat', reps(8)),
        fixed('feet-elevated-push-up', reps(15)),
        fixed('quadruped-t-spine-rotation', reps(6))
      ),
      circuit('Hamstrings + pull', 3, 90, fixed('nordic-curl', reps(4)), slot(opt('pull-up', reps(8), 'pullup_bar'), opt('inverted-row', reps(12)))),
      circuit('Hinge + pillar', 2, 60, fixed('bw-single-leg-rdl', reps(10)), fixed('side-plank', secs(40)), fixed('bear-crawl', secs(45))),
    ],
  },
  {
    id: 'lib_adv_conditioning',
    name: 'Conditioning Intervals',
    level: 'advanced',
    focus: 'conditioning',
    minutes: 30,
    summary: 'Heavy swings on the minute, then pushes and carries on a 90-second clock.',
    notes: [
      'Use a bell heavy enough that 20 swings take real effort, light enough that every rep is crisp.',
      'On the clock: whatever’s left of the interval is your rest. If you run out of rest, drop the reps, not the form.',
    ],
    blocks: [
      prepAthletic(),
      onTheClock('Swings on the minute', 8, 60, swing(20)),
      onTheClock('Push + carry', 5, 90, sledOrCrawl(), carry(40)),
    ],
  },
];

export const findLibraryWorkout = (id: string): LibraryWorkout | undefined =>
  WORKOUT_LIBRARY.find((w) => w.id === id);
