import type Anthropic from '@anthropic-ai/sdk';
import { parseComposedScript, writeComposedScript } from '../claude';

const req = { request: 'Calm before my race', kind: 'imagery' as const, minutes: 3 };
const usage = { input_tokens: 10, output_tokens: 20 } as Anthropic.Usage;

/** A stand-in client whose messages.create resolves to the given reply. */
const clientReturning = (reply: Partial<Anthropic.Message>) =>
  ({
    messages: { create: jest.fn(async () => ({ model: 'claude-haiku-4-5', usage, content: [], ...reply })) },
  }) as unknown as Anthropic;

const text = (t: string) => [{ type: 'text', text: t }] as Anthropic.Message['content'];
const script = {
  decision: 'write',
  decline_message: '',
  title: 'Race day',
  segments: [{ say: 'Settle in.', pause_after_sec: 4 }],
};

describe('writeComposedScript', () => {
  it('returns the script', async () => {
    const out = await writeComposedScript(clientReturning({ stop_reason: 'end_turn', content: text(JSON.stringify(script)) }), req);
    expect(out).toMatchObject({ kind: 'script', script: { title: 'Race day' }, model: 'claude-haiku-4-5' });
  });

  it('turns a decision to decline into a decline', async () => {
    const declined = { ...script, decision: 'decline', decline_message: 'Not this one.', segments: [] };
    const out = await writeComposedScript(clientReturning({ stop_reason: 'end_turn', content: text(JSON.stringify(declined)) }), req);
    expect(out).toMatchObject({ kind: 'declined', message: 'Not this one.' });
  });

  it('treats a safety refusal as a decline, even with half-written JSON', async () => {
    const out = await writeComposedScript(clientReturning({ stop_reason: 'refusal', content: text('{"decision": "wri') }), req);
    expect(out.kind).toBe('declined');
  });

  it('fails clearly when the reply was cut off or is not a script', async () => {
    await expect(
      writeComposedScript(clientReturning({ stop_reason: 'max_tokens', content: text('{"decision"') }), req),
    ).rejects.toThrow(/token limit/);
    await expect(writeComposedScript(clientReturning({ stop_reason: 'end_turn', content: text('hello') }), req)).rejects.toThrow(
      /not a script/,
    );
    const empty = { ...script, segments: [{ say: '  ', pause_after_sec: 1 }] };
    await expect(
      writeComposedScript(clientReturning({ stop_reason: 'end_turn', content: text(JSON.stringify(empty)) }), req),
    ).rejects.toThrow(/empty/);
  });
});

describe('parseComposedScript', () => {
  it('drops malformed segments and fills missing strings', () => {
    const parsed = parseComposedScript(
      JSON.stringify({ decision: 'write', segments: [{ say: 'ok', pause_after_sec: 2 }, { say: 'bad' }, null] }),
    );
    expect(parsed).toEqual({ decision: 'write', decline_message: '', title: '', segments: [{ say: 'ok', pause_after_sec: 2 }] });
  });

  it('rejects anything that is not a decision', () => {
    expect(parseComposedScript('[]')).toBeNull();
    expect(parseComposedScript('{"decision":"maybe","segments":[]}')).toBeNull();
    expect(parseComposedScript('not json')).toBeNull();
  });
});
