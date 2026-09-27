/**
 * Server-side executor for Java / C++ / Go / TypeScript. Compiles the generated program
 * in a throwaway directory, runs it with a time and output limit, and returns the same
 * RawTestResult[] | RunFailure contract as the browser worker. Node only (not in browser.ts).
 */
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { CodeStage } from "../content/types";
import { buildNativeProgram, NATIVE_LANGUAGES, NATIVE_RESULT_MARKER, type NativeLanguage, type NativeProgram } from "./native";
import type { RawTestResult, RunFailure } from "./results";

const COMPILE_TIMEOUT_MS = 60_000;
const RUN_TIMEOUT_MS = 10_000;
const MAX_OUTPUT_BYTES = 2_000_000;
const MAX_MESSAGE_CHARS = 4_000;
const MAX_CONCURRENT = 2;

interface ExecResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  missing: boolean;
}

/** Only what toolchains need: user code never sees API keys or other secrets from the server's env. */
function sandboxEnv(dir: string): NodeJS.ProcessEnv {
  const env: Record<string, string | undefined> = { PATH: process.env.PATH, HOME: process.env.HOME, LANG: "en_US.UTF-8", TMPDIR: dir };
  for (const key of ["GOCACHE", "GOPATH", "GOROOT", "JAVA_HOME"]) if (process.env[key]) env[key] = process.env[key];
  return env as NodeJS.ProcessEnv;
}

function exec(command: string, args: string[], options: { cwd: string; input?: string; timeoutMs: number }): Promise<ExecResult> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let size = 0;
    let timedOut = false;
    let settled = false;
    const child = spawn(command, args, { cwd: options.cwd, env: sandboxEnv(options.cwd), detached: true, stdio: ["pipe", "pipe", "pipe"] });
    const killGroup = () => {
      try {
        if (child.pid) process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    };
    const timer = setTimeout(() => {
      timedOut = true;
      killGroup();
    }, options.timeoutMs);
    const collect = (target: "stdout" | "stderr") => (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_OUTPUT_BYTES) {
        killGroup();
        return;
      }
      if (target === "stdout") stdout += chunk.toString("utf8");
      else stderr += chunk.toString("utf8");
    };
    child.stdout.on("data", collect("stdout"));
    child.stderr.on("data", collect("stderr"));
    child.on("error", (error: NodeJS.ErrnoException) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code: null, signal: null, stdout, stderr: stderr || error.message, timedOut, missing: error.code === "ENOENT" });
    });
    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr, timedOut, missing: false });
    });
    child.stdin.on("error", () => {});
    child.stdin.end(options.input ?? "");
  });
}

let active = 0;
const waiting: Array<() => void> = [];

async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((resolve) => waiting.push(resolve));
  active++;
  try {
    return await task();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

const CPP_COMPILERS = ["clang++", "g++"];

interface Toolchain {
  compile?: (dir: string) => { command: string; args: string[] };
  run: (dir: string) => { command: string; args: string[] };
}

function toolchain(language: NativeLanguage, cpp: string): Toolchain {
  switch (language) {
    case "java":
      return {
        compile: () => ({ command: "javac", args: ["-encoding", "UTF-8", "-nowarn", "-d", ".", "Main.java", "Solution.java"] }),
        run: () => ({ command: "java", args: ["-Xss64m", "-Xmx512m", "-XX:+UseSerialGC", "-XX:TieredStopAtLevel=1", "-cp", ".", "Main"] }),
      };
    case "cpp":
      return {
        compile: () => ({ command: cpp, args: ["-std=c++17", "-O2", "-w", "-I", ".", "-o", "prog", "main.cpp"] }),
        run: (dir) => ({ command: path.join(dir, "prog"), args: [] }),
      };
    case "go":
      return {
        compile: () => ({ command: "go", args: ["build", "-o", "prog", "harness.go", "solution.go"] }),
        run: (dir) => ({ command: path.join(dir, "prog"), args: [] }),
      };
    case "typescript":
      return { run: () => ({ command: process.execPath, args: ["--experimental-strip-types", "--no-warnings", "main.ts"] }) };
  }
}

function tidyMessage(text: string, dir: string, program: NativeProgram): string {
  const escaped = program.userFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const cleaned = text
    .split(dir + path.sep)
    .join("")
    .split(dir)
    .join("")
    .replace(/(^|[\s(])\.\//gm, "$1")
    .replace(new RegExp(`${escaped}:(\\d+)`, "g"), (_, line: string) => `${program.userFile}:${Math.max(1, Number(line) - program.userLineOffset)}`)
    .trim();
  return cleaned.length > MAX_MESSAGE_CHARS ? `${cleaned.slice(0, MAX_MESSAGE_CHARS)}\n…` : cleaned;
}

function signalMessage(signal: NodeJS.Signals | null, code: number | null): string {
  if (signal === "SIGSEGV" || code === 139) return "Segmentation fault (invalid memory access, often an out-of-bounds index or a null pointer).";
  if (signal === "SIGABRT" || code === 134) return "Aborted (an assertion failed or an exception escaped).";
  if (signal === "SIGFPE") return "Arithmetic error (division by zero?).";
  if (signal) return `Process killed by ${signal}.`;
  return `Process exited with code ${code}.`;
}

function isRawTestResult(value: unknown): value is RawTestResult {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  if (typeof entry.ok !== "boolean") return false;
  return entry.ok ? typeof entry.output === "string" : typeof entry.error === "string";
}

function parseResults(stdout: string): RawTestResult[] | null {
  const at = stdout.lastIndexOf(NATIVE_RESULT_MARKER);
  if (at < 0) return null;
  try {
    const parsed: unknown = JSON.parse(stdout.slice(at + NATIVE_RESULT_MARKER.length));
    if (!Array.isArray(parsed) || !parsed.every(isRawTestResult)) return null;
    return parsed.map((entry) => ({
      ...entry,
      ms: typeof entry.ms === "number" && Number.isFinite(entry.ms) ? Math.round(entry.ms * 1000) / 1000 : 0,
      logs: Array.isArray(entry.logs) ? entry.logs.map(String).slice(-50) : [],
    }));
  } catch {
    return null;
  }
}

let cppCompiler: Promise<string | null> | null = null;

function findCppCompiler(): Promise<string | null> {
  cppCompiler ??= (async () => {
    for (const candidate of CPP_COMPILERS) {
      const result = await exec(candidate, ["--version"], { cwd: os.tmpdir(), timeoutMs: 10_000 });
      if (!result.missing && result.code === 0) return candidate;
    }
    return null;
  })();
  return cppCompiler;
}

let toolchainCache: Promise<Record<NativeLanguage, boolean>> | null = null;

/** Which server languages have a working toolchain on this machine (cached for the process). */
export function nativeToolchains(): Promise<Record<NativeLanguage, boolean>> {
  toolchainCache ??= (async () => {
    const probe = async (command: string, args: string[]) => {
      const result = await exec(command, args, { cwd: os.tmpdir(), timeoutMs: 15_000 });
      return !result.missing && result.code === 0;
    };
    const [javac, java, go, cpp] = await Promise.all([
      probe("javac", ["-version"]),
      probe("java", ["-version"]),
      probe("go", ["version"]),
      findCppCompiler(),
    ]);
    const [major] = process.versions.node.split(".").map(Number);
    return { java: javac && java, cpp: cpp !== null, go, typescript: (major ?? 0) >= 22 };
  })();
  return toolchainCache;
}

export interface NativeRunOptions {
  compileTimeoutMs?: number;
  runTimeoutMs?: number;
}

/**
 * Compiles and runs `code` against the given positional argument lists. Never throws for
 * user errors: compile errors, crashes, and time limits come back as a RunFailure.
 */
export async function runNativeTests(
  language: NativeLanguage,
  code: string,
  stage: Pick<CodeStage, "functionName" | "params" | "signature" | "nativeStarters">,
  argsJson: string,
  options: NativeRunOptions = {},
): Promise<RawTestResult[] | RunFailure> {
  if (!NATIVE_LANGUAGES.includes(language)) return { kind: "runtime", message: `Unsupported language: ${language}` };
  const program = buildNativeProgram(language, code, stage);
  const cpp = language === "cpp" ? await findCppCompiler() : "clang++";
  if (!cpp) return { kind: "runtime", message: "No C++ compiler (clang++ or g++) is installed on the server." };
  const chain = toolchain(language, cpp);

  return withSlot(async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "prepr-judge-"));
    try {
      for (const [name, contents] of Object.entries(program.files)) {
        const file = path.join(dir, name);
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, contents, "utf8");
      }

      if (chain.compile) {
        const { command, args } = chain.compile(dir);
        const compiled = await exec(command, args, { cwd: dir, timeoutMs: options.compileTimeoutMs ?? COMPILE_TIMEOUT_MS });
        if (compiled.missing) return { kind: "runtime", message: `The ${command} toolchain is not installed on the server.` };
        if (compiled.timedOut) return { kind: "compile", message: "Compilation took too long." };
        if (compiled.code !== 0) {
          return { kind: "compile", message: tidyMessage(compiled.stderr || compiled.stdout, dir, program) || "Compilation failed." };
        }
      }

      const { command, args } = chain.run(dir);
      const runTimeout = options.runTimeoutMs ?? RUN_TIMEOUT_MS;
      const ran = await exec(command, args, { cwd: dir, input: argsJson, timeoutMs: runTimeout });
      if (ran.timedOut) return { kind: "timeout", message: `Time limit exceeded (${runTimeout / 1000}s for all tests). Look for an infinite loop or a slower-than-expected algorithm.` };
      const results = parseResults(ran.stdout);
      if (results) return results;
      const stderr = tidyMessage(ran.stderr, dir, program);
      if (language === "typescript" && /SyntaxError|ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX|ERR_INVALID_TYPESCRIPT_SYNTAX/.test(stderr)) {
        return { kind: "compile", message: stderr };
      }
      const detail = signalMessage(ran.signal, ran.code);
      return { kind: "runtime", message: stderr ? `${detail}\n${stderr}` : detail };
    } finally {
      await rm(dir, { recursive: true, force: true }).catch(() => {});
    }
  });
}
