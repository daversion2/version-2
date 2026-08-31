# Skip Capture — "what got in the way?"

The other half of the resistance loop. The app measured resistance only on days
you won; this measures the days you didn't, which is where the positioning
("a habit tracker that finally understands why you skip") actually lives.

## Locked decisions

| # | Decision | Why |
|---|---|---|
| **S1** | **Ask on next open**, not via notification or an explicit "I skipped" button | Almost nobody proactively opens an app to report failure, and a nightly notification gets ignored like every other one. Next-open needs no permission and catches everyone. |
| **S2** | **One tap: reason only.** No resistance rating on a skip | This lands on someone who already knows they fell short. Anything longer is where trackers get deleted. |
| **S3** | **Six reasons, grouped internal/external** — "It was me" vs "It was the day" | The split is the insight: dread needs a different response than a genuinely full week. The grouping is shown to the user, because naming the distinction is part of what the app teaches. |
| **S4** | **Logging a skip costs nothing** — no extra streak or XP penalty | The missed week already did whatever it did, whether or not they told you. If honesty is punished, people stop being honest and the dataset dies. |
| **S5** | **A skip is a WEEK that fell short**, judged against the weekly target | Habits carry a weekly target, not assigned days. A 3x/week habit has four legitimately empty days; treating "no log yesterday" as a skip would manufacture four false skips a week. |
| **S6** | **One question per habit**, not per missed rep | A user short on five habits would otherwise face a dozen questions in a review they didn't ask for. |
| **S7** | **Surfaces on Progress and on each habit's detail page** | Reason mix + internal/external split overall; per-habit, what stops you doing that specific one. |

## Two known limitations, accepted deliberately

**Recall lag.** S5 avoids false skips but means someone is asked on Monday about
a week that ended Sunday. "Forgot" will be over-reported because it is the
honest answer to "I don't remember." Mitigated by showing the days they *did*
manage ("You did it Tue and Thu") to jog memory. Treat this data as directional,
not precise.

**Question volume.** Capped at `REVIEW_CAP` (3) habits per review, biggest
shortfall first, with the remainder reported rather than silently dropped. A
review that feels like an interrogation gets dismissed, and a dismissed review
captures nothing.

## Shape

```
data/skipReasons.ts     6 reasons, each carrying its own internal/external kind
services/skipLogic.ts   PURE — shortfall detection + pattern aggregation
services/skips.ts       I/O only — Firestore reads/writes
components/habits/SkipReviewSheet.tsx      the weekly prompt
components/progress/SkipPatternsCard.tsx   both payoff surfaces
```

Two collections under the user:

- `skipLogs` — one doc per answered habit-week. **Deliberately not
  `completionLogs`**: streak, XP and every existing analytic assume a doc there
  means the habit was DONE, so putting misses in it would quietly start counting
  failures as completions.
- `skipReviews` — one doc per week, id = the week's Monday. Bookkeeping, so a
  dismissed week is never re-asked and a partially answered one resumes. Without
  it the prompt would return on every app open until every habit was answered.

`reason_kind` is denormalised onto each skip log at write time, so historical
data keeps its classification even if the reason list is later edited. The
internal/external split is the product's core claim and must not silently change
meaning for past data.

## Not done

- **No feedback loop in the review.** You chose Progress + per-habit surfaces,
  not the "last week you said you ran out of time — want to move this earlier?"
  option. Worth revisiting once there is real data.
- **Nothing prompts on Today.** The review only appears on Home load. There is
  no "I'm not doing this today" action on a habit card.
- **Untested against a real week.** Verified by unit tests over synthetic weeks;
  nobody has watched a real week close and the prompt appear.
