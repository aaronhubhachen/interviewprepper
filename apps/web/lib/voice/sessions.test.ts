import { analyzeTranscript, heuristicSparScores, overallScore } from "@synapse/core/transcript";
import { describe, expect, it } from "vitest";
import type { BehavioralFeedback, SparSessionSummary } from "@/lib/types";
import { historySummary } from "@/components/spar/SessionHistory";
import {
  comparisonFor,
  mergePracticeStats,
  mergeSessions,
  pickSurprise,
  practiceStats,
  practiceSummary,
  practiceTotals,
  resultFromSession,
  scoreTrend,
  sessionFromResult,
} from "./sessions";

function feedback(overall: number): BehavioralFeedback {
  const analysis = analyzeTranscript("At my last job I fixed the cache.", 10_000);
  const scores = heuristicSparScores(analysis);
  return {
    scores: { ...scores, star: overall },
    overall,
    strengths: [],
    improvements: [],
    starBreakdown: {
      situation: { present: true, evidence: null, note: "" },
      task: { present: false, evidence: null, note: "" },
      action: { present: true, evidence: null, note: "" },
      result: { present: false, evidence: null, note: "" },
    },
    rewrittenOpening: "",
    followUp: "What was the outcome?",
    analysis,
    source: "heuristic",
  };
}

function session(id: number, questionId: string, createdAt: number, overall: number, round: 1 | 2 = 1): SparSessionSummary {
  const fb = feedback(overall);
  return {
    id,
    questionId,
    questionPrompt: `Prompt for ${questionId}`,
    competency: "Ownership",
    round,
    followUpOf: round === 2 ? "What was the outcome?" : null,
    durationMs: 60_000,
    overall,
    scores: fb.scores,
    transcript: "At my last job I fixed the cache.",
    feedback: fb,
    createdAt,
  };
}

describe("session view models", () => {
  it("round-trips a session through the result view", () => {
    const original = session(7, "bq-a", 1000, 64);
    const view = resultFromSession(original);
    expect(view).toMatchObject({ sessionId: 7, questionId: "bq-a", round: 1, followUpOf: null });
    expect(sessionFromResult(view)).toEqual(original);
  });

  it("merges a fresh session newest-first without duplicates", () => {
    const merged = mergeSessions([session(2, "bq-a", 2000, 50), session(1, "bq-a", 1000, 40)], session(3, "bq-b", 3000, 70));
    expect(merged.map((s) => s.id)).toEqual([3, 2, 1]);
    expect(mergeSessions(merged, session(3, "bq-b", 3000, 71)).map((s) => s.id)).toEqual([3, 2, 1]);
  });

  it("compares a follow-up with its main answer, and a main answer with the last attempt", () => {
    const sessions = [
      session(4, "bq-a", 4000, 80, 2),
      session(3, "bq-a", 3000, 70),
      session(2, "bq-b", 2000, 20),
      session(1, "bq-a", 1000, 40),
    ];
    const followUp = comparisonFor(resultFromSession(sessions[0]!), sessions);
    expect(followUp).toMatchObject({ label: "Main answer", sessionId: 3, overall: 70 });
    const second = comparisonFor(resultFromSession(sessions[1]!), sessions);
    expect(second).toMatchObject({ label: "Last attempt", sessionId: 1 });
    expect(comparisonFor(resultFromSession(sessions[3]!), sessions)).toBeNull();
  });

  it("aggregates practice per question", () => {
    const stats = practiceStats([session(1, "bq-a", 1000, 40), session(2, "bq-a", 3000, 75), session(3, "bq-b", 2000, 60)]);
    expect(stats.get("bq-a")).toEqual({ count: 2, best: 75, lastAt: 3000 });
    expect(stats.get("bq-b")?.count).toBe(1);
    expect(stats.get("bq-c")).toBeUndefined();
  });

  it("keeps practice from sessions older than the history window", () => {
    // 32 sessions over 16 questions (round 1 + follow-up each); the history list only holds the latest 30.
    const all = Array.from({ length: 32 }, (_, index) => session(index + 1, `bq-${Math.floor(index / 2)}`, 1000 * (index + 1), 50 + (index % 7)));
    const recent = [...all].reverse().slice(0, 30);
    const totals = practiceTotals(all);
    expect(totals.throughId).toBe(32);

    // From the truncated list alone, the first question looks brand new.
    expect(practiceStats(recent).has("bq-0")).toBe(false);
    const stats = mergePracticeStats(totals, recent);
    expect(stats.get("bq-0")).toEqual({ count: 2, best: 51, lastAt: 2000 });
    expect(pickSurprise([{ id: "bq-0" }, { id: "bq-new" }], stats, () => 0)?.id).toBe("bq-new");
    expect(practiceSummary(stats)).toEqual({ count: 32, best: 56 });

    // A session answered after page load is added on top, once.
    const fresh = session(33, "bq-0", 99_000, 90);
    const after = mergePracticeStats(totals, mergeSessions(recent, fresh));
    expect(after.get("bq-0")).toEqual({ count: 3, best: 90, lastAt: 99_000 });
    expect(practiceSummary(after).count).toBe(33);

    // Without server totals it falls back to the list.
    expect(mergePracticeStats(null, recent)).toEqual(practiceStats(recent));
  });

  it("labels the history header with every answer, or as recent without totals", () => {
    const recent = [session(2, "bq-a", 2000, 70), session(1, "bq-a", 1000, 40)];
    expect(historySummary(recent, { count: 32, best: 88 })).toBe("32 answers · best 88");
    expect(historySummary(recent, null)).toBe("2 recent answers · best 70");
    expect(historySummary([], null)).toBeNull();
  });

  it("surprises with the least-practiced question and skips the current one", () => {
    const questions = [{ id: "bq-a" }, { id: "bq-b" }, { id: "bq-c" }];
    const stats = practiceStats([session(1, "bq-a", 1000, 40), session(2, "bq-b", 1000, 40)]);
    expect(pickSurprise(questions, stats, () => 0.99)?.id).toBe("bq-c");
    expect(pickSurprise(questions, new Map(), () => 0, "bq-a")?.id).toBe("bq-b");
    expect(pickSurprise([{ id: "bq-a" }], new Map(), () => 0.5, "bq-a")?.id).toBe("bq-a");
    expect(pickSurprise([], new Map())).toBeNull();
  });

  it("orders the score trend oldest to newest", () => {
    const trend = scoreTrend([session(3, "bq-a", 3000, 70), session(1, "bq-a", 1000, 40), session(2, "bq-a", 2000, 55)], 2);
    expect(trend.map((point) => point.overall)).toEqual([55, 70]);
  });

  it("uses the same overall math as core", () => {
    const fb = feedback(50);
    expect(overallScore(fb.scores)).toBeGreaterThanOrEqual(0);
  });
});
