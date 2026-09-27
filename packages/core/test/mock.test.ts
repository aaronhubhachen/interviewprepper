import { describe, expect, it } from "vitest";
import { codingScore, decisionFor, evaluateMockLoop, heuristicPacket, loopScore, type MockLoopInput } from "../src/mock";

const coding = {
  problemTitle: "Two Sum",
  difficulty: "easy",
  language: "Java",
  passed: 8,
  total: 8,
  status: "accepted",
  minutesUsed: 12,
  minutesAllowed: 25,
  aiAllowed: false,
  aiUse: null,
};

const full: MockLoopInput = {
  coding,
  behavioral: { question: "Tell me about a conflict.", competency: "Collaboration", overall: 70, strengths: ["Clear STAR arc."], improvements: ["Quantify the result."] },
  grill: { overall: 50, summary: "Mixed.", held: 1, shaky: 1, cracked: 1 },
};

describe("mock loop scoring", () => {
  it("scores coding by tests, with a small pace bonus and AI-use blend", () => {
    expect(codingScore(coding)).toBe(100);
    expect(codingScore({ ...coding, passed: 4 })).toBe(50);
    expect(codingScore({ ...coding, minutesUsed: 40 })).toBe(90);
    expect(codingScore({ ...coding, aiAllowed: true, aiUse: { overall: 30, summary: "" } })).toBe(72);
  });

  it("weights coding double and maps scores to decisions", () => {
    expect(loopScore(full)).toBe(80);
    expect(decisionFor(80)).toBe("hire");
    expect(decisionFor(90)).toBe("strong_hire");
    expect(decisionFor(30)).toBe("no_hire");
    expect(loopScore({ coding: null, behavioral: null, grill: null })).toBe(0);
  });

  it("writes a heuristic packet naming the weakest round", () => {
    const packet = heuristicPacket(full);
    expect(packet.decision).toBe("hire");
    expect(packet.rounds.map((round) => round.round)).toEqual(["coding", "behavioral", "grill"]);
    expect(packet.toFlip).toMatch(/grill/);
    expect(packet.concerns.join(" ")).toMatch(/cracked/);
  });

  it("falls back without a model", async () => {
    await expect(evaluateMockLoop(full, { useLlm: false })).resolves.toMatchObject({ source: "heuristic", overall: 80 });
  });
});
