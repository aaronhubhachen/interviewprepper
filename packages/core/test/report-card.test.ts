import { describe, expect, it } from "vitest";
import { buildReportCard, formatReportCardText } from "../src/report-card";
import type { Stats } from "../src/store/types";

const DAY = 86_400_000;
const NOW = 100 * DAY;

function stats(overrides: Partial<Stats> = {}): Stats {
  const reviewsByDay = Array.from({ length: 30 }, (_, i) => ({ dayKey: `d${i}`, reviews: i >= 23 ? 10 : i >= 16 ? 4 : 0, passed: i >= 23 ? 8 : 3 }));
  return {
    streakDays: 9,
    reviewsByDay,
    weakTags: [{ tag: "dp_1d", label: "1D DP", score: 2, lastFlaggedAt: NOW, source: "review" }],
    trends: {
      bot: [
        { score: 50, at: NOW - 10 * DAY, subject: null },
        { score: 70, at: NOW - 2 * DAY, subject: null },
        { score: 80, at: NOW - DAY, subject: null },
      ],
      grill: [{ score: 60, at: NOW - 3 * DAY, subject: "Resume" }],
      spar: [],
      mock: [],
      design: [],
    },
    ...overrides,
  } as unknown as Stats;
}

describe("weekly report card", () => {
  it("compares this week with last week", () => {
    const card = buildReportCard(stats(), NOW);
    expect(card).toMatchObject({ streakDays: 9, activeDays: 7, reviews: 70, reviewsDelta: 42, accuracy: 0.8, weakSpots: ["1D DP"] });
    expect(card.aiUse).toEqual({ average: 75, delta: 25, rounds: 2 });
    expect(card.rounds.map((round) => round.kind)).toEqual(["bot", "grill"]);
    expect(card.grade).toBe("A");
  });

  it("handles a quiet week", () => {
    const quiet = stats({ reviewsByDay: Array.from({ length: 30 }, (_, i) => ({ dayKey: `d${i}`, reviews: 0, passed: 0 })), trends: { bot: [], grill: [], spar: [], mock: [], design: [] }, weakTags: [] });
    const card = buildReportCard(quiet, NOW);
    expect(card).toMatchObject({ activeDays: 0, accuracy: null, aiUse: null, grade: "D" });
    expect(formatReportCardText(card)).toContain("No weak spots flagged");
  });

  it("renders plain text for iMessage", () => {
    const text = formatReportCardText(buildReportCard(stats(), NOW), "http://x/report");
    expect(text).toMatch(/^📊 Weekly report card: A/);
    expect(text).toContain("🤖 AI-use score: 75/100 (↑25) over 2 rounds");
    expect(text).not.toMatch(/[*_`#]/);
    expect(text.endsWith("Share card: http://x/report")).toBe(true);
  });
});
