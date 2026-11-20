# Back Pain — micro-app spec

*Status: Lab. Written 2026-11-20 from the idea: "for improving injuries and
pain. Specifically back pain. It would follow the same principles as the
phases in the workout app. You would measure your pain in some way (let's do
back pain only for simplicity). Then, you would pick from a list of things to
do every day (stretches, mobility exercises, diet choices, etc...), then you
would follow that for a week or two (whatever the evidence shows is enough
time to make a difference), and then you would retest and/or review your pain
levels. There would be daily check ins for pain level and whether or not you
did what you were supposed to do, etc..."*
*Id: `pain` (permanent — MiniAppId, `lab_pain_*` collections, Lab flag). The
title says "Back Pain" because v1 covers backs only; the id stays general so
other areas can join later without a migration.*

Agreed with the founder before building (2026-11-20): PSFS + 0–10 pain as the
test, blocks of 2/3/4 weeks defaulting to 3, at most three picks, no diet in
v1, a red-flag check before any plan, framed as a self-experiment.

## Who uses it

Someone who already trains with Workouts and has had a nagging lower back for
months (stiff after sitting all day, sore the morning after deadlifts) and
wants to find out what actually helps instead of trying ten things at once.

**The moment they open it:** almost always the evening check-in, on the sofa
or in bed, with 20 seconds and one thumb: how was my back today, and did I do
my things? Every few weeks there's a longer moment of 2–3 minutes: setting up
a plan, or retesting at the end of one.

## What they want to do (max 3)

1. **Check in each day in seconds:** today's pain and which plan items got done.
2. **Run a plan:** say where I am now, pick up to three things, follow them for a few weeks.
3. **See whether it worked:** retest, compare against the start with honest
   thresholds, then keep the plan, drop something or swap something.

## What we track (max 3 facts per entry)

**A day** (the check-in):

| Fact | Type | Shown where / decides what |
|---|---|---|
| Pain | 0–10 whole number | The 14-day bars, the retest's prefill, the flare warning, the dashboard metric |
| Done | plan item ids | Plan days for the weekly goal and streak, adherence on the results |
| Friction | `RESISTANCE_LEVELS` 1–3 | The product's spine, same as every app |

**A plan** (one per block): which items, how long, how long the pain has gone
on, and the test at the start and at the retest. The test is:
- **Average pain over the past 7 days**, 0–10. This is a standard recall
  question, prefilled from your check-ins when there are at least 3 of them.
- **1–3 activities you choose**, each rated 0–10 for how well you can do it
  now (the Patient-Specific Functional Scale). 0 means you can't do it at all;
  10 means as well as before the pain.

## What we deliberately don't track

| Not tracked | Why |
|---|---|
| Where it hurts (body map), pain type (sharp, dull, burning) | Back only in v1, and the type changes nothing the app does. |
| Several ratings a day, or morning vs. evening | One evening average is what the trials use, and a second rating halves the check-in speed. |
| Oswestry or Roland-Morris questionnaires | Long (10–24 questions) and licensed for commercial use. The PSFS is free, quick and personal. |
| Medication | It matters, but it's medical territory, and asking implies we'd advise on it. The results say a change in medication muddies the answer. |
| Minutes walked, reps, sets | Each item's description sets the dose, and a tick says you did it. A wearable counts steps better. |
| Diet | Apart from weight loss, there's little evidence that diet changes back pain. Left out of v1 on purpose (founder, 2026-11-20). |
| Sleep, stress, mood | Not this app's job. A wearable does sleep better. |
| Notes, photos | Not in v1. |
| Physio or doctor visits | Out of scope. The app says when to see one, and that's all. |
| The red-flag answers | Only that the check was passed (`screened_at`). Storing health answers we don't use is a liability. |
| Reminders | No app in Neuro-Nudge schedules repeating reminders since 2026-10-31. |

## The simplest flow

**Signature interaction (open → logged, zero setup):**
1. Tap today's pain (0–10) on the home screen. The check-in sheet opens with it chosen.
2. Tick the plan items you did. This is 0–3 taps, and the sheet has none with no plan.
3. Tap how hard it was to get started. That saves. With nothing ticked, tap **Save**.

So it's 2 taps on a day with no plan or nothing done, plus one per item
ticked. That's more than the ≤3 target when all three items are done; it's
accepted, because "did you do it" is the whole point of the check-in.

**Defaults that make zero setup work:**
- Check-ins work with no plan, as a plain pain diary.
- Those check-ins then prefill the starting test's 7-day pain.
- The weekly goal is 5 plan days.
- Blocks are 3 weeks.
- Activity suggestions are one tap each, so nothing needs typing.

## How it fits Neuro-Nudge

- **Friction (1–3, `RESISTANCE_LEVELS`):** asked in the check-in, only when at
  least one plan item was ticked: "How hard was it to get started today?". A
  day with nothing done has nothing to rate.
- **Weekly goal:** plan days (every item ticked) × 5, Monday to Sunday.
- **Streak:** days in a row with every plan item ticked. A today with nothing
  logged yet never breaks it (`homeDashboard.dayStreak`).
- **Dashboard metric (on graduation):** the 7-day pain average against the
  plan's starting number, e.g. "3.4 · down from 5.5".
- **Accent / icon:** `AppColors.pain` (new, a sage green, "recovery") / `body-outline`.

## Screens (max 4)

| Screen | Route | What's on it |
|---|---|---|
| Home | `PainHome` | Today's 0–10 row (tap → check-in sheet). The plan card: week N of M and days to the retest, or "Retest due", or "Start a plan". The flare warning. This week's plan days against the goal, with the streak. The last 14 days as bars. The self-experiment line. |
| Plan | `PainPlan` | One question per step (`StepFlowShell`): red flags → how long it's gone on → 7-day pain → pick activities → rate them → pick up to 3 items → length and start. For a next block (`fromPlanId`), the test steps are skipped, because the last retest is the new start. |
| Results | `PainResults` | Before the retest, the retest itself: 7-day pain (prefilled) and each activity rated again, with no peeking at the old scores. After it: the verdict, pain before → after, each activity before → after, adherence per item, the honest caveats, and "What next". Read-only for past plans. |
| History | `PainHistory` | Past plans (tap → results), check-ins from the last 4 weeks (tap → edit), and the weekly goal setting. |

The check-in itself is a bottom sheet on Home and History, not a screen.

## The menu (evidence-tiered, `data/painPlan.ts`)

| Id | Item | Dose | Tier |
|---|---|---|---|
| `walk` | Walk | 20–30 min at a pace you could talk at | Strong: WalkBack (Lancet 2024) nearly doubled the time before back pain returned |
| `core` | Core strength | 10 min: bird dogs, dead bugs, side planks | Strong: exercise is the best-supported treatment for long-standing back pain |
| `yoga` | Yoga or pilates | 15–20 min beginner back routine | Strong: both beat usual care in trials |
| `mindful` | Mindfulness | 10 min in Meditate | Some: MBSR matched CBT for chronic back pain (JAMA 2016) |
| `extension` | Back extensions | 10 press-ups on your front, 2–3 times a day | Some: helps many, especially when pain eases toward the spine |
| `mobility` | Gentle mobility | 5 min: cat-cow, knee rocks, child's pose, hip flexor stretch | Some: moving helps; the evidence is for movement, not these stretches |
| `heat` | Heat | Heat wrap or hot-water bottle, 20 min | Some: helps in the first weeks of an episode, little evidence later. Tagged for recent pain. |
| `breaks` | Sitting breaks | Up and moving for a minute every 30–45 min of sitting | Some: modest evidence, costs nothing |

## Safety

- **Red flags before every plan:** numbness around the groin or bottom; new
  bladder or bowel trouble; leg weakness that's getting worse; fever or
  feeling unwell; unexplained weight loss; a history of cancer; pain that
  started after a fall, an injury or with weak bones; night pain that rest
  doesn't ease.
  - "None of these" continues.
  - "One or more" stops: talk to a doctor first. For the first two, get
    urgent care today.
  - No plan is created.
- **Flare warning:** the two most recent days, back to back and ending today
  or yesterday, each 3+ points above the plan's starting pain. The app says to
  ease off anything that makes it worse, and to see a doctor or physio if it
  keeps up.
- **Every screen's footer:** a self-experiment, not medical advice.

## Data model

`users/{uid}/lab_pain_days/{YYYY-MM-DD}` — one per day, keyed by date so an
edit overwrites.

`users/{uid}/lab_pain_plans/{autoId}` — one per block.

`users/{uid}/lab_pain_prefs/main` — the weekly goal.

```ts
interface PainDay {
  date: string;              // YYYY-MM-DD, local; also the doc id
  pain: number;              // 0–10
  done: PainItemId[];        // plan items ticked
  logged_at: string;         // ISO
  resistance?: 1 | 2 | 3;
  resistance_scale?: 3;
}

interface PainPlan {
  id: string;
  number: number;            // 1, then 2, 3… along a chain
  previous_plan_id?: string;
  onset: 'recent' | 'months' | 'long';  // <6 weeks, 6–12 weeks, >12 weeks
  items: PainItemId[];       // 1–3
  weeks: 2 | 3 | 4;
  start_date: string;
  retest_date: string;       // start + weeks × 7
  baseline: { pain_week: number; activities: { label: string; score: number }[] };
  retest?: { pain_week: number; scores: number[] };  // same order as baseline.activities
  retest_at?: string;
  closed_on?: string;        // local date it was retested or ended
  change?: string;           // "Swapped Walk for Yoga or pilates"
  status: 'active' | 'complete' | 'ended';
  screened_at: string;
  created_at: string;
  updated_at: string;
}

interface PainPrefs { weekly_goal: number }
```

A day's plan is worked out from the plans' dates (`planOn`), not stored on
the day. One fewer fact, and nothing to go stale when a plan is ended.

## Pure logic (`services/painMath.ts`, all tested)

- `painWord(n)`: none / mild / moderate / severe (0, 1–3, 4–6, 7–10).
- `retestDateFor`, `planWeek`, `daysUntilRetest`, `isRetestDue`, `activePlan`.
- `planOn(plans, date)`: the plan a day belongs to. It runs from its start
  until it's closed, and the newest wins on a handover day.
- `isPlanDay(day, plan)`: every item ticked.
- `weekSummary(days, plans, today, goal)` and `planStreak(days, plans, today)`.
- `painAverage(days, today, n)`: the mean and count over the last n days, and
  `prefillPain` for when there are 3 or more check-ins.
- `itemAdherence(plan, days, today)`: done out of possible days, inside the
  planned window, for each item.
- `comparePain(before, after)`: better if down 2+ points, or 30%+ and at least
  1 point. Worse if up 2+. Otherwise the same.
- `compareActivities(before, after)`: the average change. 2+ points either way counts.
- `planVerdict(pain, activities)`: better / mixed / same / worse.
- `resultNotes(plan, adherence)`: the natural-recovery note for recent pain,
  the low-adherence note, and the medication line.
- `isFlare(days, plan, today)`.
- `suggestNext(verdict, adherence)`: keep / swap / consistency, with a why.
- `describeChange(prevItems, nextItems)`.
- `newPlan`, `recordRetest`, `endPlan`, `nextPlanFrom`.
- `recentPain(days, today, n)`: the bars' values, null where nothing was logged.

## Out of scope for v1

- Other body areas (neck, knee, shoulder): the id allows them later.
- Correlations ("on days you walked, pain was lower"): too noisy until there are months of data.
- Guided routines: v2 could run the stretches through Workouts' session screen and exercise figures.
- Diet items.
- Exporting a report for a physio.

## Open questions — each with the default chosen

- **Which friction question?** Defaulted to `RESISTANCE_LEVELS` with "How hard
  was it to get started today?", asked only when something was ticked. A plan
  is several small starts across the day, like Meals' one rating a day.
- **What counts as a plan day: all items or any?** Defaulted to all of them,
  because "the plan" is what the experiment tests. Partial days still show in
  per-item adherence.
- **Can you retest early?** Defaulted to no. Retest opens on the retest date,
  and before that you can end the plan instead. Retesting early undercuts the
  block length the evidence asks for.
- **Show the old activity scores during the retest?** Defaulted to hidden
  until it's done, so the retest isn't anchored on them.
- **Re-ask red flags and onset for a next block?** Defaulted to yes. It's two
  taps, and things change over weeks.
- **Where is the 7-day pain from at the retest?** The recall question,
  prefilled from the last 7 days of check-ins when there are at least 3. The
  user confirms it, so start and end are measured the same way.

## Graduating to live (not done in the Lab build)

- Add `pain` to `TodayAppId` / `TODAY_APPS`, switch friction to `finishSession`.
- Rename or migrate `lab_pain_*`, flip `release` to `'live'`.
- A dashboard page / ring: the 7-day pain average against the starting number.
- Review the copy and the red-flag list with a clinician before it reaches everyone.

## What got built (Lab, 2026-11-20)

Built the same day as the spec, with the `build-micro-app` skill. Open it from
**Admin → Lab → Back Pain** (admin accounts only). It ships over the air.

| Piece | Where |
|---|---|
| Types | `src/types/pain.ts` |
| The menu, red flags, suggestions, defaults, copy | `src/data/painPlan.ts` |
| All the rules (pure, 34 tests) | `src/services/painMath.ts`, `__tests__/painMath.test.ts` |
| Storage (3 tests) | `src/services/labPain.ts`, `__tests__/labPain.test.ts` |
| Manifest + gate | `MINI_APPS.pain` in `services/miniApps.ts`, `release: 'lab'` |
| Route | `PainApp` in `RootNavigator` (getComponent + require) |
| Lab entry | `src/screens/Lab/experiments.ts` |
| Screens | `src/screens/Lab/experiments/pain/`: `PainHomeScreen`, `PainPlanScreen`, `PainResultsScreen`, `PainHistoryScreen`, `components/CheckInSheet`, `PainScale`, `PainBars` |
| Colour | `AppColors.pain` in `constants/theme.ts` |
| Clear Account | `lab_pain_days`, `lab_pain_plans`, `lab_pain_prefs` added to `USER_SUBCOLLECTIONS` in `services/users.ts` (a jest guard caught it) |

**Collections:** `users/{uid}/lab_pain_days/{date}`, `users/{uid}/lab_pain_plans`,
`users/{uid}/lab_pain_prefs/main`. No rules or index changes.

**Reused, not rebuilt:**
- `homeDashboard.dayStreak`, `habitSchedule.addDays` / `daysBetween`
- `StepFlowShell` for the plan flow
- `BottomSheet`, `SegmentedControl`, `Stepper`, `InputField`, `ListGroup`/`ListRow`, `ProgressRing`

**Differences from the spec:**
- **The Results screen does three jobs.** It's the plan in progress (items and
  doses, adherence so far, End plan early), the retest once it's due, and the
  outcome afterwards. Without that, a running plan had no screen of its own,
  and a fifth screen would break the limit of four.
- **Two small components are new.** `PainScale` is the 0–10 row, used for pain
  and for activities. `PainBars` is the 14-day chart. `MiniBars` draws a 0
  the same as a missing day, which is wrong for pain.
- **The activities step can be skipped** ("Skip, track pain only"). The plan
  then compares pain alone.
- **A partly done today doesn't break the plan streak.** There's still time
  to finish it, the same rule as an empty today.
- **Ending a plan early sets `closed_on` to yesterday.** Today's check-in stops
  showing its items, and a plan ended the day it started never covers a day.

**Not checked on screen yet.** Jest and tsc are clean; nobody has seen it in
the simulator. See `docs/backlog.md`.
