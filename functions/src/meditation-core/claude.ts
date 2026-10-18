// =============================================================================
// The one Claude call: a request in, a script or a polite decline out.
// Shared core (see script.ts); never imported by the app, since the API key
// must stay on the server.
// =============================================================================

import type Anthropic from '@anthropic-ai/sdk';
import {
  COMPOSE_SCRIPT_SCHEMA,
  COMPOSE_SYSTEM_PROMPT,
  composeUserMessage,
  type ComposeRequest,
  type ComposedScript,
} from './compose';

/** The cheapest model while only the founder is testing. Revisit before this reaches users. */
export const COMPOSE_MODEL = 'claude-haiku-4-5';

/**
 * Per-request limits for the client, so a hung call can't outlive the Cloud
 * Function (540s) — the SDK's own defaults allow up to 10 minutes × 3 tries.
 */
export const COMPOSE_CLIENT_OPTIONS = { timeout: 120_000, maxRetries: 1 } as const;

/** Shown when Claude's safety systems stop a request before it answers. */
const REFUSED_MESSAGE = "This isn't something we can make into a session. Try describing it a different way.";

export type WriteResult =
  | { kind: 'script'; script: ComposedScript; model: string; usage: Anthropic.Usage }
  | { kind: 'declined'; message: string; model: string; usage: Anthropic.Usage };

/**
 * Plain create + our own parse, not messages.parse(): parse() throws on any
 * text that isn't complete JSON — which is exactly what a refusal or a
 * cut-off reply contains — before stop_reason can be checked, and a refusal
 * would then show as "something went wrong" instead of a decline.
 */
export async function writeComposedScript(
  client: Anthropic,
  req: Pick<ComposeRequest, 'request' | 'kind' | 'minutes'>,
  model: string = COMPOSE_MODEL,
): Promise<WriteResult> {
  const response = await client.messages.create({
    model,
    max_tokens: 16000,
    system: COMPOSE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: composeUserMessage(req) }],
    output_config: { format: { type: 'json_schema', schema: COMPOSE_SCRIPT_SCHEMA } },
  });
  const meta = { model: response.model, usage: response.usage };

  if (response.stop_reason === 'refusal') return { kind: 'declined', message: REFUSED_MESSAGE, ...meta };
  if (response.stop_reason === 'max_tokens') throw new Error('The script ran past the token limit.');

  const out = parseComposedScript(
    response.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join(''),
  );
  if (!out) throw new Error('Claude returned something that was not a script.');
  if (out.decision === 'decline') return { kind: 'declined', message: out.decline_message || REFUSED_MESSAGE, ...meta };
  if (!out.segments.some((s) => s.say.trim())) throw new Error('Claude wrote an empty script.');
  return { kind: 'script', script: out, ...meta };
}

/** Claude's JSON answer, checked for shape; null if it isn't one. */
export function parseComposedScript(text: string): ComposedScript | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const o = raw as Partial<ComposedScript> | null;
  if (!o || (o.decision !== 'write' && o.decision !== 'decline')) return null;
  if (!Array.isArray(o.segments)) return null;
  const segments = o.segments.filter(
    (s): s is ComposedScript['segments'][number] =>
      !!s && typeof s.say === 'string' && typeof s.pause_after_sec === 'number' && Number.isFinite(s.pause_after_sec),
  );
  return {
    decision: o.decision,
    decline_message: typeof o.decline_message === 'string' ? o.decline_message : '',
    title: typeof o.title === 'string' ? o.title : '',
    segments,
  };
}
