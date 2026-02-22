# Neuro-Nudge Feature Roadmap
## Consumer Growth via App Store, Influencers & Paid Ads

**Goal:** User growth through App Store optimization, influencer partnerships, and paid advertising
**Monetization:** 7-day free trial → $4.99/month or ~$29.99/year subscription
**Timeline:** 3 months (aggressive)
**Resources:** Solo developer
**Created:** February 2026

---

## Phase 1: Subscription & Trial Foundation (Month 1)

### 1.1 Subscription Infrastructure
- **RevenueCat or StoreKit 2 integration** — Handle iOS/Android subscriptions
- **Subscription plans:**
  - Monthly: $4.99/month
  - Annual: $29.99/year (~50% savings)
- **7-day free trial** — Full access, no payment required upfront
- **Paywall screen** — Compelling UI shown after trial or on app open for expired users
- **Subscription state management** — Track trial status, expiration, active subscription
- **Restore purchases** — Required for App Store compliance

### 1.2 Trial Conversion Optimization
- **Trial countdown** — Show days remaining prominently in app
- **Day 5-6 nudges** — Push notifications reminding of trial ending
- **Trial-end paywall** — Block app access with clear value proposition
- **Grace period handling** — Handle billing issues gracefully

### 1.3 Onboarding Improvements
- **Streamlined flow** — Reduce friction, get users to first challenge faster
- **Value demonstration** — Show "aha moment" within first session
- **Trial value messaging** — Emphasize 7-day free access during signup
- **Quick wins** — Ensure users complete first challenge on day 1

---

## Phase 2: Growth & Viral Features (Month 2)

### 2.1 Influencer & Attribution Toolkit
- **Referral code system:**
  - Generate unique codes per influencer
  - Track signups, trial starts, and conversions per code
  - Store referral source on user profile
- **Deep linking (Branch.io or Firebase Dynamic Links):**
  - Track campaign → install → subscription attribution
  - Support deferred deep links for App Store redirect
- **UTM parameter tracking** — Capture campaign source from paid ads
- **Influencer dashboard (simple)** — View for influencers to see their referral stats

### 2.2 Custom Onboarding for Campaigns
- **Influencer welcome screens** — Branded welcome message when using referral code
- **Challenge packs** — Pre-built challenge sets influencers can promote (e.g., "7-Day Willpower Kickstart")
- **Custom start challenges** — Auto-assign specific first challenge based on referral source

### 2.3 Share Cards (Viral Growth)
- **Achievement share cards:**
  - Level-up celebrations
  - Streak milestones (7, 30, 100 days)
  - Challenge completions
- **Card design** — Branded, visually appealing images optimized for Instagram/TikTok
- **Native share sheet** — One-tap share to social platforms
- **App branding** — Include Neuro-Nudge logo and "Download" CTA on cards

### 2.4 Social Proof Features
- **Challenge popularity** — "X people completed this challenge"
- **Trending challenges** — Surface most-completed challenges in library
- **Community stats** — "Join 10,000+ users building willpower"
- **Live activity feed** — Anonymous "Someone just completed..." notifications (opt-in)

---

## Phase 3: ASO & Retention Polish (Month 3)

### 3.1 App Store Review Generation
- **Smart review prompts:**
  - Trigger after positive moments (level-up, streak milestone, challenge completion)
  - Use `SKStoreReviewController` / Play In-App Review API
  - Limit prompts (max 3 per year per Apple guidelines)
- **Feedback routing** — If user indicates frustration, route to support instead of App Store
- **Review prompt timing** — Day 3-5 of trial for engaged users

### 3.2 Keyword Optimization
- **Keyword research** — Identify high-volume, low-competition terms
- **App title/subtitle optimization** — Include primary keywords
- **Keyword field optimization** — Maximize 100 characters
- **Localized keywords** — Optimize for key markets (US, UK, Canada, Australia)

### 3.3 Trial Conversion Tactics (Best Practices)

| Tactic | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Streak Protection** | Strong emotional hook, leverages loss aversion | May feel manipulative | ✅ Implement — "Don't lose your 5-day streak!" |
| **Progress Reminder Emails** | Personal, shows invested effort | Requires email system | ✅ Implement — "You've completed 8 challenges!" |
| **Trial Extension** | Captures engaged users not ready to pay | Delays revenue, may train users to wait | ⚠️ Optional — Offer 3 extra days to engaged users only |
| **Discount at Trial End** | Increases conversion rate | Trains users to expect discounts | ❌ Skip initially — Test later if needed |

### 3.4 Retention & Re-engagement
- **Lapsed user notifications** — "We miss you! Your streak is waiting"
- **Win-back emails** — For churned subscribers
- **Streak freeze (future consideration)** — Premium perk to protect streaks

---

## Summary Timeline

| Week | Focus | Key Deliverables |
|------|-------|------------------|
| 1-2 | Subscription setup | RevenueCat, paywall, trial logic |
| 3-4 | Onboarding + trial UX | Streamlined flow, countdown, day 5-6 nudges |
| 5-6 | Influencer toolkit | Referral codes, deep links, attribution |
| 7-8 | Viral features | Share cards, social proof, custom onboarding |
| 9-10 | ASO optimization | Review prompts, keyword research |
| 11-12 | Retention polish | Conversion tactics, re-engagement flows |

---

## Technical Considerations

### New Dependencies
- **RevenueCat** — Subscription management (recommended for solo dev)
- **Branch.io or Firebase Dynamic Links** — Deep linking & attribution
- **react-native-share** — Native share sheet
- **Expo StoreReview** — App Store review prompts

### New Firestore Structure
```
referralCodes/{code}
├── influencerId, influencerName
├── campaign, createdAt
└── stats: { signups, trials, conversions }

users/{userId}
├── referralCode (how they signed up)
├── trialStartDate, trialEndDate
├── subscriptionStatus: 'trial' | 'active' | 'expired' | 'cancelled'
└── subscriptionPlatform: 'ios' | 'android'
```

### Key Screens to Build
1. **PaywallScreen** — Shown when trial expires or on locked action
2. **TrialStatusBanner** — Persistent banner showing "X days left"
3. **ShareCardGenerator** — Component to create shareable images
4. **InfluencerWelcomeScreen** — Custom onboarding for referral codes

---

## Metrics to Track

| Metric | Target |
|--------|--------|
| Trial start rate | 60%+ of downloads |
| Trial → Paid conversion | 10-15% |
| Day 1 retention | 40%+ |
| Day 7 retention | 25%+ |
| Cost per acquisition (paid ads) | < $5 |
| Referral code conversions | Track per influencer |

---

## Budget Considerations

| Item | Estimated Cost |
|------|----------------|
| RevenueCat | Free up to $2.5k MRR |
| Branch.io | Free tier available |
| Paid ads (testing) | $500-2000/month |
| Influencer partnerships | Varies (rev share or flat fee) |
| Apple Developer | $99/year |
| Google Play | $25 one-time |

---

## Open Questions

1. Will you offer a lifetime purchase option?
2. Influencer compensation model: rev share, flat fee, or free access only?
3. Which paid ad platforms to prioritize (Meta, TikTok, Google)?
4. Do you want in-app purchase for one-off items (themes, badge packs)?
