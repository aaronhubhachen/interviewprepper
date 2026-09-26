/**
 * Server-render smoke tests: every practice component renders its states
 * without throwing, and the markup carries the accessibility hooks we rely on.
 * (Vitest runs in node; effects do not run, so this covers first paint.)
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { drillCardsForProblem, listProblems } from "@synapse/core/content";
import { judgeResults } from "@synapse/core/judge";
import type { JudgeOutcome } from "@/lib/judge";
import { toClientProblem } from "@/lib/server/serialize";
import { CodeStagePanel } from "./CodeStagePanel";
import { CompletionPanel } from "./CompletionPanel";
import { JudgeResults } from "./JudgeResults";
import { Markdown } from "./Markdown";
import { ProblemList } from "./ProblemList";
import { ProblemStatement } from "./ProblemStatement";
import { ProblemWorkspace } from "./ProblemWorkspace";
import { newSession, sessionReducer, syncFromResponse, type PracticeSession } from "./session";
import { SolutionPanel } from "./SolutionPanel";
import { StageStepper } from "./StageStepper";
import { TextStageCard } from "./TextStageCard";
import { EMPTY_FILTERS } from "./filters";

const source = listProblems().find((problem) => problem.id === "p-partition-k-equal-sum-subsets") ?? listProblems()[0]!;
const problem = toClientProblem(
  source,
  drillCardsForProblem(source).map((card) => ({ id: card.id, title: card.title })),
);
const noop = () => undefined;

function doneSession(): PracticeSession {
  const result = {
    answer: "dp over subsets",
    evaluation: { verdict: "partial" as const, nailed: [], missed: [], feedback: "Say what the mask means.", suggestedGrade: 3 as const, source: "heuristic" as const },
    answerKey: "key",
    keyPoints: ["Mask of used numbers"],
    suggestedRating: "like" as const,
  };
  const base = { attemptId: 1, problemId: problem.id, passed: true, struggled: false, flaggedTags: [], scheduled: null, graded: null, message: null };
  return [
    { type: "evaluated", stage: "invariant", result, revealed: false },
    { type: "completeText", stage: "invariant", rating: "like", sync: syncFromResponse({ ...base, stage: "invariant" }, 1), activeMs: 30_000 },
    { type: "evaluated", stage: "edgeCase", result, revealed: true },
    {
      type: "completeText",
      stage: "edgeCase",
      rating: "dislike",
      sync: syncFromResponse(
        {
          ...base,
          stage: "edgeCase",
          passed: false,
          struggled: true,
          flaggedTags: [{ tag: "dp_state_compression", label: "Bitmask DP" }],
          scheduled: { cardIds: ["mc-1"], titles: ["Bitmask states"], dueAt: 5, dueLabel: "tomorrow at 9:00 AM" },
        },
        2,
      ),
      activeMs: 5_000,
    },
    { type: "judged", counted: true, summary: { mode: "submit", status: "accepted", passed: 9, total: 9, language: "javascript", at: 3 } },
    {
      type: "codeSynced",
      sync: syncFromResponse({ ...base, stage: "code", struggled: true, graded: { grade: 3, nextLabel: "1d", dueAt: 9 } }, 4),
      completed: true,
      gaveUp: false,
      activeMs: 90_000,
    },
  ].reduce((state, action) => sessionReducer(state, action as Parameters<typeof sessionReducer>[1]), newSession(problem.id, 0));
}

describe("practice components render", () => {
  it("renders every problem statement with examples and typographic constraints", () => {
    for (const entry of listProblems()) {
      const client = toClientProblem(entry, []);
      const html = renderToStaticMarkup(<ProblemStatement problem={client} weak={new Set(["dp_state_compression"])} attempts={[]} now={0} />);
      expect(html, entry.id).toContain("Example 1");
      expect(html).not.toContain("<script");
    }
    const html = renderToStaticMarkup(<Markdown source={"Use `mask` and **bits**.\n\n- a\n- b"} />);
    expect(html).toContain("<code>mask</code>");
    expect(html).toContain("<strong>bits</strong>");
    expect(html).toContain("<ul><li>a</li><li>b</li></ul>");
  });

  it("server-renders the workspace shell with the statement and never the answer keys", () => {
    const html = renderToStaticMarkup(<ProblemWorkspace problem={problem} />);
    expect(html).toContain(problem.title);
    expect(html).toContain('aria-label="Loading your session"');
    expect(html).not.toContain(source.stages.invariant.answerKey);
    expect(html).not.toContain(source.stages.code.reference.javascript.slice(0, 40));
  });

  it("renders the list page loading state", () => {
    const html = renderToStaticMarkup(<ProblemList initialFilters={EMPTY_FILTERS} />);
    expect(html).toContain("Practice");
    expect(html).toContain('aria-label="Loading problems"');
  });

  it("renders text stages front and back", () => {
    const session = newSession(problem.id, 0);
    const front = renderToStaticMarkup(
      <TextStageCard
        stage="invariant"
        prompt={problem.stages.invariant}
        state={{ ...session.invariant, hintShown: true, draft: "mask" }}
        readOnly={false}
        evaluating={false}
        evalError="Server down"
        saving={null}
        saveError={null}
        getElapsed={() => 61_000}
        onDraft={noop}
        onHint={noop}
        onEvaluate={noop}
        onRate={noop}
        onSkipSave={noop}
      />,
    );
    expect(front).toContain("Name the invariant");
    expect(front).toContain(problem.stages.invariant.hint);
    expect(front).toContain("Couldn&#x27;t grade that answer");
    expect(front).toContain("1:01");

    const done = doneSession();
    const back = renderToStaticMarkup(
      <TextStageCard
        stage="invariant"
        prompt={problem.stages.invariant}
        state={done.invariant}
        readOnly
        evaluating={false}
        evalError={null}
        saving={null}
        saveError={null}
        getElapsed={() => 0}
        onDraft={noop}
        onHint={noop}
        onEvaluate={noop}
        onRate={noop}
        onSkipSave={noop}
      />,
    );
    expect(back).toContain("Partially there");
    expect(back).toContain("Answer key");
    expect(back).toContain('aria-pressed="true"');
  });

  it("renders judge results for accepted, wrong, and whole-run failures", () => {
    const stage = problem.stages.code;
    const wrong = judgeResults(stage, stage.tests.map((_, index) => (index === 0 ? { ok: false as const, error: "TypeError: x", ms: 1, logs: ["hi"] } : { ok: true as const, output: "false", ms: 0.2, logs: [] })));
    const outcome: JudgeOutcome = { ok: true, mode: "submit", language: "javascript", report: wrong, wallMs: 3, setupLogs: [] };
    const html = renderToStaticMarkup(<JudgeResults outcome={outcome} running={null} loadingRuntime={false} params={stage.params} visibleCount={5} totalCount={stage.tests.length} />);
    expect(html).toContain("TypeError: x");
    expect(html).toContain("Hidden test");
    expect(html).toContain('role="tablist"');

    const timeout: JudgeOutcome = { ok: true, mode: "run", language: "python", report: judgeResults(stage, { kind: "timeout", message: "Time limit exceeded" }), wallMs: 3000, setupLogs: [] };
    expect(renderToStaticMarkup(<JudgeResults outcome={timeout} running="run" loadingRuntime params={stage.params} visibleCount={5} totalCount={9} />)).toContain("Loading the Python runtime");

    const infra: JudgeOutcome = { ok: false, mode: "run", language: "python", reason: "runtime-unavailable", message: "Pyodide unreachable" };
    expect(renderToStaticMarkup(<JudgeResults outcome={infra} running={null} loadingRuntime={false} params={[]} visibleCount={1} totalCount={1} />)).toContain("Pyodide unreachable");
    expect(renderToStaticMarkup(<JudgeResults outcome={null} running={null} loadingRuntime={false} params={[]} visibleCount={5} totalCount={9} />)).toContain("including 4 hidden");
  });

  it("renders the code stage (editor loads client-side) and completion summary", () => {
    const done = doneSession();
    const code = renderToStaticMarkup(
      <CodeStagePanel
        problem={problem}
        state={done.code}
        practiceMode={false}
        saving={false}
        saveError="offline"
        notes={{ invariant: "inv", edgeCase: null }}
        getElapsed={() => 0}
        onLanguage={noop}
        onJudged={noop}
        onGiveUp={noop}
        onRetrySave={noop}
        onSkipSave={noop}
      />,
    );
    expect(code).toContain(`${problem.stages.code.functionName}(`);
    expect(code).toContain('role="radiogroup"');
    expect(code).toContain("Finish without saving");

    const summary = renderToStaticMarkup(
      <CompletionPanel problem={problem} session={done} nextProblem={{ id: "p-x", title: "Next One" }} onRestart={noop} onReview={noop} onShowSolution={noop} solutionShown={false} />,
    );
    expect(summary).toContain("Solved, with a fight");
    expect(summary).toContain("next review in");
    expect(summary).toContain("Flagged Bitmask DP");
    expect(summary).toContain("Next: Next One");

    const stepper = renderToStaticMarkup(<StageStepper session={done} displayed="done" onSelect={noop} />);
    expect(stepper).toContain("👍");
    expect(stepper).toContain("📖");
    expect(stepper).toContain("✅");
  });

  it("renders solution states", () => {
    const ready = renderToStaticMarkup(
      <SolutionPanel
        state={{ status: "ready", data: { problemId: problem.id, reference: { javascript: "function f(){}", python: "def f(): pass" }, invariantAnswer: "I", edgeCaseAnswer: "E" } }}
        initialLanguage="python"
        onRetry={noop}
      />,
    );
    expect(ready).toContain("def f(): pass");
    expect(renderToStaticMarkup(<SolutionPanel state={{ status: "error", locked: true, message: "Submit first." }} initialLanguage="javascript" onRetry={noop} />)).toContain("Still locked");
    expect(renderToStaticMarkup(<SolutionPanel state={{ status: "idle" }} initialLanguage="javascript" onRetry={noop} />)).toBe("");
  });
});
