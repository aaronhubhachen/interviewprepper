import { describe, expect, it } from "vitest";
import { allCards } from "@synapse/core/content";
import { describeEvent, splitLeadingEmoji, tapbackForGrade } from "./feed";
import { retentionBand, sortMastery, summarizeForecast, weakSeverity, weakWhy } from "./insights";

describe("splitLeadingEmoji", () => {
  it("splits emoji-led store titles", () => {
    expect(splitLeadingEmoji("🧠 Two Sum → 4d")).toEqual({ emoji: "🧠", rest: "Two Sum → 4d" });
    expect(splitLeadingEmoji("⚠️ Weak spot: Bitmask DP")).toEqual({ emoji: "⚠️", rest: "Weak spot: Bitmask DP" });
    expect(splitLeadingEmoji("▶️ Resumed texts")).toEqual({ emoji: "▶️", rest: "Resumed texts" });
    expect(splitLeadingEmoji("Plain title")).toEqual({ emoji: null, rest: "Plain title" });
  });
});

describe("tapbackForGrade", () => {
  it("maps SM-2 grades back to tapbacks", () => {
    expect(tapbackForGrade(5).emoji).toBe("❤️");
    expect(tapbackForGrade(4).emoji).toBe("👍");
    expect(tapbackForGrade(3).emoji).toBe("👍");
    expect(tapbackForGrade(1).emoji).toBe("👎");
    expect(tapbackForGrade(0).emoji).toBe("👎");
  });
});

describe("describeEvent", () => {
  const micro = allCards().find((card) => card.kind === "micro")!;
  const problem = allCards().find((card) => card.kind === "problem")!;

  it("renders reviews with the source icon, card title, tapback, and next interval", () => {
    const row = describeEvent({
      id: 1,
      kind: "review",
      title: `🧠 ${micro.title} → 4d`,
      detail: { cardId: micro.id, grade: 5, source: "imessage", verdict: "correct", nextLabel: "4d" },
      createdAt: 10,
    });
    expect(row).toMatchObject({
      icon: "💬",
      iconLabel: "Reviewed via iMessage",
      title: micro.title,
      detail: "via iMessage · returns in 4d",
      tapback: { emoji: "❤️", label: "Effortless" },
      href: null,
    });
  });

  it("links problem reviews to the IDE and survives unknown cards", () => {
    const linked = describeEvent({
      id: 2,
      kind: "review",
      title: `🔁 ${problem.title} → 10m`,
      detail: { cardId: problem.id, grade: 1, source: "ide", nextLabel: "10m" },
      createdAt: 10,
    });
    expect(linked.href).toBe(`/practice/${problem.id}`);
    expect(linked.tapback?.emoji).toBe("👎");

    const orphan = describeEvent({
      id: 3,
      kind: "review",
      title: "🧠 Retired card → 6d",
      detail: { cardId: "mc-gone" },
      createdAt: 10,
    });
    expect(orphan.title).toBe("Retired card");
    expect(orphan.tapback).toBeNull();
  });

  it("uses the emoji-led title for other kinds", () => {
    const weak = describeEvent({
      id: 4,
      kind: "weak_flag",
      title: "⚠️ Weak spot: Bitmask DP",
      detail: { tags: ["dp_state_compression"], source: "ide" },
      createdAt: 10,
    });
    expect(weak).toMatchObject({ icon: "⚠️", title: "Weak spot: Bitmask DP", detail: "from the IDE" });

    const attempt = describeEvent({
      id: 5,
      kind: "ide_attempt",
      title: `🧩 ${problem.title} · Code`,
      detail: { problemId: problem.id, stage: "code", passed: false, struggled: true },
      createdAt: 10,
    });
    expect(attempt).toMatchObject({ icon: "🧩", detail: "struggled", href: `/practice/${problem.id}` });

    expect(describeEvent({ id: 6, kind: "mystery", title: "Something", detail: null, createdAt: 1 }).icon).toBe("•");
  });
});

describe("insights", () => {
  it("bands weakness and explains it", () => {
    expect(weakSeverity(3)).toBe("high");
    expect(weakSeverity(1)).toBe("medium");
    expect(weakSeverity(0.4)).toBe("low");
    expect(weakWhy("ide").text).toMatch(/IDE/);
    expect(weakWhy("unknown").icon).toBe("⚠️");
  });

  it("sorts mastery by progress, then label", () => {
    const sorted = sortMastery([
      { tag: "b", label: "B", cards: 3, learned: 0, mastered: 0, progress: 0, weakScore: 0 },
      { tag: "a", label: "A", cards: 3, learned: 0, mastered: 0, progress: 0, weakScore: 0 },
      { tag: "c", label: "C", cards: 3, learned: 1, mastered: 0, progress: 0.2, weakScore: 0 },
    ]);
    expect(sorted.map((entry) => entry.tag)).toEqual(["c", "a", "b"]);
  });

  it("summarizes the forecast", () => {
    const summary = summarizeForecast([
      { label: "Today", count: 2 },
      { label: "Tmrw", count: 5 },
      { label: "Mon", count: 1 },
      ...Array.from({ length: 11 }, () => ({ label: "x", count: 1 })),
    ]);
    expect(summary.peak).toEqual({ label: "Tmrw", count: 5 });
    expect(summary.nextWeek).toBe(12);
    expect(summary.total).toBe(19);
    expect(summarizeForecast([{ label: "Today", count: 0 }]).peak).toBeNull();
  });

  it("bands retention", () => {
    expect(retentionBand(null)).toBe("none");
    expect(retentionBand(0.9)).toBe("strong");
    expect(retentionBand(0.75)).toBe("ok");
    expect(retentionBand(0.5)).toBe("weak");
  });
});
