/** Pure geometry for the hand-rolled SVG radar chart (first axis at 12 o'clock, clockwise). */

export interface Point {
  x: number;
  y: number;
}

/** Angle (radians) of axis `index` of `count`, starting straight up. */
export function axisAngle(index: number, count: number): number {
  return -Math.PI / 2 + (index * 2 * Math.PI) / count;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Point for a 0..max value on axis `index`. Values are clamped to [0, max]. */
export function radarPoint(index: number, count: number, value: number, radius: number, center: Point, max = 100): Point {
  const safe = Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : 0;
  const r = (safe / max) * radius;
  const angle = axisAngle(index, count);
  return { x: round(center.x + r * Math.cos(angle)), y: round(center.y + r * Math.sin(angle)) };
}

/** SVG `points` attribute for a closed polygon through the given values. */
export function radarPolygon(values: readonly number[], radius: number, center: Point, max = 100): string {
  return values
    .map((value, index) => radarPoint(index, values.length, value, radius, center, max))
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
}

/** A grid ring (regular polygon) at `level` of the radius (0..1). */
export function ringPolygon(level: number, count: number, radius: number, center: Point): string {
  return radarPolygon(new Array<number>(count).fill(level * 100), radius, center);
}

export interface AxisLabelPlacement extends Point {
  anchor: "start" | "middle" | "end";
  /** Vertical alignment offset in em for the first line, so labels sit outside the grid. */
  dy: number;
}

/** Where to put an axis label just outside the grid, with a text-anchor that keeps it clear of the chart. */
export function labelPlacement(index: number, count: number, radius: number, center: Point, gap = 14): AxisLabelPlacement {
  const angle = axisAngle(index, count);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const x = round(center.x + (radius + gap) * cos);
  const y = round(center.y + (radius + gap) * sin);
  const anchor = Math.abs(cos) < 0.2 ? "middle" : cos > 0 ? "start" : "end";
  // Top labels sit above their point, bottom labels below, side labels centered.
  const dy = sin < -0.5 ? -0.35 : sin > 0.5 ? 0.95 : 0.35;
  return { x, y, anchor, dy };
}

/** Splits a label into at most two balanced lines ("Technical depth" → ["Technical", "depth"]). */
export function splitLabel(label: string, maxLineChars = 11): string[] {
  if (label.length <= maxLineChars || !label.includes(" ")) return [label];
  const parts = label.split(" ");
  let best: [string, string] = [label, ""];
  let bestWidth = Infinity;
  for (let i = 1; i < parts.length; i++) {
    const first = parts.slice(0, i).join(" ");
    const second = parts.slice(i).join(" ");
    const width = Math.max(first.length, second.length);
    if (width < bestWidth) {
      bestWidth = width;
      best = [first, second];
    }
  }
  return best;
}

/** Sparkline path through values (0..max) inside a width x height box with padding. */
export function sparklinePoints(values: readonly number[], width: number, height: number, pad = 6, max = 100): Point[] {
  if (values.length === 0) return [];
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const step = values.length > 1 ? innerW / (values.length - 1) : 0;
  return values.map((value, index) => {
    const safe = Number.isFinite(value) ? Math.min(max, Math.max(0, value)) : 0;
    return {
      x: round(values.length > 1 ? pad + index * step : width / 2),
      y: round(pad + innerH - (safe / max) * innerH),
    };
  });
}
