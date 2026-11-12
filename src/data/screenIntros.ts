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
    intro: 'Your last 7 days across Meditate, Workouts and Meals, on one screen.',
    points: [
      {
        label: 'The rings',
        text: 'One ring per app: how much of its weekly goal you’ve met in the last 7 days. Beside them, sessions done out of the goal (days logged, for Meals). Under them, your streak and XP.',
      },
      {
        label: 'Open an app',
        text: 'Tap Meditate, Workouts or Meals under Your apps for its page: the main number and how it’s trending, your streak, your goal, your override and your push. Start a session from the button at the bottom.',
      },
      {
        label: 'Override and push',
        text: 'As you start a session, rate how hard it is to start: your override, 1 to 3. When you finish, rate how hard you pushed. Each app’s page shows both. Your override should fall; your push should hold up.',
      },
      {
        label: 'Close out the day',
        text: 'Last thing at night, grade the effort and set a plan for tomorrow. It shows here the next day as Today’s plan.',
      },
    ],
    science: [
      {
        label: 'Your override is the measurement',
        text: 'How hard a thing feels to start is the clearest signal of whether it is bedding in. What repetition makes automatic is the starting, not the work — so the number falls while the session itself stays exactly as demanding. Watching that fall over weeks is the point of tracking it at all.',
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
        text: 'The bars are friction faced: each session counted at how hard starting that app was in your first few sessions. They climb as you do more. The dots are the override it actually took. The gap between them is how much stronger you’ve got.',
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

  nightly_reflection: {
    id: 'nightly_reflection',
    icon: 'moon-outline',
    title: 'Closing out the day',
    intro: 'Under a minute: grade the effort, then decide exactly when tomorrow’s session happens.',
    points: [
      {
        label: 'Grade the effort, not the list',
        text: 'A day where you did little but held the line under pressure can beat one where everything got done.',
      },
      {
        label: 'Tomorrow as a when-then',
        text: 'When it happens, then what you’ll do: “When I finish work, then a 10-minute sit.” It’s waiting on Today in the morning.',
      },
      {
        label: 'A rough day gets a smaller plan',
        text: 'Grade it D or F and keep tomorrow small. Getting back on track beats making up for it.',
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
