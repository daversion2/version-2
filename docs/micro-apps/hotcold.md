# Hot & Cold — micro-app spec

*Status: Lab. Written 2026-11-01 from the idea: "Build a micro-app that will
help users track cold plunges and sauna sessions by keeping track of both
temperature and time for each."*
*Id: `hotcold` (permanent — MiniAppId, `lab_hotcold_*` collections, Lab flag).*

## Who uses it

Someone who already meditates and trains with Neuro-Nudge and does cold
plunges or cold showers at home and sauna at the gym, two to four times a
week, because they want the mood and resilience effects. They want to see
themselves get braver, not to produce a lab report.

**The moment they open it:** almost always *right after*, not during. They are
dripping wet or still hot, standing by the tub or in a changing room, with
maybe 20 seconds of patience and damp thumbs. The phone usually stayed
outside: heat is bad for phones, and nobody takes one into a plunge. Sometimes,
at a home plunge, they open it *before* to time the dip.

That moment drives the design: **logging after the fact is the main path**,
a timer is the optional extra, and every number arrives already filled in.

## What they want to do (max 3)

1. **Log a session in seconds**: cold or heat, how long, how cold/hot.
2. **Time a cold plunge** without watching the screen: a count-up clock,
   plus a bell at their target.
3. **See they're getting braver**: this week's minutes against their
   goal, and their longest/coldest records.

## What we track (max 3 facts per entry)

| Fact | Type | Shown where / decides what |
|---|---|---|
| Kind | `'cold' \| 'heat'` | Splits every total, record and default |
| Duration | seconds | Week minutes, "longest" records, the next session's prefill |
| Temperature | °C, stored as one number (shown in the user's unit) | "Coldest" record, the next session's prefill, history rows |

Plus the friction rating every app records (below) and the date.

## What we deliberately don't track

| Not tracked | Why |
|---|---|
| Heart rate, HRV, core temperature | A wearable does it better. Typing it in by hand would be a chore. |
| Sauna type (dry, steam, infrared) | Changes nothing the app shows. The temperature already says most of it. |
| Cold type (plunge, shower, lake) | Same. Temperature and time are what matter. If it turns out to matter, it's a v2 chip. |
| Contrast "rounds" as a structure | A sauna → plunge → sauna set is just consecutive sessions on the same day, and the day view already shows them in order. A rounds builder is setup nobody needs. |
| Mood or how they felt afterwards | Friction already captures the one feeling the product is built around. A second rating halves the logging speed. |
| Notes | Wet hands. Not in v1. |
| Breathing technique during cold | Meditate's territory. |
| Location, photos, social | Not this app's job. |
| "Hottest sauna" record | The gym sets the sauna temperature. It isn't an achievement, and chasing it isn't safe. |

## The simplest flow

**Signature interaction (open → logged, 2 taps, zero setup):**
1. Tap **Cold** (or **Heat**) on the home screen. The log sheet opens with
   duration and temperature prefilled from your last session of that kind.
2. Tap how hard it was to start (Easy / Difficult but manageable / Took
   everything I had). **That tap saves it.**

Adjusting the numbers adds a tap or two on the steppers. "Save without a
rating" is a small link for anyone who won't rate.

**Timed plunge:** tap **Time it** → the clock counts up (wall-clock based, so
it survives a locked phone) and the bell rings at your target. Tap **Done**
→ the same log sheet, with the real time filled in.

**Defaults that make zero setup work:**
- First cold session: 2 min at 10 °C / 50 °F. First heat session: 15 min at
  80 °C / 176 °F.
- After that, each kind prefills from your last session of that kind.
- Unit: °F when the phone's region is the US, otherwise °C.
- Weekly goal: 3 sessions. Cold timer target: 2 min.

## How it fits Neuro-Nudge

- **Friction (1–3, `RESISTANCE_LEVELS`):** asked in the log sheet, as the save
  buttons themselves, labelled "How hard was it to start?". It's per session
  because starting a plunge is the textbook case of resistance, and this app
  should show that resistance falling. Stored on the session doc.
- **Weekly goal:** sessions, cold and heat together, default **3**,
  Monday-start week (same as Workouts).
- **Streak:** weeks in a row that met the goal. The current week counts once
  met and never breaks the run (`homeDashboard.weekStreak`, reused).
- **Dashboard metric (on graduation):** this week's minutes, cold and heat
  side by side ("Cold 6 min · Heat 45 min"), with sessions vs goal as the ring.
  The headline the founder may prefer instead: friction on cold starts, falling.
- **Accent / icon:** new theme token `AppColors.hotcold` (a glacier blue,
  distinct from Meals' blue), plus `ThermalColors.cold` / `ThermalColors.heat`
  to tell the two kinds apart. Icon `snow-outline`.

## Screens (max 4)

| Screen | Route | What's on it |
|---|---|---|
| Home (log + today) | `HotColdHome` | **Cold** and **Heat** buttons, **Time it**, this week (sessions vs goal, minutes per kind, streak), today's sessions. Tapping a session edits it. |
| Timer | `HotColdTimer` | Big count-up clock, target and bell, Done / Cancel. |
| History | `HotColdHistory` | Records (longest cold, coldest cold, longest heat), then sessions grouped by day for the last 12 weeks. Records and the streak use all history. Tap to edit or delete. |
| Settings | `HotColdSettings` | Unit °C/°F, weekly goal, cold timer target. |

The log sheet is a `BottomSheet` on Home and History, not a screen.

## Data model

`users/{uid}/lab_hotcold_sessions/{autoId}`

```ts
interface HotColdSession {
  id: string;
  kind: 'cold' | 'heat';
  date: string;           // YYYY-MM-DD, local — the day it happened
  logged_at: string;      // ISO, when saved (orders a day's sessions)
  duration_sec: number;
  temp_c: number;         // one decimal; always °C in storage
  timed?: boolean;        // came from the in-app timer
  resistance?: 1 | 2 | 3;
  resistance_scale?: 3;
}
```

`users/{uid}/lab_hotcold_prefs/main`

```ts
interface HotColdPrefs {
  unit: 'C' | 'F';
  weekly_goal: number;    // sessions
  cold_target_sec: number;
}
```

Queries: sessions `where('date', '>=', from)`, one field, so no composite index.
The in-progress timer is kept in `miniAppDrafts` so a killed app resumes it.

## Pure logic (`services/hotcoldMath.ts`, all tested)

- `toC`, `fromC`, `formatTemp(c, unit)`: conversion, with whole-number display
  that round-trips (stored to one decimal).
- `defaultUnit(locale)`: °F for US regions.
- `clampTemp(kind, c)` and `clampDuration(sec)`: sane bounds (cold −2 to 25 °C,
  heat 40 to 120 °C, 5 s to 30 min for cold, 5 s to 2 h for heat).
- `prefillFor(kind, sessions)`: the last session of that kind, else the
  defaults.
- `weekSummary(sessions, today, goal)`: Monday-start week, with sessions,
  goal, met, and seconds per kind.
- `streakWeeks(sessions, today, goal)`: delegates to `weekStreak`.
- `records(sessions)`: longest cold, coldest cold, longest heat.
- `newRecords(session, others)`: which records a just-saved session broke, for
  a one-line "New record: longest cold" note.
- `groupByDay(sessions)`: newest day first, each day in the order logged.
- `formatDuration(sec)`: "45 s", "2:30", "15 min".
- `tempStep(unit)` and the stepper bounds per unit.

## Out of scope for v1

- Contrast-set builder, guided protocols, breathing cues.
- Charts beyond the week summary (on graduation, the dashboard's history
  charts cover it).
- A sauna timer bell. The phone is outside; the bell is for the plunge. A heat
  session can still be timed, it just doesn't get a target.
- Reminders, Apple Health export, sharing.

## Open questions — each with the default chosen

- **One app or two (Cold, Sauna)?** Defaulted to **one** because the same
  people do both, often in the same visit, and a contrast set should read as
  one day.
- **Name.** Defaulted to **Hot & Cold** (id `hotcold`). Plain words beat
  "Thermal" or "Contrast", and it covers someone who only does one of them.
- **Is friction required?** Defaulted to **asked every time, skippable**:
  the rating buttons are the save buttons, and a small link saves without one.
- **Weekly goal in sessions or minutes?** Defaulted to **sessions**, to match
  the other apps' goal %. Minutes are shown alongside.
- **Records that reward going further?** Defaulted to **longest and coldest
  only, no "hottest"**. A short safety line sits on the Home screen's first
  use and in Settings: "Build up gradually. Get out if you feel dizzy, numb
  or unwell."
- **Past days?** Defaulted to **Today / Yesterday** in the sheet, which
  covers the forgot-last-night case. Older days aren't loggable in v1.

## Graduating to live (not done in the Lab build)

- Add `hotcold` to `TodayAppId` / `TODAY_APPS` and switch friction to
  `finishSession` (Today's rating sheet, XP, celebration). Decide whether to
  keep the in-sheet rating.
- Rename or migrate `lab_hotcold_*`, flip `release` to `'live'`.
- A dashboard page and ring, and a place in the week grid.

---

## What got built (Lab, 2026-11-01)

Built the same day as the spec, with the `build-micro-app` skill. Open it from
**Admin → Lab → Hot & Cold** (admin accounts only). It ships over the air.

| Piece | Where |
|---|---|
| Types | `src/types/hotcold.ts` |
| Defaults, labels, safety line | `src/data/hotcold.ts` |
| All the rules (pure, 26 tests) | `src/services/hotcoldMath.ts`, `__tests__/hotcoldMath.test.ts` |
| Storage (4 tests) | `src/services/labHotCold.ts`, `__tests__/labHotCold.test.ts` |
| Manifest + gate | `MINI_APPS.hotcold` in `services/miniApps.ts`, `release: 'lab'` |
| Route | `HotColdApp` in `RootNavigator` (getComponent + require) |
| Lab entry | `src/screens/Lab/experiments.ts` |
| Screens | `src/screens/Lab/experiments/hotcold/`: `HotColdHomeScreen`, `HotColdTimerScreen`, `HotColdHistoryScreen`, `HotColdSettingsScreen`, `components/LogSheet` |
| Colours | `AppColors.hotcold`, `ThermalColors` in `constants/theme.ts` |

**Collections:** `users/{uid}/lab_hotcold_sessions`, `users/{uid}/lab_hotcold_prefs/main`.
The running timer is kept on the phone (`miniAppDrafts`, key `hotcold`).
No rules or index changes.

**Reused, not rebuilt:**
- `sessionTimer.elapsedSec` (a wall-clock timer that survives a locked phone)
- `sessionBell` (the bell as a scheduled notification)
- `homeDashboard.weekStreak`
- `BottomSheet`, `Stepper`, `SegmentedControl`, `ListGroup`/`ListRow`,
  `ProgressRing`

**Differences from the spec:**
- The safety line sits at the bottom of Home all the time, not only on first
  use. That needs no "seen it" flag, and it's one quiet line.
- The rating label shows as each row's subtitle in Today and History, so a
  falling resistance is visible before any chart exists.
- Changing the bell time on the timer screen also saves it as the new default
  (Settings shows the same value).

**Not checked on screen yet.** Jest and tsc are clean; nobody has seen it in
the simulator. See `docs/backlog.md`.
