/**
 * Pure math & interpolation utilities for clinical score engines
 */

export interface Point {
  x: number;
  y: number;
}

/**
 * Linear interpolation on a sorted list of points
 */
export function interpolatePiecewise(x: number, points: Point[]): number {
  if (points.length === 0) return 0;
  if (points.length === 1) return points[0].y;

  // Extrapolate flat before first or after last
  if (x <= points[0].x) return points[0].y;
  if (x >= points[points.length - 1].x) return points[points.length - 1].y;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (x >= p1.x && x <= p2.x) {
      if (p2.x === p1.x) return p1.y;
      const t = (x - p1.x) / (p2.x - p1.x);
      return p1.y + t * (p2.y - p1.y);
    }
  }

  return points[points.length - 1].y;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

export function round(val: number, decimals: number = 1): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}
