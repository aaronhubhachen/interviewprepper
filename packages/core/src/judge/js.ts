import type { CodeStage } from "../content/types";
import { judgeResults, testArgsJson, type JudgeReport, type RawTestResult } from "./results";

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

function assertIdentifier(functionName: string): void {
  if (!IDENTIFIER.test(functionName)) throw new Error(`Invalid function name: ${functionName}`);
}

/**
 * Source for `new Function(source)()` that evaluates the user's code and
 * returns the named function (declarations, `var f = function…`, and arrows all work).
 */
export function buildJsHarness(code: string, functionName: string): string {
  assertIdentifier(functionName);
  return `${code}
;if (typeof ${functionName} !== "function") {
  throw new ReferenceError("Define a function named ${functionName}.");
}
return ${functionName};`;
}

/**
 * Source for `new Function(source)()` that returns `run(argsListJson) => resultsJson`,
 * where results are RawTestResult[] with per-test console output captured. This is
 * the contract the browser judge worker executes; the main thread then calls judgeResults.
 */
export function buildJsRunner(code: string, functionName: string): string {
  return `const __synapseLogs = [];
const __synapseFormat = (value) => {
  if (typeof value === "string") return value;
  try { return JSON.stringify(value); } catch { return String(value); }
};
const __synapseLog = (...values) => { __synapseLogs.push(values.map(__synapseFormat).join(" ")); };
const console = { log: __synapseLog, info: __synapseLog, warn: __synapseLog, error: __synapseLog, debug: __synapseLog };
const __synapseClock = typeof performance === "object" ? performance : Date;
const __synapseFn = (function () {
${buildJsHarness(code, functionName)}
})();
return function run(argsListJson) {
  const results = JSON.parse(argsListJson).map((args) => {
    __synapseLogs.length = 0;
    const started = __synapseClock.now();
    try {
      const value = __synapseFn(...args);
      const output = JSON.stringify(value === undefined ? null : value);
      return { ok: true, output, ms: __synapseClock.now() - started, logs: __synapseLogs.slice(-50) };
    } catch (error) {
      const message = error && error.message ? error.name + ": " + error.message : String(error);
      return { ok: false, error: message, ms: __synapseClock.now() - started, logs: __synapseLogs.slice(-50) };
    }
  });
  return JSON.stringify(results);
};`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

/**
 * Runs JavaScript tests synchronously in-process (Node tests and server-side
 * checks). No timeout: only use with trusted code such as reference solutions.
 */
export function runJsTests(code: string, stage: Pick<CodeStage, "functionName" | "tests" | "compare">): JudgeReport {
  let run: (argsListJson: string) => string;
  try {
    run = new Function(buildJsRunner(code, stage.functionName))() as typeof run;
  } catch (error) {
    const kind = error instanceof SyntaxError ? "compile" : "runtime";
    return judgeResults(stage, { kind, message: errorMessage(error) });
  }
  const raw = JSON.parse(run(testArgsJson(stage))) as RawTestResult[];
  return judgeResults(stage, raw);
}
