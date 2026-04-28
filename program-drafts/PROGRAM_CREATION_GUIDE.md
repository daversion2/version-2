# Program Creation Guide

> This document describes the collaborative process for designing and implementing new programs in Neuro-Nudge. Follow these steps exactly when creating a new program with the user.

---

## Overview

Programs are structured multi-day challenges with daily educational content. Each program has two modes:

- **Cold Turkey** — Full intensity from Day 1
- **Gradual Build** — Progressive ramp-up to full intensity

The process has 4 phases: **Interview → Draft → Review → Implement**.

---

## Phase 1: Interview

Before writing any content, interview the user to understand their vision. Ask questions one topic at a time using the AskUserQuestion tool. Cover all of the following:

### Required Interview Topics

1. **Name & Duration**
   - What should the program be called?
   - How many days? (Existing programs use 21 or 30 days)

2. **Philosophy & Angle**
   - What's the core philosophy? (e.g., discipline, neuroscience, psychology, practical, or a blend)
   - What makes this program unique compared to existing ones?

3. **Scope & Rules**
   - What specific behaviors, substances, or habits are targeted?
   - Where is the line drawn? What's in, what's out?

4. **Cold Turkey Mode**
   - What does the daily challenge look like from Day 1?
   - Any special actions required on Day 1? (e.g., deleting apps, clearing a pantry)

5. **Gradual Build Mode**
   - How should restrictions/challenges layer in over the duration?
   - Options to consider: by category, by time window, by difficulty, by meal/activity, hybrid

6. **Daily Format**
   - Consistent core challenge (same challenge daily, varying educational content) — this is the established pattern
   - Varied daily challenges (different challenge each day)
   - Mix of both

7. **Educational Content Approach**
   - What topics must be covered?
   - How should content be weighted? (even rotation, phase-based, front-loaded)
   - Should it alternate between "why" (science) and "how" (practical)?

8. **Success Criteria**
   - How is daily success measured?
   - Binary pass/fail, percentage-based, or meal/activity-focused?

9. **Difficulty Curve**
   - How should difficulty ratings (1-5) progress across the program?
   - Common pattern: start high (4), taper to 2 by the final week
   - Consider: does the challenge naturally get easier with repetition?

10. **Recommended Mode**
    - Which mode should be recommended to the user? (cold_turkey, gradual_build, or no recommendation)

11. **Category**
    - Which app category? Options: Physical, Mind, Social

12. **Appearance**
    - Icon (Ionicons outline icon name, e.g., 'nutrition-outline', 'snow-outline')
    - Color (hex code, should contrast with existing programs)

13. **Completion Rewards**
    - Badge name (short, identity-based, e.g., "Scroll Breaker", "Diet Reset Warrior")
    - Bonus points (existing programs use 20-25)

14. **Suggested Post-Program Habits**
    - 1-2 habits the user should adopt after completing the program
    - Each needs: name, category, target_count_per_week (1-7)

### Interview Tips

- Ask 1-2 questions at a time, not all at once
- Provide well-thought-out options with descriptions for each question
- Let the user pick "Other" and provide custom answers
- Summarize all decisions at the end of the interview before moving to drafting

---

## Phase 2: Draft

Create a markdown file in `/neuro-nudge/program-drafts/` named after the program (e.g., `cold-exposure.md`).

### File Structure

```markdown
# [Program Name] — [Duration] Days

> Status: DRAFT — AWAITING REVIEW
> Last updated: [date]

## Interview Notes

- **Philosophy:** [summary]
- **Scope/Rules:** [what's targeted, what's allowed]
- **Cold Turkey:** [brief description]
- **Gradual Build:** [brief description of progression arc]
- **Daily format:** [consistent/varied/mix]
- **Educational content:** [approach]
- **Success criteria:** [how success is measured]
- **Difficulty curve:** [progression]
- **Recommended mode:** [cold_turkey/gradual_build]
- **Category:** [Physical/Mind/Social]
- **Icon:** [icon-name], color: [hex]
- **Badge:** "[Badge Name]" — [points] points
- **Suggested habits:** [list]

---

## Cold Turkey Mode

### Day 1
- **Challenge:** [challenge name — short, used as the title in the app]
- **Description:** [1-3 sentences. What to do today, context, encouragement]
- **Success Criteria:** [clear, measurable statement of success]
- **Difficulty:** [1-5]
- **Category:** [Physical/Mind/Social]
- **Educational Title:** [compelling title for the day's lesson]
- **Educational Content:** [2-4 sentences of science, psychology, or practical knowledge]
- **Neuroscience Note:** [optional — 1-2 sentences of specific neuroscience detail]
- **Tip:** [optional — 1-2 sentences of practical actionable advice]

### Day 2
...

---

## Gradual Build Mode

### Day 1
...
```

### Content Guidelines

**Challenge Name:**
- Short and action-oriented (e.g., "Eat only whole, unprocessed foods", "No social media")
- For consistent-challenge programs, the name stays the same (or nearly the same) across all days
- For gradual build, the name should reflect the current restriction level

**Description:**
- 1-3 sentences
- Reference the day number and what's new or changing
- Include emotional/psychological context where appropriate (e.g., "cravings may peak today", "this is the messy middle")
- On milestone days (7, 14, 21, 30), acknowledge the achievement

**Success Criteria:**
- Clear, unambiguous statement
- Should match the challenge — user can self-assess pass/fail
- For gradual build, criteria evolve as restrictions increase

**Difficulty Ratings:**
- 1 = Easy, almost automatic
- 2 = Moderate, requires some effort
- 3 = Challenging, requires active discipline
- 4 = Hard, significant willpower needed
- 5 = Very hard, peak difficulty
- Typical cold turkey curve: 4 → 3 → 2 → 2 over 4 weeks
- Typical gradual build curve: 2 → 3 → 4 (at full restriction) → 3 → 2

**Educational Content:**
- Rotate evenly across the program's philosophical pillars (e.g., biology/psychology/discipline)
- Alternate between "why" (science, research, neuroscience) and "how" (practical tips, strategies)
- Each day's content should stand alone — no required reading order
- Reference specific studies, researchers, or concepts where possible for credibility
- Avoid repeating the same topic; 30 unique educational angles minimum

**Neuroscience Note (optional):**
- Include on ~30-40% of days, not every day
- Specific, technical detail that adds depth
- Should reference a brain region, mechanism, or study

**Tip (optional but recommended):**
- Actionable, concrete, and immediately usable
- Not a restatement of the challenge — something extra
- Include on ~80-90% of days

### Narrative Arc

Programs should follow a psychological arc across the duration:

| Phase | Days | Theme |
|-------|------|-------|
| Shock & Commitment | 1-3 | First exposure, withdrawal begins, establishing the new behavior |
| Initial Adaptation | 4-7 | Building first routines, facing first weekend, early wins |
| The Messy Middle | 8-14 | Novelty gone, motivation dips, discipline required |
| Deepening | 15-21 | Identity shift, replacement habits forming, confidence growing |
| Consolidation | 22-27 | Post-program planning, maintenance mindset, compound results |
| Completion | 28-30 | Finishing strong, celebrating, transitioning to habits |

### Gradual Build Progression

The gradual build mode should feel like natural stepping stones, not arbitrary restrictions. Common patterns:

- **By category:** Remove one category per phase (e.g., sugary drinks → snacks → fast food → all processed)
- **By time/amount:** Reduce a numeric limit over time (e.g., 30 min → 20 → 15 → 10 → 5 → 0)
- **By meal/activity:** Clean up one context at a time (e.g., breakfast → lunch → dinner)
- **By difficulty:** Start with easy swaps, escalate to harder eliminations
- **Hybrid:** Combine approaches for a natural-feeling progression

The gradual build should arrive at the same standard as cold turkey by approximately the halfway point (or slightly after), giving the user the second half at full intensity.

---

## Phase 3: Review

After drafting, present the completed markdown to the user for review.

- Summarize the structure of both modes (key milestones, progression arc, content themes)
- Invite specific feedback on: tone, topics, challenge wording, difficulty ratings, progression pacing
- Iterate as many times as needed — edit the markdown file with each round of feedback
- Only proceed to implementation when the user explicitly approves

---

## Phase 4: Implement

### Step 1: Add TypeScript Arrays

In `/neuro-nudge/src/data/programSeedData.ts`, add two new arrays before the `PROGRAM_SEED_DATA` export:

```typescript
const [programName]ColdTurkey: ProgramDay[] = [
  {
    day_number: 1,
    challenge_name: '...',
    challenge_description: '...',
    success_criteria: '...',
    difficulty: 4,
    category: 'Mind',
    educational_title: '...',
    educational_content: '...',
    neuroscience_note: '...', // optional
    tip: '...', // optional
  },
  // ... all 30 (or 21) days
];

const [programName]GradualBuild: ProgramDay[] = [
  // ... all days
];
```

**Important:** Escape all single quotes in strings with `\'`.

### Step 2: Add or Update the Program Template

If the program already exists in `PROGRAM_SEED_DATA` (with empty arrays), update it:
- Replace `cold_turkey_days: []` with the new array reference
- Replace `gradual_build_days: []` with the new array reference
- Update description and mode descriptions to match interview decisions

If the program is entirely new, add a new entry to the `PROGRAM_SEED_DATA` array:

```typescript
{
  name: 'Program Name',
  description: '1-2 sentence description for the discovery screen.',
  category: 'Mind', // or 'Physical' or 'Social'
  duration_days: 30, // or 21
  grace_days: 3, // typically 3 for 30-day, 2 for 21-day
  icon: 'icon-name-outline', // Ionicons
  color: '#HEXCODE',
  order: 6, // next in sequence
  cold_turkey_days: programNameColdTurkey,
  gradual_build_days: programNameGradualBuild,
  cold_turkey_description: 'Short description of cold turkey mode for the mode selection screen.',
  gradual_build_description: 'Short description of gradual build mode for the mode selection screen.',
  recommended_mode: 'cold_turkey', // or 'gradual_build'
  completion_badge_name: 'Badge Name',
  completion_bonus_points: 25,
  suggested_habits: [
    { name: 'Habit name', category: 'Mind', target_count_per_week: 7 },
  ],
  is_premium: false,
  assignable_by_coach: true,
},
```

### Step 3: Verify

Run TypeScript compilation to check for errors:

```bash
cd neuro-nudge && npx tsc --noEmit src/data/programSeedData.ts
```

### Step 4: Seed the Database

The app auto-seeds when it detects fewer programs than expected in Firestore. However, if programs already exist with empty content, they won't be overwritten automatically.

To update existing programs or add new ones, use `reseedPrograms()` from `/neuro-nudge/src/utils/seedPrograms.ts`. This clears all programs and re-seeds from the current `PROGRAM_SEED_DATA`.

**Warning:** Reseeding will reset all program data in Firestore. Any user enrollments referencing old program IDs should still work since program IDs are derived from the name (slug format).

---

## Reference: Existing Programs

| # | Name | Duration | Category | Status |
|---|------|----------|----------|--------|
| 1 | Phone Detox | 30 days | Mind | Complete |
| 2 | Diet Reset | 30 days | Physical | Complete |
| 3 | Cold Exposure | 21 days | Physical | Coming Soon |
| 4 | Digital Minimalism | 21 days | Mind | Coming Soon |
| 5 | Morning Discipline | 21 days | Physical | Coming Soon |
| 6 | Social Media Detox | 30 days | Mind | Complete |

Update this table as programs are added.

---

## Reference: ProgramDay Type

```typescript
interface ProgramDay {
  day_number: number;
  challenge_name: string;
  challenge_description: string;
  success_criteria: string;
  difficulty: number; // 1-5
  category: string; // 'Physical' | 'Mind' | 'Social'
  educational_title: string;
  educational_content: string;
  neuroscience_note?: string;
  tip?: string;
}
```
