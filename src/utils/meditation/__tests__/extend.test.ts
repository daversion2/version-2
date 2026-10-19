import { planExtension } from '../extend';

describe('planExtension', () => {
  const PAUSES: [number, number][] = [
    [93.15, 102.57],
    [104.28, 113.73],
    [118.95, 126.0],
  ];

  it('lands on exactly the target length', () => {
    const { cuts, fills } = planExtension(229.137, PAUSES, 600, 1);
    // Every join is a 1s crossfade that overlaps: two per pause.
    const result = 229.137 + fills.reduce((a, b) => a + b, 0) - 2 * PAUSES.length * 1;
    expect(result).toBeCloseTo(600, 6);
    expect(cuts).toEqual([97.86, 109.005, 122.475]);
  });

  it('gives longer pauses proportionally more time', () => {
    const { fills } = planExtension(229.137, PAUSES, 600, 1);
    expect(fills[0]).toBeGreaterThan(fills[2]);
    expect(fills[0] / fills[2]).toBeCloseTo((102.57 - 93.15) / (126.0 - 118.95), 6);
  });

  it('sorts the pauses into time order', () => {
    const { cuts } = planExtension(229.137, [PAUSES[2], PAUSES[0]], 600, 1);
    expect(cuts[0]).toBeLessThan(cuts[1]);
  });

  it('refuses pauses it cannot use, and a target shorter than the source', () => {
    expect(() => planExtension(200, [], 600, 1)).toThrow(/at least one/);
    expect(() => planExtension(200, [[190, 210]], 600, 1)).toThrow(/inside/);
    expect(() => planExtension(200, [[10, 20], [15, 30]], 600, 1)).toThrow(/overlap/);
    expect(() => planExtension(200, [[10, 11.5]], 600, 1)).toThrow(/too short/);
    expect(() => planExtension(200, [[10, 20]], 150, 1)).toThrow(/can't be stretched/);
  });
});
