/**
 * Main-thread judge orchestration: spawns the classic worker at
 * /judge-worker.js, enforces the per-run time limit by terminating it, and
 * hands raw results back for comparison (see judge.ts). Browser-only at
 * runtime, but the Worker is injected so the logic is unit-testable in Node.
 *
 * - JavaScript gets a FRESH worker per run: no state leaks between runs, and
 *   stray timers from a previous run die with it.
 * - Python keeps ONE warm worker (Pyodide takes seconds to load). A timeout
 *   terminates it and immediately starts warming a new one.
 * - The time limit starts at the worker's "started" message, so Pyodide's
 *   first-load time never counts against the user's code.
 *
 * The worker runs untrusted code on the app's origin. next.config.ts serves it
 * with JUDGE_WORKER_CSP (csp.ts). That policy leaves 'self' out of connect-src,
 * so pasted code cannot call /api or send data anywhere except the Pyodide CDN.
 */
import { buildJsRunner, PYODIDE_INDEX_URL, PYTHON_HARNESS, type RawTestResult, type RunFailure } from "@synapse/core/judge";
import type { JudgeLanguage } from "@synapse/core/content";
import { JUDGE_WORKER_URL } from "./csp";
import { isWorkerResponse, normalizeRaw, type WorkerRequest, type WorkerResponse } from "./protocol";

/** Per-run time limit (ms of user-code execution). */
export const RUN_TIMEOUT_MS = 3000;
/** How long a fresh worker may take to boot before we give up. */
export const BOOT_TIMEOUT_MS = 15_000;
/** How long Pyodide may take to download + initialise on a cold start. */
export const PYTHON_LOAD_TIMEOUT_MS = 120_000;

export { JUDGE_WORKER_URL };

/** The subset of the DOM Worker API the client needs (lets tests inject fakes). */
export interface WorkerLike {
  postMessage(message: WorkerRequest): void;
  terminate(): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: { message?: string; preventDefault?: () => void }) => void) | null;
}

export type PythonRuntimeStatus = "cold" | "loading" | "ready" | "error";

export interface ExecuteRequest {
  language: JudgeLanguage;
  code: string;
  functionName: string;
  /** JSON list of positional-argument lists (core's testArgsJson). */
  argsJson: string;
}

export type ExecuteOutcome =
  | {
      ok: true;
      raw: RawTestResult[] | RunFailure;
      /** Wall-clock execution time measured on the main thread. */
      wallMs: number;
      /** Python stdout printed while the module loaded (outside any test). */
      setupLogs: string[];
    }
  | {
      ok: false;
      reason: "runtime-unavailable" | "busy" | "disposed" | "worker-crashed";
      message: string;
    };

export interface JudgeClientOptions {
  createWorker?: () => WorkerLike;
  timeoutMs?: number;
  bootTimeoutMs?: number;
  pythonLoadTimeoutMs?: number;
  pythonHarness?: string;
  pyodideIndexUrl?: string;
  now?: () => number;
  onPythonStatus?: (status: PythonRuntimeStatus, message?: string) => void;
}

interface PendingRun {
  id: number;
  language: JudgeLanguage;
  worker: WorkerLike;
  handle: (message: WorkerResponse) => void;
  crash: (message: string) => void;
  abort: (outcome: ExecuteOutcome) => void;
}

function defaultCreateWorker(): WorkerLike {
  return new Worker(JUDGE_WORKER_URL, { name: "synapse-judge" }) as unknown as WorkerLike;
}

function defaultNow(): number {
  return typeof performance === "object" && typeof performance.now === "function" ? performance.now() : Date.now();
}

export function timeoutMessage(timeoutMs: number): string {
  const seconds = Math.round(timeoutMs / 100) / 10;
  return `Time limit exceeded: stopped after ${seconds}s. Look for an infinite loop or a missing base case.`;
}

export class JudgeClient {
  private readonly createWorker: () => WorkerLike;
  private readonly timeoutMs: number;
  private readonly bootTimeoutMs: number;
  private readonly pythonLoadTimeoutMs: number;
  private readonly harness: string;
  private readonly indexURL: string;
  private readonly now: () => number;
  private readonly onPythonStatus?: JudgeClientOptions["onPythonStatus"];

  private python: WorkerLike | null = null;
  private status: PythonRuntimeStatus = "cold";
  private pending: PendingRun | null = null;
  private nextId = 1;
  private disposed = false;

  constructor(options: JudgeClientOptions = {}) {
    this.createWorker = options.createWorker ?? defaultCreateWorker;
    this.timeoutMs = options.timeoutMs ?? RUN_TIMEOUT_MS;
    this.bootTimeoutMs = options.bootTimeoutMs ?? BOOT_TIMEOUT_MS;
    this.pythonLoadTimeoutMs = options.pythonLoadTimeoutMs ?? PYTHON_LOAD_TIMEOUT_MS;
    this.harness = options.pythonHarness ?? PYTHON_HARNESS;
    this.indexURL = options.pyodideIndexUrl ?? PYODIDE_INDEX_URL;
    this.now = options.now ?? defaultNow;
    this.onPythonStatus = options.onPythonStatus;
  }

  get pythonStatus(): PythonRuntimeStatus {
    return this.status;
  }

  get busy(): boolean {
    return this.pending !== null;
  }

  /** Starts downloading Pyodide in the background (no-op when already warm or warming). */
  preloadPython(): void {
    if (this.disposed || this.python) return;
    try {
      this.ensurePython().postMessage({ type: "preload", language: "python", harness: this.harness, indexURL: this.indexURL });
    } catch (error) {
      this.dropPython();
      this.setStatus("error", error instanceof Error ? error.message : String(error));
    }
  }

  run(request: ExecuteRequest): Promise<ExecuteOutcome> {
    if (this.disposed) return Promise.resolve({ ok: false, reason: "disposed", message: "The judge was shut down." });
    if (this.pending) return Promise.resolve({ ok: false, reason: "busy", message: "A run is already in progress." });

    let worker: WorkerLike;
    let message: WorkerRequest;
    const id = this.nextId++;
    try {
      if (request.language === "javascript") {
        worker = this.spawn();
        message = { type: "run", id, language: "javascript", source: buildJsRunner(request.code, request.functionName), argsJson: request.argsJson };
      } else {
        worker = this.ensurePython();
        message = {
          type: "run",
          id,
          language: "python",
          code: request.code,
          functionName: request.functionName,
          argsJson: request.argsJson,
          harness: this.harness,
          indexURL: this.indexURL,
        };
      }
    } catch (error) {
      if (request.language === "python") this.dropPython();
      const detail = error instanceof Error ? error.message : String(error);
      return Promise.resolve({ ok: false, reason: "runtime-unavailable", message: `Could not start the judge: ${detail}` });
    }

    const bootLimit = request.language === "python" && this.status !== "ready" ? this.pythonLoadTimeoutMs : this.bootTimeoutMs;
    return new Promise<ExecuteOutcome>((resolve) => {
      let startedAt: number | null = null;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const finish = (outcome: ExecuteOutcome, killWorker: boolean) => {
        if (this.pending?.id !== id) return;
        if (timer) clearTimeout(timer);
        this.pending = null;
        if (killWorker) this.kill(worker, request.language);
        resolve(outcome);
      };

      const arm = (ms: number, onExpire: () => void) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(onExpire, ms);
      };

      const onTimeout = () => {
        finish({ ok: true, raw: { kind: "timeout", message: timeoutMessage(this.timeoutMs) }, wallMs: this.timeoutMs, setupLogs: [] }, true);
        // Python: warm a replacement right away so the next run does not pay the full cold start.
        if (request.language === "python") this.preloadPython();
      };

      const onBootTimeout = () => {
        const text =
          request.language === "python"
            ? "The Python runtime (Pyodide) took too long to load. Check your connection and try again."
            : "The judge worker did not start. Reload the page and try again.";
        if (request.language === "python") this.setStatus("error", text);
        finish({ ok: false, reason: "runtime-unavailable", message: text }, true);
      };

      this.pending = {
        id,
        language: request.language,
        worker,
        handle: (response) => {
          if (response.type === "started" && response.id === id) {
            startedAt = this.now();
            arm(this.timeoutMs, onTimeout);
          } else if (response.type === "result" && response.id === id) {
            const wallMs = startedAt === null ? 0 : Math.max(0, this.now() - startedAt);
            const setupLogs = Array.isArray(response.logs) ? response.logs.map(String) : [];
            finish({ ok: true, raw: normalizeRaw(response.raw), wallMs, setupLogs }, request.language === "javascript");
          } else if (response.type === "load-error" && response.id === id) {
            finish({ ok: false, reason: "runtime-unavailable", message: response.message }, true);
          }
        },
        crash: (text) => {
          if (startedAt !== null) {
            // The worker died while running user code (e.g. out of memory): report it as a runtime error.
            finish({ ok: true, raw: { kind: "runtime", message: text }, wallMs: Math.max(0, this.now() - startedAt), setupLogs: [] }, true);
          } else {
            finish({ ok: false, reason: "worker-crashed", message: text }, true);
          }
        },
        abort: (outcome) => finish(outcome, true),
      };

      arm(bootLimit, onBootTimeout);
      try {
        worker.postMessage(message);
      } catch (error) {
        finish({ ok: false, reason: "worker-crashed", message: error instanceof Error ? error.message : String(error) }, true);
      }
    });
  }

  /** Terminates every worker; an in-flight run resolves with reason "disposed". */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.pending?.abort({ ok: false, reason: "disposed", message: "The judge was shut down." });
    this.pending = null;
    this.dropPython();
  }

  // ── internals ────────────────────────────────────────────────────────────

  private spawn(): WorkerLike {
    const worker = this.createWorker();
    worker.onmessage = (event) => this.onMessage(worker, event.data);
    worker.onerror = (event) => {
      event.preventDefault?.();
      this.onCrash(worker, event.message || "The judge worker crashed.");
    };
    return worker;
  }

  private ensurePython(): WorkerLike {
    if (!this.python) {
      this.python = this.spawn();
      this.setStatus("loading");
    }
    return this.python;
  }

  private onMessage(worker: WorkerLike, data: unknown): void {
    if (!isWorkerResponse(data)) return;
    if (data.type === "status" && worker === this.python) {
      if (data.status === "python-ready") this.setStatus("ready");
      else if (data.status === "loading-python") this.setStatus("loading");
      else this.setStatus("error", data.message);
      return;
    }
    if (this.pending && this.pending.worker === worker) this.pending.handle(data);
  }

  private onCrash(worker: WorkerLike, message: string): void {
    if (this.pending && this.pending.worker === worker) {
      this.pending.crash(message);
      return;
    }
    if (worker === this.python) {
      this.dropPython();
      this.setStatus("error", message);
    }
  }

  private kill(worker: WorkerLike, language: JudgeLanguage): void {
    if (language === "python" && worker === this.python) {
      this.dropPython();
      return;
    }
    this.terminate(worker);
  }

  private dropPython(): void {
    if (this.python) this.terminate(this.python);
    this.python = null;
    if (this.status !== "error") this.setStatus("cold");
  }

  private terminate(worker: WorkerLike): void {
    worker.onmessage = null;
    worker.onerror = null;
    try {
      worker.terminate();
    } catch {
      // already gone
    }
  }

  private setStatus(status: PythonRuntimeStatus, message?: string): void {
    if (this.status === status && status !== "error") return;
    this.status = status;
    this.onPythonStatus?.(status, message);
  }
}
