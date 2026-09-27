/**
 * Run / Submit on the main thread: pick the tests, execute them through the
 * worker client, then compare with core's judgeResults (→ compareOutput).
 * User code never leaves the browser.
 */
import type { CodeStage, CodeTest } from "@synapse/core/content";
import { judgeResults, testArgsJson, type CodeLanguage, type JudgeReport } from "@synapse/core/judge";
import type { ExecuteOutcome, ExecuteRequest } from "./client";

/** "run" = visible tests only (free practice); "submit" = every test, hidden included. */
export type JudgeMode = "run" | "submit";

/** Just what the judge needs from a problem's code stage (ClientCodeStage fits). */
export type JudgeStage = Pick<CodeStage, "functionName" | "tests" | "compare">;

export interface JudgePlan {
  mode: JudgeMode;
  /** Stage restricted to the selected tests. */
  stage: Pick<CodeStage, "tests" | "compare">;
  /** Original test index for each selected test. */
  indices: number[];
}

export function planTests(stage: Pick<CodeStage, "tests" | "compare">, mode: JudgeMode): JudgePlan {
  const selected: Array<{ test: CodeTest; index: number }> = [];
  stage.tests.forEach((test, index) => {
    if (mode === "submit" || !test.hidden) selected.push({ test, index });
  });
  // A problem without visible tests still gets something to run.
  const chosen = selected.length > 0 ? selected : stage.tests.map((test, index) => ({ test, index }));
  return {
    mode,
    stage: { tests: chosen.map((entry) => entry.test), compare: stage.compare },
    indices: chosen.map((entry) => entry.index),
  };
}

/** Maps a report on the planned subset back to original test indices ("Test 7"). */
export function remapReport(report: JudgeReport, plan: JudgePlan): JudgeReport {
  return {
    ...report,
    cases: report.cases.map((testCase) => ({ ...testCase, index: plan.indices[testCase.index] ?? testCase.index })),
  };
}

export type JudgeOutcome =
  | {
      ok: true;
      mode: JudgeMode;
      language: CodeLanguage;
      report: JudgeReport;
      wallMs: number;
      setupLogs: string[];
    }
  | {
      ok: false;
      mode: JudgeMode;
      language: CodeLanguage;
      /** Infrastructure problem (runtime failed to load, worker crashed) — not the user's fault. */
      message: string;
      reason: Extract<ExecuteOutcome, { ok: false }>["reason"];
    };

/** ExecuteRequest widened to every IDE language; problemId lets the server look up the signature. */
export type RunRequest = Omit<ExecuteRequest, "language"> & { language: CodeLanguage; problemId?: string };

export interface JudgeRunner {
  run(request: RunRequest): Promise<ExecuteOutcome>;
}

export async function judgeCode(
  runner: JudgeRunner,
  input: { stage: JudgeStage; mode: JudgeMode; language: CodeLanguage; code: string; problemId?: string },
): Promise<JudgeOutcome> {
  const plan = planTests(input.stage, input.mode);
  const outcome = await runner.run({
    language: input.language,
    code: input.code,
    functionName: input.stage.functionName,
    argsJson: testArgsJson(plan.stage),
    problemId: input.problemId,
  });
  if (!outcome.ok) return { ok: false, mode: input.mode, language: input.language, message: outcome.message, reason: outcome.reason };
  const report = remapReport(judgeResults(plan.stage, outcome.raw), plan);
  return { ok: true, mode: input.mode, language: input.language, report, wallMs: outcome.wallMs, setupLogs: outcome.setupLogs };
}

/** Sum of per-test runtimes (ms); null when nothing reported a time. */
export function totalRuntime(report: JudgeReport): number | null {
  const times = report.cases.map((testCase) => testCase.ms).filter((ms): ms is number => typeof ms === "number");
  return times.length > 0 ? times.reduce((sum, ms) => sum + ms, 0) : null;
}

/** Index (into report.cases) of the first failing case, or -1. */
export function firstFailure(report: JudgeReport): number {
  return report.cases.findIndex((testCase) => !testCase.passed);
}
