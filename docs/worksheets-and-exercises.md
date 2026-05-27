# Neuro-Nudge — Worksheets & Exercises

Complete documentation of every exercise/worksheet in the app, including user flows and all copy the user sees.

---

## Overview

The app has two types of exercises:

1. **Full Worksheets** — Structured CBT-based forms with multiple sections (accessed from the Worksheets tab)
2. **Micro-Exercises** — Quick 3-question flows triggered contextually (comeback, failure, reflection, inactivity)

---

## Part 1: Full Worksheets

### Accessing Worksheets

**Worksheet Library Screen**

- Grid layout showing all 4 worksheet template cards
- Category filter chips at top: `All` | `Thoughts` | `Beliefs` | `Behavior`
- If user has saved drafts, a banner appears:
  > "You have [N] draft(s) in progress" → tapping resumes the most recent draft

Each card shows: icon, name, short description, difficulty dots (1-3), and time estimate.

---

### Worksheet Form Flow (all worksheets)

1. **Header** — Shows the `when_to_use` text in italic
2. **Tips** — Collapsible section (tap "Tips" to expand), shows bullet-pointed tips
3. **Mood Before** — "How are you feeling right now?" (1-10 mood scale)
4. **Sections** — Template-specific form fields rendered in order
5. **Goal Linking** — Optional: link this worksheet to an existing goal
6. **Mood After** — "How are you feeling now?" (1-10 mood scale)
7. **Actions:**
   - `Save Draft` — Alert: "Draft Saved" / "You can resume this worksheet anytime."
   - `Complete` — Alert: "Worksheet Complete" / "+[N] willpower points earned!"
   - Validation alert if required fields missing: "Missing Fields" / "Please fill in all required fields before completing."

**Points:** 2 base points for completion. +1 bonus if mood improves by 3+ points.

---

### Worksheet 1: Challenge That Thought

| | |
|---|---|
| **ID** | `thought_record` |
| **Category** | Thoughts |
| **Difficulty** | 1 (easy) |
| **Duration** | ~10 min |
| **Icon** | document-text (teal) |

**Short Description:**
> Catch a negative thought and see how much of it is actually true

**Long Description:**
> When a thought feels like a fact, writing it down changes everything. This exercise helps you slow down, look at what actually happened, and find a version of the story that's more accurate — not more positive, just more honest.

**When to Use:**
> When a negative thought is stuck in your head, or a strong emotion just hit out of nowhere.

**Tips:**
- Try to capture the thought as close to word-for-word as possible
- Rate emotions on a 0-100% intensity scale
- The balanced thought doesn't have to be positive — just more accurate

#### Sections & Fields

**Section 1: The Situation**
> What happened? Where were you? Who was involved?

| Field | Label | Placeholder | Type | Required |
|-------|-------|-------------|------|----------|
| situation_description | Describe the situation | "e.g., My boss didn't respond to my email for two days..." | textarea | Yes |
| situation_when | When did this happen? | "e.g., Tuesday afternoon at work" | text | No |

**Section 2: Automatic Thoughts**
> What went through your mind? What did you tell yourself?

| Field | Label | Placeholder | Type | Required | Helper |
|-------|-------|-------------|------|----------|--------|
| hot_thought | The "hot thought" (most distressing) | "e.g., I'm going to get fired. He hates my work." | textarea | Yes | "The thought that carries the most emotional charge" |
| thought_belief_rating | How much do you believe this thought? (0-100%) | "e.g., 85" | text | Yes | |

**Section 3: Emotions**
> What emotions did you feel? How intense were they?

| Field | Label | Placeholder | Type | Required | Helper |
|-------|-------|-------------|------|----------|--------|
| emotions_felt | Emotions experienced | "e.g., Anxious (80%), Ashamed (60%), Frustrated (40%)" | textarea | Yes | "Name each emotion and rate its intensity 0-100%" |

**Section 4: Examine the Evidence**
> Look at the facts — not feelings — for and against the thought.

| Field | Label | Placeholder | Type | Required |
|-------|-------|-------------|------|----------|
| evidence_for | Evidence that supports this thought | "e.g., He usually replies within a few hours..." | textarea | Yes |
| evidence_against | Evidence that contradicts this thought | "e.g., He told me last week my report was excellent..." | textarea | Yes |

**Section 5: Balanced Thought**
> Based on ALL the evidence, what is a more balanced perspective?

| Field | Label | Placeholder | Type | Required |
|-------|-------|-------------|------|----------|
| balanced_thought_text | A more balanced thought | "e.g., He might just be busy. One slow reply doesn't mean he's unhappy with my work." | textarea | Yes |
| new_belief_rating | How much do you believe the original thought NOW? (0-100%) | "e.g., 40" | text | Yes |

---

### Worksheet 2: Name Your Thinking Trap

| | |
|---|---|
| **ID** | `cognitive_distortions` |
| **Category** | Thoughts |
| **Difficulty** | 1 (easy) |
| **Duration** | ~8 min |
| **Icon** | warning (orange) |

**Short Description:**
> Identify the mental patterns that make things feel worse than they are

**Long Description:**
> Your brain runs patterns on autopilot — and some of those patterns distort reality in predictable ways. This exercise helps you name which one is running so you can catch it faster next time.

**When to Use:**
> When you're spiraling, catastrophizing, or stuck in the same negative thought loop.

**Tips:**
- Most thoughts contain multiple distortions — that's normal
- Naming the distortion creates distance from it
- Over time you'll notice your "favorite" distortions

#### Sections & Fields

**Section 1: The Thought**
> Write down the negative or unhelpful thought you want to examine.

| Field | Label | Placeholder | Type | Required |
|-------|-------|-------------|------|----------|
| original_thought | The thought | "e.g., I always mess things up. Nothing I do ever works out." | textarea | Yes |
| trigger_situation | What triggered this thought? | "e.g., Made a small mistake in my presentation" | textarea | No |

**Section 2: Identify the Distortions**
> Which thinking traps are present in this thought? Select all that apply.

| Field | Label | Type | Required |
|-------|-------|------|----------|
| distortions_present | Distortions present | checklist | Yes |

**Checklist Options:**
1. All-or-Nothing Thinking (black and white)
2. Overgeneralization (one event = always/never)
3. Mental Filter (focusing only on the negative)
4. Disqualifying the Positive (dismissing good things)
5. Jumping to Conclusions (mind reading / fortune telling)
6. Magnification / Minimization (blowing up or shrinking)
7. Emotional Reasoning (feeling it so it must be true)
8. Should Statements (rigid rules for self/others)
9. Labeling (attaching a fixed label)
10. Personalization (blaming yourself for everything)

**Section 3: Challenge & Reframe**
> Now that you've named the distortions, how could you think about this differently?

| Field | Label | Placeholder | Type | Required |
|-------|-------|-------------|------|----------|
| why_distorted | Why is the original thought distorted? | "e.g., I'm overgeneralizing from one mistake to 'always' and 'nothing ever'..." | textarea | Yes |
| reframed_thought | A more realistic version of this thought | "e.g., I made one mistake in an otherwise solid presentation. That's human." | textarea | Yes |

---

### Worksheet 3: Find the Root

| | |
|---|---|
| **ID** | `core_belief_arrow` |
| **Category** | Beliefs |
| **Difficulty** | 2 (moderate) |
| **Duration** | ~10 min |
| **Icon** | arrow-down-circle (blue) |

**Short Description:**
> Trace a surface worry down to the deeper belief actually driving it

**Long Description:**
> Most recurring thoughts aren't really about what they appear to be about. This exercise asks "what would that mean?" again and again until you hit the belief underneath — the one that keeps generating the same thought patterns.

**When to Use:**
> When the same fear or thought pattern keeps showing up across different situations in your life.

**Tips:**
- Keep asking "what would that mean about me?" until you hit something that feels core
- Core beliefs are usually short, absolute statements (I am... People are... The world is...)
- You may feel emotional when you hit the core belief — that's a sign you've found it

#### Sections & Fields

**Section 1: Starting Thought**
> What is the automatic thought or worry on the surface?

| Field | Label | Placeholder | Type | Required |
|-------|-------|-------------|------|----------|
| surface_thought_text | The surface thought | "e.g., I shouldn't have said that at dinner." | textarea | Yes |

**Section 2: The Downward Arrow**
> For each answer, ask: "If that were true, what would it mean about me / my life?"

| Field | Label | Placeholder | Type | Required |
|-------|-------|-------------|------|----------|
| arrow_1 | If that were true, what would it mean? | "e.g., It means people think I'm awkward..." | textarea | Yes |
| arrow_2 | And if THAT were true, what would it mean? | "e.g., It means I'll never fit in or be liked..." | textarea | Yes |
| arrow_3 | And what would THAT mean about you? | "e.g., I am fundamentally unlovable." | textarea | Yes |
| arrow_4 | Go deeper if needed — what would that mean? | "(Leave blank if you've reached the core)" | textarea | No |

**Section 3: The Core Belief**
> What is the deepest belief you uncovered?

| Field | Label | Placeholder | Type | Required | Helper |
|-------|-------|-------------|------|----------|--------|
| core_belief_text | My core belief | "e.g., I am unlovable / I am not good enough / I am a failure" | textarea | Yes | "Core beliefs are usually short, absolute 'I am...' statements" |
| belief_origin | Where might this belief have come from? | "e.g., Being criticized frequently as a child..." | textarea | No | |
| compassionate_response | What would you say to a friend who believed this about themselves? | "e.g., That's not true. One awkward moment doesn't define your worth." | textarea | Yes | |

---

### Worksheet 4: Turn 'I Should' Into a Plan

| | |
|---|---|
| **ID** | `smart_action_plan` |
| **Category** | Behavior |
| **Difficulty** | 1 (easy) |
| **Duration** | ~8 min |
| **Icon** | checkbox (green) |

**Short Description:**
> Convert a vague intention into a concrete action you'll actually follow through on

**Long Description:**
> Avoidance thrives on vagueness. 'I should exercise more' is impossible to execute. 'I will walk for 20 minutes on Tuesday at 7am' is not. This exercise takes what you know you want to do and makes it specific enough to actually happen.

**When to Use:**
> When you keep saying 'I should do this' but never start — or when overwhelm is keeping you stuck.

**Tips:**
- Start with the smallest possible first step
- If it feels too big, break it down further
- Schedule it in your calendar immediately after completing this worksheet

#### Sections & Fields

**Section 1: The Vague Intention**
> What is the thing you keep telling yourself you "should" do?

| Field | Label | Placeholder | Type | Required |
|-------|-------|-------------|------|----------|
| vague_intention | I keep telling myself I should... | "e.g., I should start exercising more / I should have that difficult conversation" | textarea | Yes |
| avoidance_reason | What has been stopping me? | "e.g., It feels too overwhelming / I don't know where to start" | textarea | Yes |

**Section 2: SMART Breakdown**
> Make it Specific, Measurable, Achievable, Relevant, and Time-bound.

| Field | Label | Placeholder | Type | Required |
|-------|-------|-------------|------|----------|
| specific_action | Specific: What exactly will I do? | "e.g., Walk for 20 minutes around my neighborhood" | textarea | Yes |
| measurable | Measurable: How will I know I did it? | "e.g., I completed 20 minutes of walking (timer on phone)" | textarea | Yes |
| achievable | Achievable: Is this realistic for me right now? (1-10 confidence) | "e.g., 8 — I can definitely walk for 20 minutes" | text | Yes |
| relevant | Relevant: How does this connect to what matters to me? | "e.g., Physical health is key to my energy and mood goals" | textarea | Yes |
| time_bound | Time-bound: When exactly will I do this? | "e.g., Tomorrow (Wednesday) at 7:00 AM before work" | text | Yes |

**Section 3: Anticipate Obstacles**
> What could get in the way, and how will you handle it?

| Field | Label | Placeholder | Type | Required | Helper |
|-------|-------|-------------|------|----------|--------|
| potential_obstacle | The most likely obstacle | "e.g., I'll feel tired and want to sleep in" | textarea | Yes | |
| if_then_plan | My IF-THEN plan | "e.g., IF I feel too tired, THEN I'll put on shoes and walk for just 5 minutes" | textarea | Yes | "IF [obstacle happens], THEN I will [specific response]" |

---

## Part 2: Micro-Exercises

### Overview

Micro-exercises are quick 3-question reflections triggered contextually. They take ~2 minutes and award 2 willpower points.

**Triggers:**
- `comeback` — User returns after being away
- `challenge_failure` — User failed a challenge/habit
- `reflection` — Daily reflection prompt
- `inactivity` — User hasn't been active

---

### Micro-Exercise Flow

#### Screen 1: Feeling Selection

**Title:** "What resonates most right now?"
**Subtitle:** "Pick whichever feels closest. There's no wrong answer."

Shows 3 feeling options by default (ordered by trigger relevance), with a "See more options" button to reveal all 4.

**Bottom link:** "Not right now" (dismisses)

**Feeling Options:**
1. "I'm being hard on myself"
2. "I keep avoiding this"
3. "I feel like giving up"
4. "Everything feels like too much"

---

#### Screen 2: Questions (×3)

**Progress:** 3 dots showing current position (filled = completed/current)

**Layout:** Feeling label shown as tag at top, then the question prompt in large bold text, then a text input area.

**Button (questions 1 & 2):** "Continue →"
**Button (question 3):** "One last step →"

**Max length:** 500 characters per answer

---

#### Screen 3: Micro-Commitment

**Icon:** Flag outline (secondary color)

**Title:** "One thing. Just today."

**Subtitle:** "Based on what you just worked through — what's one small, specific thing you'll do differently today?"

**Placeholder:** "e.g. I'll start with just 5 minutes instead of waiting to feel ready..."

**Helper text (italic):** "Tomorrow we'll check in on how it went."

**Button:** "Save & Commit" (disabled until text entered)

**Max length:** 300 characters

---

#### Screen 4: Completion

**Icon:** Large green checkmark circle

**Content:** Shows the exercise's `completion_affirmation` message (see below per feeling)

**Card:** "YOUR COMMITMENT" label + the user's commitment in quotes

**Badge:** "+2 willpower points" (with flash icon)

**Button:** "Done" (returns to home)

**Link:** "Want to go deeper? Try the full **[Template Name]** worksheet →"

---

#### Screen 5: Follow-Up (24 hours later, via notification)

**Title:** "How did yesterday go?"

**Card:**
- Label: "YOU COMMITTED TO"
- Content: "[user's commitment in quotes]"

**Question:** "Did it happen?"

**Buttons:**
- "Yes, I did it" (primary, with checkmark icon)
- "Not quite — that's okay" (secondary text)

**If "Yes, I did it":**
- Icon: Green checkmark circle
- Title: "That's a genuine win."
- Body: "Keeping small commitments builds real trust with yourself. That's how lasting change actually happens."
- Button: "Keep going"

**If "Not quite":**
- Icon: Heart outline (secondary color)
- Title: "That's okay."
- Body: "Knowing what gets in the way is how you eventually break through. That's useful data, not failure."
- Button: "Try working through it again" (opens micro-exercise flow with comeback trigger)
- Secondary: "I'll keep going from here" (goes home)

---

### Micro-Exercise 1: "I'm being hard on myself"

| | |
|---|---|
| **Feeling Key** | `hard_on_self` |
| **Default Trigger** | reflection |
| **Links to Worksheet** | Name Your Thinking Trap |

**Question 1:**
> What's the harshest thing you've been saying to yourself today?

Placeholder: _"e.g. 'I always fail at this, I can't do anything right...'"_

**Question 2:**
> What is that voice actually assuming about you — that you always fail, that you're not capable, something else?

Placeholder: _"e.g. 'That I'll never be consistent, that everyone else handles this better...'"_

**Question 3:**
> Is that assumption correct, or can you find some evidence to the contrary?

Placeholder: _"e.g. 'I keep thinking I always fail, but I've succeeded at plenty in my life...'"_

**Completion Affirmation:**
> You just surfaced a BS story you were telling yourself and challenged it with evidence. A small part of your brain is currently rewiring itself to get you closer to who you're becoming.

---

### Micro-Exercise 2: "I keep avoiding this"

| | |
|---|---|
| **Feeling Key** | `avoiding` |
| **Default Trigger** | challenge_failure |
| **Links to Worksheet** | Turn 'I Should' Into a Plan |

**Question 1:**
> What have you been putting off — and don't say 'nothing.'

Placeholder: _"e.g. 'Starting my workout routine, having that difficult conversation...'"_

**Question 2:**
> What's the story or reason you keep telling yourself about why you can't start yet?

Placeholder: _"e.g. 'I tell myself I'll start when I feel more motivated, or tomorrow, or when things calm down...'"_

**Question 3:**
> What's the smallest version of this you could do today — small enough that your brain can't talk you out of it?

Placeholder: _"e.g. 'Just five minutes with no pressure to continue...'"_

**Completion Affirmation:**
> Avoidance isn't laziness. It's your brain running a protection program it wrote a long time ago. You just identified the loop — and naming it is the first step to breaking it.

---

### Micro-Exercise 3: "I feel like giving up"

| | |
|---|---|
| **Feeling Key** | `giving_up` |
| **Default Trigger** | comeback, inactivity |
| **Links to Worksheet** | Challenge That Thought |

**Question 1:**
> What's the thought making giving up feel like the reasonable option right now?

Placeholder: _"e.g. 'I'll never be consistent enough, why bother trying again...'"_

**Question 2:**
> Find one piece of evidence — even a small one — that that thought isn't the whole story.

Placeholder: _"e.g. 'I did stick with it for three weeks last month before things fell apart...'"_

**Question 3:**
> What does 'not giving up' look like just for today? Not forever. Just today.

Placeholder: _"e.g. 'Doing the smallest version of my commitment, even just 10 minutes...'"_

**Completion Affirmation:**
> That urge to quit isn't weakness — it's your nervous system trying to conserve energy. You just gave it a reason not to. That's your brain updating its model of you.

---

### Micro-Exercise 4: "Everything feels like too much"

| | |
|---|---|
| **Feeling Key** | `overwhelmed` |
| **Default Trigger** | _(none — available via "See more")_ |
| **Links to Worksheet** | Find the Root |

**Question 1:**
> Out of everything piling up right now — what's the one thing sitting heaviest?

Placeholder: _"e.g. 'The feeling that I'm falling behind and can't catch up...'"_

**Question 2:**
> Is it the thing itself that feels heavy, or what you're afraid it says about you?

Placeholder: _"e.g. 'Honestly it's more about feeling like everyone else is handling this better...'"_

**Question 3:**
> What's one move so small it almost doesn't count — but would prove to yourself you're not stuck?

Placeholder: _"e.g. 'Just opening the document, or putting my shoes on, or...'"_

**Completion Affirmation:**
> Being overwhelmed is what happens when your brain treats everything as equally urgent. You just forced it to prioritize. That's your prefrontal cortex doing exactly what it's built for — you just had to make it work.

---

## Points & Rewards

| Action | Points |
|--------|--------|
| Complete a full worksheet | 2 |
| Complete a full worksheet + mood improves by 3+ | 3 |
| Complete a micro-exercise | 2 |

---

## Trigger → Feeling Ordering

When a micro-exercise is triggered, feelings are ordered with the most relevant one first:

| Trigger | Primary Feeling Shown First |
|---------|-----------------------------|
| `reflection` | "I'm being hard on myself" |
| `challenge_failure` | "I keep avoiding this" |
| `comeback` | "I feel like giving up" |
| `inactivity` | "I feel like giving up" |

The remaining feelings appear in default order. Only 3 are shown initially; "See more options" reveals all 4.

---

## Micro-Exercise → Full Worksheet Connection

Each micro-exercise maps to a related full worksheet for users who want to "go deeper":

| Micro-Exercise | Full Worksheet |
|----------------|---------------|
| I'm being hard on myself | Name Your Thinking Trap |
| I keep avoiding this | Turn 'I Should' Into a Plan |
| I feel like giving up | Challenge That Thought |
| Everything feels like too much | Find the Root |
