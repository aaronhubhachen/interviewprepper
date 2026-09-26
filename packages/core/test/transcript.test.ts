import { describe, expect, it } from "vitest";
import { evaluateBehavioral } from "../src/spar";
import { analyzeTranscript, heuristicSparScores, overallScore } from "../src/transcript";

const STRONG =
  "Last year at my internship our checkout service was timing out during peak traffic. " +
  "My goal was to cut p99 latency before the holiday launch. " +
  "I profiled the endpoint, found an N+1 database query, and I rewrote it as a single batched query behind a Redis cache. " +
  "We considered sharding instead, but the trade-off in operational cost was not worth it. " +
  "As a result p99 latency dropped from 900 ms to 120 ms and checkout errors fell by 35%.";

const RAMBLING =
  "um so basically we were like working on this project and uh we kind of had this problem you know " +
  "and we tried a bunch of stuff and um we we sort of figured it out anyway so yeah we did it and I like the team " +
  "anyway the thing is we just kept going and like it was fine";

describe("analyzeTranscript", () => {
  it("detects a complete STAR story with metrics and trade-offs", () => {
    const analysis = analyzeTranscript(STRONG, 60_000);
    expect(analysis.star.situation.present).toBe(true);
    expect(analysis.star.task.present).toBe(true);
    expect(analysis.star.action.present).toBe(true);
    expect(analysis.star.result.present).toBe(true);
    expect(analysis.star.result.evidence).toContain("As a result");
    expect(analysis.hasMetrics).toBe(true);
    expect(analysis.metrics).toEqual(expect.arrayContaining(["900 ms", "35%"]));
    expect(analysis.tradeoffMentions).toBeGreaterThanOrEqual(2);
    expect(analysis.technicalTerms).toBeGreaterThanOrEqual(5);
    expect(analysis.wpm).toBe(analysis.wordCount);
    expect(analysis.fillerCount).toBe(0);
  });

  it("does not mistake a goal with an outcome verb for the Result", () => {
    const goalOnly = analyzeTranscript("My goal was to cut p99 latency before launch. I profiled the service and rewrote the query.", 20_000);
    expect(goalOnly.star.task.present).toBe(true);
    expect(goalOnly.star.result.present).toBe(false);
    const withOutcome = analyzeTranscript(
      "My goal was to cut p99 latency before launch. I profiled the service and rewrote the query. Latency dropped to 120 ms.",
      20_000,
    );
    expect(withOutcome.star.result.evidence).toContain("Latency dropped");
  });

  it("counts fillers but not literal uses of like / kind of", () => {
    const analysis = analyzeTranscript(RAMBLING, 30_000);
    const counts = Object.fromEntries(analysis.fillers.map((filler) => [filler.word, filler.count]));
    expect(counts).toMatchObject({ um: 2, uh: 1, basically: 1, like: 2, "kind of": 1, "sort of": 1, "you know": 1 });
    expect(analysis.fillerRate).toBeGreaterThan(10);
    expect(analyzeTranscript("I like this kind of problem and what kind of cache", 10_000).fillerCount).toBe(0);
  });

  it("measures ownership from I vs we", () => {
    const analysis = analyzeTranscript(RAMBLING, 30_000);
    expect(analysis.weStatements).toBeGreaterThan(analysis.iStatements);
    expect(analysis.ownershipRatio).toBeLessThan(0.3);
    expect(analyzeTranscript("they were happy and well rested", 5_000).weStatements).toBe(0);
  });

  it("flags rambling", () => {
    const longSentence = `I ${"really ".repeat(50)}tried.`;
    expect(analyzeTranscript(longSentence, 20_000).rambleFlags[0]).toMatch(/word sentence/);
    expect(analyzeTranscript(RAMBLING, 200_000).rambleFlags).toEqual(
      expect.arrayContaining([expect.stringMatching(/2\.5 minutes/), expect.stringMatching(/tangent/)]),
    );
  });

  it("handles an empty transcript", () => {
    const analysis = analyzeTranscript("", 0);
    expect(analysis).toMatchObject({ wordCount: 0, wpm: 0, fillerRate: 0, ownershipRatio: 0, hasMetrics: false });
    expect(heuristicSparScores(analysis)).toEqual({ conciseness: 0, star: 0, ownership: 0, technicalDepth: 0, impact: 0, clarity: 0 });
  });
});

describe("heuristicSparScores", () => {
  it("scores a strong answer above a rambling one on every axis but conciseness", () => {
    const strong = heuristicSparScores(analyzeTranscript(STRONG, 60_000));
    const weak = heuristicSparScores(analyzeTranscript(RAMBLING, 30_000));
    expect(strong.star).toBe(100);
    expect(strong.impact).toBe(100);
    expect(strong.ownership).toBeGreaterThan(weak.ownership);
    expect(strong.technicalDepth).toBeGreaterThan(weak.technicalDepth);
    expect(strong.clarity).toBeGreaterThan(weak.clarity);
    expect(overallScore(strong)).toBeGreaterThan(overallScore(weak));
    for (const value of Object.values(strong)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });
});

describe("evaluateBehavioral (heuristic)", () => {
  it("coaches a weak answer toward STAR with a probing follow-up", async () => {
    const feedback = await evaluateBehavioral({ question: "Tell me about a hard project.", transcript: RAMBLING, durationMs: 30_000 }, { useLlm: false });
    expect(feedback.source).toBe("heuristic");
    expect(feedback.improvements.length).toBeGreaterThan(0);
    expect(feedback.improvements.join(" ")).toMatch(/Task|Result|Action/);
    expect(feedback.followUp).toBe("What was the measurable outcome, and how did you know it worked?");
    expect(feedback.starBreakdown.result.present).toBe(false);
    expect(feedback.rewrittenOpening.split(/(?<=\.)\s/).length).toBeGreaterThanOrEqual(2);
    expect(feedback.overall).toBe(overallScore(feedback.scores));
  });

  it("praises a strong answer and falls back to the question's follow-ups", async () => {
    const feedback = await evaluateBehavioral(
      {
        question: {
          id: "bq-test",
          prompt: "Tell me about a performance win.",
          competency: "Impact",
          followUps: ["How did you validate the fix in production?"],
          lookFor: [],
          redFlags: [],
        },
        transcript: STRONG,
        durationMs: 60_000,
      },
      { useLlm: false },
    );
    expect(feedback.strengths.join(" ")).toMatch(/STAR|quantified/);
    expect(feedback.followUp).toBe("How did you validate the fix in production?");
    expect(feedback.rewrittenOpening).toMatch(/^Last year at my internship/);
  });

  it("uses the heuristic path when no model is configured", async () => {
    const feedback = await evaluateBehavioral({ question: "Q", transcript: STRONG, durationMs: 60_000 });
    expect(feedback.source).toBe("heuristic");
  });
});
