import { beforeAll, describe, expect, it } from "vitest";
import type { CodeStage } from "../src/content/types";
import { buildJsHarness, buildJsRunner, compareOutput, judgeResults, runJsTests } from "../src/judge";
import { loadPythonRunner, type PythonRunner } from "./support/pyodide";

const TWO_SUM: Pick<CodeStage, "functionName" | "tests" | "compare"> = {
  functionName: "twoSum",
  compare: "unordered",
  tests: [
    { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
    { args: [[3, 2, 4], 6], expected: [1, 2] },
    { args: [[3, 3], 6], expected: [1, 0], hidden: true },
  ],
};

const TWO_SUM_JS = `function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];
    seen.set(nums[i], i);
  }
  return [];
}`;

describe("compareOutput", () => {
  it("exact: deep structural equality", () => {
    expect(compareOutput([1, [2, { a: 3 }]], [1, [2, { a: 3 }]], "exact")).toBe(true);
    expect(compareOutput({ a: 1, b: 2 }, { b: 2, a: 1 }, "exact")).toBe(true);
    expect(compareOutput([1, 2], [2, 1], "exact")).toBe(false);
    expect(compareOutput(1, "1", "exact")).toBe(false);
    expect(compareOutput(null, [], "exact")).toBe(false);
  });

  it("unordered: top-level multiset, inner order significant", () => {
    expect(compareOutput([3, 1, 2], [1, 2, 3], "unordered")).toBe(true);
    expect(compareOutput([1, 1, 2], [1, 2, 2], "unordered")).toBe(false);
    expect(compareOutput([[1, 2], [3]], [[3], [1, 2]], "unordered")).toBe(true);
    expect(compareOutput([[2, 1]], [[1, 2]], "unordered")).toBe(false);
    expect(compareOutput(5, 5, "unordered")).toBe(true);
  });

  it("unordered-nested: sorts inner arrays, then the outer list", () => {
    expect(compareOutput([["eat", "tea"], ["bat"]], [["bat"], ["tea", "eat"]], "unordered-nested")).toBe(true);
    expect(compareOutput([[1, 2]], [[1, 3]], "unordered-nested")).toBe(false);
    expect(compareOutput([[1, 2], [1, 2]], [[2, 1]], "unordered-nested")).toBe(false);
  });

  it("float: 1e-5 tolerance, recursively", () => {
    expect(compareOutput(0.3333333, 1 / 3, "float")).toBe(true);
    expect(compareOutput([1.000001, [2.5]], [1, [2.500004]], "float")).toBe(true);
    expect(compareOutput(0.3334, 1 / 3, "float")).toBe(false);
    expect(compareOutput(1e9 + 1, 1e9, "float")).toBe(true);
  });
});

describe("JS harness", () => {
  it("returns the named function for declarations, function expressions, and arrows", () => {
    for (const code of [
      "function add(a, b) { return a + b; }",
      "var add = function (a, b) { return a + b; };",
      "const add = (a, b) => a + b;",
    ]) {
      const add = new Function(buildJsHarness(code, "add"))() as (a: number, b: number) => number;
      expect(add(2, 3)).toBe(5);
    }
  });

  it("rejects missing functions and unsafe names", () => {
    expect(() => new Function(buildJsHarness("const x = 1;", "add"))()).toThrow(/Define a function named add/);
    expect(() => buildJsHarness("", "a; alert(1)")).toThrow(/Invalid function name/);
  });

  it("runner returns raw JSON results with captured logs and per-test errors", () => {
    const code = `function f(x) { console.log("x is", x, { k: 1 }); if (x < 0) throw new RangeError("negative"); return x * 2; }`;
    const run = new Function(buildJsRunner(code, "f"))() as (argsJson: string) => string;
    const [ok, failed] = JSON.parse(run(JSON.stringify([[2], [-1]])));
    expect(ok).toMatchObject({ ok: true, output: "4", logs: ['x is 2 {"k":1}'] });
    expect(failed).toMatchObject({ ok: false, error: "RangeError: negative", logs: ["x is -1 {\"k\":1}"] });
  });
});

describe("runJsTests & judgeResults", () => {
  it("accepts a correct solution", () => {
    const report = runJsTests(TWO_SUM_JS, TWO_SUM);
    expect(report).toMatchObject({ status: "accepted", passed: 3, total: 3 });
    expect(report.cases[2]).toMatchObject({ hidden: true, passed: true, actual: [0, 1] });
  });

  it("reports wrong answers, runtime errors, and compile errors", () => {
    expect(runJsTests("function twoSum() { return [0, 0]; }", TWO_SUM).status).toBe("wrong_answer");
    expect(runJsTests("function twoSum(n) { return n.nope.x; }", TWO_SUM).status).toBe("runtime_error");
    const compile = runJsTests("function twoSum( {", TWO_SUM);
    expect(compile.status).toBe("compile_error");
    expect(compile.cases.every((testCase) => !testCase.passed && testCase.error)).toBe(true);
    expect(runJsTests("throw new Error('boom');", TWO_SUM).status).toBe("runtime_error");
  });

  it("maps executor failures such as timeouts onto every case", () => {
    const report = judgeResults(TWO_SUM, { kind: "timeout", message: "Time limit exceeded (2s)" });
    expect(report).toMatchObject({ status: "timeout", passed: 0, total: 3, message: "Time limit exceeded (2s)" });
  });

  it("treats missing or unparseable outputs as failures", () => {
    const report = judgeResults(TWO_SUM, [{ ok: true, output: "not json", ms: 1, logs: [] }]);
    expect(report.cases[0]!.error).toMatch(/JSON/);
    expect(report.cases[1]!.error).toMatch(/No result/);
    expect(report.status).toBe("runtime_error");
  });
});

describe("PYTHON_HARNESS (Pyodide)", () => {
  let python: PythonRunner | null = null;
  beforeAll(async () => {
    python = await loadPythonRunner();
  }, 120_000);

  it("runs top-level functions and Solution classes", (ctx) => {
    if (!python) return ctx.skip();
    const topLevel = `def twoSum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i\n`;
    expect(python.runTests(topLevel, TWO_SUM).status).toBe("accepted");
    const leetcodeStyle = `class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        seen = defaultdict(int)\n        for i, n in enumerate(nums):\n            if target - n in seen:\n                return (seen[target - n], i)\n            seen[n] = i\n`;
    expect(python.runTests(leetcodeStyle, TWO_SUM).status).toBe("accepted");
  });

  it("captures stdout and reports errors with line numbers", (ctx) => {
    if (!python) return ctx.skip();
    const code = `def twoSum(nums, target):\n    print("len", len(nums))\n    return nums[99]\n`;
    const report = python.runTests(code, TWO_SUM);
    expect(report.status).toBe("runtime_error");
    expect(report.cases[0]).toMatchObject({ logs: ["len 4"], error: "IndexError: list index out of range (line 3)" });
  });

  it("reports syntax errors as compile errors and missing functions as runtime errors", (ctx) => {
    if (!python) return ctx.skip();
    const syntax = python.runTests("def twoSum(:\n  pass", TWO_SUM);
    expect(syntax.status).toBe("compile_error");
    expect(syntax.message).toMatch(/SyntaxError.*line 1/);
    const missing = python.runTests("x = 1", TWO_SUM);
    expect(missing.status).toBe("runtime_error");
    expect(missing.message).toMatch(/NameError: Define a function named twoSum/);
  });
});
