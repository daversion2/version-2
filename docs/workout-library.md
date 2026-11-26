# Workout library

*Built 2026-11-25. Admin-only for now.*

Premade workouts in the Workouts app, by level, that fit whatever equipment
someone says they have. Opened from Workouts → Create → **Workout library**
(admins only; `canSeeWorkoutLibrary` in `src/services/workoutLibrary.ts` is the
one gate — make it return `true` to open it to everyone).

## Where things live

| What | File |
|---|---|
| Templates, gear list, excluded exercises | `src/data/workoutLibrary.ts` |
| Fitting to equipment, listing, copying | `src/services/workoutLibrary.ts` (+ `__tests__/workoutLibrary.test.ts`) |
| Screens | `src/screens/Lab/experiments/workouts/WorkoutLibraryScreen.tsx`, `WorkoutLibraryDetailScreen.tsx` |
| Types | `LibraryWorkout`, `LibrarySlot`, `LibraryGear`, … in `src/types/workouts.ts` |

## How it works

- Pick a level (Beginner / Intermediate / Advanced) and tick the equipment you
  have, or **Bodyweight only**. Both are remembered (`WorkoutPrefs.library_level`,
  `library_gear`).
- Every exercise slot in a template lists options **best first**. The first one
  your equipment covers is used. Dumbbells + bench gets a dumbbell bench press;
  dumbbells alone a floor press; nothing gets push-ups.
- Every template fits a full gym **and** no equipment at all (a test checks
  this), so all 15 always show. The gear only changes which exercises you get.
  The slot model still lets a future template require equipment; the list then
  says "N more need equipment you haven't ticked".
- **Add to my workouts** copies the fitted version into the user's own
  workouts (`Workout.library_id` set), where it runs, edits and deletes like
  any other. No weights are prefilled: the first session becomes "last time".

## The principles (Verstegen / Exos, Boyle, Cook)

1. **Session order (Exos):** movement prep → power → strength → pillar and carries.
   Every session except the mobility one opens with a movement-prep circuit.
2. **Mobility before stability before strength (Cook):** beginner prep starts
   with crocodile breathing and active straight-leg lowering; the Mobility &
   Pillar Reset session is an FMS-style corrective day.
3. **Single-leg emphasis (Boyle):** split squats, rear-foot-elevated split
   squats, single-leg RDLs, skater squats and lateral lunges carry most lower-body
   work.
4. **Paired supersets / tri-sets (Boyle):** a main lift, a contrasting lift,
   and a mobility or core filler in the rest.
5. **Core as anti-movement (Boyle, McGill, Cook):** dead bugs, bird dogs, side
   planks, Copenhagen planks, Pallof presses, half-kneeling chops and loaded
   carries. No crunches.
6. **Joint-friendly loading:** trap bar over straight bar for deadlifts; front,
   goblet and double-kettlebell front squats instead of back squats;
   half-kneeling or landmine pressing overhead; at least as much pulling as
   pressing, plus face pulls or band pull-aparts.
7. **Quality over fatigue:** power work is low-rep and all-out; conditioning
   is swings, sled pushes, carries and crawls on a clock, not high-rep jumps or
   burpees.
8. **Progressions:** each level and each fallback is a regression or
   progression of the same pattern (chin-up negatives → band-assisted → chin-ups;
   incline → floor → feet-elevated → plyo push-ups).

**Excluded on purpose** (`LIBRARY_EXCLUDED_EXERCISES`, enforced by a test):
crunch and sit-up variations, Russian twists and side bends, upright rows, leg
extensions and the hip abduction/adduction machines, Smith machine lifts, back
squats, good mornings, burpees, tire flips, sledgehammer swings, muscle-ups.

## The 15 templates

| Level | Workout | Focus | ~min |
|---|---|---|---|
| Beginner | Foundations A | Full body | 40 |
| Beginner | Foundations B | Full body | 40 |
| Beginner | Bodyweight Basics | Full body, no equipment | 30 |
| Beginner | Mobility & Pillar Reset | Mobility, no equipment | 20 |
| Intermediate | Total Body Strength A | Full body | 50 |
| Intermediate | Total Body Strength B | Full body | 50 |
| Intermediate | Lower Body Strength | Lower | 45 |
| Intermediate | Upper Body Strength | Upper | 45 |
| Intermediate | Bodyweight Strength | Full body, no equipment | 40 |
| Intermediate | Power & Conditioning | Conditioning | 30 |
| Advanced | Strength & Power: Lower | Lower | 55 |
| Advanced | Strength & Power: Upper | Upper | 50 |
| Advanced | Total Body Power | Power | 55 |
| Advanced | Advanced Bodyweight | Full body, bodyweight + bar | 45 |
| Advanced | Conditioning Intervals | Conditioning | 30 |

## New exercises

31 exercises were added to the core catalog (`CORE_EXERCISES`) with written
positions and cues in `exerciseDemos.ts`, among them bird dog, crocodile
breathing, active straight-leg lowering, world's greatest stretch, split squat,
skater squat, single-leg RDLs, half-kneeling press and chops, band Pallof press,
suitcase carry, Copenhagen plank and med ball rotational throw. They have **no photos
yet**, so the app shows the text positions. **They show up in everyone's exercise
picker**, not just admins'. They're additive and harmless, but that part is live
for all users.

## For the founder to review

- The exercise choices and their best-first order in each slot (the slot
  families near the top of `data/workoutLibrary.ts`).
- Reps are per side for single-arm and single-leg work. The app has no
  "each side" field, so each template's notes say so.
- Sled push is logged as weight × "reps" (one rep = one push of about 20 m).
- Photos for the 31 new exercises (the existing exercise-art pipeline).
