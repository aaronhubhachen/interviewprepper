import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CodeStage } from "@synapse/core/content";
import { JudgeClient, timeoutMessage, type WorkerLike } from "./client";
import { formatArgs, formatMs, formatValue, summarizeReport } from "./format";
import { firstFailure, judgeCode, planTests, totalRuntime } from "./judge";
import { normalizeRaw, type WorkerRequest } from "./protocol";

type Behavior = (message: WorkerRequest, worker: FakeWorker) => void;

class FakeWorker implements WorkerLike {
  onmessage: WorkerLike["onmessage"] = null;
  onerror: WorkerLike["onerror"] = null;
  readonly posted: WorkerRequest[] = [];
  terminated = false;

  constructor(private readonly behavior: Behavior) {}

  postMessage(message: WorkerRequest): void {
    this.posted.push(message);
    queueMicrotask(() => this.behavior(message, this));
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(data: unknown): void {
    if (!this.terminated) this.onmessage?.({ data });
  }
}

function factory(behavior: Behavior) {
  const workers: FakeWorker[] = [];
  return {
    workers,
    createWorker: () => {
      const worker = new FakeWorker(behavior);
      workers.push(worker);
      return worker;
    },
  };
}

const ok = (output: unknown) => ({ ok: true as const, output: JSON.stringify(output), ms: 0.5, logs: [] as string[] });

/** Answers every run with the given outputs; Python preloads report ready. */
function answering(outputs: unknown[]): Behavior {
  return (message, worker) => {
    if (message.type === "preload") {
      worker.emit({ type: "status", status: "loading-python" });
      worker.emit({ type: "status", status: "python-ready" });
      return;
    }
    if (message.language === "python") worker.emit({ type: "status", status: "python-ready" });
    worker.emit({ type: "started", id: message.id });
    worker.emit({ type: "result", id: message.id, raw: outputs.map(ok) });
  };
}

const STAGE: Pick<CodeStage, "functionName" | "tests" | "compare"> = {
  functionName: "add",
  compare: "exact",
  tests: [
    { args: [1, 2], expected: 3 },
    { args: [2, 2], expected: 4 },
    { args: [5, 5], expected: 10, hidden: true },
  ],
};

describe("planTests", () => {
  it("runs visible tests only and submits everything", () => {
    const run = planTests(STAGE, "run");
    expect(run.indices).toEqual([0, 1]);
    expect(run.stage.tests).toHaveLength(2);
    const submit = planTests(STAGE, "submit");
    expect(submit.indices).toEqual([0, 1, 2]);
  });

  it("falls back to all tests when none are visible", () => {
    const hiddenOnly = { compare: "exact" as const, tests: [{ args: [1], expected: 1, hidden: true }] };
    expect(planTests(hiddenOnly, "run").indices).toEqual([0]);
  });
});

describe("JudgeClient", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends JS as core's runner source to a fresh worker per run and terminates it afterwards", async () => {
    const { workers, createWorker } = factory(answering([3, 4]));
    const client = new JudgeClient({ createWorker });
    const outcome = await judgeCode(client, { stage: STAGE, mode: "run", language: "javascript", code: "function add(a, b) { return a + b; }" });

    expect(workers).toHaveLength(1);
    const message = workers[0]!.posted[0]!;
    expect(message).toMatchObject({ type: "run", language: "javascript", argsJson: "[[1,2],[2,2]]" });
    expect(message.type === "run" && message.language === "javascript" && message.source).toContain("function add(a, b)");
    expect(workers[0]!.terminated).toBe(true);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.report.status).toBe("accepted");
    expect(outcome.report.cases.map((c) => c.index)).toEqual([0, 1]);

    await judgeCode(client, { stage: STAGE, mode: "submit", language: "javascript", code: "function add(a, b) { return a + b; }" });
    expect(workers).toHaveLength(2);
  });

  it("compares on the main thread and maps subset indices back to the original tests", async () => {
    const { createWorker } = factory(answering([3, 4, 11]));
    const client = new JudgeClient({ createWorker });
    const outcome = await judgeCode(client, { stage: STAGE, mode: "submit", language: "javascript", code: "function add(a,b){return a+b}" });
    expect(outcome.ok && outcome.report.status).toBe("wrong_answer");
    if (!outcome.ok) return;
    expect(outcome.report.passed).toBe(2);
    expect(firstFailure(outcome.report)).toBe(2);
    expect(outcome.report.cases[2]).toMatchObject({ index: 2, hidden: true, actual: 11, expected: 10, passed: false });
    expect(totalRuntime(outcome.report)).toBeCloseTo(1.5);
  });

  it("times out after the limit, terminates the worker, and recovers with a new one", async () => {
    let hang = true;
    const { workers, createWorker } = factory((message, worker) => {
      if (message.type !== "run") return;
      worker.emit({ type: "started", id: message.id });
      if (!hang) worker.emit({ type: "result", id: message.id, raw: [ok(3), ok(4)] });
    });
    const client = new JudgeClient({ createWorker, timeoutMs: 3000 });
    const pending = judgeCode(client, { stage: STAGE, mode: "run", language: "javascript", code: "function add(){ while(true){} }" });
    await vi.advanceTimersByTimeAsync(2999);
    expect(client.busy).toBe(true);
    await vi.advanceTimersByTimeAsync(2);
    const outcome = await pending;
    expect(outcome.ok && outcome.report.status).toBe("timeout");
    if (outcome.ok) expect(outcome.report.message).toBe(timeoutMessage(3000));
    expect(workers[0]!.terminated).toBe(true);
    expect(client.busy).toBe(false);

    hang = false;
    const next = await judgeCode(client, { stage: STAGE, mode: "run", language: "javascript", code: "function add(a,b){return a+b}" });
    expect(next.ok && next.report.status).toBe("accepted");
    expect(workers).toHaveLength(2);
  });

  it("does not count Pyodide's load time against the limit", async () => {
    const statuses: string[] = [];
    const { workers, createWorker } = factory((message, worker) => {
      if (message.type !== "run") return;
      worker.emit({ type: "status", status: "loading-python" });
      // Simulate a 10 s cold start before the code actually runs.
      setTimeout(() => {
        worker.emit({ type: "status", status: "python-ready" });
        worker.emit({ type: "started", id: message.id });
        worker.emit({ type: "result", id: message.id, raw: [ok(3), ok(4)], logs: ["loaded"] });
      }, 10_000);
    });
    const client = new JudgeClient({ createWorker, onPythonStatus: (status) => statuses.push(status) });
    const pending = judgeCode(client, { stage: STAGE, mode: "run", language: "python", code: "def add(a, b):\n    return a + b\n" });
    await vi.advanceTimersByTimeAsync(10_001);
    const outcome = await pending;
    expect(outcome.ok && outcome.report.status).toBe("accepted");
    if (outcome.ok) expect(outcome.setupLogs).toEqual(["loaded"]);
    expect(statuses).toEqual(["loading", "ready"]);
    expect(client.pythonStatus).toBe("ready");

    const message = workers[0]!.posted[0]!;
    expect(message).toMatchObject({ type: "run", language: "python", functionName: "add" });
    expect(message.type === "run" && message.language === "python" && message.harness).toContain("synapse_run_tests");
    expect(message.type === "run" && message.language === "python" && message.indexURL).toMatch(/pyodide\/v[\d.]+\/full\/$/);

    // The Python worker stays warm across runs.
    const second = judgeCode(client, { stage: STAGE, mode: "run", language: "python", code: "def add(a, b):\n    return a + b\n" });
    await vi.advanceTimersByTimeAsync(10_001);
    await expect(second).resolves.toMatchObject({ ok: true });
    expect(workers).toHaveLength(1);
    expect(workers[0]!.terminated).toBe(false);
  });

  it("restarts and re-warms Python after a timeout", async () => {
    const statuses: string[] = [];
    const { workers, createWorker } = factory((message, worker) => {
      if (message.type === "preload") {
        worker.emit({ type: "status", status: "python-ready" });
        return;
      }
      worker.emit({ type: "status", status: "python-ready" });
      worker.emit({ type: "started", id: message.id });
    });
    const client = new JudgeClient({ createWorker, onPythonStatus: (status) => statuses.push(status) });
    const pending = judgeCode(client, { stage: STAGE, mode: "run", language: "python", code: "while True: pass" });
    await vi.advanceTimersByTimeAsync(3001);
    const outcome = await pending;
    expect(outcome.ok && outcome.report.status).toBe("timeout");
    expect(workers[0]!.terminated).toBe(true);
    expect(workers).toHaveLength(2);
    expect(workers[1]!.posted[0]).toMatchObject({ type: "preload", language: "python" });
    await vi.advanceTimersByTimeAsync(0);
    expect(statuses).toEqual(["loading", "ready", "cold", "loading", "ready"]);
  });

  it("reports an unreachable Python runtime as an infrastructure error, not a user error", async () => {
    const { createWorker } = factory((message, worker) => {
      if (message.type !== "run") return;
      worker.emit({ type: "status", status: "python-error", message: "NetworkError" });
      worker.emit({ type: "load-error", id: message.id, message: "Could not load the Python runtime (Pyodide)." });
    });
    const client = new JudgeClient({ createWorker });
    const outcome = await judgeCode(client, { stage: STAGE, mode: "run", language: "python", code: "def add(a,b): return a+b" });
    expect(outcome).toMatchObject({ ok: false, reason: "runtime-unavailable" });
    expect(client.pythonStatus).toBe("error");
  });

  it("rejects overlapping runs and resolves in-flight runs on dispose", async () => {
    const { workers, createWorker } = factory(() => undefined);
    const client = new JudgeClient({ createWorker });
    const first = client.run({ language: "javascript", code: "function add(){}", functionName: "add", argsJson: "[]" });
    const second = await client.run({ language: "javascript", code: "function add(){}", functionName: "add", argsJson: "[]" });
    expect(second).toMatchObject({ ok: false, reason: "busy" });
    client.dispose();
    await expect(first).resolves.toMatchObject({ ok: false, reason: "disposed" });
    expect(workers[0]!.terminated).toBe(true);
    await expect(client.run({ language: "javascript", code: "", functionName: "add", argsJson: "[]" })).resolves.toMatchObject({
      reason: "disposed",
    });
  });

  it("turns a worker crash during execution into a runtime error", async () => {
    const { createWorker } = factory((message, worker) => {
      if (message.type !== "run") return;
      worker.emit({ type: "started", id: message.id });
      worker.onerror?.({ message: "Out of memory" });
    });
    const client = new JudgeClient({ createWorker });
    const outcome = await judgeCode(client, { stage: STAGE, mode: "run", language: "javascript", code: "function add(){}" });
    expect(outcome.ok && outcome.report.status).toBe("runtime_error");
    if (outcome.ok) expect(outcome.report.message).toBe("Out of memory");
  });

  it("gives up if a worker never boots", async () => {
    const { createWorker } = factory(() => undefined);
    const client = new JudgeClient({ createWorker, bootTimeoutMs: 1000 });
    const pending = client.run({ language: "javascript", code: "function add(){}", functionName: "add", argsJson: "[]" });
    await vi.advanceTimersByTimeAsync(1001);
    await expect(pending).resolves.toMatchObject({ ok: false, reason: "runtime-unavailable" });
  });
});

describe("normalizeRaw", () => {
  it("accepts well-formed results and failures", () => {
    expect(normalizeRaw([{ ok: true, output: "1", ms: 1, logs: ["x"] }])).toEqual([{ ok: true, output: "1", ms: 1, logs: ["x"] }]);
    expect(normalizeRaw({ kind: "compile", message: "SyntaxError" })).toEqual({ kind: "compile", message: "SyntaxError" });
  });

  it("rejects malformed payloads", () => {
    expect(normalizeRaw([{ nope: true }])).toMatchObject({ kind: "runtime" });
    expect(normalizeRaw(null)).toMatchObject({ kind: "runtime" });
    expect(normalizeRaw({ kind: "weird" })).toEqual({ kind: "runtime", message: "Execution failed." });
    expect(normalizeRaw([{ ok: true, output: "1" }])).toEqual([{ ok: true, output: "1", ms: 0, logs: [] }]);
  });
});

describe("format helpers", () => {
  it("formats values and arguments like LeetCode", () => {
    expect(formatValue("abc")).toBe('"abc"');
    expect(formatValue([[1, 2], [3]])).toBe("[[1,2],[3]]");
    expect(formatValue(undefined)).toBe("undefined");
    expect(formatValue("x".repeat(50), 10)).toBe('"xxxxxxxx…');
    expect(formatArgs(["nums", "k"], [[1, 2], 2])).toBe("nums = [1,2], k = 2");
    expect(formatArgs([], [1])).toBe("arg1 = 1");
  });

  it("formats runtimes", () => {
    expect(formatMs(0.001)).toBe("<0.01 ms");
    expect(formatMs(0.042)).toBe("0.04 ms");
    expect(formatMs(12.3)).toBe("12 ms");
    expect(formatMs(1530)).toBe("1.53 s");
    expect(formatMs(undefined)).toBe("—");
  });

  it("summarizes reports", () => {
    expect(summarizeReport({ status: "wrong_answer", passed: 5, total: 9, cases: [] })).toBe("Wrong answer: 5 of 9 tests passed.");
    expect(summarizeReport({ status: "timeout", passed: 0, total: 9, cases: [], message: "Stopped." })).toBe(
      "Time limit exceeded. Stopped.",
    );
  });
});
