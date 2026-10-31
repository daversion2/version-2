import { clampPct, nestedRingSizes, ringEndCap } from '../ringMath';

describe('clampPct', () => {
  it('keeps 0–1 and clamps the rest', () => {
    expect(clampPct(0.4)).toBe(0.4);
    expect(clampPct(-1)).toBe(0);
    expect(clampPct(3)).toBe(1);
    expect(clampPct(NaN)).toBe(0);
  });
});

describe('ringEndCap', () => {
  // 100pt ring, 10pt stroke: the stroke's centre line has radius 45.
  const at = (pct: number) => {
    const { x, y } = ringEndCap(pct, 100, 10);
    return { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 };
  };

  it('starts at 12 o’clock', () => expect(at(0)).toEqual({ x: 50, y: 5 }));
  it('is at 3 o’clock a quarter of the way', () => expect(at(0.25)).toEqual({ x: 95, y: 50 }));
  it('is at 6 o’clock halfway', () => expect(at(0.5)).toEqual({ x: 50, y: 95 }));
  it('comes back to the top when full, and past full', () => {
    expect(at(1)).toEqual({ x: 50, y: 5 });
    expect(at(1.5)).toEqual({ x: 50, y: 5 });
  });
});

describe('nestedRingSizes', () => {
  it('steps each ring in by stroke + gap on both sides', () => {
    expect(nestedRingSizes(3, 140, 13, 4)).toEqual([140, 106, 72]);
  });
});
