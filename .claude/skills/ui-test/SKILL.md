---
name: ui-test
description: Drive the Neuro-Nudge app in the iOS simulator with Maestro to verify a change actually works on screen — taps, scrolls, assertions, screenshots. Use when asked to run or screenshot the app, to confirm a change works in the real app rather than only in Jest, or to write/extend a Maestro flow. Covers the environment quirks (accessibility selectors, tab-bar taps) that cost several failed runs to discover.
---

# Driving the app with Maestro

Jest proves the functions are right. This proves the assembled app renders and
responds. Reach for it when a change touches a screen.

## Prerequisites

The app must already be installed on a booted simulator:

```bash
xcrun simctl list devices booted     # expect one booted device
```

If nothing is booted or the app isn't installed, `npx expo run:ios` builds and
installs it (several minutes). **A JS-only change needs no rebuild** — Metro's
fast refresh applies it to the running app, so edit and re-run the flow.

Maestro lives outside the default PATH. Every invocation needs:

```bash
export PATH="$PATH:$HOME/.maestro/bin"
maestro test .maestro/                          # all flows
maestro test .maestro/02-chip-switching.yaml    # one flow
```

## Three environment quirks — read these before writing a selector

Each of these cost multiple failed runs to find. They are not obvious from
Maestro's docs because they are React Native + iOS specific.

**1. Text selectors are full-string regexes, and iOS adds a leading comma.**
A `TouchableOpacity` wrapping an icon and a `<Text>` collapses into one
accessibility node whose label is `", Reps"` — comma included, because the icon
contributes an empty label. Since matching is full-string, bare `Reps` finds
nothing. Wrap every chip, button, and row selector:

```yaml
- tapOn:
    text: ".*Reps"          # not "Reps"
```

Plain `<Text>` nodes (section titles like `By Metric`) match exactly and need no
wrapper.

**2. The bottom tab bar needs a coordinate tap.** React Navigation exposes each
tab as an accessibility element, so `tapOn: text: "Progress, tab.*"` reports
**COMPLETED and silently does nothing**. Tap by position instead.

**3. That tap also needs a retry.** Straight after `launchApp`, the
accessibility tree is populated *before* React Native attaches its gesture
responders. A tap landing in that gap vanishes with no error. Waiting on a
visible element does not close the window — only retrying does.

Both tab-bar workarounds are already solved in
`.maestro/subflows/open-progress.yaml`. **Reuse it rather than re-deriving them:**

```yaml
- launchApp
- runFlow: subflows/open-progress.yaml
```

## Finding selectors for a new screen

Dump the live accessibility tree and grep it — this is the fastest way to learn
what a screen actually exposes:

```bash
export PATH="$PATH:$HOME/.maestro/bin"
maestro hierarchy > /tmp/hier.json 2>&1
grep -oE '"accessibilityText" : "[^"]+"' /tmp/hier.json | sort -u
```

Note the field is `accessibilityText`, not `text` — on iOS, `text` holds only
system chrome like the status bar. Mind the spaces around the colon.

## Writing a flow

Model new flows on the existing ones. The shape that works:

```yaml
appId: com.neuronudge.neuronudge
---
- launchApp
- runFlow: subflows/open-progress.yaml     # or navigate yourself
- scrollUntilVisible:
    element:
      text: "Section Title"
    direction: DOWN
    timeout: 40000
- assertVisible: "Section Title"
- takeScreenshot: 06a-thing               # bare name; paths outside the run dir are rejected
```

Screens fetch before they render, so prefer `extendedWaitUntil` and
`scrollUntilVisible` (both take a `timeout`) over assuming content is present.

Screenshots land in:

```
~/.maestro/tests/<timestamp>/<flow-name>/takeScreenshot/<name>.png
```

Failures additionally write the screenshot **and** the full UI hierarchy at the
failing step under `.../screen-hierarchy/`. Read both before concluding a
failure is a real regression — it is usually a selector.

Find the newest run with:

```bash
ls -t ~/.maestro/tests/ | head -1
```

## Maestro asserts; it does not judge

An assertion only checks what someone thought to write. Maestro will happily
screenshot a caption reading "1 reps" and report the flow as passed.

So after a green run, **read the screenshots** and report the concrete values
observed — the actual numbers, the actual strings. Verify arithmetic where a
total and its parts are both on screen. A passing flow is necessary, not
sufficient.

## Known limitation

Flows assert against whatever data the signed-in account holds, so they cover
"does this change work now" rather than durable regression. Renaming a habit
breaks any selector naming it. Genuine regression coverage would need a seeded
test account; don't describe the current suite as one.
