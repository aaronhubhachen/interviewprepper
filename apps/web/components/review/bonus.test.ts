import { describe, expect, it } from "vitest";
import { allCards } from "@synapse/core/content";
import { pickBonusCard, rankBonusCards, type BonusCandidate } from "./bonus";

const CARDS: BonusCandidate[] = [
  { id: "p-hard", kind: "problem", tags: ["hashing"], difficulty: 1 },
  { id: "mc-2", kind: "micro", tags: ["hashing"], difficulty: 2 },
  { id: "mc-1", kind: "micro", tags: ["heap"], difficulty: 1 },
  { id: "mc-3", kind: "micro", tags: ["dp_state_compression"], difficulty: 3 },
];

describe("rankBonusCards", () => {
  it("prefers micro-cards, then easier ones, in registry order", () => {
    expect(rankBonusCards(CARDS, { seen: new Set() }).map((card) => card.id)).toEqual(["mc-1", "mc-2", "mc-3", "p-hard"]);
  });

  it("puts weak tags first", () => {
    const weakScores = new Map([["dp_state_compression", 2]]);
    expect(pickBonusCard(CARDS, { seen: new Set(), weakScores })?.id).toBe("mc-3");
  });

  it("skips seen and excluded cards and honours the tag filter", () => {
    expect(pickBonusCard(CARDS, { seen: new Set(["mc-1"]), exclude: new Set(["mc-2"]) })?.id).toBe("mc-3");
    expect(pickBonusCard(CARDS, { seen: new Set(), tag: "hashing" })?.id).toBe("mc-2");
    expect(pickBonusCard(CARDS, { seen: new Set(CARDS.map((card) => card.id)) })).toBeUndefined();
  });

  it("works on the real registry", () => {
    const first = pickBonusCard(allCards(), { seen: new Set() });
    expect(first?.kind).toBe("micro");
    expect(first?.difficulty).toBe(1);
  });
});
