// =============================================================================
// Squarified treemap layout (Bruls, Huizing & van Wijk): each item gets a
// rectangle whose AREA is proportional to its value, laid out to keep the
// rectangles as close to square as possible. Used by the Meals servings
// treemap (components/homeDashboard/DashboardParts.tsx).
// =============================================================================

export interface TreemapItem {
  id: string;
  value: number;
}

export interface TreemapRect {
  id: string;
  value: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The worst (largest) aspect ratio a row of these areas would have along `side`. */
const worst = (areas: number[], side: number): number => {
  const sum = areas.reduce((s, a) => s + a, 0);
  const max = Math.max(...areas);
  const min = Math.min(...areas);
  return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
};

/**
 * Lay `items` out in a `width` × `height` box. Items with no value get no
 * rectangle; the rest come out in the order given (pass them largest first for
 * the best shapes) and exactly fill the box.
 */
export const squarify = (items: TreemapItem[], width: number, height: number): TreemapRect[] => {
  const live = items.filter((i) => i.value > 0);
  const total = live.reduce((s, i) => s + i.value, 0);
  if (!total || width <= 0 || height <= 0) return [];
  const scale = (width * height) / total;
  let rest = live.map((i) => ({ ...i, area: i.value * scale }));
  let x = 0;
  let y = 0;
  let w = width;
  let h = height;
  const out: TreemapRect[] = [];
  while (rest.length) {
    const side = Math.min(w, h);
    let n = 1;
    while (n < rest.length && worst(rest.slice(0, n + 1).map((r) => r.area), side) <= worst(rest.slice(0, n).map((r) => r.area), side)) {
      n++;
    }
    const row = rest.slice(0, n);
    const sum = row.reduce((s, r) => s + r.area, 0);
    if (w >= h) {
      // A column down the left of what's left.
      const cw = sum / h;
      let cy = y;
      for (const r of row) {
        const ch = r.area / cw;
        out.push({ id: r.id, value: r.value, x, y: cy, w: cw, h: ch });
        cy += ch;
      }
      x += cw;
      w -= cw;
    } else {
      // A row across the top of what's left.
      const rh = sum / w;
      let cx = x;
      for (const r of row) {
        const rw = r.area / rh;
        out.push({ id: r.id, value: r.value, x: cx, y, w: rw, h: rh });
        cx += rw;
      }
      y += rh;
      h -= rh;
    }
    rest = rest.slice(n);
  }
  return out;
};
