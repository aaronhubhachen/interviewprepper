import { describe, expect, it } from "vitest";
import {
  DEFAULT_DAY_MS,
  formatInterval,
  gradeReview,
  isDemoScale,
  newReviewState,
  previewIntervals,
  relearnMs,
  schedulerOptions,
  type Grade,
  type ReviewState,
} from "../src/sm2";

const T0 = Date.UTC(2026, 8, 26, 15, 0);
const DAY = DEFAULT_DAY_MS;
const REAL = schedulerOptions();

/** Grades a fresh card with each grade in turn, reviewing exactly when due. */
function run(grades: Grade[], opts = REAL): ReviewState[] {
  const states: ReviewState[] = [];
  let state = newReviewState(T0);
  let now = T0;
  for (const grade of grades) {
    state = gradeReview(state, grade, now, opts);
    states.push(state);
    now = state.dueAt;
  }
  return states;
}

describe("gradeReview", () => {
  it("starts new cards with SM-2 defaults, due immediately", () => {
    expect(newReviewState(T0)).toEqual({
      repetition: 0,
      intervalDays: 0,
      easeFactor: 2.5,
      dueAt: T0,
      lapses: 0,
      phase: "new",
      lastReviewedAt: null,
    });
  });

  it("follows the canonical SM-2 sequence for grade 4 (1, 6, then × EF)", () => {
    const states = run([4, 4, 4, 4]);
    expect(states.map((s) => s.intervalDays)).toEqual([1, 6, 15, 38]);
    expect(states.every((s) => s.easeFactor === 2.5)).toBe(true);
    expect(states.map((s) => s.repetition)).toEqual([1, 2, 3, 4]);
  });

  it("uses the previous ease factor for the interval and lowers EF on hesitant recalls", () => {
    const states = run([3, 3, 3]);
    expect(states.map((s) => s.intervalDays)).toEqual([1, 6, Math.round(6 * 2.22)]);
    expect(states.map((s) => s.easeFactor)).toEqual([2.36, 2.22, 2.08]);
  });

  it("distinguishes ❤️ from 👍 on the first review via the easy graduating interval and bonus", () => {
    const [firstEasy] = run([5]);
    const [firstGood] = run([3]);
    expect(firstEasy!.intervalDays).toBe(4);
    expect(firstGood!.intervalDays).toBe(1);

    const easy = run([5, 5, 5]);
    expect(easy.map((s) => s.intervalDays)).toEqual([4, Math.round(6 * 1.3), Math.round(8 * 2.7 * 1.3)]);
    expect(easy.map((s) => s.easeFactor)).toEqual([2.6, 2.7, 2.8]);
  });

  it("sets dueAt from the injected clock and marks passing cards as review", () => {
    const state = gradeReview(newReviewState(T0), 3, T0 + 5_000, REAL);
    expect(state.dueAt).toBe(T0 + 5_000 + DAY);
    expect(state.phase).toBe("review");
    expect(state.lastReviewedAt).toBe(T0 + 5_000);
  });

  it("sends a lapsed review card to a sub-day relearning step and counts the lapse", () => {
    const [, learned] = run([4, 4]);
    const lapsed = gradeReview(learned!, 1, T0, REAL);
    expect(lapsed).toMatchObject({ repetition: 0, intervalDays: 0, lapses: 1, phase: "relearning" });
    expect(lapsed.dueAt).toBe(T0 + 10 * 60_000);
    expect(lapsed.easeFactor).toBe(1.96);

    const failedAgain = gradeReview(lapsed, 1, lapsed.dueAt, REAL);
    expect(failedAgain.lapses).toBe(1);
    expect(failedAgain.phase).toBe("relearning");

    const recovered = gradeReview(failedAgain, 3, failedAgain.dueAt, REAL);
    expect(recovered).toMatchObject({ repetition: 1, intervalDays: 1, phase: "review" });
  });

  it("keeps never-learned cards in learning without counting lapses", () => {
    const failed = gradeReview(newReviewState(T0), 0, T0, REAL);
    expect(failed).toMatchObject({ phase: "learning", lapses: 0, repetition: 0 });
  });

  it("never lets the ease factor drop below 1.3", () => {
    const states = run([0, 0, 0, 0, 0, 0]);
    expect(Math.min(...states.map((s) => s.easeFactor))).toBe(1.3);
    expect(states.at(-1)!.easeFactor).toBe(1.3);
  });

  it("is pure and deterministic", () => {
    const state = run([4, 4])[1]!;
    const snapshot = structuredClone(state);
    const a = gradeReview(state, 5, T0 + DAY, REAL);
    const b = gradeReview(state, 5, T0 + DAY, REAL);
    expect(a).toEqual(b);
    expect(state).toEqual(snapshot);
  });

  it("scales every interval with SYNAPSE_DAY_MS for demos", () => {
    const demo = schedulerOptions(60_000);
    const passed = gradeReview(newReviewState(T0), 5, T0, demo);
    expect(passed.dueAt - T0).toBe(4 * 60_000);
    const failed = gradeReview(newReviewState(T0), 1, T0, demo);
    expect(failed.dueAt - T0).toBe(15_000);
  });
});

describe("relearnMs & demo scale", () => {
  it("is 10 minutes at real scale with a 15 s floor", () => {
    expect(relearnMs(DAY)).toBe(600_000);
    expect(relearnMs(60_000)).toBe(15_000);
    expect(relearnMs(10 * DAY)).toBe(6_000_000);
  });

  it("detects demo scale below one hour per SRS day", () => {
    expect(isDemoScale(60_000)).toBe(true);
    expect(isDemoScale(DAY)).toBe(false);
  });
});

describe("previewIntervals & formatInterval", () => {
  it("shows Anki-style labels for each tapback on a new card", () => {
    const preview = previewIntervals(newReviewState(T0), T0, REAL);
    expect(preview.love.label).toBe("4d");
    expect(preview.like.label).toBe("1d");
    expect(preview.dislike.label).toBe("10m");
    expect(preview.love.grade).toBe(5);
    expect(preview.like.next.dueAt).toBe(T0 + DAY);
  });

  it("keeps labels in SRS units at demo scale", () => {
    const preview = previewIntervals(newReviewState(T0), T0, schedulerOptions(60_000));
    expect(preview.love.label).toBe("4d");
    expect(preview.love.delayMs).toBe(240_000);
    expect(preview.dislike.label).toBe("6h");
  });

  it("formats minutes, hours, days, months and years", () => {
    expect(formatInterval(10 / 1440)).toBe("10m");
    expect(formatInterval(0.25)).toBe("6h");
    expect(formatInterval(6)).toBe("6d");
    expect(formatInterval(45)).toBe("1.5mo");
    expect(formatInterval(400)).toBe("1.1y");
  });
});
