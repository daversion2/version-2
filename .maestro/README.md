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
