import { Colors } from '../constants/theme';

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (n: number): string => Math.round(n).toString(16).padStart(2, '0');

/**
 * A 0-100 Meals score as a colour: a linear blend from Colors.fail (0) to
 * Colors.success (100), so a score reads the same on a chip, a plate and the
 * servings treemap. Colors.border for null (not yet scored).
 */
export const scoreColor = (score: number | null): string => {
  if (score == null) return Colors.border;
  const t = Math.max(0, Math.min(100, score)) / 100;
  const [r1, g1, b1] = hexToRgb(Colors.fail);
  const [r2, g2, b2] = hexToRgb(Colors.success);
  return `#${toHex(r1 + (r2 - r1) * t)}${toHex(g1 + (g2 - g1) * t)}${toHex(b1 + (b2 - b1) * t)}`;
};
