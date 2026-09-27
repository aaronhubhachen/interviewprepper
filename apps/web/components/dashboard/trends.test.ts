import { describe, expect, it } from "vitest";
import { trendSummary } from "./TrendsCard";

describe("trendSummary", () => {
  it("summarizes the first and latest score with a direction", () => {
    expect(trendSummary([])).toBeNull();
    expect(trendSummary([55])).toEqual({ text: "55", direction: "flat" });
    expect(trendSummary([30, 41, 72])).toEqual({ text: "30 → 72", direction: "up" });
    expect(trendSummary([80, 60])).toEqual({ text: "80 → 60", direction: "down" });
  });
});
