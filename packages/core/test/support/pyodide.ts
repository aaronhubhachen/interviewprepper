import { createRequire } from "node:module";
import path from "node:path";
import type { CodeStage } from "../../src/content/types";
import {
  judgeResults,
  PYTHON_HARNESS,
  testArgsJson,
  type JudgeReport,
  type RawTestResult,
  type RunFailure,
} from "../../src/judge";

type RunTests = ((code: string, functionName: string, argsListJson: string) => string) & { destroy?: () => void };

export interface PythonRunner {
  runTests(code: string, stage: Pick<CodeStage, "functionName" | "tests" | "compare">): JudgeReport;
}

let loading: Promise<PythonRunner | null> | undefined;

/**
 * Loads Pyodide from the local npm package (no network needed) once per test
 * file and installs PYTHON_HARNESS. Resolves null — with a clear warning — when
 * Pyodide cannot load, so Python checks skip instead of failing.
 */
export function loadPythonRunner(): Promise<PythonRunner | null> {
  loading ??= (async () => {
    try {
      const { loadPyodide } = await import("pyodide");
      // Explicit indexURL: Pyodide infers its location from stack traces, which Vitest source-maps away.
      const packageDir = path.dirname(createRequire(import.meta.url).resolve("pyodide/package.json"));
      const pyodide = await loadPyodide({ indexURL: `${packageDir}${path.sep}` });
      pyodide.runPython(PYTHON_HARNESS);
      const run = pyodide.globals.get("synapse_run_tests") as RunTests;
      return {
        runTests(code, stage) {
          const raw = JSON.parse(run(code, stage.functionName, testArgsJson(stage))) as RawTestResult[] | RunFailure;
          return judgeResults(stage, raw);
        },
      };
    } catch (error) {
      console.warn(`[synapse] Pyodide unavailable, skipping Python checks: ${(error as Error).message}`);
      return null;
    }
  })();
  return loading;
}
