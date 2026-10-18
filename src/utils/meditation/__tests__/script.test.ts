import {
  parseMeditationScript,
  withGaps,
  applyPronunciations,
  totalPauseSec,
  fitPauses,
  approvalStatus,
} from '../script';

const HEADER = '---\nid: first-sit-5\ntitle: First sit\nmode: sit\n---\n';

describe('parseMeditationScript', () => {
  it('reads front matter, speech, pauses and bells', () => {
    const { meta, segments } = parseMeditationScript(
      `${HEADER}\nWelcome.\n\n[pause 20s]\nBreathe in.\n[bell]\n`,
    );
    expect(meta).toEqual({ id: 'first-sit-5', title: 'First sit', mode: 'sit' });
    expect(segments).toEqual([
      { kind: 'speech', text: 'Welcome.' },
      { kind: 'pause', seconds: 20 },
      { kind: 'speech', text: 'Breathe in.' },
      { kind: 'bell' },
    ]);
  });

  it('joins consecutive lines and splits on blank lines', () => {
    const { segments } = parseMeditationScript(`${HEADER}One\ntwo.\n\nThree.`);
    expect(segments).toEqual([
      { kind: 'speech', text: 'One two.' },
      { kind: 'speech', text: 'Three.' },
    ]);
  });

  it('never speaks # notes', () => {
    const { segments } = parseMeditationScript(`${HEADER}# slow down here\nHello.`);
    expect(segments).toEqual([{ kind: 'speech', text: 'Hello.' }]);
  });

  it.each([
    ['[pause 20s]', 20],
    ['[pause 20]', 20],
    ['[pause 1.5s]', 1.5],
    ['[pause 1m]', 60],
    ['[pause 1m30s]', 90],
    ['[PAUSE 5s]', 5],
  ])('reads %s as %d seconds', (marker, seconds) => {
    const { segments } = parseMeditationScript(`${HEADER}Hi.\n${marker}`);
    expect(segments[1]).toEqual({ kind: 'pause', seconds });
  });

  it('rejects markers it cannot read rather than speaking them', () => {
    expect(() => parseMeditationScript(`${HEADER}Hi.\n[pause soon]`)).toThrow(/Line 7/);
    expect(() => parseMeditationScript(`${HEADER}Hi.\n[pause 0s]`)).toThrow();
    expect(() => parseMeditationScript(`${HEADER}Hi.\n[chime]`)).toThrow();
  });

  it('requires id, title and something to say', () => {
    expect(() => parseMeditationScript('---\ntitle: X\n---\nHi.')).toThrow(/id/);
    expect(() => parseMeditationScript('---\nid: x\n---\nHi.')).toThrow(/title/);
    expect(() => parseMeditationScript('---\nid: x\ntitle: X\n')).toThrow(/closing/);
    expect(() => parseMeditationScript(`${HEADER}[pause 5s]`)).toThrow(/nothing to say/);
  });
});

describe('withGaps', () => {
  it('adds the gap only between back-to-back speech', () => {
    const out = withGaps(
      [
        { kind: 'speech', text: 'a' },
        { kind: 'speech', text: 'b' },
        { kind: 'pause', seconds: 10 },
        { kind: 'speech', text: 'c' },
      ],
      1.5,
    );
    expect(out).toEqual([
      { kind: 'speech', text: 'a' },
      { kind: 'pause', seconds: 1.5 },
      { kind: 'speech', text: 'b' },
      { kind: 'pause', seconds: 10 },
      { kind: 'speech', text: 'c' },
    ]);
  });
});

describe('applyPronunciations', () => {
  it('replaces whole words only, longest first', () => {
    const map = { NSDR: 'N S D R', 'NSDR session': 'rest session' };
    expect(applyPronunciations('Start the NSDR session. NSDRs and NSDR.', map)).toBe(
      'Start the rest session. NSDRs and N S D R.',
    );
  });
});

describe('fitPauses', () => {
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

  it('scales only the time beyond the base beat', () => {
    // Base 2s each = 6s kept; extras 8+18+28 = 54s scaled to fill the rest.
    expect(fitPauses([10, 20, 30], 33, 2)).toEqual([6, 11, 16]);
    expect(fitPauses([10, 20, 30], 114, 2)).toEqual([18, 38, 58]);
  });

  it('leaves short pauses alone while long ones absorb the change', () => {
    const out = fitPauses([1.5, 4, 30], 20, 2);
    expect(out[0]).toBe(1.5);
    expect(out[1]).toBeGreaterThan(2);
    expect(out[1]).toBeLessThan(4);
    expect(sum(out)).toBeCloseTo(20);
  });

  it('stretches in proportion when every pause is short', () => {
    expect(fitPauses([1, 2], 9, 2)).toEqual([3, 6]);
  });

  it('keeps the base beats and runs long when even they do not fit', () => {
    expect(fitPauses([5, 1, 30], 3, 2)).toEqual([2, 1, 2]);
    expect(fitPauses([5, 5], -10, 2)).toEqual([2, 2]);
  });

  it('handles no pauses', () => {
    expect(fitPauses([], 30, 2)).toEqual([]);
  });
});

describe('totalPauseSec', () => {
  it('sums the pauses', () => {
    expect(totalPauseSec([{ kind: 'pause', seconds: 2 }, { kind: 'bell' }, { kind: 'pause', seconds: 3.5 }])).toBe(5.5);
  });
});

describe('approvalStatus', () => {
  const approval = { audio_sha256: 'A', script_sha256: 'S', duration_sec: 300, approved_at: '2026-10-17T00:00:00Z' };

  it('approves only the exact audio, from the current script', () => {
    expect(approvalStatus({ scriptSha: 'S', audioSha: 'A', renderedFromScriptSha: 'S', approval })).toBe('approved');
  });

  it('is not rendered without audio', () => {
    expect(approvalStatus({ scriptSha: 'S', audioSha: null, renderedFromScriptSha: null, approval })).toBe('not-rendered');
  });

  it('is a stale render when the script was edited after rendering', () => {
    expect(approvalStatus({ scriptSha: 'S2', audioSha: 'A', renderedFromScriptSha: 'S', approval })).toBe('stale-render');
  });

  it('needs approval when none is recorded', () => {
    expect(approvalStatus({ scriptSha: 'S', audioSha: 'A', renderedFromScriptSha: 'S', approval: undefined })).toBe(
      'not-approved',
    );
  });

  it('loses approval when the audio or script changes', () => {
    expect(approvalStatus({ scriptSha: 'S', audioSha: 'A2', renderedFromScriptSha: 'S', approval })).toBe('audio-changed');
    expect(approvalStatus({ scriptSha: 'S2', audioSha: 'A', renderedFromScriptSha: 'S2', approval })).toBe(
      'audio-changed',
    );
  });
});
