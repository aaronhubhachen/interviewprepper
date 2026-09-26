/**
 * Message contract between the main thread (lib/judge/client.ts) and the
 * classic judge worker (public/judge-worker.js). The worker only EXECUTES code
 * and posts raw JSON; the main thread compares outputs (core's judgeResults →
 * compareOutput) and enforces the time limit by terminating the worker.
 */
import type { RawTestResult, RunFailure } from "@synapse/core/judge";

/** JavaScript: `source` is core's buildJsRunner(code, fn); `new Function(source)()` returns run(argsJson). */
export interface RunJavaScriptMessage {
  type: "run";
  id: number;
  language: "javascript";
  source: string;
  argsJson: string;
}

/** Python: the worker loads Pyodide from `indexURL`, installs `harness` (core's PYTHON_HARNESS) once, then runs. */
export interface RunPythonMessage {
  type: "run";
  id: number;
  language: "python";
  code: string;
  functionName: string;
  argsJson: string;
  harness: string;
  indexURL: string;
}

/** Warm up Pyodide without running anything (sent when the user switches to Python). */
export interface PreloadPythonMessage {
  type: "preload";
  language: "python";
  harness: string;
  indexURL: string;
}

export type WorkerRequest = RunJavaScriptMessage | RunPythonMessage | PreloadPythonMessage;

export type PythonWorkerStatus = "loading-python" | "python-ready" | "python-error";

export type WorkerResponse =
  | { type: "status"; status: PythonWorkerStatus; message?: string }
  /** Posted right before user code runs: the time limit starts here (not while Pyodide loads). */
  | { type: "started"; id: number }
  /** raw: per-test results, or a RunFailure when the code could not load. logs: Python module-level stdout. */
  | { type: "result"; id: number; raw: RawTestResult[] | RunFailure; logs?: string[] }
  /** The language runtime itself could not be loaded (e.g. the Pyodide CDN is unreachable). */
  | { type: "load-error"; id: number; message: string };

const RESPONSE_TYPES = new Set(["status", "started", "result", "load-error"]);

export function isWorkerResponse(value: unknown): value is WorkerResponse {
  return Boolean(
    value && typeof value === "object" && RESPONSE_TYPES.has((value as { type?: unknown }).type as string),
  );
}

function isRawTestResult(value: unknown): value is RawTestResult {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  if (typeof entry.ok !== "boolean") return false;
  return entry.ok ? typeof entry.output === "string" : typeof entry.error === "string";
}

/**
 * Defensive normalization of whatever came back from the worker. User code
 * shares the worker's global scope, so the payload is not fully trusted.
 */
export function normalizeRaw(value: unknown): RawTestResult[] | RunFailure {
  if (Array.isArray(value)) {
    if (!value.every(isRawTestResult)) return { kind: "runtime", message: "The judge returned malformed results." };
    return value.map((entry) => ({
      ...entry,
      ms: typeof entry.ms === "number" && Number.isFinite(entry.ms) ? entry.ms : 0,
      logs: Array.isArray(entry.logs) ? entry.logs.map(String) : [],
    }));
  }
  if (value && typeof value === "object") {
    const failure = value as Partial<RunFailure>;
    const kind = failure.kind === "compile" || failure.kind === "timeout" ? failure.kind : "runtime";
    return { kind, message: typeof failure.message === "string" ? failure.message : "Execution failed." };
  }
  return { kind: "runtime", message: "The judge returned no results." };
}
