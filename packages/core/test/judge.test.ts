import { beforeAll, describe, expect, it } from "vitest";
import type { CodeStage } from "../src/content/types";
import { buildJsHarness, buildJsRunner, compareOutput, judgeResults, PYTHON_MAX_RECURSION, runJsTests } from "../src/judge";
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

  it("supports every console method and prints values as themselves", () => {
    const code = `console.log("loaded");
function f(x) {
  console.table([[1, 2]]); console.dir({ a: 1 }); console.trace("t"); console.count(); console.time("x"); console.timeEnd("x");
  console.group(); console.groupEnd(); console.assert(x > 5, "small", x);
  console.log(new Map([[1, 2]]), new Set([1]), undefined, NaN, -Infinity, -0, 10n, [undefined, "s"], function named() {});
  return x;
}`;
    const run = new Function(buildJsRunner(code, "f"))() as (argsJson: string) => string;
    const [first, second] = JSON.parse(run(JSON.stringify([[1], [2]])));
    expect(first.ok).toBe(true);
    expect(first.logs).toEqual([
      "loaded",
      "[[1,2]]",
      '{"a":1}',
      "t",
      "Assertion failed: small 1",
      'Map(1) {1 => 2} Set(1) {1} undefined NaN -Infinity -0 10n [undefined,"s"] [Function: named]',
    ]);
    expect(second.logs[0]).toBe("[[1,2]]");
  });

  it("reports non-JSON return values per test instead of null or a broken run", () => {
    const stage = {
      functionName: "f",
      compare: "exact" as const,
      tests: [
        { args: [0], expected: -1 },
        { args: [1], expected: 1 },
        { args: [2], expected: [1] },
        { args: [3], expected: [1] },
        { args: [4], expected: 1 },
      ],
    };
    const code = `function f(n) {
  if (n === 0) return Infinity;
  if (n === 1) return 1;
  if (n === 2) return new Set([1]);
  if (n === 3) return [1, NaN];
  return () => n;
}`;
    const report = runJsTests(code, stage);
    expect(report.status).toBe("runtime_error");
    expect(report.cases.map((testCase) => testCase.error ?? "passed")).toEqual([
      "Returned Infinity, which is not valid JSON.",
      "passed",
      "Returned a Set, which is not valid JSON.",
      "Returned NaN at [1], which is not valid JSON.",
      "Returned a function, which is not valid JSON.",
    ]);
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

  it("names the line of a syntax error once", (ctx) => {
    if (!python) return ctx.skip();
    expect(python.runTests("def twoSum(nums, target):\n    return nums +\n", TWO_SUM).message).toBe("SyntaxError: invalid syntax (line 2)");
    expect(python.runTests("def twoSum(nums, target):\nreturn 1\n", TWO_SUM).message).toBe(
      "IndentationError: expected an indented block after function definition on line 1 (line 2)",
    );
  });

  it("reports sys.exit() per test instead of failing the whole run", (ctx) => {
    if (!python) return ctx.skip();
    const report = python.runTests("import sys\ndef twoSum(nums, target):\n    if target == 6:\n        sys.exit(1)\n    return [0, 1]\n", TWO_SUM);
    expect(report.cases.map((testCase) => testCase.error ?? "passed")).toEqual(["passed", "SystemExit: 1 (line 4)", "SystemExit: 1 (line 4)"]);
    const topLevel = python.runTests("import sys\nsys.exit(0)\n", TWO_SUM);
    expect(topLevel).toMatchObject({ status: "runtime_error", message: "SystemExit: 0 (line 2)" });
    expect(python.runTests("def twoSum(nums, target):\n    exit()\n", TWO_SUM).cases[0]!.error).toBe("SystemExit (line 2)");
  });

  it("reports inf and nan returns as a per-test error that names the value", (ctx) => {
    if (!python) return ctx.skip();
    const stage = { functionName: "f", compare: "exact" as const, tests: [{ args: [0], expected: -1 }, { args: [1], expected: [1] }] };
    const report = python.runTests("def f(n):\n    return float('inf') if n == 0 else [1, float('nan')]\n", stage);
    expect(report.cases.map((testCase) => testCase.error)).toEqual([
      "Returned inf, which is not valid JSON.",
      "Returned nan, which is not valid JSON.",
    ]);
  });

  it("starts every run from a clean interpreter and caps the recursion limit", (ctx) => {
    if (!python) return ctx.skip();
    const stage = { functionName: "f", compare: "exact" as const, tests: [{ args: [1], expected: 1000 }] };
    // A LeetCode habit that used to stick to the warm worker...
    expect(python.runTests("import sys\nsys.setrecursionlimit(10**6)\ndef f(n):\n    return sys.getrecursionlimit()\n", stage).cases[0]!.actual).toBe(
      PYTHON_MAX_RECURSION,
    );
    expect(python.runTests("import sys\ndef f(n):\n    return sys.getrecursionlimit()\n", stage).status).toBe("accepted");
    // ...and turned infinite recursion into a fatal Pyodide crash. Now it is an ordinary RecursionError.
    const runaway = python.runTests("import sys\nsys.setrecursionlimit(10**6)\ndef f(n):\n    return f(n + 1)\n", stage);
    expect(runaway.cases[0]!.error).toMatch(/^RecursionError: .*caps recursion at 1500 levels.*\(line 4\)$/);
    // A hijacked sys.stdout does not leak into the next run.
    python.runTests("import sys, io\nsys.stdout = io.StringIO()\ndef f(n):\n    return 1\n", stage);
    const next = python.runTests("import sys, io\nHIJACKED = isinstance(sys.stdout, io.StringIO)\ndef f(n):\n    print('hi')\n    return HIJACKED\n", {
      ...stage,
      tests: [{ args: [1], expected: false }],
    });
    expect(next.cases[0]).toMatchObject({ passed: true, logs: ["hi"] });
  });
});
