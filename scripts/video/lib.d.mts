/** Types for lib.mjs, so the tests type-check. Keep in step with the implementation. */
export interface Span {
    start: number;
    end: number;
}
export interface Word {
    w: string;
    s: number;
    e: number;
}
export interface Block {
    id: string;
    kind: string;
    text?: string;
    callout?: string;
    [key: string]: unknown;
}
export function slugify(name: string): string;
export function formatTimestamp(seconds: number): string;
export function vttTime(seconds: number): string;
export function pickTrim(input: {
    speech: Span[];
    sceneChanges?: number[];
    duration: number;
    lead?: number;
    tailMin?: number;
    tailMax?: number;
}): Span;
export function speechSpans(silences: { start: number; end?: number }[], duration: number): Span[];
export function shiftVtt(vtt: string, offset: number, end?: number, replacements?: [string, string][]): string;
export function liftCallouts<T extends Block>(blocks: T[]): Block[];
export function resolveTimestamps(markdown: string, starts: Record<string, number> | null | undefined): string;
export function sectionStarts(syncReport: { sections?: { id: string; total: number }[] }): Record<string, number>;
export function sentences(text: string): string[];
export function phraseStart(words: Word[], phrase: string): number | null;
export function captionsFromNarration(sections: { offset: number; text: string; words: Word[]; duration: number }[]): string;
export interface PlanStep {
    mark: string;
    do?: string;
    sync?: string;
    pre?: number;
    after?: number;
    speed?: number;
    shot?: boolean | string;
    crop?: string | number[];
}
export interface Plan {
    title: string;
    sections: { id: string; label: string; narration: string; steps: PlanStep[]; tail?: number }[];
    [key: string]: unknown;
}
export interface RecorderExport {
    t0: number;
    marks: { label: string; start: number; end: number }[];
}
export interface Clip {
    in: number;
    out: number;
    speed?: number;
    sync?: string;
}
export function validatePlan(plan: Plan): string[];
export function planToRevoice(
    plan: Plan,
    rec: RecorderExport,
    opts?: { offset?: number; duration?: number },
): {
    revoice: { title: string; sections: { id: string; label: string; narration: string; clips: Clip[]; tail?: number }[] };
    shots: { name: string; t: number; crop: string | number[] }[];
    missing: string[];
};
export interface StillClip {
    still: string;
    kind: string;
    box?: number[];
    zoom?: number;
    prev?: string;
    sync?: string;
    /** Callouts drawn on the still. */
    notes?: StillNotes;
    /** Where the previous still's camera, ring, cursor and callouts ended, so this clip
     * moves on from there. Only when the previous still had a box. */
    from?: { box: number[]; zoom?: number; kind?: string; notes?: StillNotes };
}
export interface StillNotes {
    tags: unknown[];
    arrows: unknown[];
}
export function planToStills(
    plan: Plan & { mode?: string },
    rec: { rects?: Record<string, { box: { x: number; y: number; w: number; h: number } | null }> },
): {
    revoice: { title: string; mode: string; sections: { id: string; label: string; narration: string; clips: StillClip[]; tail?: number }[] };
    shots: { name: string; still: string; crop: string | number[] }[];
    missing: string[];
};
