import { describe, expect, it } from "vitest";
import type { IntervalPreview, ReviewState } from "@synapse/core/sm2";
import type { QueueCounts, ReviewEvaluateResponse, ReviewGradeResponse, ReviewNextCard, ReviewNextEmpty } from "@/lib/types";
import {
  currentTurn,
  gradedMessage,
  inferDayMs,
  initialSession,
  isDemoDayMs,
  reviewedCount,
  sessionReducer,
  type SessionAction,
  type SessionState,
} from "./session";

const QUEUE: QueueCounts = { dueNow: 2, newToday: 1, newPerDay: 8, newRemaining: 7, nextDueAt: null };

function state(intervalDays: number): ReviewState {
  return { repetition: 1, intervalDays, easeFactor: 2.5, dueAt: 0, lapses: 0, phase: "review", lastReviewedAt: 0 };
}

function preview(dayMs: number): Record<"love" | "like" | "dislike", IntervalPreview> {
  return {
    love: { rating: "love", grade: 5, next: state(4), delayMs: 4 * dayMs, label: "4d" },
    like: { rating: "like", grade: 3, next: state(1), delayMs: dayMs, label: "1d" },
    dislike: { rating: "dislike", grade: 1, next: state(0), delayMs: 600_000, label: "10m" },
  };
}

function nextCard(id: string): ReviewNextCard {
  return {
    card: { id, kind: "micro", title: `Card ${id}`, prompt: "Why?", hint: "Think.", tags: ["hashing"], difficulty: 1 },
    reason: "due",
    weakTags: [],
    state: { phase: "review", repetition: 1, intervalDays: 1, easeFactor: 2.5, dueAt: 0, lapses: 0, lastReviewedAt: 0 },
    preview: preview(86_400_000),
    queue: QUEUE,
  };
}

function evaluation(cardId: string): ReviewEvaluateResponse {
  return {
    cardId,
    evaluation: { verdict: "partial", nailed: ["a"], missed: ["b"], feedback: "Close.", suggestedGrade: 3, source: "heuristic" },
    answerKey: "Because.",
    explanation: "Deeper.",
    keyPoints: ["a", "b"],
    preview: preview(86_400_000),
    suggestedRating: "like",
  };
}

function graded(cardId: string, rating: "love" | "like" | "dislike"): ReviewGradeResponse {
  return {
    cardId,
    grade: rating === "love" ? 5 : rating === "like" ? 3 : 1,
    rating,
    nextLabel: "1d",
    dueAt: 1,
    intervalDays: 1,
    easeFactor: 2.5,
    phase: "review",
    lapses: 0,
    wasNew: false,
    reviewId: 1,
    queue: { ...QUEUE, dueNow: 1 },
    stats: { dueNow: 1, reviewedToday: 1, streakDays: 1, cardsLearned: 1, retention30d: 1 },
  };
}

function run(actions: SessionAction[], start: SessionState = initialSession()): SessionState {
  return actions.reduce(sessionReducer, start);
}

describe("sessionReducer", () => {
  it("walks the full loop: card → answer → feedback → tapback → next", () => {
    let s = run([{ type: "card", next: nextCard("mc-1") }]);
    expect(s.phase).toBe("answering");
    expect(currentTurn(s)?.next.card.id).toBe("mc-1");

    s = run([{ type: "hint" }, { type: "submit", answer: "hash map", gaveUp: false }], s);
    expect(s.phase).toBe("evaluating");
    expect(currentTurn(s)).toMatchObject({ hintShown: true, answer: "hash map" });

    s = sessionReducer(s, { type: "evaluated", evaluation: evaluation("mc-1") });
    expect(s.phase).toBe("rating");

    s = sessionReducer(s, { type: "rate", rating: "like" });
    expect(s.phase).toBe("grading");
    s = sessionReducer(s, { type: "graded", result: graded("mc-1", "like"), at: 42 });
    expect(s.phase).toBe("graded");
    expect(s.tally).toEqual({ love: 0, like: 1, dislike: 0 });
    expect(s.queue?.dueNow).toBe(1);
    expect(s.turns[0]).toMatchObject({ rating: "like", gradedAt: 42 });
    expect(currentTurn(s)).toBeUndefined();
    expect(reviewedCount(s)).toBe(1);

    s = run([{ type: "load" }, { type: "card", next: nextCard("mc-1") }], s);
    expect(s.turns).toHaveLength(2);
    expect(s.turns[0]!.key).not.toBe(s.turns[1]!.key);
  });

  it("ignores out-of-phase and stale responses", () => {
    const s = run([{ type: "card", next: nextCard("mc-1") }]);
    expect(sessionReducer(s, { type: "rate", rating: "love" })).toBe(s);
    expect(sessionReducer(s, { type: "evaluated", evaluation: evaluation("mc-1") })).toBe(s);
    const evaluating = sessionReducer(s, { type: "submit", answer: "x", gaveUp: false });
    expect(sessionReducer(evaluating, { type: "evaluated", evaluation: evaluation("mc-other") })).toBe(evaluating);
    expect(sessionReducer(evaluating, { type: "hint" })).toBe(evaluating);
  });

  it("returns to the composer when evaluation fails and to the tapbacks when grading fails", () => {
    let s = run([
      { type: "card", next: nextCard("mc-1") },
      { type: "submit", answer: "x", gaveUp: false },
    ]);
    s = sessionReducer(s, { type: "error", scope: "evaluate", message: "offline" });
    expect(s.phase).toBe("answering");
    expect(currentTurn(s)?.answer).toBeNull();
    expect(s.error?.message).toBe("offline");

    s = run(
      [
        { type: "submit", answer: "x", gaveUp: false },
        { type: "evaluated", evaluation: evaluation("mc-1") },
        { type: "rate", rating: "love" },
      ],
      s,
    );
    s = sessionReducer(s, { type: "error", scope: "grade", message: "nope" });
    expect(s.phase).toBe("rating");
    expect(currentTurn(s)?.rating).toBeNull();
  });

  it("skips cards into the exclude list", () => {
    const s = run([{ type: "card", next: nextCard("mc-1") }, { type: "skip" }]);
    expect(s.phase).toBe("loading");
    expect(s.skipped).toEqual(["mc-1"]);
    expect(s.turns[0]!.skipped).toBe(true);
  });

  it("ends when the queue is empty and switches to bonus mode on request", () => {
    const empty: ReviewNextEmpty = { card: null, nextDueAt: 5, nextDueIn: "3 hr", queue: QUEUE };
    let s = run([{ type: "empty", empty }]);
    expect(s).toMatchObject({ phase: "done", exhausted: false, mode: "due" });
    s = run([{ type: "bonus" }], s);
    expect(s).toMatchObject({ phase: "loading", mode: "bonus", empty: null });
    s = run([{ type: "empty", empty }], s);
    expect(s.exhausted).toBe(true);
  });

  it("surfaces load errors", () => {
    const s = run([{ type: "error", scope: "next", message: "down" }]);
    expect(s.phase).toBe("error");
    expect(run([{ type: "load" }], s).error).toBeNull();
  });
});

describe("helpers", () => {
  it("infers the SRS day length from a preview", () => {
    expect(inferDayMs(preview(86_400_000))).toBe(86_400_000);
    expect(inferDayMs(preview(60_000))).toBe(60_000);
    expect(inferDayMs(null)).toBeNull();
    expect(isDemoDayMs(60_000)).toBe(true);
    expect(isDemoDayMs(86_400_000)).toBe(false);
    expect(isDemoDayMs(null)).toBe(false);
  });

  it("writes plain-text confirmations", () => {
    expect(gradedMessage("love", "4d")).toContain("returns in 4d");
    expect(gradedMessage("dislike", "10m")).toContain("10m");
  });
});
