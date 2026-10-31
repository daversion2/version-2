# Maestro UI flows

End-to-end flows driving the iOS simulator. They cover the Progress screen's
By Metric section — the cross-habit metric rollup — plus the Training Volume and
Personal Records changes that shipped alongside it.

## Running

```bash
export PATH="$PATH:$HOME/.maestro/bin"

maestro test .maestro/                          # everything
maestro test .maestro/01-by-metric-renders.yaml # one flow
```

Requires a booted simulator with the app installed (`npx expo run:ios`). Flows
run against **whatever data the signed-in account already has**, so they assert
structure and behaviour rather than hardcoded totals — an account with no timed
habits will legitimately have no Time chip.

Screenshots land in `~/.maestro/tests/<timestamp>/<flow>/takeScreenshot/`.

## The flows

| Flow | What it pins down |
|---|---|
| `01-by-metric-renders` | The section mounts and its chip row appears |
| `02-chip-switching` | Chips switch metrics; a "lower is better" metric says so |
| `03-time-filter` | Totals and chips follow the 7/30/all-time window |
| `04-tap-through-and-volume` | Habit rows navigate to detail; Volume + Records render |
| `05-custom-habit-metric-lines` | Custom habits show metric lines; singular/plural captions |
| `10a`–`10d` (Meals, Lab) | Run in order with Meals open (Admin → Lab → Meals, or the Meals card on Today). Chips work out a 0-100 score; a Processed snack pulls the day's average down; the Scoring settings' `On target at` threshold decides the day, and a daily food-group goal is a progress readout that never gates it; the week adds the scores up; closing out an off-target day with no habit linked writes no check-in and reopens. `10d` puts the account back (scoring at defaults, no group goals, today cleared). Chips are targeted by `id: meal-chip-<group>` — the "Processed" heading shares the chip's text. Re-editing an already-logged plate shows a Recent row that can push the Processed-section and lower whole-food chips below the fold further than a fresh picker does — `scrollUntilVisible` + `centerElement` rather than a fixed swipe for those taps. |
| `11-workouts-picker` (Workouts) | Writes nothing. Opens Workouts from the Today "Workout" row; the picker opens on body-part tiles; Pull-up, Push-up, Pull-up picked across tiles shows "1, 3" and a removable order strip; search spans every body part; the circuit saves into the builder with each Pull-up keeping its own reps; single mode picks and closes; leaving asks "Discard changes?" with no native-stack warning. Dev builds raise a startup-warning toast over the confirm button — the flow closes it by position. |
| `12-workouts-phases` (Workouts) | **Writes** two phase docs and, the first time, the Full Body A / B workouts. Needs the Workouts card on Today and the "Train in phases" card on Workouts home (no phase under way, latest not "done"). Setup (Full body + a Mile Run test from the picker, with its "not in your program" note) → baseline (50 lb goblet weight, 9:00 mile) → Phase 1 week 1 of 6 → early retest → results → plan phase 2 → end it. Steppers are tapped `below:` their exercise's name: one hidden under the footer once took "See results" instead. |
| `13a`–`13d` (Meals) | Writes nothing — every picker is Cancelled. Run in order with Today showing. Meals opens from the Today card; the Lunch, Dinner and Something additional pickers show a Recent section; tapping a recent plate fills the chips and a 0-100 score renders. Needs logged plates in the last ~5 weeks. Opening a picker is confirmed by "Close Meals" being gone, not by its title — the day view's "SOMETHING ADDITIONAL" heading matches the extra picker's title. |
| `14a-workouts-best-set` (Workouts) | Writes nothing. Start on Today. Opens Back Squat, Pull-up and Plank from History → Stats (range All) via `subflows/workouts-exercise-stats.yaml` (takes `EXERCISE`, `SHOT`); the Best set card shows a readout, a summary line and a dot per session, and tapping the first dot changes the readout. Needs those exercises logged in ≥2 sessions. Back on Stats is checked by the `History` title — scrolled, the section headings are off screen. |
| `14b-meals-past-weeks` (Meals) | Writes nothing. Starts on Today or in Meals, opens the week view, scrolls to Past weeks, returns to Today. Needs something logged in the 4 weeks before this one. |
| `16a-meals-scoring` (Meals) | **Writes and resets.** The 0-100 spectrum scoring: a clean Eggs+Fruit plate scores 80 ("All whole food."), adding Processed drops it and shows the penalty reason; a middling plate and an all-Processed plate score 57 and 0; the day card reads "Averaged 46 · below your target of 70"; Settings' new Scoring section steppers (`On target at` etc.) persist across navigation; the Guide's worked examples and the week grid show numbers, not Pass/Fail. Clears today and resets scoring to defaults when done. The Meals card on Today sits partly behind the tab bar — `scrollUntilVisible` + `centerElement` before tapping it, or the tap lands on the tab bar instead. The Processed-section chips are behind the picker's footer the same way the 13c extra-picker chips are — swipe the list up before tapping them, or the tap lands on "Didn't eat"/"Save" instead. |
| `17a-home-dashboard` (Today) | Writes nothing. The 2026-10-31 dashboard Today: the Overview / Meditate / Workouts / Meals tab row (icon + label, so selectors are `"., Meditate"` — the icon is a private-use glyph, not empty, and `.*Meditate` would also hit the ring), "LAST 7 DAYS" rings and the "…across all three" line, no Browse library / Create your own / Library tab. Scrolls Overview to show the rings collapse to one line and expand again; taps each page tab and screenshots it. Closes the dev "Open debugger to view warnings" toast if present. Never taps Start/Log. |
| `17b-progress-after-habits` (Progress, Settings) | Writes nothing. Progress (tab at 50% — three tabs now) has no By Metric / Training Volume / Personal Records; opens Sat 24 Oct 2026 from "Days you showed up" by its accessibility label (account- and date-specific; change it when it drops out of the calendar) and checks there's no "Log a habit for this day"; Settings has no Archived Habits row and no "Reminders for individual habits" copy. Never taps Delete. |

## Two gotchas worth knowing before editing these

**Text selectors are full-string regexes.** iOS exposes a `TouchableOpacity`
wrapping an icon and a label as `", Reps"` — leading comma included. Bare `Reps`
matches nothing. Every selector for a chip or habit row needs `.*` around it.

**The tab bar needs a coordinate tap, and a retry.** `tapOn: text` on a React
Navigation tab reports COMPLETED and silently does nothing. Worse, straight
after `launchApp` the accessibility tree is populated before React Native
attaches its gesture responders, so even a coordinate tap can land in that gap
and vanish — waiting on a visible element does not close the window. Both
workarounds live in `subflows/open-progress.yaml`; reuse it rather than
re-deriving them.
