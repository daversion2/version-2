# Habit Library v2 — Proposal (for iteration)

> A re-weighted habit library for the customer avatar: late-20s–mid-30s, ambitious,
> self-aware, externally "fine" but privately frustrated that their life doesn't match
> their vision. Has tried (and abandoned) every wellness app, book, coach, and gym
> membership. The wound is the **broken promise to self** — "I always do this."
>
> **Status:** DRAFT v2. Nothing is wired into code. Goal: agree on content + categories,
> then generate `src/data/habitLibrary.ts`.

---

## The rule every habit here must pass

> **Same action, same trigger — repeatable regardless of what today contains.**

This is the bar. Habit formation needs a *consistent behavior in a consistent context*
(Wood & Neal). If the action changes day to day, or some days it doesn't apply, it's not
a habit — it's a journaling prompt in a habit costume. That's exactly the open-ended
"set your own intention" filler this avatar has already abandoned five apps over.

Concrete test, applied to two killed v1-draft entries:

| Candidate | Same action daily? | Verdict |
|---|---|---|
| "Keep one promise to myself" | No — the promise changes daily | ✗ prompt, not a habit |
| "Do the thing I'm avoiding" | No — varies; some days nothing applies | ✗ prompt, not a habit |
| "Get up at the first alarm" | **Yes — identical action, identical cue** | ✓ habit |
| "Open my banking app and look" | **Yes — identical action, identical cue** | ✓ habit |

Anything in this doc you can't film yourself doing the *same way* tomorrow gets cut.

---

## Self-trust is the FRAME, not a category

The broken-promise wound is the heart of the product — but you don't heal it with a vague
"keep a promise" habit. You heal it with a wall of **specific, repeatable** kept reps —
"I got up at 6," "I did my focus block," "I moved for 20 minutes" — and the app reflecting
that track record back. Self-trust is the *why* behind the whole library; it lives in:

- **Onboarding / narrative copy** — name the wound, position the product as the bridge.
- **The streak + celebration** — "you've kept this 14 times" is the self-trust payoff
  (ties to the celebration/identity mechanics in `habit-library-analysis.md`).
- **The italic *Identity* line** on each habit below — "Each time I do this, I'm someone
  who ___." (Open question: promote to a real `identity` schema field, or keep as copy?)

A **weekly review** ritual (am I closer than last week?) is worth building — but as an
*app feature / prompt*, not a tracked streak habit. Noted, not in the library list.

---

## Schema reminder

```ts
{
  id: string;
  name: string;
  category_id: string;
  description: string;
  suggested_target_per_week: number;
  action_plan: {
    anchor?: string;              // "After I ___" — habit stacking
    pairing?: string;             // optional temptation bundle
    environment_change?: string;  // make it obvious / easy
    obstacle_plan?: string;       // WOOP if-then
    minimum_version?: string;     // two-minute rule floor
    accountability_person?: string;
  }
}
```

---

## Proposed categories

| Category | Why it's here for this avatar | # habits |
|---|---|---|
| **Body** | Foundational energy/sleep. Trimmed of theater & redundancy. | 7 |
| **Focus & Craft** | The ambition gap — output, deep work, attention. | 4 |
| **Mind** | Calm, clarity, attention — trimmed of saturated filler. | 4 |
| **Money** | A huge, avoided source of "I'm behind." Absent from v1. | 3 |
| **Connection** | They're isolated by design. High emotional leverage. Absent from v1. | 3 |

Total: **21 habits** — every one passes the consistency test.

---

## 1. Body

Cut from v1: `take-stairs`, `stand-up-hourly` (theater), `daily-plank` (low-meaning
micro-fitness), `yoga-flow` (redundant — it's an allowed form of `move-20min`),
`cold-shower` (→ challenge library). De-mythed `daily-water`. Collapsed 7 movement
habits into 2 strong ones.

### `no-snooze` — Get up at the first alarm
- **Target/week:** 5
- **Description:** When the alarm goes, feet on the floor — no negotiation. The same action, every morning: win the first decision of the day.
- **Anchor:** hear my first alarm
- **Environment:** Put the alarm across the room so I have to stand up to turn it off
- **Obstacle:** If I'm exhausted, I still stand up and sit on the edge of the bed for 30 seconds before deciding anything
- **Minimum:** Feet on the floor before any second alarm
- *Identity: I'm someone who gets up when I said I would.*

### `move-20min` — 20 minutes of movement *(merged walk + workout + yoga + outdoor)*
- **Target/week:** 4
- **Description:** Twenty minutes of intentional movement — walk, workout, run, or yoga. The form is flexible; showing up isn't.
- **Anchor:** get home from work
- **Pairing:** my favorite playlist or a podcast
- **Environment:** Lay out clothes the night before; keep shoes/gym bag by the door
- **Obstacle:** If I miss a planned session, I do 10 minutes of bodyweight movement at home rather than skip entirely
- **Minimum:** 10 minutes of movement of any kind
- *Identity: I'm someone who moves my body, no matter the week.*

### `morning-daylight` — Get outside in the morning
- **Target/week:** 5
- **Description:** Ten minutes of daylight early in the day — real circadian benefit, not vibes. Light and air before the day starts.
- **Anchor:** finish breakfast
- **Pairing:** a podcast or audiobook
- **Environment:** Lay shoes and a jacket by the door the night before
- **Obstacle:** If it's raining or I'm late, I step outside for 2 minutes or stand by an open window in daylight
- **Minimum:** Stepping outside and to the end of the street and back
- *Identity: I'm someone who starts the day in motion.*

### `consistent-bedtime` — Protect my bedtime
- **Target/week:** 5
- **Description:** A consistent bedtime to protect sleep and recovery — the foundation everything else runs on.
- **Anchor:** see it's 10 PM
- **Environment:** Set a 10pm "wind down" alarm and dim the lights at that time
- **Obstacle:** If I'm out late, I commit to being in bed within 30 minutes of getting home
- **Minimum:** In bed by 11pm on a tough night
- *Identity: I'm someone who guards my sleep.*

### `wind-down` — Screen-free wind-down *(merged digital-detox + pre-bed-stretch + reading)*
- **Target/week:** 5
- **Description:** A 30-minute screen-free wind-down before bed — read, stretch, or sit quietly. An off-ramp instead of a feed.
- **Anchor:** start my bedtime routine
- **Environment:** Charge the phone across the room; keep a book or journal on the nightstand
- **Obstacle:** If I need to be reachable, I switch to Do Not Disturb with calls only rather than scroll
- **Minimum:** 15 minutes of no-phone time before bed
- *Identity: I'm someone who ends the day deliberately.*

### `cook-real-meal` — Cook one real meal
- **Target/week:** 5
- **Description:** Prepare at least one nutritious meal from scratch — an act of looking after yourself that pays off in energy.
- **Anchor:** get home from work
- **Pairing:** a podcast or favorite playlist
- **Environment:** Prep ingredients on Sunday; keep 5 simple recipes on the fridge
- **Obstacle:** If I'm too tired, I make something simple — eggs, a salad, a smoothie
- **Minimum:** Assembling a healthy plate of whole foods
- *Identity: I'm someone who feeds myself well.*

### `water-only` — Water only today
- **Target/week:** 5
- **Description:** Water is the only thing you drink today — no soda, juice, energy drinks, or alcohol. A daily discipline that cuts empty calories and the small crutches you reach for without thinking.
- **Anchor:** pour my first drink of the day
- **Environment:** Keep a full water bottle filled and visible; move soda/juice out of easy reach in the fridge
- **Obstacle:** If I'm out and tempted, I order sparkling water or water with lemon so I still have something to hold
- **Minimum:** Making water my default and skipping at least every sugary and soft drink today
- *Identity: I'm someone who doesn't need a crutch to get through the day.*

---

## 2. Focus & Craft

For the part of them that wants to *build* and feels behind. Note these are concrete
behaviors (a rule you apply the same way), not "do whatever's most important" prompts.

### `phone-free-first-hour` — No phone for the first 30 minutes
- **Target/week:** 5
- **Description:** Start the day on your own agenda, not your notifications. Phone stays away for the first 30 minutes awake.
- **Anchor:** wake up
- **Environment:** Charge the phone outside the bedroom; use a separate alarm clock
- **Obstacle:** If I need the phone as an alarm, I leave it on Do Not Disturb and open no app until my 30 minutes are up
- **Minimum:** 15 minutes phone-free after waking
- *Identity: I'm someone who owns the start of my day.*

### `inbox-after-focus` — First focus block before email *(reframed `hard-thing-first`)*
- **Target/week:** 5
- **Description:** A fixed rule: no email, Slack, or group chat until your first focus block is done. Win the morning before the world makes its demands.
- **Anchor:** sit down at my desk
- **Environment:** Keep inbox and chat apps closed/logged out until the block is finished; decide the block's task the night before
- **Obstacle:** If something genuinely urgent lands first, I handle only that, then protect the next clear 25 minutes
- **Minimum:** 10 minutes of real work before opening any inbox
- *Identity: I'm someone who does the real work first.*

### `deep-focus-session` — One deep focus block *(kept from v1)*
- **Target/week:** 5
- **Description:** One Pomodoro-style block of uninterrupted, single-task work — phone away, one tab, timer running.
- **Anchor:** finish my first coffee at my desk
- **Environment:** Phone in another room, unnecessary tabs closed, focus app running
- **Obstacle:** If I get interrupted, I restart the timer — the goal is one clean block, and it's okay to try again
- **Minimum:** 10 minutes of genuinely focused, single-task work
- *Identity: I'm someone who can go deep on what matters.*

### `plan-tomorrow` — Set tomorrow's top priority *(revived from v1 — it's concrete)*
- **Target/week:** 5
- **Description:** Before you stop for the day, write down tomorrow's single most important thing. Same action, same time — reduces decision fatigue and starts the next day with clarity.
- **Anchor:** finish my workday
- **Environment:** Keep a notepad by the laptop or a pinned note on my phone's home screen
- **Obstacle:** If I can't think of three, I write just one — the single most important thing for tomorrow
- **Minimum:** Writing down one priority for tomorrow
- *Identity: I'm someone who decides my day before it decides me.*

---

## 3. Mind

Cut from v1: `visualization` (reads as "manifesting" — credibility risk). Reframed
`gratitude-list` → `note-one-good-thing` (de-clichéd, specific). Folded `limit-news`
into `protect-attention`. Moved vague open-ended ones (`learn-something-new`,
`practice-skill`, `creative-activity`, `brain-dump`) to enrichment — they fail the
consistency test as streak habits.

### `morning-meditation` — 5-minute meditation *(kept from v1)*
- **Target/week:** 5
- **Description:** Five minutes to build calm focus before the day's noise — a trained skill, not a mood.
- **Anchor:** have my morning coffee
- **Environment:** Set a cushion or chair in a visible spot; open the app the night before
- **Obstacle:** If I'm rushed, I do 2 minutes of deep breathing — that still resets the nervous system
- **Minimum:** 2 minutes of slow breathing with eyes closed
- *Identity: I'm someone who can find stillness on purpose.*

### `breathing-break` — A real midday pause *(kept from v1)*
- **Target/week:** 5
- **Description:** A few minutes of slow, deep breathing to reset the nervous system mid-day — a circuit-breaker for stress.
- **Anchor:** have lunch
- **Environment:** Block 5 minutes on the calendar after lunch with a recurring reminder
- **Obstacle:** If I skip lunch, I do 1 minute of box breathing at my desk
- **Minimum:** 5 slow, intentional breaths
- *Identity: I'm someone who can steady myself.*

### `protect-attention` — No social media before noon *(bright line; merged `limit-news`)*
- **Target/week:** 7
- **Description:** A bright line: no news or social feeds before midday. Start the day on your own agenda, not the feed — and keep the biggest attention sink out of your most valuable hours.
- **Anchor:** wake up
- **Environment:** Remove social/news apps from the home screen (or log out); keep them off until noon
- **Obstacle:** If I genuinely need a platform for work before noon, I go straight to the specific task and close it — no feed scrolling
- **Minimum:** Not opening any feed in the first hour awake
- *Identity: I'm someone who decides where my attention goes.*

### `note-one-good-thing` — Name one good thing *(reframed `gratitude-list`)*
- **Target/week:** 7
- **Description:** Not a forced gratitude list — write down one *specific* good thing from the day, to retrain a mind that defaults to what's wrong.
- **Anchor:** brushing my teeth before bed
- **Environment:** Keep a note on the nightstand or a sticky note on the mirror
- **Obstacle:** If nothing big comes to mind, I go specific and small — a good coffee, a kind text, a problem solved
- **Minimum:** One genuine specific thing
- *Identity: I'm someone who notices what's working.*

---

## 4. Money  *(new category)*

Finances are a top source of "I'm behind" and pure avoidance. Concrete, shame-free,
repeatable habits that replace dread with visibility.

### `check-the-numbers` — Look at my accounts
- **Target/week:** 5
- **Description:** A 2-minute look at your balances — no judgment, just no longer looking away. Avoidance is what makes money scary.
- **Anchor:** finish my morning coffee
- **Environment:** Keep the banking app on my home screen, not buried in a folder
- **Obstacle:** If I dread it, I look for just 30 seconds at one account — visibility beats avoidance every time
- **Minimum:** Opening the app and looking at one balance
- *Identity: I'm someone who faces my money instead of hiding from it.*

### `log-the-spend` — Track today's spending
- **Target/week:** 7
- **Description:** Note what you spent today. Awareness alone changes behavior — you can't manage what you refuse to see.
- **Anchor:** get into bed
- **Environment:** Use one note or app; keep it one tap away
- **Obstacle:** If I forget details, I estimate — a rough log beats no log
- **Minimum:** Logging the single biggest spend of the day
- *Identity: I'm someone who knows where my money goes.*

### `pay-myself-first` — Move money toward a goal weekly
- **Target/week:** 1
- **Description:** Once a week, move something — anything — toward savings or a goal before it gets spent. The amount grows; the habit is what matters.
- **Anchor:** finish my weekly review
- **Environment:** Set up an automatic transfer, or keep the transfer screen bookmarked
- **Obstacle:** If money's tight, I move a token amount — keeping the habit alive matters more than the sum
- **Minimum:** Moving any amount, even small, toward a goal
- *Identity: I'm someone who pays my future self first.*

---

## 5. Connection  *(new category)*

The avatar hides their struggle from everyone. Connection habits carry high emotional
leverage and quietly dismantle the isolation. All concrete actions — no "share something
real if you feel like it" prompts.

### `reach-out` — Send one genuine message
- **Target/week:** 4
- **Description:** Send one genuine message to someone you care about — not logistics, just connection. Relationships compound like anything else.
- **Anchor:** have lunch
- **Environment:** Keep a short list of people I want to stay close to where I'll see it
- **Obstacle:** If I can't think who, I reply properly to the last message I left on read
- **Minimum:** One genuine message to one person
- *Identity: I'm someone who keeps my people close.*

### `make-the-call` — Call someone you haven't spoken to in a while
- **Target/week:** 1
- **Description:** Once a week, actually call someone instead of texting. Voice beats thumbs for the relationships that matter.
- **Anchor:** finish dinner
- **Environment:** Keep a short list of people worth a real call; block 15 minutes for it
- **Obstacle:** If they don't pick up, I leave a warm voicemail or send a voice note — the reach still counts
- **Minimum:** One short call or voice note to one person
- *Identity: I'm someone who makes time for real conversation.*

### `phone-free-dinner` — Phone-free meal with someone
- **Target/week:** 4
- **Description:** One meal with another person and no phones on the table. Presence is the whole point.
- **Anchor:** sit down for dinner with someone
- **Environment:** Set a "phone basket" or leave phones in another room during the meal
- **Obstacle:** If I'm expecting something urgent, I say so out loud and keep the phone face-down and silent
- **Minimum:** Phone away for the first half of the meal
- *Identity: I'm someone who is fully there with the people I love.*

---

## Moved to the Challenge library (not daily habits)

Time-bound discipline/comfort-zone *challenges*, not behaviors meant to automate
(`LibraryChallenge`, `barrier_type: 'comfort-zone'`):

- **cold-shower** — resilience stunt, thin health evidence, mostly generates misses as a daily habit.
- *(Candidates)* "no-spend day," "digital sabbath" — natural challenge-library fits if wanted.

---

## Cut entirely (and why)

| Item | Reason |
|---|---|
| `take-stairs`, `stand-up-hourly` | Habit theater — trivially gameable, near-zero meaning for a self-aware user. |
| `daily-plank` | Low-meaning micro-fitness; movement covered by `move-20min`. |
| `yoga-flow` | Redundant — an allowed form of `move-20min`. |
| `visualization` | Reads as "manifesting" — credibility risk with a skeptical avatar. |
| `no-late-caffeine` | Minor; cut to reduce count. *(Flag to restore.)* |
| `vegetables-every-meal` | Folded into `cook-real-meal`. *(Flag to restore as standalone.)* |
| `hydrate-with-meals` | Auto-satisfied (everyone drinks with a meal) — changes no behavior. Replaced by `water-only`. |
| `single-task` | Duplicate of `deep-focus-session`. |
| `daily-journal` | App already has built-in reflection functionality. |
| `pause-before-buying` | Event-triggered (only when about to buy) — fails the every-day rule. |
| `voice-appreciation` | Too soft / cheesy for this avatar. |
| **"Keep a promise to myself"** | Fails the consistency test — promise changes daily. Now the product *frame*. |
| **"Do the thing I'm avoiding"** | Fails — varies daily, may not apply. (Same for "send the avoided text," "make a delayed money decision," "share something real.") |
| **"Ship something" / weekly review** | Ship: may not apply daily. Review: kept as an app ritual, not a streak habit. |

**Demoted to "flexible / enrichment" (available, but not streak-core):**
`learn-something-new`, `practice-skill`, `creative-activity`, `brain-dump` — too
open-ended to automate; would generate false failures as streak habits.

---

## Open questions for you

1. **Categories:** good with the 5 (Body, Focus & Craft, Mind, Money, Connection)?
2. **Identity line:** promote to a real `identity` schema field this pass, or keep as copy?
3. **Count:** 25 feel right? Leaner (e.g. 4/category = 20) or room for more?
4. **The cuts:** want caffeine / vegetables / a standalone reading habit back?
5. **Challenge library:** want me to also draft cold-shower / no-spend / digital-sabbath entries?
6. **Money & Connection:** these are the biggest bets and totally new — do the specific habits feel right for the avatar, or too prescriptive?
