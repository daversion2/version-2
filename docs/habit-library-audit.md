# Habit Library — Audit

**45 habits** across 5 categories. Generated from the merged catalog in `src/data/practices.ts`.

Tick the **Keep?** box for anything you want to survive the cull, or strike through the row for anything to cut. Ids are what to give me — they are the Firestore doc ids and the `practice_id` on any adopted habit.

| Column | Meaning |
|---|---|
| Target | Suggested times per week |
| Flow | `tap` = plain check-in. `timer`/`away`/`moment` = carries a guided briefing screen |
| Template | Extra metrics captured on completion, on top of the difficulty rating |
| Sci | Has a "what this does to your brain" section |
| Cited | Number of real, linked studies attached |
| ⚠️ | Flagged `off_thesis` — marked during the old direction as not fitting the thesis. A reasonable place to start cutting. |

## At a glance

| Measure | Count |
|---|---|
| Total habits | 45 |
| With a guided flow | 9 |
| With a tracking template | 9 |
| With a science section | 45 |
| With cited research | 13 |
| **Flagged `off_thesis`** | **16** |

| Category | Habits |
|---|---|
| Body | 20 |
| Focus & Craft | 12 |
| Mind | 7 |
| Money | 3 |
| Connection | 3 |

## Body — 20

| Keep? | Habit | id | Target | Flow | Template | Sci | Cited | Description |
|---|---|---|---|---|---|---|---|---|
| [ ] | **Cold Exposure** | `cold_exposure` | 3× | `away` | duration_min<br>water_temp_f | ✓ | 2 | A cold shower or plunge — get in, and stay past the urge to get out. |
| [ ] | ⚠️ **Cook one real meal** | `cook-real-meal` | 5× | — | — | ✓ | — | Prepare at least one nutritious meal from scratch — an act of looking after yourself that pays off in energy. |
| [ ] | **Cut the sugar** | `trad-no-sugar` | 5× | — | — | ✓ | — | Skip added sugar and sugary snacks today. |
| [ ] | ⚠️ **Drink more water** | `trad-drink-water` | 7× | — | — | ✓ | — | Stay hydrated through the day — aim for around eight glasses of water. |
| [ ] | **Eat Healthy Food I Don’t Enjoy** | `eat_healthy_unenjoyable` | 5× | `moment` | meal | ✓ | 2 | Choose the nutritious option over the one you crave — and eat it without doctoring it up. |
| [ ] | ⚠️ **Eat your vegetables** | `trad-eat-vegetables` | 7× | — | — | ✓ | — | Include vegetables or fruit with your meals today. |
| [ ] | **Fasting** | `fasting` | 1× | `away` | duration_hrs | ✓ | 2 | A deliberate fasting window — sit with hunger without acting on it. |
| [ ] | ⚠️ **Floss** | `trad-floss` | 7× | — | — | ✓ | — | Floss your teeth as part of your nightly routine. |
| [ ] | ⚠️ **Get outside in the morning** | `morning-daylight` | 5× | — | — | ✓ | — | Ten minutes of daylight early in the day — real circadian benefit, not vibes. Light and air before the day starts. |
| [ ] | **Get up at the first alarm** | `no-snooze` | 5× | — | — | ✓ | — | When the alarm goes, feet on the floor — no negotiation. The same action, every morning: win the first decision of the day. |
| [ ] | **Heat Exposure** | `heat_exposure` | 2× | `away` | duration_min<br>temp_f | ✓ | 2 | Sauna or sustained heat — sit with the discomfort and stay calm in it. |
| [ ] | **Hit 10,000 steps** | `trad-10k-steps` | 5× | — | — | ✓ | 2 | Stay active across the day and reach a 10,000-step target. |
| [ ] | **Movement** | `movement` | 4× | `away` | duration_min<br>type | ✓ | — | Intentional physical effort — a workout, a hard walk, anything that makes the body work. |
| [ ] | **Protect my bedtime** | `consistent-bedtime` | 5× | — | — | ✓ | 1 | A consistent bedtime to protect sleep and recovery — the foundation everything else runs on. |
| [ ] | **Screen-free wind-down** | `wind-down` | 5× | — | — | ✓ | — | A 30-minute screen-free wind-down before bed — read, stretch, or sit quietly. An off-ramp instead of a feed. |
| [ ] | ⚠️ **Skincare routine** | `trad-skincare` | 7× | — | — | ✓ | — | Follow your skincare routine, morning or night. |
| [ ] | **Stretch** | `trad-stretch` | 5× | — | — | ✓ | — | A few minutes of stretching to stay loose and mobile. |
| [ ] | ⚠️ **Take vitamins** | `trad-take-vitamins` | 7× | — | — | ✓ | — | Take your daily vitamins or supplements. |
| [ ] | **Unplugged Cardio** | `unplugged_cardio` | 4× | `away` | duration_min<br>pace | ✓ | 2 | Run or walk with no phone, music, or screens — physical effort and mental stillness at the same time. |
| [ ] | **Water only today** | `water-only` | 5× | — | — | ✓ | — | Water is the only thing you drink today — no soda, juice, energy drinks, or alcohol. A daily discipline that cuts empty calories and the small crutches you reach for without thinking. |

## Focus & Craft — 12

| Keep? | Habit | id | Target | Flow | Template | Sci | Cited | Description |
|---|---|---|---|---|---|---|---|---|
| [ ] | **Deliberate Boredom** | `deliberate_boredom` | 3× | `timer` | duration_min | ✓ | 2 | No phone, no input — sit with nothing and let the boredom be there. |
| [ ] | **First focus block before email** | `inbox-after-focus` | 5× | — | — | ✓ | — | A fixed rule: no email, Slack, or group chat until your first focus block is done. Win the morning before the world makes its demands. |
| [ ] | ⚠️ **Make your bed** | `trad-make-bed` | 7× | — | — | ✓ | — | Make your bed first thing — a small win to start the day. |
| [ ] | **No phone for the first 30 minutes** | `phone-free-first-hour` | 5× | — | — | ✓ | — | Start the day on your own agenda, not your notifications. Phone stays away for the first 30 minutes awake. |
| [ ] | **One deep focus block** | `deep-focus-session` | 5× | — | — | ✓ | — | One Pomodoro-style block of uninterrupted, single-task work — phone away, one tab, timer running. |
| [ ] | ⚠️ **Plan your day** | `trad-todo-list` | 5× | — | — | ✓ | — | Write a short to-do list of what matters most today. |
| [ ] | **Practice a language** | `trad-learn-language` | 5× | — | — | ✓ | — | Do a short language lesson or practice session. |
| [ ] | **Practice a skill** | `trad-learn-skill` | 4× | — | — | ✓ | — | Spend focused time practising an instrument, craft, or skill. |
| [ ] | **Read** | `trad-read` | 7× | — | — | ✓ | — | Read a book for a few minutes instead of scrolling. |
| [ ] | ⚠️ **Set tomorrow's top priority** | `plan-tomorrow` | 5× | — | — | ✓ | 1 | Before you stop for the day, write down tomorrow's single most important thing. Same action, same time — reduces decision fatigue and starts the next day with clarity. |
| [ ] | ⚠️ **Tidy up** | `trad-tidy` | 5× | — | — | ✓ | — | Spend a few minutes tidying or resetting your space. |
| [ ] | **Wake up early** | `trad-wake-early` | 5× | — | — | ✓ | — | Get up at a consistent early time to start the day with margin. |

## Mind — 7

| Keep? | Habit | id | Target | Flow | Template | Sci | Cited | Description |
|---|---|---|---|---|---|---|---|---|
| [ ] | **Breathwork** | `breathwork` | 7× | `timer` | duration_min<br>technique | ✓ | 2 | A few minutes of slow, deliberate breathing — longer exhale than inhale. |
| [ ] | **Journal** | `trad-journal` | 5× | — | — | ✓ | — | Spend a few minutes writing about your day or how you feel. |
| [ ] | **Limit screen time** | `trad-limit-screens` | 7× | — | — | ✓ | — | Keep recreational screen time within a limit you set. |
| [ ] | **Meditation** | `meditation` | 5× | `timer` | duration_min<br>technique | ✓ | 3 | Sit quietly and observe your mind without acting on every urge to move or escape. |
| [ ] | ⚠️ **Name one good thing** | `note-one-good-thing` | 7× | — | — | ✓ | 1 | Not a forced gratitude list — write down one specific good thing from the day, to retrain a mind that defaults to what's wrong. |
| [ ] | **No social media before noon** | `protect-attention` | 7× | — | — | ✓ | — | A bright line: no news or social feeds before midday. Start the day on your own agenda, not the feed — and keep the biggest attention sink out of your most valuable hours. |
| [ ] | ⚠️ **Practice gratitude** | `trad-gratitude` | 7× | — | — | ✓ | 1 | Write down a few things you’re grateful for today. |

## Money — 3

| Keep? | Habit | id | Target | Flow | Template | Sci | Cited | Description |
|---|---|---|---|---|---|---|---|---|
| [ ] | ⚠️ **Look at my accounts** | `check-the-numbers` | 5× | — | — | ✓ | — | A 2-minute look at your balances — no judgment, just no longer looking away. Avoidance is what makes money scary. |
| [ ] | ⚠️ **Move money toward a goal** | `pay-myself-first` | 1× | — | — | ✓ | — | Once a week, move something — anything — toward savings or a goal before it gets spent. The amount grows; the habit is what matters. |
| [ ] | ⚠️ **Track today's spending** | `log-the-spend` | 7× | — | — | ✓ | — | Note what you spent today. Awareness alone changes behavior — you can't manage what you refuse to see. |

## Connection — 3

| Keep? | Habit | id | Target | Flow | Template | Sci | Cited | Description |
|---|---|---|---|---|---|---|---|---|
| [ ] | **Call instead of text** | `make-the-call` | 1× | — | — | ✓ | — | Once a week, actually call someone instead of texting. Voice beats thumbs for the relationships that matter. |
| [ ] | **Phone-free meal with someone** | `phone-free-dinner` | 4× | — | — | ✓ | — | One meal with another person and no phones on the table. Presence is the whole point. |
| [ ] | **Send one genuine message** | `reach-out` | 4× | — | — | ✓ | — | Send one genuine message to someone you care about — not logistics, just connection. Relationships compound like anything else. |

## Already retired

Duplicates hidden from browsing but still resolvable, so a habit adopted under the old id keeps its history. Nothing to audit here — listed so the ids are accounted for.

| Retired id | Resolves to |
|---|---|
| `move-20min` | Movement |
| `trad-exercise` | Movement |
| `morning-meditation` | Meditation |
| `trad-meditate` | Meditation |
| `breathing-break` | Breathwork |
| `trad-budget` | Track today's spending |
