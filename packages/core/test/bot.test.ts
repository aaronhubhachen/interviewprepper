import { describe, expect, it } from "vitest";
import { botChat, BOT_MAX_TRAPS, evaluateBotSession, heuristicBotReport, shouldPlantTrap, type BotSessionInput } from "../src/bot";
import { getProblem } from "../src/content";

const problem = getProblem("p-valid-parentheses")!;

function session(overrides: Partial<BotSessionInput> = {}): BotSessionInput {
  return {
    problem,
    language: "python",
    finalCode: "def isValid(s): return True",
    durationMs: 20 * 60_000,
    messages: [],
    events: [],
    traps: [],
    lastResult: null,
    ...overrides,
  };
}

describe("shouldPlantTrap", () => {
  it("never plants with trap mode off or the budget spent", () => {
    expect(shouldPlantTrap(false, 0, () => 0)).toBe(false);
    expect(shouldPlantTrap(true, BOT_MAX_TRAPS, () => 0)).toBe(false);
  });

  it("is likelier for the first trap than the second", () => {
    expect(shouldPlantTrap(true, 0, () => 0.5)).toBe(true);
    expect(shouldPlantTrap(true, 1, () => 0.5)).toBe(false);
  });
});

describe("offline bot", () => {
  it("answers with hints from the problem, never code", async () => {
    const reply = await botChat({ problem, language: "python", code: "", messages: [{ role: "user", content: "what edge cases break this?" }], plantTrap: true }, { useLlm: false });
    expect(reply.source).toBe("heuristic");
    expect(reply.trap.planted).toBe(false);
    expect(reply.reply).not.toContain("```");
  });
});

describe("heuristicBotReport", () => {
  it("credits pushing back on a planted bug and a passing submit", () => {
    const report = heuristicBotReport(
      session({
        messages: [
          { role: "user", content: "Can you write a stack solution?" },
          { role: "assistant", content: "```python\ndef isValid(s): ...\n```" },
          { role: "user", content: "This fails on '((' , there's a bug: you never check the stack is empty at the end." },
        ],
        events: [
          { at: 1_000, kind: "prompt", detail: "Can you write a stack solution?" },
          { at: 30_000, kind: "insert", detail: "12 lines" },
          { at: 60_000, kind: "run", passed: 4, total: 5 },
          { at: 90_000, kind: "submit", passed: 9, total: 9 },
        ],
        traps: [{ messageIndex: 1, description: "Returns true without checking the stack is empty." }],
        lastResult: { status: "accepted", passed: 9, total: 9 },
      }),
    );
    expect(report.traps[0]).toMatchObject({ caught: true });
    expect(report.dimensions.find((d) => d.key === "outcome")?.score).toBe(100);
    expect(report.highlights.some((h) => h.kind === "good")).toBe(true);
  });

  it("flags blind trust: asked for code first, never ran tests, missed the bug", () => {
    const report = heuristicBotReport(
      session({
        messages: [
          { role: "user", content: "solve it" },
          { role: "assistant", content: "```python\n...\n```" },
          { role: "user", content: "thanks" },
        ],
        events: [
          { at: 1_000, kind: "prompt", detail: "solve it" },
          { at: 5_000, kind: "insert", detail: "10 lines" },
        ],
        traps: [{ messageIndex: 1, description: "Off-by-one." }],
      }),
    );
    expect(report.traps[0]!.caught).toBe(false);
    expect(report.highlights.map((h) => h.text).join(" ")).toMatch(/never ran the tests/);
    expect(report.overall).toBeLessThan(50);
  });

  it("falls back without an LLM", async () => {
    await expect(evaluateBotSession(session(), { useLlm: false })).resolves.toMatchObject({ source: "heuristic" });
  });
});
