# Exercise library

The 200 extra built-in exercises in Workouts, on top of the 59 hand-made ones
in `src/data/workoutExercises.ts`. Taken from
[free-exercise-db](https://github.com/yuhonas/free-exercise-db), which is public
domain (Unlicense): no credit or licence text needed, and we can change
anything.

| | |
|---|---|
| `picks.tsv` | The curated list: source name → our id, our name, and any overrides (`muscle=`, `equipment=`, `kind=`). **Ids are permanent once shipped**: they're stored in workouts, sessions and records. |
| `steps-overrides.json` | Hand-written steps where the source's were missing or unusable. |
| `scripts/importExerciseLibrary.ts` | Builds everything below from those two files. |
| `src/data/exerciseLibrary.ts` | Generated: the exercises and their how-to steps. |
| `src/data/exerciseLibraryImages.ts` | Generated: the bundled start/end photos. |
| `assets/exercise-library/` | Generated: the photos, 440 px wide. Kept apart from `assets/exercises/`, which the art publish step prunes. |

Run with `npx tsx scripts/importExerciseLibrary.ts`. It downloads the dataset at
the commit pinned in the script, caches photos in `.cache/` here (git-ignored),
and resizes with `sips` (macOS) or ImageMagick.

How the fields are filled when `picks.tsv` doesn't override them:
- **Muscle** from the first primary muscle: lats, middle/lower back and traps →
  back; quads, hamstrings, glutes, calves, adductors, abductors → legs; biceps,
  triceps, forearms → arms; abdominals → core.
- **Equipment:** e-z curl bar → barbell, kettlebells → kettlebell, body only →
  bodyweight, bands → band; medicine ball, exercise ball and anything else → other.
- **Kind:** bodyweight → reps, a static hold → time, anything else → weight.
- **Steps:** the source's instructions, minus the closing "Repeat for the
  recommended amount of repetitions."

To swap the photos for generated art later, give the exercise a spec in
`src/data/exerciseDemos.ts` and run the art pipeline; approved art wins over
the library photos.
