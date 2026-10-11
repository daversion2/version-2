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
        text: 'The number is how hard it was to start — easy, had to push, or nearly didn’t. That single tap records the habit and how hard it was, together.',
      },
      {
        label: 'Rate it honestly, not generously',
        text: 'An easy day logged as hard tells you nothing later. The number only earns its keep if it is true.',
      },
      {
        label: 'Tap the name for more',
        text: 'The card opens to show your week, where you can fill in a day you forgot, read about the habit, or log with the full detail.',
      },
      {
        label: 'The headings tell you where you stand',
        text: 'Due today, behind this week, done. Habits move between them as you log, so the top of the list is always what needs you.',
      },
    ],
    science: [
      {
        label: 'Resistance is the measurement',
        text: 'How hard a thing feels to start is the clearest signal of whether it is bedding in. What repetition makes automatic is the starting, not the work — so the number falls while the habit itself stays exactly as demanding. Watching that fall over weeks is the point of tracking it at all.',
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
        label: 'Friction you can handle',
        text: 'The bars are friction faced: each habit counted at how hard it was when you started it. They climb as you take on more. The dots are how hard it actually felt. The gap between them is how much stronger you’ve got.',
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
    intro: 'Habits you can take on, and what each one asks of you.',
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
        text: 'Two habits you keep beat six you abandon. You can always add more once the first ones hold.',
      },
    ],
  },

  habit_detail: {
    id: 'habit_detail',
    icon: 'stats-chart-outline',
    title: 'Habit details',
    intro: 'Everything this one habit has done since you started it.',
    points: [
      {
        label: 'Adherence is the honest number',
        text: 'Of the days this habit asked for, how many you kept. Totals tell you how much; this tells you how reliably.',
      },
      {
        label: 'Change the schedule any time',
        text: 'A set number of times a week, or specific days. Naming the days makes a missed one a fact rather than an estimate.',
      },
      {
        label: 'Archive rather than delete',
        text: 'A habit you archive comes off Today and stops counting toward your streaks, but every check-in you logged is kept and you can bring it back.',
      },
    ],
  },

  archived: {
    id: 'archived',
    icon: 'archive-outline',
    title: 'Archived habits',
    intro: 'Habits you have put away. Nothing here was deleted.',
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
      'Under a minute: see one win, grade the effort, and decide exactly when tomorrow’s hardest habit happens.',
    points: [
      {
        label: 'One win, already found',
        text: 'It picks out the habit you did even though it was hard. Nothing to type.',
      },
      {
        label: 'Grade the effort, not the list',
        text: 'A day where you did little but held the line under pressure can beat one where everything got ticked.',
      },
      {
        label: 'Tomorrow as a when-then',
        text: 'It’s pre-filled from your toughest habit due tomorrow. Edit it if you like — it’s waiting at the top of Today in the morning.',
      },
      {
        label: 'A rough day gets a smaller plan',
        text: 'Grade it D or F and the plan shrinks to the minimum version. Getting back on track beats making up for it.',
      },
    ],
    science: [
      {
        label: 'Plans beat intentions',
        text: 'Deciding when and where you’ll act — an if-then plan — is one of the most reliable ways to close the gap between meaning to and doing.',
      },
      {
        label: 'End the night looking forward',
        text: 'Writing down what’s next, rather than replaying what went wrong, helps people fall asleep faster.',
      },
    ],
  },
};

export const getScreenIntro = (id: string): ScreenIntro | undefined => SCREEN_INTROS[id];
