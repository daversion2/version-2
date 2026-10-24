import { getPractice } from '../data/practices';
import { BreathPatternKey, getBreathPattern } from '../data/breathPatterns';
import {
  CompletedMeditateSession,
  GuidedRecording,
  MeditateMode,
  MeditateSession,
  MeditateStyle,
  NsdrLink,
  SitTechnique,
} from '../types/meditate';
import { getWeekStart, toLocalDateString } from '../utils/date';
import { loggedSec } from './sessionTimer';

// =============================================================================
// Meditate's logic, kept out of the screens so it can be tested: what the start
// screen opens on, a session from start to finish, what it hands the check-in,
// and the stats and records. Storage is services/labMeditate.ts; the clock is
// services/sessionTimer.ts.
// =============================================================================

export interface ModeConfig {
  label: string;
  icon: string;
  minMin: number;
  maxMin: number;
  stepMin: number;
  defaultMin: number;
  /** Shown under the mode on the start screen. */
  blurb: string;
}

// Ranges match each habit's duration field, so the minutes always land on a
// real stop of the check-in's slider.
export const MODES: Record<MeditateMode, ModeConfig> = {
  sit: {
    label: 'Sit',
    icon: 'flower-outline',
    minMin: 1,
    maxMin: 60,
    stepMin: 1,
    defaultMin: 10,
    blurb: 'Eyes closed, one anchor. Lock your phone — a bell rings at the end.',
  },
  breathe: {
    label: 'Breathe',
    icon: 'pulse-outline',
    minMin: 1,
    maxMin: 20,
    stepMin: 1,
    defaultMin: 5,
    blurb: 'Slow, deliberate breathing — longer out than in.',
  },
  nsdr: {
    label: 'NSDR',
    icon: 'moon-outline',
    minMin: 5,
    maxMin: 45,
    stepMin: 5,
    defaultMin: 20,
    blurb: 'Lie still with a recording you like. Deeply relaxed, not asleep.',
  },
};

export const MODE_ORDER: MeditateMode[] = ['sit', 'breathe', 'nsdr'];

export interface SitTechniqueDef {
  key: SitTechnique;
  label: string;
  /** The one line to hold onto — shown on the start screen and during the sit. */
  cue: string;
  /** The meditation habit's technique guide this matches (practices.ts). */
  guideLabel: string;
}

export const SIT_TECHNIQUES: SitTechniqueDef[] = [
  {
    key: 'breath',
    label: 'Focused',
    cue: 'When your mind wanders, notice — and return to the breath. Every return counts.',
    guideLabel: 'Focused Attention',
  },
  {
    key: 'open',
    label: 'Open awareness',
    cue: 'Notice whatever shows up, name it in a word, and let it pass.',
    guideLabel: 'Open Awareness / Noting Practice',
  },
  {
    key: 'body_scan',
    label: 'Body scan',
    cue: 'Move slowly through the body. Notice what’s there — don’t try to fix it.',
    guideLabel: 'Body Scan',
  },
];

export const getSitTechnique = (key?: string): SitTechniqueDef =>
  SIT_TECHNIQUES.find((t) => t.key === key) ?? SIT_TECHNIQUES[0];

/** The full steps, from the meditation habit's own guide — one source for the copy. */
export const techniqueSteps = (key: SitTechnique): string[] => {
  const label = getSitTechnique(key).guideLabel;
  return getPractice('meditation')?.techniques?.find((t) => t.label === label)?.steps ?? [];
};

/** Which mode a habit opens on: the meditation family sits, breathwork breathes. */
export const modeForHabit = (practiceId?: string | null): MeditateMode | undefined => {
  switch (getPractice(practiceId)?.id) {
    case 'meditation':
      return 'sit';
    case 'breathwork':
      return 'breathe';
    case 'nsdr':
      return 'nsdr';
    default:
      return undefined;
  }
};

/** On the mode's own steps and inside its range. */
export const clampMinutes = (mode: MeditateMode, minutes: number): number => {
  const { minMin, maxMin, stepMin } = MODES[mode];
  const snapped = Math.round(minutes / stepMin) * stepMin;
  return Math.min(maxMin, Math.max(minMin, snapped));
};

export interface StartChoices {
  mode: MeditateMode;
  technique: SitTechnique;
  pattern: BreathPatternKey;
  breatheStyle: MeditateStyle;
  nsdrLinkId?: string;
  minutes: Record<MeditateMode, number>;
}

/**
 * What the start screen opens on. Everything comes from the last session of
 * that kind, so a regular taps Begin and nothing else. The habit that opened
 * the app picks the mode, and its committed minutes stand in until there's a
 * last time to copy.
 */
export const startDefaults = (input: {
  /** Newest first. */
  sessions: CompletedMeditateSession[];
  nsdrLinks: NsdrLink[];
  launchPracticeId?: string | null;
  /** The launch habit's committed duration (metric_goals.duration_min). */
  launchGoalMin?: number;
}): StartChoices => {
  const { sessions, nsdrLinks, launchPracticeId, launchGoalMin } = input;
  const lastOf = (mode: MeditateMode) => sessions.find((s) => s.mode === mode);
  const launchMode = modeForHabit(launchPracticeId);
  const mode = launchMode ?? sessions[0]?.mode ?? 'sit';

  const minutes = {} as Record<MeditateMode, number>;
  for (const m of MODE_ORDER) {
    const last = lastOf(m);
    const fallback = m === launchMode && launchGoalMin ? launchGoalMin : MODES[m].defaultMin;
    minutes[m] = clampMinutes(m, last ? last.planned_sec / 60 : fallback);
  }

  const lastSit = lastOf('sit');
  const lastBreathe = lastOf('breathe');
  const lastNsdrTitle = lastOf('nsdr')?.nsdr_title;
  const nsdrLinkId = (nsdrLinks.find((l) => l.title === lastNsdrTitle) ?? nsdrLinks[0])?.id;

  return {
    mode,
    technique: lastSit?.technique ?? 'breath',
    pattern: lastBreathe?.pattern ?? 'box',
    // A guided breathing session doesn't decide pacer-or-timer for next time.
    breatheStyle: lastBreathe?.style === 'timer' ? 'timer' : 'pacer',
    nsdrLinkId,
    minutes,
  };
};

// --- A session, start to finish ----------------------------------------------

export const startSession = (input: {
  id: string;
  mode: MeditateMode;
  minutes: number;
  now: Date;
  technique?: SitTechnique;
  pattern?: BreathPatternKey;
  /** Breathe only — Sit and NSDR always lock and bell. */
  breatheStyle?: MeditateStyle;
  nsdrLink?: NsdrLink;
  /** A guided recording to play instead of the timer or pacer. Its own length is the plan. */
  guided?: Pick<GuidedRecording, 'id' | 'title' | 'duration_sec'>;
  habitId?: string;
  /** The start screen's optional "How calm do you feel?" (1–5). */
  calmBefore?: number;
}): MeditateSession => {
  const { id, mode, minutes, now, habitId, guided } = input;
  const session: MeditateSession = {
    id,
    mode,
    style: guided ? 'guided' : mode === 'breathe' ? input.breatheStyle ?? 'pacer' : 'timer',
    plannedSec: guided ? Math.round(guided.duration_sec) : clampMinutes(mode, minutes) * 60,
    startedAt: now.toISOString(),
  };
  if (guided) {
    session.guidedId = guided.id;
    session.guidedTitle = guided.title;
  }
  if (mode === 'sit') session.technique = input.technique ?? 'breath';
  if (mode === 'breathe') session.pattern = input.pattern ?? 'box';
  if (mode === 'nsdr' && input.nsdrLink) {
    session.nsdrLinkId = input.nsdrLink.id;
    session.nsdrTitle = input.nsdrLink.title;
  }
  if (habitId) session.habitId = habitId;
  if (isCalm(input.calmBefore)) session.calmBefore = input.calmBefore;
  return session;
};

export const isEnded = (session: MeditateSession): boolean => !!session.endedAt;

/**
 * Ends a session and fixes what it logs. A timed one counts by the clock
 * (capped at the plan — see sessionTimer.loggedSec); a paced one by the
 * seconds actually breathed, so pauses don't count; a guided one counts only
 * if it played to the end — its full length then, nothing before.
 */
export const endSession = (session: MeditateSession, now: Date, early: boolean): MeditateSession => {
  if (session.endedAt) return session;
  const logged =
    session.style === 'guided'
      ? early
        ? 0
        : session.plannedSec
      : session.style === 'pacer'
        ? Math.min(session.plannedSec, session.pacedSec ?? 0)
        : loggedSec(session, now);
  return {
    ...session,
    endedAt: now.toISOString(),
    loggedSec: logged,
    endedEarly: early && logged < session.plannedSec,
  };
};

/** Pacer progress, written as each breath completes so a killed app loses one breath at most. */
export const addPacedSeconds = (session: MeditateSession, sec: number): MeditateSession => ({
  ...session,
  pacedSec: Math.min(session.plannedSec, (session.pacedSec ?? 0) + sec),
});

/**
 * Finished and saved. `calmAfter` is the Done screen's optional answer; it
 * lives on the screen, not the draft, so it's passed in here.
 */
export const toCompletedSession = (
  session: MeditateSession,
  now: Date,
  calmAfter?: number
): CompletedMeditateSession => {
  const ended = endSession(session, now, false);
  const completed: CompletedMeditateSession = {
    id: ended.id,
    mode: ended.mode,
    style: ended.style,
    planned_sec: ended.plannedSec,
    duration_sec: ended.loggedSec ?? 0,
    ended_early: !!ended.endedEarly,
    started_at: ended.startedAt,
    finished_at: now.toISOString(),
    date: toLocalDateString(new Date(ended.startedAt)),
  };
  if (ended.technique) completed.technique = ended.technique;
  if (ended.pattern) completed.pattern = ended.pattern;
  if (ended.nsdrTitle) completed.nsdr_title = ended.nsdrTitle;
  if (ended.guidedId) completed.guided_id = ended.guidedId;
  if (ended.guidedTitle) completed.guided_title = ended.guidedTitle;
  if (ended.habitId) completed.habit_id = ended.habitId;
  if (isCalm(ended.calmBefore)) completed.calm_before = ended.calmBefore;
  if (isCalm(calmAfter)) completed.calm_after = calmAfter;
  return completed;
};

// --- Calm, before and after ---------------------------------------------------

/** 1 = tense, 5 = calm. */
export const CALM_LEVELS = [1, 2, 3, 4, 5] as const;

export const isCalm = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 5;

/** Sessions with both answers before the "usually" line shows — fewer is noise. */
export const CALM_MIN_SESSIONS = 3;

export interface CalmInsight {
  /** Sessions answered before and after. */
  sessions: number;
  /** Average after − before, to one decimal. */
  change: number;
}

/** How a session usually moves you, from every session answered both times. Null until there are enough. */
export const calmInsight = (sessions: Pick<CompletedMeditateSession, 'calm_before' | 'calm_after'>[]): CalmInsight | null => {
  const pairs = sessions.filter((s) => isCalm(s.calm_before) && isCalm(s.calm_after));
  if (pairs.length < CALM_MIN_SESSIONS) return null;
  const total = pairs.reduce((sum, s) => sum + (s.calm_after! - s.calm_before!), 0);
  return { sessions: pairs.length, change: Math.round((total / pairs.length) * 10) / 10 };
};

/** "You usually finish 1.5 points calmer", or about as calm, or less calm — never dressed up. */
export const describeCalmInsight = (i: CalmInsight): string => {
  const n = Math.abs(i.change);
  if (n < 0.3) return 'You usually finish about as calm as you started.';
  const points = `${n} ${n === 1 ? 'point' : 'points'}`;
  return i.change > 0 ? `You usually finish ${points} calmer.` : `You usually finish ${points} less calm.`;
};

/** "Calm 2 → 4", "Calm before: 3", "Calm after: 4", or null. */
export const describeCalm = (s: Pick<CompletedMeditateSession, 'calm_before' | 'calm_after'>): string | null => {
  const before = isCalm(s.calm_before) ? s.calm_before : undefined;
  const after = isCalm(s.calm_after) ? s.calm_after : undefined;
  if (before && after) return `Calm ${before} → ${after}`;
  if (before) return `Calm before: ${before}`;
  if (after) return `Calm after: ${after}`;
  return null;
};

/**
 * A session entered after the fact ("Log a past session"): no timer ran, so
 * planned and logged are the minutes given, filed on the day chosen (started
 * at noon local, so the day can't slip across midnight in any timezone math).
 */
export const pastSession = (input: {
  id: string;
  mode: MeditateMode;
  date: string;
  minutes: number;
  now: Date;
}): CompletedMeditateSession => {
  const [y, m, d] = input.date.split('-').map(Number);
  const sec = Math.max(1, Math.round(input.minutes)) * 60;
  return {
    id: input.id,
    mode: input.mode,
    style: 'timer',
    planned_sec: sec,
    duration_sec: sec,
    ended_early: false,
    started_at: new Date(y, m - 1, d, 12).toISOString(),
    finished_at: input.now.toISOString(),
    date: input.date,
  };
};

/**
 * What the check-in gets besides the minutes: the technique sat, or the
 * pattern breathed, for the habit's own `technique` field. The shell checks it
 * against that field's options, so a breathwork pattern never lands on a
 * meditation habit.
 */
export const checkinChoices = (
  session: Pick<MeditateSession, 'technique' | 'pattern'>
): Record<string, string> | undefined => {
  const value = session.technique ?? session.pattern;
  return value ? { technique: value } : undefined;
};

/** "Sit · Body scan", "Breathe · Box · pacer", "NSDR · Yoga nidra 20". */
export const describeSession = (
  s: Pick<CompletedMeditateSession, 'mode' | 'technique' | 'pattern' | 'nsdr_title' | 'style'>
): string => {
  const parts = [MODES[s.mode].label];
  if (s.mode === 'sit') parts.push(getSitTechnique(s.technique).label);
  if (s.mode === 'breathe') parts.push(getBreathPattern(s.pattern).label);
  if (s.mode === 'nsdr' && s.nsdr_title) parts.push(s.nsdr_title);
  if (s.style === 'guided') parts.push('Guided');
  return parts.join(' · ');
};

/**
 * The published recordings that fit what's picked on the start screen: this
 * mode and, for Sit, this technique — shortest first. Empty means no Guided
 * option is shown.
 */
export const guidedOptions = (
  recordings: GuidedRecording[],
  mode: MeditateMode,
  technique?: SitTechnique,
): GuidedRecording[] =>
  recordings
    .filter((r) => r.mode === mode && (mode !== 'sit' || r.technique === (technique ?? 'breath')))
    .sort((a, b) => a.length_min - b.length_min || a.title.localeCompare(b.title));

// --- Stats -------------------------------------------------------------------

/** 'YYYY-MM-DD' → a local Date at noon, clear of any DST edge. */
const localDay = (date: string): Date => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

/** Monday of the session's week, as YYYY-MM-DD. */
export const weekOf = (date: string): string => toLocalDateString(getWeekStart(localDay(date)));

const sum = (sessions: CompletedMeditateSession[]) => sessions.reduce((t, s) => t + s.duration_sec, 0);

export interface MeditateTotals {
  weekSec: number;
  monthSec: number;
  allSec: number;
  sessions: number;
}

export const totals = (sessions: CompletedMeditateSession[], now: Date): MeditateTotals => {
  const today = toLocalDateString(now);
  const week = weekOf(today);
  const month = today.slice(0, 7);
  return {
    weekSec: sum(sessions.filter((s) => weekOf(s.date) === week)),
    monthSec: sum(sessions.filter((s) => s.date.slice(0, 7) === month)),
    allSec: sum(sessions),
    sessions: sessions.length,
  };
};

export interface WeekBar {
  /** Monday, YYYY-MM-DD. */
  weekStart: string;
  sec: number;
  byMode: Record<MeditateMode, number>;
}

/** The last `weeks` weeks, oldest first, empty weeks included — the chart's bars. */
export const weeklyTotals = (sessions: CompletedMeditateSession[], now: Date, weeks = 8): WeekBar[] => {
  const thisWeek = getWeekStart(now);
  const bars: WeekBar[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisWeek);
    start.setDate(thisWeek.getDate() - i * 7);
    bars.push({ weekStart: toLocalDateString(start), sec: 0, byMode: { sit: 0, breathe: 0, nsdr: 0 } });
  }
  const index = new Map(bars.map((b) => [b.weekStart, b]));
  for (const s of sessions) {
    const bar = index.get(weekOf(s.date));
    if (!bar) continue;
    bar.sec += s.duration_sec;
    bar.byMode[s.mode] += s.duration_sec;
  }
  return bars;
};

const weekSums = (sessions: CompletedMeditateSession[]): Map<string, number> => {
  const out = new Map<string, number>();
  for (const s of sessions) {
    const w = weekOf(s.date);
    out.set(w, (out.get(w) ?? 0) + s.duration_sec);
  }
  return out;
};

export interface MeditateRecords {
  longest: Partial<Record<MeditateMode, CompletedMeditateSession>>;
  bestWeek?: { weekStart: string; sec: number };
}

/** Longest session per mode, and the most minutes in a week. First to reach a value keeps it. */
export const computeRecords = (sessions: CompletedMeditateSession[]): MeditateRecords => {
  const oldestFirst = [...sessions].sort((a, b) => a.started_at.localeCompare(b.started_at));
  const longest: MeditateRecords['longest'] = {};
  for (const s of oldestFirst) {
    const best = longest[s.mode];
    if (!best || s.duration_sec > best.duration_sec) longest[s.mode] = s;
  }
  let bestWeek: MeditateRecords['bestWeek'];
  for (const [weekStart, sec] of weekSums(oldestFirst)) {
    if (!bestWeek || sec > bestWeek.sec) bestWeek = { weekStart, sec };
  }
  return { longest, bestWeek };
};

export const RECORD_LABELS: Record<MeditateMode, string> = {
  sit: 'Longest sit',
  breathe: 'Longest breathwork',
  nsdr: 'Longest NSDR',
};

export interface NewRecord {
  label: string;
  sec: number;
  /** What it beat. */
  previousSec: number;
}

/**
 * Records `completed` sets against everything before it. A first session of a
 * kind is a baseline, not a record — there was nothing to beat. Best week is
 * called once, the session that takes this week past every other week; more
 * sessions that same week keep raising it quietly.
 */
export const newRecords = (
  previous: CompletedMeditateSession[],
  completed: CompletedMeditateSession
): NewRecord[] => {
  const out: NewRecord[] = [];
  const prior = computeRecords(previous).longest[completed.mode];
  if (prior && completed.duration_sec > prior.duration_sec) {
    out.push({ label: RECORD_LABELS[completed.mode], sec: completed.duration_sec, previousSec: prior.duration_sec });
  }

  const sums = weekSums(previous);
  const week = weekOf(completed.date);
  const before = sums.get(week) ?? 0;
  sums.delete(week);
  const otherBest = Math.max(0, ...sums.values());
  const after = before + completed.duration_sec;
  if (sums.size > 0 && before <= otherBest && after > otherBest) {
    out.push({ label: 'Most minutes in a week', sec: after, previousSec: otherBest });
  }
  return out;
};

export interface BreakdownRow {
  key: string;
  mode: MeditateMode;
  label: string;
  sec: number;
  sessions: number;
}

/** Time by mode and technique/pattern, biggest first — "where the minutes went". */
export const breakdown = (sessions: CompletedMeditateSession[]): BreakdownRow[] => {
  const rows = new Map<string, BreakdownRow>();
  for (const s of sessions) {
    const detail = s.mode === 'sit' ? s.technique ?? 'breath' : s.mode === 'breathe' ? s.pattern ?? 'box' : '';
    const key = `${s.mode}:${detail}`;
    const row = rows.get(key) ?? {
      key,
      mode: s.mode,
      label: describeSession({ mode: s.mode, technique: s.technique, pattern: s.pattern, style: s.style }),
      sec: 0,
      sessions: 0,
    };
    row.sec += s.duration_sec;
    row.sessions += 1;
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => b.sec - a.sec);
};

/**
 * A link someone pasted, made openable, or null. App links (spotify://…) pass
 * as they are; a bare "youtu.be/abc" gets https:// in front.
 */
export const normalizeLink = (raw: string): string | null => {
  const url = raw.trim();
  if (!url || /\s/.test(url)) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\/\S+/i.test(url)) return url;
  return /^[^/]+\.[a-z]{2,}(\/|$)/i.test(url) ? `https://${url}` : null;
};
