import type { CodeStage } from "../content/types";
import { compareOutput } from "./compare";

/** What an executor (worker, Node helper) returns per test: raw JSON output, never compared. */
export type RawTestResult =
  | { ok: true; output: string; ms: number; logs: string[] }
  | { ok: false; error: string; ms: number; logs: string[] };

/** A failure that prevented running the tests at all. */
export interface RunFailure {
  kind: "compile" | "runtime" | "timeout";
  message: string;
}

export type JudgeStatus = "accepted" | "wrong_answer" | "runtime_error" | "compile_error" | "timeout";

export interface TestCaseResult {
  index: number;
  hidden: boolean;
  args: unknown[];
  expected: unknown;
  actual?: unknown;
  passed: boolean;
  error?: string;
  ms?: number;
  logs: string[];
}

export interface JudgeReport {
  status: JudgeStatus;
  passed: number;
  total: number;
  cases: TestCaseResult[];
  message?: string;
}

const FAILURE_STATUS: Record<RunFailure["kind"], JudgeStatus> = {
  compile: "compile_error",
  runtime: "runtime_error",
  timeout: "timeout",
};

function isRunFailure(value: RawTestResult[] | RunFailure): value is RunFailure {
  return !Array.isArray(value);
}

/** Main-thread verdict: compares raw executor output with each test's expected value. */
export function judgeResults(stage: Pick<CodeStage, "tests" | "compare">, raw: RawTestResult[] | RunFailure): JudgeReport {
  const total = stage.tests.length;
  if (isRunFailure(raw)) {
    const cases = stage.tests.map((test, index) => ({
      index,
      hidden: Boolean(test.hidden),
      args: test.args,
      expected: test.expected,
      passed: false,
      error: raw.message,
      logs: [],
    }));
    return { status: FAILURE_STATUS[raw.kind], passed: 0, total, cases, message: raw.message };
  }

  const cases = stage.tests.map((test, index): TestCaseResult => {
    const base = { index, hidden: Boolean(test.hidden), args: test.args, expected: test.expected };
    const result = raw[index];
    if (!result) return { ...base, passed: false, error: "No result (execution stopped early).", logs: [] };
    if (!result.ok) return { ...base, passed: false, error: result.error, ms: result.ms, logs: result.logs };
    let actual: unknown;
    try {
      actual = JSON.parse(result.output);
    } catch {
      return { ...base, passed: false, error: "Output is not JSON-serializable.", ms: result.ms, logs: result.logs };
    }
    return { ...base, actual, passed: compareOutput(actual, test.expected, stage.compare), ms: result.ms, logs: result.logs };
  });

  const passed = cases.filter((testCase) => testCase.passed).length;
  const status: JudgeStatus =
    passed === total ? "accepted" : cases.some((testCase) => testCase.error) ? "runtime_error" : "wrong_answer";
  return { status, passed, total, cases };
}

/** JSON payload of positional-argument lists that executors consume. */
export function testArgsJson(stage: Pick<CodeStage, "tests">): string {
  return JSON.stringify(stage.tests.map((test) => test.args));
}
