import { describe, expect, it } from "vitest";
import { newReviewState, previewIntervals, schedulerOptions } from "../src/sm2";
import {
  compactLegend,
  legendLines,
  normalizeTapback,
  parseLegacyTapbackText,
  parseTextGrade,
  tapbackToGrade,
} from "../src/tapback";

describe("normalizeTapback", () => {
  it.each([
    ["❤️", "love"],
    ["❤", "love"],
    ["♥️", "love"],
    ["💙", "love"],
    ["❤️‍🔥", "love"],
    ["👍", "like"],
    ["👍🏽", "like"],
    ["👎", "dislike"],
    ["👎🏿", "dislike"],
    ["‼️", "emphasize"],
    ["‼", "emphasize"],
    ["❓", "question"],
    ["?", "question"],
    ["😂", "laugh"],
  ] as const)("maps emoji %s → %s", (input, kind) => {
    expect(normalizeTapback(input)).toBe(kind);
  });

  it.each([
    ["love", "love"],
    ["Loved", "love"],
    ["LIKE", "like"],
    ["thumbs_up", "like"],
    ["thumbs-down", "dislike"],
    ["+1", "like"],
    ["-1", "dislike"],
    ["disliked", "dislike"],
    ["emphasize", "emphasize"],
    ["Emphasized", "emphasize"],
    ["question", "question"],
    ["laughed at", "laugh"],
    ["haha", "laugh"],
    [" like ", "like"],
  ] as const)("maps name %s → %s", (input, kind) => {
    expect(normalizeTapback(input)).toBe(kind);
  });

  it.each([undefined, null, "", "  ", "hello", "🦄", "❤️ I think it's a hash map"])("ignores %s", (input) => {
    expect(normalizeTapback(input)).toBeUndefined();
  });
});

describe("tapbackToGrade", () => {
  it("maps ratings to SM-2 grades and ignores action tapbacks", () => {
    expect(tapbackToGrade("love")).toBe(5);
    expect(tapbackToGrade("like")).toBe(3);
    expect(tapbackToGrade("dislike")).toBe(1);
    expect(tapbackToGrade("question")).toBeUndefined();
    expect(tapbackToGrade("emphasize")).toBeUndefined();
    expect(tapbackToGrade("laugh")).toBeUndefined();
    expect(tapbackToGrade(undefined)).toBeUndefined();
  });
});

describe("parseTextGrade", () => {
  it.each([
    ["easy", 5],
    ["Effortless!", 5],
    ["3", 5],
    ["❤️", 5],
    ["good", 3],
    ["ok", 3],
    ["OK.", 3],
    ["okay", 3],
    ["hesitant", 3],
    ["hard", 3],
    ["2", 3],
    ["👍", 3],
    ["again", 1],
    ["guessed", 1],
    ["blank", 1],
    ["1", 1],
    ["👎", 1],
  ] as const)("grades %s → %d", (text, grade) => {
    expect(parseTextGrade(text)).toBe(grade);
  });

  it.each(["a hash map and a linked list", "ok so it's a hash map", "4", "", "?", "‼️"])("does not grade %s", (text) => {
    expect(parseTextGrade(text)).toBeUndefined();
  });
});

describe("parseLegacyTapbackText", () => {
  it("reads tapbacks relayed as text", () => {
    expect(parseLegacyTapbackText("Loved “Design an LRU cache…”")).toBe("love");
    expect(parseLegacyTapbackText('Disliked "What is the invariant?"')).toBe("dislike");
    expect(parseLegacyTapbackText("Laughed at “haha”")).toBe("laugh");
    expect(parseLegacyTapbackText("Reacted 👍 to “Design an LRU cache…”")).toBe("like");
    expect(parseLegacyTapbackText("I loved that problem")).toBeUndefined();
  });
});

describe("legend", () => {
  it("renders Anki-style lines from the interval preview", () => {
    const preview = previewIntervals(newReviewState(0), 0, schedulerOptions());
    expect(legendLines(preview)).toEqual(["❤️ Effortless → 4d", "👍 Hesitant → 1d", "👎 Guessed/blank → 10m"]);
    expect(compactLegend(preview)).toBe("❤️ 4d · 👍 1d · 👎 10m");
  });
});
