/**
 * Pure helpers for the hand-rolled dashboard charts (no DOM, no React), so the
 * geometry is unit-testable and identical on every render.
 */

export interface NiceScale {
  /** Top of the y-axis (>= the data max, a "clean" number). */
  max: number;
  /** Tick values from 0 to max inclusive, evenly spaced. */
  ticks: number[];
}

/**
 * A clean y-scale for counts: the top tick is the smallest 1/2/5×10^k step
 * multiple that fits the data, with at most `maxTicks` intervals. Integers
 * only (review counts are whole numbers), so an empty chart still gets 0..4.
 */
export function niceScale(dataMax: number, maxTicks = 4): NiceScale {
  const top = Number.isFinite(dataMax) ? Math.max(0, dataMax) : 0;
  const intervals = Math.max(1, Math.floor(maxTicks));
  if (top <= intervals) {
    const max = Math.max(intervals, Math.ceil(top));
    const step = Math.max(1, Math.ceil(max / intervals));
    return build(step, intervals);
  }
  const raw = top / intervals;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step =
    [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= raw && Number.isInteger(candidate)) ??
    10 * magnitude;
  const count = Math.max(1, Math.ceil(top / step));
  return build(step, count);
}

function build(step: number, count: number): NiceScale {
  const ticks = Array.from({ length: count + 1 }, (_, index) => index * step);
  return { max: ticks[ticks.length - 1]!, ticks };
}

/**
 * Indices whose x-axis label is shown: every `every`-th slot counted back from
 * the last one (so "Today" is always labelled), plus the first slot when it
 * would not crowd its neighbour.
 */
export function axisLabelIndices(count: number, every: number): Set<number> {
  const shown = new Set<number>();
  if (count <= 0) return shown;
  const step = Math.max(1, Math.floor(every));
  let lowest = count - 1;
  for (let index = count - 1; index >= 0; index -= step) {
    shown.add(index);
    lowest = index;
  }
  if (lowest > 0 && lowest >= Math.max(2, Math.ceil(step * 0.6))) shown.add(0);
  return shown;
}

export type TooltipAlign = "start" | "center" | "end";

/** Keeps tooltips inside the plot: edge columns anchor to their own side. */
export function tooltipAlign(index: number, count: number): TooltipAlign {
  if (count <= 2) return index === 0 ? "start" : "end";
  const position = (index + 0.5) / count;
  if (position < 0.2) return "start";
  if (position > 0.8) return "end";
  return "center";
}

/**
 * Pixel heights for one stacked column: the column height is proportional to
 * the total, and the 2px surface gaps between visible segments come out of it
 * (so a stacked bar is exactly as tall as a single bar with the same total).
 * Non-zero segments never shrink below `minSegment` pixels.
 */
export function stackHeights(values: readonly number[], scaleMax: number, plotHeight: number, gap = 2, minSegment = 2): number[] {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0);
  if (total <= 0 || scaleMax <= 0 || plotHeight <= 0) return values.map(() => 0);
  const columnHeight = Math.min(plotHeight, (total / scaleMax) * plotHeight);
  const visible = values.filter((value) => value > 0).length;
  const available = Math.max(visible * minSegment, columnHeight - gap * (visible - 1));
  return values.map((value) => (value > 0 ? Math.max(minSegment, (value / total) * available) : 0));
}

/** Index of the largest value (first one on ties); -1 when every value is 0. */
export function peakIndex(values: readonly number[]): number {
  let best = -1;
  let bestValue = 0;
  values.forEach((value, index) => {
    if (value > bestValue) {
      best = index;
      bestValue = value;
    }
  });
  return best;
}
