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
    intro:
      'Everything you are working on, grouped by what it is asking of you right now.',
    points: [
      {
        label: 'Tap 1, 2 or 3 to log it',
        text: 'The number is how hard it was to start — easy, had to push, or nearly didn’t. That single tap records the practice and the difficulty together.',
      },
      {
        label: 'Rate it honestly, not generously',
        text: 'An easy day logged as hard tells you nothing later. The number only earns its keep if it is true.',
      },
      {
        label: 'Tap the name for more',
        text: 'The card opens to show your week, where you can fill in a day you forgot, read about the practice, or log with the full detail.',
      },
      {
        label: 'The headings tell you where you stand',
        text: 'Due today, behind this week, done. Practices move between them as you log, so the top of the list is always what needs you.',
      },
    ],
    science: [
      {
        label: 'Resistance is the measurement',
        text: 'How hard a thing feels to start is the clearest signal of whether it is becoming automatic. Watching that number fall over weeks is the point of tracking it at all — which is why logging always asks for it.',
      },
    ],
  },

  progress: {
    id: 'progress',
    icon: 'trending-down-outline',
    title: 'Progress',
    intro: 'What has actually changed, rather than how much you have done.',
    points: [
      {
        label: 'Look for the line going down',
        text: 'The resistance trend is the headline. Falling means the same practices are costing you less than they used to.',
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

  library: {
    id: 'library',
    icon: 'library-outline',
    title: 'Library',
    intro: 'Practices you can take on, and what each one asks of you.',
    points: [
      {
        label: 'Open one to read it first',
        text: 'What it is, how to do it, and what tends to get in the way — before you commit to anything.',
      },
      {
        label: 'Some ask for an amount',
        text: 'Water asks how much, reading asks how long. You choose the number when you add it, and you can change it later.',
      },
      {
        label: 'Start with fewer than you want to',
        text: 'Two practices you keep beat six you abandon. You can always add more once the first ones hold.',
      },
    ],
  },

  habit_detail: {
    id: 'habit_detail',
    icon: 'stats-chart-outline',
    title: 'Practice details',
    intro: 'Everything this one practice has done since you started it.',
    points: [
      {
        label: 'Adherence is the honest number',
        text: 'Of the days this practice asked for, how many you kept. Totals tell you how much; this tells you how reliably.',
      },
      {
        label: 'Change the schedule any time',
        text: 'A set number of times a week, or specific days. Naming the days makes a missed one a fact rather than an estimate.',
      },
      {
        label: 'Archive rather than delete',
        text: 'A practice you archive comes off Today and stops counting toward your streaks, but every rep you logged is kept and you can bring it back.',
      },
    ],
  },

  archived: {
    id: 'archived',
    icon: 'archive-outline',
    title: 'Archived',
    intro: 'Practices you have put away. Nothing here was deleted.',
    points: [
      {
        label: 'Restore brings it back whole',
        text: 'Its history, schedule and plan return exactly as they were, and it reappears on Today.',
      },
      {
        label: 'Tap one to read its history',
        text: 'Everything you logged is still there, whether or not you ever restore it.',
      },
    ],
  },

  nightly_reflection: {
    id: 'nightly_reflection',
    icon: 'moon-outline',
    title: 'Closing out the day',
    intro:
      'One honest look back at the whole day — a different question from how any single practice went.',
    points: [
      {
        label: 'Grade the day, not the list',
        text: 'A day where you did little but held the line under pressure can beat one where everything got ticked.',
      },
      {
        label: 'A sentence is enough',
        text: 'This is not journalling. Name what happened and what got in the way.',
      },
      {
        label: 'Skipping a night costs nothing',
        text: 'It builds a weekly picture on Progress, and that picture survives gaps.',
      },
    ],
    science: [
      {
        label: 'Naming it is what makes it stick',
        text: 'Effort you examine transfers to new situations; effort you do not mostly stays stuck to the task it happened in. Writing one line is the cheapest version of that examination.',
      },
    ],
  },
};

export const getScreenIntro = (id: string): ScreenIntro | undefined => SCREEN_INTROS[id];
