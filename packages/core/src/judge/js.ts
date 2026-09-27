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
 * Runtime helpers prepended to every runner: a console whose every method logs
 * or no-ops (console.table/dir/trace/assert/count/time... never throw), a small
 * inspector so Map, Set, undefined, NaN, Infinity, -0, bigint and functions print
 * as themselves (JSON.stringify showed "{}" and "null"), and a check for return
 * values JSON can't carry.
 */
const JS_RUNTIME = String.raw`const __synapseLogs = [];
const __synapseInspect = (value, depth, seen) => {
  if (typeof value === "string") return depth === 0 ? value : JSON.stringify(value);
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "number") return Object.is(value, -0) ? "-0" : String(value);
  if (typeof value === "bigint") return String(value) + "n";
  if (typeof value === "boolean" || typeof value === "symbol") return String(value);
  if (typeof value === "function") return value.name ? "[Function: " + value.name + "]" : "[Function (anonymous)]";
  if (seen.includes(value)) return "[Circular]";
  if (depth > 5) return Array.isArray(value) ? "[Array]" : "[Object]";
  const next = seen.concat([value]);
  const inner = (item) => __synapseInspect(item, depth + 1, next);
  if (Array.isArray(value)) return "[" + value.map(inner).join(",") + "]";
  if (value instanceof Map) return "Map(" + value.size + ") {" + Array.from(value, ([k, v]) => inner(k) + " => " + inner(v)).join(", ") + "}";
  if (value instanceof Set) return "Set(" + value.size + ") {" + Array.from(value, inner).join(", ") + "}";
  if (value instanceof Error) return value.name + ": " + value.message;
  if (value instanceof Date) return isNaN(value.getTime()) ? "Invalid Date" : value.toISOString();
  if (ArrayBuffer.isView(value) && typeof value.length === "number") return value.constructor.name + "(" + value.length + ") [" + Array.from(value).join(",") + "]";
  return "{" + Object.keys(value).map((key) => JSON.stringify(key) + ":" + inner(value[key])).join(",") + "}";
};
const __synapseFormat = (value) => {
  try { return __synapseInspect(value, 0, []); } catch { return String(value); }
};
const __synapseLog = (...values) => { __synapseLogs.push(values.map(__synapseFormat).join(" ")); };
const __synapseNoop = () => undefined;
const __synapseConsole = {
  log: __synapseLog, info: __synapseLog, warn: __synapseLog, error: __synapseLog, debug: __synapseLog,
  trace: __synapseLog, dirxml: __synapseLog, dir: (value) => __synapseLog(value), table: (data) => __synapseLog(data),
  assert: (condition, ...values) => { if (!condition) __synapseLog("Assertion failed" + (values.length > 0 ? ":" : ""), ...values); },
};
const console = new Proxy(__synapseConsole, {
  get: (target, key) => (typeof key === "string" && !(key in target) ? __synapseNoop : target[key]),
});
const __synapseJsonIssue = (value, depth, seen) => {
  if (typeof value === "number") return Number.isFinite(value) ? null : { what: String(value), at: "" };
  if (typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") return { what: "a " + typeof value, at: "" };
  if (value === null || typeof value !== "object" || depth > 64 || seen.has(value)) return null;
  if (value instanceof Map || value instanceof Set) return { what: "a " + (value instanceof Map ? "Map" : "Set"), at: "" };
  if (typeof value.toJSON === "function") return null;
  seen.add(value);
  const isArray = Array.isArray(value);
  for (const key of isArray ? value.keys() : Object.keys(value)) {
    const issue = __synapseJsonIssue(value[key], depth + 1, seen);
    if (issue) return { what: issue.what, at: (isArray ? "[" + key + "]" : "." + key) + issue.at };
  }
  return null;
};
const __synapseClock = typeof performance === "object" ? performance : Date;
`;

/**
 * Source for `new Function(source)()` that returns `run(argsListJson) => resultsJson`,
 * where results are RawTestResult[] with per-test console output captured. This is
 * the contract the browser judge worker executes; the main thread then calls judgeResults.
 * Console output from top-level code is prepended to the first test's logs. A return
 * value JSON can't carry faithfully (Infinity, NaN, a function, a Map or Set) is a
 * per-test error naming it, not a misleading "null" or "{}".
 */
export function buildJsRunner(code: string, functionName: string): string {
  return `${JS_RUNTIME}const __synapseFn = (function () {
${buildJsHarness(code, functionName)}
})();
const __synapseSetupLogs = __synapseLogs.splice(0);
return function run(argsListJson) {
  const results = JSON.parse(argsListJson).map((args) => {
    __synapseLogs.length = 0;
    const started = __synapseClock.now();
    try {
      const value = __synapseFn(...args);
      const issue = __synapseJsonIssue(value, 0, new Set());
      if (issue) {
        const error = "Returned " + issue.what + (issue.at ? " at " + issue.at : "") + ", which is not valid JSON.";
        return { ok: false, error, ms: __synapseClock.now() - started, logs: __synapseLogs.slice(-50) };
      }
      const output = JSON.stringify(value === undefined ? null : value);
      return { ok: true, output, ms: __synapseClock.now() - started, logs: __synapseLogs.slice(-50) };
    } catch (error) {
      const message = error && error.message ? error.name + ": " + error.message : String(error);
      return { ok: false, error: message, ms: __synapseClock.now() - started, logs: __synapseLogs.slice(-50) };
    }
  });
  if (results.length > 0 && __synapseSetupLogs.length > 0) {
    results[0].logs = __synapseSetupLogs.concat(results[0].logs).slice(-50);
  }
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
