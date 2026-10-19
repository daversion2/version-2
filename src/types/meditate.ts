import type { BreathPatternKey } from '../data/breathPatterns';

// =============================================================================
// Meditate (Lab mini-app) — one calm app for sitting, breathwork and NSDR.
// Stored under users/{uid}/lab_meditate_*. See services/labMeditate.ts.
// =============================================================================

export type MeditateMode = 'sit' | 'breathe' | 'nsdr';

/** Values match the meditation habit's `technique` tracking options. */
export type SitTechnique = 'breath' | 'open' | 'body_scan';

/**
 * How the session runs. 'timer' = lock the phone, a notification rings the
 * bell. 'pacer' = breathwork's follow-along circle, screen on. 'guided' = a
 * published guided recording plays; it only counts if it plays to the end.
 */
export type MeditateStyle = 'timer' | 'pacer' | 'guided';

/**
 * A guided recording in the guidedRecordings catalog — published only by
 * scripts/publishMeditations.ts, and only once the founder has approved it.
 */
export interface GuidedRecording {
  id: string;
  title: string;
  mode: MeditateMode;
  /** Sit recordings: which technique (the SitTechnique key). */
  technique: string | null;
  length_min: number;
  duration_sec: number;
  voice: string;
  audio_url: string;
}

export interface NsdrLink {
  id: string;
  title: string;
  url: string;
}

/** The session in progress — what the on-phone draft holds. */
export interface MeditateSession {
  id: string;
  mode: MeditateMode;
  style: MeditateStyle;
  technique?: SitTechnique;
  pattern?: BreathPatternKey;
  nsdrLinkId?: string;
  /** Kept on the session so a link deleted mid-sit still names the recording. */
  nsdrTitle?: string;
  /** Guided only: the recording playing, and its title (kept if it's later taken down). */
  guidedId?: string;
  guidedTitle?: string;
  plannedSec: number;
  startedAt: string;
  /** Pacer only: seconds actually breathed, pauses excluded. */
  pacedSec?: number;
  /** Set once it's over (bell, End early, or the pacer finishing). */
  endedAt?: string;
  /** What gets logged — fixed when the session ends. */
  loggedSec?: number;
  endedEarly?: boolean;
  /** The scheduled end-bell notification, cancelled if it ends early. */
  bellId?: string;
  /** The habit whose Start button opened the app, if one did. */
  habitId?: string;
}

/** A finished session, as saved. */
export interface CompletedMeditateSession {
  id: string;
  mode: MeditateMode;
  style: MeditateStyle;
  technique?: SitTechnique;
  pattern?: BreathPatternKey;
  nsdr_title?: string;
  /** Guided sessions: which recording. */
  guided_id?: string;
  guided_title?: string;
  planned_sec: number;
  duration_sec: number;
  ended_early: boolean;
  started_at: string;
  finished_at: string;
  /** Local YYYY-MM-DD the session started on — what weeks and months count by. */
  date: string;
  habit_id?: string;
  /** Seeded by Admin → demo data; removed when demo mode is turned off. */
  is_demo?: boolean;
}

export interface MeditatePrefs {
  linked_habit_ids: string[];
  nsdr_links: NsdrLink[];
  intro_seen?: boolean;
}

export type MeditateStackParamList = {
  MeditateHome: undefined;
  MeditateSession: undefined;
  MeditateGuided: undefined;
  MeditateDone: undefined;
  MeditateHistory: undefined;
  MeditateSettings: undefined;
};
