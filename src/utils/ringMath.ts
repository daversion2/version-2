// Geometry for components/common/ProgressRing.tsx. The ring is drawn from plain
// Views (there's no SVG in the binary), which can't round an arc's ends, so the
// ring places a dot on each end instead. These say where.

/** 0–1, whatever comes in. NaN reads as empty. */
export const clampPct = (pct: number): number => (Number.isFinite(pct) ? Math.max(0, Math.min(1, pct)) : 0);

/**
 * Centre of the dot that rounds the arc's leading end, in the ring's own box
 * (0,0 top-left). The arc starts at 12 o'clock and runs clockwise.
 */
export const ringEndCap = (pct: number, size: number, stroke: number): { x: number; y: number } => {
  const r = (size - stroke) / 2;
  const angle = clampPct(pct) * 2 * Math.PI;
  return { x: size / 2 + r * Math.sin(angle), y: size / 2 - r * Math.cos(angle) };
};

/** Each ring's outer size when rings nest inside one another, outermost first. */
export const nestedRingSizes = (count: number, size: number, stroke: number, gap: number): number[] =>
  Array.from({ length: count }, (_, i) => size - 2 * i * (stroke + gap));
