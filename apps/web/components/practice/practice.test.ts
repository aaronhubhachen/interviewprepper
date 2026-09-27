import { describe, expect, it } from "vitest";
import { listProblems } from "@synapse/core/content";
import type { Evaluation } from "@synapse/core/grading";
import type { PracticeAttemptResponse } from "@/lib/types";
import { inlineToText, parseInline, parseMarkdown } from "./markdown-parser";
import {
  bestSubmit,
  canGiveUp,
  codeAttemptRequest,
  drillMessage,
  evaluationRetry,
  joinLabels,
  flaggedTags,
  hintsUsed,
  latestSchedule,
  newSession,
  parseSession,
  sessionReducer,
  stageStatus,
  syncFromResponse,
  textAttemptRequest,
  unsavedSync,
  type PracticeSession,
  type SessionAction,
  type TextStageResult,
} from "./session";
import { filterProblems, parseFilters, filtersToQuery, recommendProblem, problemStatus } from "./filters";
import type { ProblemSummary } from "@/lib/types";

describe("parseMarkdown", () => {
  it("parses paragraphs with inline code and bold", () => {
    const blocks = parseMarkdown("Given a string `s`, return the **longest substring**.\n\nA substring is contiguous.");
    expect(blocks).toEqual([
      {
        type: "paragraph",
        children: [
          { type: "text", text: "Given a string " },
          { type: "code", text: "s" },
          { type: "text", text: ", return the " },
          { type: "strong", children: [{ type: "text", text: "longest substring" }] },
          { type: "text", text: "." },
        ],
      },
      { type: "paragraph", children: [{ type: "text", text: "A substring is contiguous." }] },
    ]);
  });

  it("parses headings, lists and fenced code", () => {
    const blocks = parseMarkdown("## Notes\n- one\n- two *three*\n\n1. first\n2. second\n\n```js\nconst x = 1 * 2;\n```");
    expect(blocks.map((b) => b.type)).toEqual(["heading", "list", "list", "code"]);
    expect(blocks[1]).toMatchObject({ type: "list", ordered: false, items: [[{ text: "one" }], [{ text: "two " }, { type: "em" }]] });
    expect(blocks[2]).toMatchObject({ type: "list", ordered: true, start: 1 });
    expect(blocks[3]).toEqual({ type: "code", language: "js", text: "const x = 1 * 2;" });
  });

  it("never treats spaced asterisks or snake_case as emphasis", () => {
    expect(inlineToText(parseInline("0 <= n <= 5 * 10^4"))).toBe("0 <= n <= 5 * 10^4");
    expect(parseInline("use dp_state_compression here")).toEqual([{ type: "text", text: "use dp_state_compression here" }]);
    expect(parseInline("a * b * c")).toEqual([{ type: "text", text: "a * b * c" }]);
  });

  it("renders constraint typography and superscripts outside code only", () => {
    expect(parseInline("1 <= s.length <= 5 * 10^4", { superscript: true, typography: true })).toEqual([
      { type: "text", text: "1 ≤ s.length ≤ 5 * " },
      { type: "sup", base: "10", exponent: "4" },
    ]);
    expect(parseInline("`a <= b`", { typography: true })).toEqual([{ type: "code", text: "a <= b" }]);
  });

  it("only links http(s) URLs", () => {
    expect(parseInline("[ok](https://leetcode.com)")).toEqual([
      { type: "link", href: "https://leetcode.com", children: [{ type: "text", text: "ok" }] },
    ]);
    expect(parseInline("[bad](javascript:alert(1))")).toEqual([{ type: "text", text: "bad" }]);
  });

  it("parses every problem statement without losing text", () => {
    for (const problem of listProblems()) {
      const blocks = parseMarkdown(problem.statement);
      expect(blocks.length, problem.id).toBeGreaterThan(0);
      const text = blocks
        .map((block) => (block.type === "code" ? block.text : block.type === "list" ? block.items.map(inlineToText).join(" ") : inlineToText(block.children)))
        .join(" ");
      const plain = problem.statement.replace(/`|\*\*/g, "").replace(/\s+/g, " ").trim();
      expect(text.replace(/\s+/g, " ").trim(), problem.id).toBe(plain);
    }
  });
});

const EVALUATION: Evaluation = {
  verdict: "partial",
  nailed: ["Window has no repeats"],
  missed: ["Move left past the duplicate"],
  feedback: "Close: say where left jumps.",
  suggestedGrade: 3,
  source: "heuristic",
};

const RESULT: TextStageResult = {
  answer: "The window has no repeats.",
  evaluation: EVALUATION,
  answerKey: "The window never contains a repeat.",
  keyPoints: ["Window has no repeats", "Move left past the duplicate"],
  suggestedRating: "like",
};

function response(overrides: Partial<PracticeAttemptResponse> = {}): PracticeAttemptResponse {
  return {
    attemptId: 1,
    problemId: "p-x",
    stage: "invariant",
    passed: true,
    struggled: false,
    flaggedTags: [],
    scheduled: null,
    graded: null,
    message: null,
    ...overrides,
  };
}

function run(session: PracticeSession, ...actions: SessionAction[]): PracticeSession {
  return actions.reduce(sessionReducer, session);
}

describe("practice session", () => {
  it("walks invariant → edge case → code → done", () => {
    let session = newSession("p-x", 1000);
    expect(stageStatus(session, "invariant")).toBe("current");
    expect(stageStatus(session, "code")).toBe("upcoming");

    session = run(
      session,
      { type: "draft", stage: "invariant", text: "no repeats" },
      { type: "hint", stage: "invariant" },
      { type: "hint", stage: "invariant" },
      { type: "evaluated", stage: "invariant", result: RESULT, revealed: false },
      { type: "draft", stage: "invariant", text: "ignored after grading" },
    );
    expect(session.invariant.draft).toBe("no repeats");
    expect(hintsUsed(session)).toBe(1);

    const request = textAttemptRequest(session, "invariant", 3, 42_000);
    expect(request).toEqual({
      problemId: "p-x",
      stage: "invariant",
      grade: 3,
      passed: true,
      failedRuns: 0,
      hintsUsed: 1,
      gaveUp: undefined,
      durationMs: 42_000,
      answer: "The window has no repeats.",
    });

    session = run(session, { type: "completeText", stage: "invariant", rating: "like", sync: syncFromResponse(response(), 2000), activeMs: 42_000 });
    expect(session.current).toBe("edgeCase");
    expect(stageStatus(session, "invariant")).toBe("done");

    session = run(
      session,
      { type: "hint", stage: "edgeCase" },
      { type: "evaluated", stage: "edgeCase", result: { ...RESULT, suggestedRating: "dislike" }, revealed: true },
    );
    const stuck = textAttemptRequest(session, "edgeCase", 1, 10_000);
    expect(stuck).toMatchObject({ passed: false, gaveUp: true, hintsUsed: 2 });

    const scheduled = {
      cardIds: ["mc-a"],
      titles: ["Drill A"],
      dueAt: 99,
      dueLabel: "tomorrow at 9:00 AM",
    };
    session = run(session, {
      type: "completeText",
      stage: "edgeCase",
      rating: "dislike",
      sync: syncFromResponse(response({ passed: false, struggled: true, scheduled, flaggedTags: [{ tag: "sliding_window", label: "Sliding Window" }] }), 3000),
      activeMs: 10_000,
    });
    expect(session.current).toBe("code");
    expect(latestSchedule(session)?.scheduled?.dueLabel).toBe("tomorrow at 9:00 AM");
    expect(flaggedTags(session)).toEqual([{ tag: "sliding_window", label: "Sliding Window" }]);

    // A visible-test run is free practice; a failed submit counts toward attemptNumber.
    session = run(
      session,
      { type: "judged", counted: false, summary: { mode: "run", status: "wrong_answer", passed: 1, total: 3, language: "javascript", at: 4000 } },
      { type: "judged", counted: true, summary: { mode: "submit", status: "wrong_answer", passed: 5, total: 9, language: "javascript", at: 5000 } },
    );
    expect(session.code).toMatchObject({ runs: 1, failedRuns: 1, submits: 1, failedSubmits: 1 });

    const accepted = codeAttemptRequest(session, { passed: true, testsPassed: 9, testsTotal: 9, activeMs: 60_000 });
    expect(accepted).toEqual({
      problemId: "p-x",
      stage: "code",
      passed: true,
      failedRuns: 1,
      hintsUsed: 2,
      gaveUp: undefined,
      durationMs: 60_000,
      language: "javascript",
      testsPassed: 9,
      testsTotal: 9,
    });
    expect("code" in accepted).toBe(false); // user code never goes to the server

    session = run(session, {
      type: "codeSynced",
      sync: syncFromResponse(response({ stage: "code", graded: { grade: 3, nextLabel: "1d", dueAt: 1 } }), 6000),
      completed: true,
      gaveUp: false,
      activeMs: 60_000,
    });
    expect(session.current).toBe("done");
    expect(stageStatus(session, "code")).toBe("done");
  });

  it("caps stage time and resets cleanly", () => {
    let session = run(newSession("p-x", 0), { type: "time", stage: "invariant", activeMs: 10 * 60 * 60 * 1000 });
    expect(session.invariant.activeMs).toBe(60 * 60 * 1000);
    session = run(session, { type: "language", language: "python" }, { type: "reset", now: 5 });
    expect(session).toEqual(newSession("p-x", 5, "python"));
  });

  it("round-trips through storage and rejects foreign or corrupt data", () => {
    const session = run(newSession("p-x", 7), { type: "draft", stage: "invariant", text: "hi" });
    const json = JSON.stringify(session);
    expect(parseSession(json, "p-x")).toEqual(session);
    expect(parseSession(json, "p-other")).toBeNull();
    expect(parseSession("{nope", "p-x")).toBeNull();
    expect(parseSession(JSON.stringify({ ...session, version: 2 }), "p-x")).toBeNull();
    expect(parseSession(JSON.stringify({ ...session, current: "hacked" }), "p-x")).toBeNull();
    expect(parseSession(null, "p-x")).toBeNull();
  });

  it("words the struggle → iMessage sync message", () => {
    const scheduled = { cardIds: ["mc-a"], titles: ["A"], dueAt: 1, dueLabel: "tomorrow at 9:00 AM" };
    expect(drillMessage([{ tag: "dp_state_compression", label: "Bitmask DP" }], scheduled)).toBe(
      "Flagged Bitmask DP — Synapse will text you a drill tomorrow at 9:00 AM",
    );
    expect(
      drillMessage(
        [
          { tag: "sliding_window", label: "Sliding Window" },
          { tag: "hashing", label: "Hashing" },
        ],
        { ...scheduled, cardIds: ["a", "b"], dueLabel: "in 1 min" },
      ),
    ).toBe("Flagged Sliding Window and Hashing — Synapse will text you 2 drills in 1 min");
    expect(drillMessage([], { ...scheduled, dueLabel: null })).toBe("Synapse will text you a drill soon");
    expect(joinLabels(["A", "B", "C"])).toBe("A, B and C");
  });

  it("marks unsaved stages as local-only", () => {
    expect(unsavedSync(true, 1)).toMatchObject({ saved: false, passed: true, struggled: false, scheduled: null });
  });

  it("remembers the best submit, not just the last one", () => {
    const submit = (passed: number, at: number) => ({
      type: "judged" as const,
      counted: true,
      summary: { mode: "submit" as const, status: "wrong_answer" as const, passed, total: 9, language: "javascript" as const, at },
    });
    const session = run(newSession("p-x", 0), submit(8, 1), submit(2, 2));
    expect(session.code.lastSubmit?.passed).toBe(2);
    expect(bestSubmit(session.code)).toMatchObject({ passed: 8, total: 9 });
    // Sessions persisted before bestSubmit existed fall back to the last submit.
    expect(bestSubmit({ ...session.code, bestSubmit: undefined })?.passed).toBe(2);
    expect(bestSubmit(newSession("p-x", 0).code)).toBeNull();
  });

  it("never allows a give-up while saving or on top of an accepted submit", () => {
    const fresh = newSession("p-x", 0).code;
    expect(canGiveUp(fresh, false)).toBe(true);
    expect(canGiveUp(fresh, true)).toBe(false);
    const accepted = run(newSession("p-x", 0), {
      type: "judged",
      counted: true,
      summary: { mode: "submit", status: "accepted", passed: 9, total: 9, language: "javascript", at: 1 },
    }).code;
    // Accepted but the save has not landed (in flight or failed): still no give-up.
    expect(accepted.completed).toBe(false);
    expect(canGiveUp(accepted, false)).toBe(false);
    expect(canGiveUp({ ...fresh, completed: true }, false)).toBe(false);
  });

  it("retries a failed \"I'm stuck\" as a reveal, not as a graded draft", () => {
    expect(evaluationRetry(true, "")).toBe(true);
    expect(evaluationRetry(true, "half an idea")).toBe(true);
    expect(evaluationRetry(false, "my answer")).toBe(false);
    expect(evaluationRetry(false, "   ")).toBeNull();
  });
});

function summary(overrides: Partial<ProblemSummary> & Pick<ProblemSummary, "id">): ProblemSummary {
  return {
    title: overrides.id,
    leetcodeSlug: overrides.id,
    difficulty: "medium",
    tags: ["hashing"],
    weakTags: ["hashing"],
    progress: {
      attempts: 0,
      lastAttemptAt: null,
      stagesPassed: [],
      solved: false,
      struggled: false,
      card: { phase: "new", dueAt: null, due: false, intervalLabel: null },
    },
    ...overrides,
  };
}

describe("problem filters", () => {
  const problems: ProblemSummary[] = [
    summary({ id: "p-a", title: "Two Sum", difficulty: "easy", tags: ["hashing"] }),
    summary({ id: "p-b", title: "Coin Change", tags: ["dp_1d"], weakTags: ["dp_1d"] }),
    summary({
      id: "p-c",
      title: "Partition K",
      difficulty: "hard",
      tags: ["dp_state_compression", "backtracking"],
      weakTags: ["dp_state_compression"],
      progress: {
        attempts: 3,
        lastAttemptAt: 10,
        stagesPassed: ["invariant", "edgeCase", "code"],
        solved: true,
        struggled: true,
        card: { phase: "review", dueAt: 5, due: true, intervalLabel: "1d" },
      },
    }),
  ];

  it("parses and serializes URL filters", () => {
    const filters = parseFilters({ tag: "dp_1d", difficulty: "hard", weak: "1", q: " coin ", junk: "x" });
    expect(filters).toEqual({ tag: "dp_1d", difficulty: "hard", weakOnly: true, query: "coin" });
    expect(parseFilters({ tag: "not_a_tag", difficulty: "brutal" })).toEqual({ tag: null, difficulty: null, weakOnly: false, query: "" });
    expect(filtersToQuery(filters)).toBe("tag=dp_1d&difficulty=hard&weak=1&q=coin");
    expect(filtersToQuery({ tag: null, difficulty: null, weakOnly: false, query: "" })).toBe("");
  });

  it("filters by tag, difficulty, weak spots and text", () => {
    const weak = new Set(["dp_state_compression"] as const);
    const none = { tag: null, difficulty: null, weakOnly: false, query: "" };
    expect(filterProblems(problems, { ...none, difficulty: "easy" }, weak).map((p) => p.id)).toEqual(["p-a"]);
    expect(filterProblems(problems, { ...none, tag: "backtracking" }, weak).map((p) => p.id)).toEqual(["p-c"]);
    expect(filterProblems(problems, { ...none, weakOnly: true }, weak).map((p) => p.id)).toEqual(["p-c"]);
    expect(filterProblems(problems, { ...none, query: "bitmask" }, weak).map((p) => p.id)).toEqual(["p-c"]);
    expect(filterProblems(problems, { ...none, query: "coin" }, weak).map((p) => p.id)).toEqual(["p-b"]);
  });

  it("recommends due problems, then weak spots, then fresh ones", () => {
    const weak = new Set(["dp_1d"] as const);
    expect(recommendProblem(problems, weak)?.problem.id).toBe("p-c");
    expect(recommendProblem(problems.slice(0, 2), weak)).toMatchObject({ problem: { id: "p-b" }, reason: "weak" });
    expect(recommendProblem(problems.slice(0, 1), new Set())).toMatchObject({ problem: { id: "p-a" }, reason: "new" });
    // Everything attempted, one still unsolved and not on a weak tag: pick it up again, not "a fresh problem".
    const attempted = { ...problems[0]!.progress, attempts: 2, lastAttemptAt: 5 };
    const started = [summary({ id: "p-a", progress: attempted }), summary({ id: "p-s", progress: { ...attempted, solved: true } })];
    expect(recommendProblem(started, new Set())).toMatchObject({ problem: { id: "p-a" }, reason: "unfinished" });
    expect(problemStatus(problems[2]!)).toBe("due");
    expect(problemStatus(problems[0]!)).toBe("new");
  });
});
