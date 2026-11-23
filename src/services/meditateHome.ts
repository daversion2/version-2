import { getBreathPattern, BreathPatternKey } from '../data/breathPatterns';
import type {
  CompletedMeditateSession,
  GuidedRecording,
  MeditateMode,
  MeditateSession,
  MeditateStyle,
  NsdrLink,
  SitTechnique,
} from '../types/meditate';
import { getSitTechnique, guidedOptions, MODES, startDefaults } from './meditateMath';

// =============================================================================
// WHAT MEDITATE'S HOME OFFERS (founder, 2026-11-23), the same shape as Workouts'
// workoutHomeFocus. People don't rotate through meditations the way they rotate
// Push, Pull and Legs, so the top card is the last session, ready to repeat.
// =============================================================================

/** One session, fully chosen: what Do it starts. */
export interface MeditatePlan {
  mode: MeditateMode;
  minutes: number;
  technique: SitTechnique;
  pattern: BreathPatternKey;
  breatheStyle: MeditateStyle;
  nsdrLink?: NsdrLink;
  guided?: GuidedRecording;
  /** "Focused", "Box", a recording's name. */
  title: string;
  /** "Sit · 10 min · bell at the end". */
  detail: string;
  /** NSDR with no recording saved: there's nothing for Do it to open yet. */
  needsLink: boolean;
  /** Locks the phone and relies on the bell. */
  timed: boolean;
}

export interface PlanInput {
  /** Newest first. */
  sessions: CompletedMeditateSession[];
  nsdrLinks: NsdrLink[];
  guided: GuidedRecording[];
  launchPracticeId?: string | null;
  launchGoalMin?: number;
}

/** A mode, set up the way it was last done. */
export const planFor = (mode: MeditateMode, input: PlanInput): MeditatePlan => {
  const { sessions, nsdrLinks, guided, launchPracticeId, launchGoalMin } = input;
  const choices = startDefaults({ sessions, nsdrLinks, launchPracticeId, launchGoalMin });
  const last = sessions.find((s) => s.mode === mode);
  const options = guidedOptions(guided, mode, choices.technique);
  // Last time's recording, or another of this kind if that one was taken down.
  const recording =
    last?.style === 'guided' ? options.find((r) => r.id === last.guided_id) ?? options[0] : undefined;
  const nsdrLink = mode === 'nsdr' && !recording ? nsdrLinks.find((l) => l.id === choices.nsdrLinkId) : undefined;
  const needsLink = mode === 'nsdr' && !recording && !nsdrLink;
  const minutes = recording ? recording.length_min : choices.minutes[mode];
  const timed = !recording && (mode !== 'breathe' || choices.breatheStyle === 'timer');

  const title =
    mode === 'sit'
      ? getSitTechnique(choices.technique).label
      : mode === 'breathe'
        ? getBreathPattern(choices.pattern).label
        : recording?.title ?? nsdrLink?.title ?? MODES.nsdr.label;
  const how = recording ? 'guided' : timed ? 'bell at the end' : 'with the pacer';
  const detail = needsLink
    ? 'Save a recording to start'
    : `${MODES[mode].label} · ${minutes} min · ${how}`;

  return {
    mode,
    minutes,
    technique: choices.technique,
    pattern: choices.pattern,
    breatheStyle: choices.breatheStyle,
    ...(nsdrLink ? { nsdrLink } : {}),
    ...(recording ? { guided: recording } : {}),
    title,
    detail,
    needsLink,
    timed,
  };
};

export type MeditateHomeFocus =
  | { kind: 'resume' }
  | { kind: 'session'; plan: MeditatePlan; why: string };

/** The top card: a session left open, else the last session again. */
export const meditateHomeFocus = (input: PlanInput & { draft?: MeditateSession | null }): MeditateHomeFocus => {
  if (input.draft) return { kind: 'resume' };
  const { mode } = startDefaults({
    sessions: input.sessions,
    nsdrLinks: input.nsdrLinks,
    launchPracticeId: input.launchPracticeId,
    launchGoalMin: input.launchGoalMin,
  });
  const repeated = input.sessions[0]?.mode === mode;
  return {
    kind: 'session',
    plan: planFor(mode, input),
    why: repeated ? 'Same as last time' : input.sessions.some((s) => s.mode === mode) ? 'Up next' : 'A good place to start',
  };
};
