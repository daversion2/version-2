import { squarify } from '../treemap';

const area = (r: { w: number; h: number }) => r.w * r.h;

describe('squarify', () => {
  const items = [
    { id: 'veggies', value: 11 },
    { id: 'fruit', value: 6 },
    { id: 'grains', value: 6 },
    { id: 'chicken', value: 5 },
    { id: 'sweets', value: 1 },
  ];

  it('gives each item an area proportional to its value, filling the box exactly', () => {
    const rects = squarify(items, 400, 300);
    const total = items.reduce((s, i) => s + i.value, 0);
    for (const r of rects) expect(area(r)).toBeCloseTo((r.value / total) * 400 * 300, 6);
    expect(rects.reduce((s, r) => s + area(r), 0)).toBeCloseTo(400 * 300, 6);
  });

  it('keeps every rectangle inside the box, with none overlapping', () => {
    const rects = squarify(items, 400, 300);
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(-1e-9);
      expect(r.y).toBeGreaterThanOrEqual(-1e-9);
      expect(r.x + r.w).toBeLessThanOrEqual(400 + 1e-9);
      expect(r.y + r.h).toBeLessThanOrEqual(300 + 1e-9);
    }
    for (const a of rects) {
      for (const b of rects) {
        if (a === b) continue;
        const overlapW = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const overlapH = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        expect(overlapW > 1e-6 && overlapH > 1e-6).toBe(false);
      }
    }
  });

  it('keeps tiles reasonably square', () => {
    const ratio = (r: { w: number; h: number }) => Math.max(r.w / r.h, r.h / r.w);
    for (const r of squarify(items, 400, 300)) expect(ratio(r)).toBeLessThan(4);
  });

  it('skips items with nothing, and returns nothing for an empty week or box', () => {
    expect(squarify([{ id: 'a', value: 0 }, { id: 'b', value: 2 }], 100, 100).map((r) => r.id)).toEqual(['b']);
    expect(squarify([], 100, 100)).toEqual([]);
    expect(squarify(items, 0, 100)).toEqual([]);
  });

  it('a single item fills the whole box', () => {
    expect(squarify([{ id: 'a', value: 3 }], 200, 150)).toEqual([{ id: 'a', value: 3, x: 0, y: 0, w: 200, h: 150 }]);
  });
});
