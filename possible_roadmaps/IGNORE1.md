# Neuro-Nudge Feature Roadmap

**Goal:** User growth through Corporate Wellness & Life Coach partnerships
**Timeline:** 6 months
**Resources:** Solo developer
**Created:** February 2026

---

## Phase 1: Foundation (Months 1-2)

### 1.1 Organization & Coach Infrastructure
- **Organization entity** — Create `organizations` collection with settings, branding config, member limits
- **Role system** — Add `role` field to users: `member`, `coach`, `org_admin`
- **Invite system** — Generate organization invite codes/links for bulk onboarding
- **Organization membership** — Link users to organizations, support multiple orgs per user

### 1.2 Custom Branding (MVP)
- **Theming system** — Extend `src/constants/theme.ts` to support dynamic colors/logo
- **Organization branding** — Store primary color, logo URL, app name override in org settings
- **Branded experience** — Apply org theme when user is part of a branded organization

### 1.3 Gamification: Badges System
- **Badge definitions** — Create badge types (streak milestones, level-ups, first challenge, etc.)
- **Badge earning logic** — Trigger badge awards on relevant events
- **Badge display** — Show earned badges on profile, celebration modals

---

## Phase 2: Admin & Group Features (Months 3-4)

### 2.1 Mobile Admin Dashboard
- **Admin tab/screen** — New navigation option visible only to `coach`/`org_admin` roles
- **Member list view** — See all organization members with status indicators
- **Member detail view** — View individual's challenges, habits, streaks, willpower level
- **Aggregate stats** — Organization-wide completion rates, active users, avg streaks

### 2.2 Group Challenges
- **Group challenge entity** — Define challenges that span an organization/team
- **Competition models:**
  - **Team vs Team** — Create sub-teams, track team scores
  - **Individual Leaderboards** — Rank members by points earned during challenge
  - **Collaborative Goals** — Shared target (e.g., "1000 completions as a company")
- **Group challenge creation** — Admin UI to create, configure, and launch group challenges
- **Progress visualization** — Leaderboards, progress bars, countdown timers

### 2.3 Gamification: Achievements & Rewards
- **Achievement system** — Longer-term goals beyond badges (e.g., "Complete 100 challenges")
- **Achievement progress tracking** — Show progress toward incomplete achievements
- **Reward milestones** — Tie achievements to special profile flair or titles

---

## Phase 3: Polish & Launch (Months 5-6)

### 3.1 Coach-Specific Features
- **Client management** — Coaches can view/manage their assigned clients
- **Suggested challenges** — Coaches can push recommended challenges to clients
- **Notes/comments** — Private coach notes on client progress
- **Client invite flow** — Coaches generate personalized invite links

### 3.2 Group Challenge Enhancements
- **Challenge templates** — Pre-built group challenges (30-day wellness, stress reduction, etc.)
- **Notifications** — Group challenge reminders, leaderboard updates, milestone celebrations
- **End-of-challenge summaries** — Recap stats, winners, participation rates

### 3.3 Onboarding & Marketing Support
- **Organization onboarding flow** — Streamlined signup for org members via invite
- **Demo mode** — Showcase features to potential partners without real data
- **Export/share stats** — Allow admins to export engagement data for reporting

### 3.4 Final Gamification Polish
- **Badge/achievement showcase** — Public profile section showing accomplishments
- **Milestone celebrations** — Enhanced animations for major achievements
- **Badge rarity indicators** — Show how rare each badge is across the platform

---

## Summary Timeline

| Month | Focus | Key Deliverables |
|-------|-------|------------------|
| 1 | Infrastructure | Organizations, roles, invite system |
| 2 | Branding + Badges | Custom theming, badge system |
| 3 | Admin Dashboard | Member views, aggregate stats |
| 4 | Group Challenges | All 3 competition models |
| 5 | Coach Features | Client management, suggested challenges |
| 6 | Polish & Launch | Templates, onboarding, export tools |

---

## Technical Considerations

### New Firestore Collections

```
organizations/{orgId}
├── name, settings, branding (logo, colors), member limits
├── members/{userId}
│   └── role, joinedAt, invitedBy

groupChallenges/{challengeId}
├── orgId, title, description, competitionModel
├── startDate, endDate, targetGoal
├── teams/{teamId} (for team vs team)
└── leaderboard/{userId} (scores)

badges/{badgeId}
├── name, description, icon, criteria, rarity

users/{userId}/earnedBadges/{badgeId}
└── earnedAt, context
```

### Key Architecture Decisions

1. **Theme Context** — Create a `ThemeContext` that wraps the app and can be dynamically updated based on organization branding
2. **Role-Based Navigation** — Conditionally render admin screens in `MainTabs.tsx` and stack navigators based on user role
3. **Reuse Team Infrastructure** — Leverage existing `teams` collection patterns for organization sub-teams
4. **Offline Support** — Ensure badge/achievement data syncs properly with Firestore persistence

### Migration Strategy

- Existing users remain unaffiliated (no organization)
- Organizations created fresh, users join via invite
- No breaking changes to current user experience

---

## Success Metrics

- Number of organizations onboarded
- Users acquired through organization invites
- Group challenge participation rates
- Coach-to-client ratio
- Badge/achievement engagement rates

---

## Open Questions

1. Pricing model for organizations (per-seat, flat rate, tiered?)
2. Data privacy controls for organization admins (what can they see?)
3. Should coaches be able to manage multiple organizations?
4. Integration priorities (Slack, HR systems, SSO?)
