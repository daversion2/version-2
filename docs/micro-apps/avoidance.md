# Avoidance Training — micro-app spec

*Status: Lab. Written 2026-11-01 from the idea: "a to do list but framed as
'avoidance training'. It will be a to do list with a focus on getting users to
add items that they typically put off and thus help them train overcoming
procrastination."*
*Id: `avoidance` (permanent — MiniAppId, `lab_avoidance_*` collections, Lab flag).*

## Who uses it

Someone who already trains with Neuro-Nudge and carries a short, nagging list
in their head that never gets done: book the dentist, return the parcel,
reply to an awkward email, sort last year's receipts. They don't need another
productivity app; their calendar and work tools handle the real to-dos. They
want to get better at the *start*: the moment where they'd usually find
something else to do.

**The moment they open it:** two kinds.
1. Morning or a quiet gap, coffee in hand, 1–2 minutes: "what am I dodging
   today?" They want one thing picked for them, not a list to manage.
2. The instant they notice they're avoiding something, when it's on their
   mind. They want to get it written down in under 10 seconds before the
   thought slides away.

## What they want to do (max 3)

1. **Write down what they're putting off**: one line, in seconds.
2. **Face one today**: the app puts one in front of them (the one avoided
   longest), they do it, and they say how hard starting was.
3. **See the dread was worse than the thing**: what they expected vs. how it
   actually went, and that they're clearing more over time.

## What we track (max 3 facts per entry)

| Fact | Type | Shown where / decides what |
|---|---|---|
| What it is | one line of text | The list, Today's rep, the cleared log |
| How hard they expect starting to be | 1–3 (`RESISTANCE_LEVELS`), optional, set when adding | Compared with the actual rating: "Easier than you feared" |
| How hard starting actually was | 1–3 (`RESISTANCE_LEVELS`), asked on "Did it" | Friction, the cleared log, dread vs reality |

Plus dates the app stamps itself: when it was added (gives "avoided for 23
days") and when it was cleared (week count, streak).

**Why the forecast is the heart of it.** Avoidance runs on a prediction:
"this will be awful." Exposure work in CBT shows the prediction is usually
worse than the event. Writing the prediction down, then rating the reality on
the *same* scale, makes the gap visible: "You expected 'Took everything I
had'. It was 'Easy today'." Over weeks, that record is the training. It is
the same 3-level scale as every other app, so no new scale and no new
concept: the forecast is just friction asked in advance.

## What we deliberately don't track

| Not tracked | Why |
|---|---|
| Due dates | Avoided things usually have no deadline; that's why they drift. Deadlines belong in a calendar. |
| Priority, projects, tags, categories | The old version had categories; nothing read them. A short list doesn't need sorting. |
| Subtasks | If a job is big, the add box says to write the first step instead. One line per rep. |
| Recurring tasks | This is for one-off dodged things. Recurring chores are habits, which the product has moved away from. |
| Notes and attachments | One line is enough to remember it. |
| Time spent | Starting is the rep, however long it takes. |
| Reminders | v2. The app has removed habit reminders (2026-10-31), and a nag about avoided things is exactly what people avoid. |
| How often a task was skipped | It would be a guilt counter. Skipping today's pick just shows the next one. |
| Mood afterwards / relief | Tempting, but a second rating halves the speed. The forecast vs actual gap already shows relief. |

## The simplest flow

**Signature interaction (open → logged, 2 taps, zero setup):**
1. Open. **Today's rep** is at the top: the thing you've avoided longest,
   with "Avoided for 23 days". Tap **Did it**.
2. Tap how hard it was to start. That saves it, and a line shows the
   comparison with what you expected.

**Adding (1 field + 1 tap):** type into "What have you been putting off?",
then tap how hard you expect starting to be. That tap adds it. The return
key adds it without a forecast.

**Not today:** "Not this one" shows the next oldest. It's not stored; tomorrow
starts over from the oldest.

**Defaults that make zero setup work:**
- Weekly goal: 3 cleared a week.
- Empty list: three example prompts in the add box's placeholder rotation,
  plus, if the old Avoidance Training holds open tasks, one tap to bring them
  over.

## How it fits Neuro-Nudge

- **Friction (1–3, `RESISTANCE_LEVELS`):** asked on **Did it**, worded "How
  hard was it to start?", like every app. The forecast asks the same scale in
  advance: "How hard will it be to start?". This app is friction in its purest
  form: the whole product is about the start.
- **Weekly goal:** tasks cleared, default **3**, Monday-start week (like
  Workouts and Hot & Cold).
- **Streak:** weeks in a row that met the goal. The current week counts once
  met and never breaks it (`homeDashboard.weekStreak`).
- **Dashboard metric (on graduation):** "Easier than you feared: 7 of 9", the
  dread-vs-reality count over the last 30 days, with cleared this week as the
  ring.
- **Accent / icon:** `CategoryColors.mind` (purple, unused by the other apps) /
  `flash-outline`, which the old version used too.

## Screens (max 4)

| Screen | Route | What's on it |
|---|---|---|
| Home | `AvoidanceHome` | Add box with forecast chips, Today's rep, "Still avoiding" (oldest first, with days avoided), this week vs goal. Tap a task to rename, change the forecast or delete it. |
| Cleared | `AvoidanceCleared` | Dread vs reality (easier / as expected / harder), cleared count, average days avoided before clearing, then every cleared task with expected → actual. |
| Settings | `AvoidanceSettings` | Weekly goal, bring over from the old Avoidance Training. |

The rating and the task editor are `BottomSheet`s on Home, not screens.

## Data model

`users/{uid}/lab_avoidance_tasks/{autoId}`

```ts
interface AvoidanceTask {
  id: string;
  text: string;
  created_at: string;        // ISO
  created_date: string;      // YYYY-MM-DD, local — "avoided for N days"
  forecast?: 1 | 2 | 3;      // how hard starting is expected to be
  status: 'open' | 'done';
  done_date?: string;        // YYYY-MM-DD, local
  done_at?: string;          // ISO, orders the cleared log
  resistance?: 1 | 2 | 3;    // how hard starting actually was
  resistance_scale?: 3;
  imported_from?: string;    // id in the old users/{uid}/avoidanceTasks
}
```

`users/{uid}/lab_avoidance_prefs/main`: `{ weekly_goal: number }`.

The whole collection is read at once. It's a short personal list, so there's
no window, query or index. The old collection is only ever read.

## Pure logic (`services/avoidanceMath.ts`, all tested)

- `daysAvoided(task, today)`: days from added to cleared (or to today).
- `openTasks(tasks)` and `todaysRep(open, passed)`: oldest first; the rep is
  the oldest not passed over this session.
- `clearedTasks(tasks)`: newest first.
- `weekSummary(tasks, today, goal)` and `streakWeeks(tasks, today, goal)`.
- `outcome(forecast, actual)`: `'easier' | 'as_expected' | 'harder' | null`,
  plus the copy for it.
- `dreadVsReality(tasks, from?)`: counts of each outcome, over tasks with both
  ratings.
- `clearedStats(tasks)`: count and average days avoided.
- `cleanTaskText(text)`: trims, refuses empty, caps at 120 characters.
- `importable(oldTasks, tasks)`: old open tasks not yet brought over, as new
  tasks keeping their original added date.

## Out of scope for v1

- Reminders or a daily nudge.
- Breaking a task into steps.
- Suggested tasks or the old interview's prompts as a flow (the placeholder
  carries the examples instead).
- Reopening a cleared task. Delete it from the log and add it again.

## Open questions — each with the default chosen

- **Does "Did it" mean finished, or started?** Defaulted to **"Did it" =
  you did the thing**, with the add box nudging big jobs into a first step
  ("Write the first step, not the whole job"). That keeps one meaning per
  rep and avoids a half-done state.
- **Is the forecast required?** Defaulted to **optional**: the chips are the
  add buttons, and return adds without one. Most adds will have it because
  tapping a chip is the obvious way to add.
- **Which task is Today's rep?** Defaulted to **avoided longest**. It's the
  most avoidance-shaped choice, and it can't be gamed by only adding easy
  things. Ties go to the higher forecast.
- **A cap on the list?** Defaulted to **none**, but the list is framed as
  "Still avoiding" and Today's rep shows one thing, so a long list never
  becomes the screen.
- **What about the old Avoidance Training's data?** Defaulted to **a one-tap
  import of its open tasks, keeping their added dates**. Its cleared ones
  have no ratings, so they'd only pad the log; they're left behind. The old
  collection is never written.
- **Name.** Defaulted to **Avoidance Training** (header: "Avoidance"), the
  user's own framing and the old feature's name.

## Graduating to live (not done in the Lab build)

- Add `avoidance` to `TodayAppId` / `TODAY_APPS` and switch the "Did it"
  rating to `finishSession` (Today's rating sheet, XP, celebration). Keep the
  forecast in-app.
- Rename or migrate `lab_avoidance_*`, flip `release` to `'live'`.
- A dashboard page with dread vs reality.
- Decide the fate of the archived Training tab's Avoidance screen and its
  `avoidanceTasks` collection.
