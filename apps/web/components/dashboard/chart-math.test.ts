import { describe, expect, it } from "vitest";
import { axisLabelIndices, niceScale, peakIndex, stackHeights, tooltipAlign } from "./chart-math";

describe("niceScale", () => {
  it("gives an empty chart a readable 0..4 axis", () => {
    expect(niceScale(0)).toEqual({ max: 4, ticks: [0, 1, 2, 3, 4] });
    expect(niceScale(3)).toEqual({ max: 4, ticks: [0, 1, 2, 3, 4] });
  });

  it("rounds the top up to clean integer steps", () => {
    expect(niceScale(7)).toEqual({ max: 8, ticks: [0, 2, 4, 6, 8] });
    expect(niceScale(23)).toEqual({ max: 30, ticks: [0, 10, 20, 30] });
    expect(niceScale(120).ticks.every((tick) => Number.isInteger(tick))).toBe(true);
    expect(niceScale(120).max).toBeGreaterThanOrEqual(120);
  });

  it("never exceeds the requested number of intervals and always covers the data", () => {
    for (let value = 0; value <= 500; value += 7) {
      const scale = niceScale(value);
      expect(scale.max).toBeGreaterThanOrEqual(value);
      expect(scale.ticks.length - 1).toBeLessThanOrEqual(4);
      expect(scale.ticks[0]).toBe(0);
    }
  });

  it("tolerates garbage", () => {
    expect(niceScale(Number.NaN).max).toBe(4);
    expect(niceScale(-5).max).toBe(4);
  });
});

describe("axisLabelIndices", () => {
  it("always labels the last slot and steps back from it", () => {
    expect([...axisLabelIndices(30, 7)].sort((a, b) => a - b)).toEqual([1, 8, 15, 22, 29]);
    expect(axisLabelIndices(14, 1).size).toBe(14);
  });

  it("adds the first slot only when it does not crowd a neighbour", () => {
    expect(axisLabelIndices(14, 2).has(0)).toBe(false);
    expect(axisLabelIndices(27, 7).has(0)).toBe(true); // lowest stepped label is 5
    expect(axisLabelIndices(0, 3).size).toBe(0);
  });
});

describe("tooltipAlign", () => {
  it("anchors edge columns inward", () => {
    expect(tooltipAlign(0, 30)).toBe("start");
    expect(tooltipAlign(15, 30)).toBe("center");
    expect(tooltipAlign(29, 30)).toBe("end");
    expect(tooltipAlign(0, 1)).toBe("start");
  });
});

describe("stackHeights", () => {
  it("is proportional to the total and subtracts the 2px surface gaps", () => {
    const heights = stackHeights([2, 2], 4, 100);
    expect(heights[0]! + heights[1]! + 2).toBeCloseTo(100);
    expect(heights[0]).toBeCloseTo(heights[1]!);
  });

  it("keeps tiny non-zero segments visible and zero segments empty", () => {
    const heights = stackHeights([100, 1, 0], 101, 100);
    expect(heights[1]).toBeGreaterThanOrEqual(2);
    expect(heights[2]).toBe(0);
  });

  it("returns zeros for an empty column", () => {
    expect(stackHeights([0, 0], 4, 100)).toEqual([0, 0]);
  });
});

describe("peakIndex", () => {
  it("finds the first maximum", () => {
    expect(peakIndex([1, 4, 4, 2])).toBe(1);
    expect(peakIndex([0, 0])).toBe(-1);
  });
});
