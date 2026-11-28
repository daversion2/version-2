import { Ionicons } from '@expo/vector-icons';
import { FeatureInfoPoint, FeatureInfoScience } from '../components/common/FeatureInfoModal';

// =============================================================================
// SCREEN INTROS — "what is this screen and how do I use it?"
//
// Shown once, automatically, the first time a user lands on a screen, and
// available forever after behind the ⓘ in the header. The one-time state lives
// on the user doc as `seen_intros[id]` (see services/users.markScreenIntroSeen).
//
// The copy answers HOW YOU'LL USE IT first and what it is second. A user who
// has just arrived somewhere new does not need the philosophy; they need to
// know what the controls do. `science` is optional and reserved for the screens
// where the mechanism is genuinely the point.
//
// Keep them short. This is a modal standing between someone and the thing they
// opened the app to do.
// =============================================================================

export interface ScreenIntro {
  /** Stable key, stored in User.seen_intros. Never rename without a migration. */
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  intro: string;
  points: FeatureInfoPoint[];
  science?: FeatureInfoScience[];
  footer?: string;
}

export const SCREEN_INTROS: Record<string, ScreenIntro> = {
  today: {
    id: 'today',
    icon: 'today-outline',
    title: 'Today',
    intro: 'Your week across all your apps, on one screen.',
    points: [
      {
        label: 'Your week',
        text: 'Each app’s weekly goal, three ways: rings, bars, or a grid of the days you showed up. Swipe the card to switch; it stays on the one you pick. The week starts Monday. Under it, your streak and XP.',
      },
      {
        label: 'Open an app',
        text: 'Tap Meditate, Workouts or Meals under Your apps for its page: the main number and how it’s trending, your streak, your goal, and your override: getting started and staying with it. Start a session from the button at the bottom.',
      },
      {
        label: 'Your override, twice',
        text: 'Getting started: as you start a session, rate how hard it is to start, 1 to 3. Staying with it: when you finish, rate how hard it was to keep going when part of you wanted to stop. Each app’s page shows both. A hard session is the training, not a bad mark.',
      },
      {
        label: 'Close out the day',
        text: 'Last thing at night, grade the effort and set a plan for tomorrow. It shows here the next day as Today’s plan.',
      },
    ],
    science: [
      {
        label: 'Your override is the record',
        text: 'Your brain predicts what a thing will cost, and you feel it as resistance. Each rating records what a session cost you. Over months, you see how hard your hard things feel to you.',
      },
    ],
  },

  progress: {
    id: 'progress',
    icon: 'trending-up-outline',
    title: 'Progress',
    intro: 'What has actually changed, rather than how much you have done.',
    points: [
      {
        label: 'Friction you’ve taken on',
        text: 'The bars are friction faced: each session counted at how hard starting that app was in your first few sessions. They climb as you do more. The dots are the override it actually took. The gap shows how your hard things feel to you now, against how they felt at first.',
      },
      {
        label: 'The calendar shows the shape of it',
        text: 'Filled days are days you logged something. Gaps are not failures — they are the pattern worth noticing.',
      },
      {
        label: 'Give it a couple of weeks',
        text: 'Most of this needs a handful of logged days before it can say anything. Early on it will look thin, and that is expected.',
      },
    ],
  },

  // library, habit_detail and archived went with their screens' last links
  // (docs/pivot-checklist.md, Phase 1). Those screens still call
  // useScreenIntro, and ScreenIntro renders nothing for an id with no entry.
  // nightly_reflection (Close out the day) went 2026-11-28: founder's call in
  // the brand copy review (docs/handoff-brand-copy.md).
};

export const getScreenIntro = (id: string): ScreenIntro | undefined => SCREEN_INTROS[id];
