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
| `10a`–`10d` (Meals, Lab) | Run in order with Meals open (Admin → Lab → Meals). Chips work out pass/fail; a Processed snack is a miss; the goal and a daily food-group goal decide the day; the week adds up; closing out with no habit linked writes no check-in and reopens. `10d` puts the account back (goal 3 of 3, no group goals, today cleared). Chips are targeted by `id: meal-chip-<group>` — the "Processed" heading shares the chip's text. |
| `11-workouts-picker` (Workouts) | Writes nothing. Opens Workouts from the Today "Workout" row; the picker opens on body-part tiles; Pull-up, Push-up, Pull-up picked across tiles shows "1, 3" and a removable order strip; search spans every body part; the circuit saves into the builder with each Pull-up keeping its own reps; single mode picks and closes; leaving asks "Discard changes?" with no native-stack warning. Dev builds raise a startup-warning toast over the confirm button — the flow closes it by position. |
| `12-workouts-phases` (Workouts) | **Writes** two phase docs and, the first time, the Full Body A / B workouts. Needs the Workouts card on Today and the "Train in phases" card on Workouts home (no phase under way, latest not "done"). Setup (Full body + a Mile Run test from the picker, with its "not in your program" note) → baseline (50 lb goblet weight, 9:00 mile) → Phase 1 week 1 of 6 → early retest → results → plan phase 2 → end it. Steppers are tapped `below:` their exercise's name: one hidden under the footer once took "See results" instead. |

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
