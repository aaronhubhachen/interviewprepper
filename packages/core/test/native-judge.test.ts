import { beforeAll, describe, expect, it } from "vitest";
import { getProblem, listProblems, nativeReference } from "../src/content";
import { judgeResults, nativeStarter, testArgsJson, type NativeLanguage } from "../src/judge";
import { nativeToolchains, runNativeTests } from "../src/judge/native-runner";

const TIMEOUT = 120_000;
let available: Record<NativeLanguage, boolean> = { java: false, cpp: false, go: false, typescript: false };

beforeAll(async () => {
  available = await nativeToolchains();
}, TIMEOUT);

async function judge(problemId: string, language: NativeLanguage, code: string) {
  const problem = getProblem(problemId)!;
  const stage = problem.stages.code;
  const raw = await runNativeTests(language, code, stage, testArgsJson(stage));
  return judgeResults(stage, raw);
}

const starterOf = (id: string, language: NativeLanguage) => nativeStarter(getProblem(id)!.stages.code, language);

const LANGUAGES: NativeLanguage[] = ["java", "cpp", "go", "typescript"];


for (const language of LANGUAGES) {
  describe.concurrent(`native judge: ${language}`, () => {
    for (const problem of listProblems()) {
      it(`accepts the reference for ${problem.id}`, async ({ skip }) => {
        if (!available[language]) skip();
        const reference = nativeReference(problem.id, language);
        expect(reference, `${problem.id} has a ${language} reference`).toBeDefined();
        const report = await judge(problem.id, language, reference!);
        expect(report.cases.filter((c) => !c.passed).map((c) => `${c.index}: ${c.error ?? JSON.stringify(c.actual)}`), report.message).toEqual([]);
        expect(report.status).toBe("accepted");
      }, TIMEOUT);
    }

    for (const problem of listProblems()) {
      it(`compiles and runs the starter for ${problem.id} (without passing)`, async ({ skip }) => {
        if (!available[language]) skip();
        const report = await judge(problem.id, language, starterOf(problem.id, language));
        expect(report.status, report.message).not.toBe("compile_error");
        expect(report.status).not.toBe("accepted");
      }, TIMEOUT);
    }
  });
}

describe.concurrent("native judge: failures", () => {
  it("maps Java compile errors to the user's line numbers", async ({ skip }) => {
    if (!available.java) skip();
    const code = "class Solution {\n    public boolean isValid(String s) {\n        return undefinedThing;\n    }\n}";
    const report = await judge("p-valid-parentheses", "java", code);
    expect(report.status).toBe("compile_error");
    expect(report.message).toContain("Solution.java:3");
    expect(report.message).not.toContain("prepr-judge");
  }, TIMEOUT);

  it("reports C++ compile errors in solution.cpp", async ({ skip }) => {
    if (!available.cpp) skip();
    const report = await judge("p-valid-parentheses", "cpp", "class Solution {\npublic:\n    bool isValid(string s) { return nope; }\n};");
    expect(report.status).toBe("compile_error");
    expect(report.message).toMatch(/solution\.cpp:3/);
  }, TIMEOUT);

  it("captures per-test prints and exceptions with a line number (Java)", async ({ skip }) => {
    if (!available.java) skip();
    const code = `class Solution {
    public boolean isValid(String s) {
        System.out.println("len=" + s.length());
        if (s.length() > 2) throw new IllegalStateException("boom");
        return true;
    }
}`;
    const report = await judge("p-valid-parentheses", "java", code);
    expect(report.cases[0]!.logs).toEqual(["len=2"]);
    const thrown = report.cases.find((c) => c.error);
    expect(thrown?.error).toContain("IllegalStateException: boom (line 4)");
  }, TIMEOUT);

  it("recovers Go panics per test and captures fmt output", async ({ skip }) => {
    if (!available.go) skip();
    const code = `import "fmt"

func isValid(s string) bool {
	fmt.Println("checking", s)
	if len(s) > 2 {
		var empty []int
		return empty[5] == 0
	}
	return true
}`;
    const report = await judge("p-valid-parentheses", "go", code);
    expect(report.cases[0]!.logs).toEqual(["checking ()"]);
    expect(report.cases.find((c) => c.error)?.error).toContain("panic");
  }, TIMEOUT);

  it("stops infinite loops at the time limit", async ({ skip }) => {
    if (!available.cpp) skip();
    const problem = getProblem("p-valid-parentheses")!;
    const raw = await runNativeTests(
      "cpp",
      "class Solution {\npublic:\n    bool isValid(string s) { volatile int x = 0; while (true) x++; return false; }\n};",
      problem.stages.code,
      testArgsJson(problem.stages.code),
      { runTimeoutMs: 1_500 },
    );
    expect(raw).toMatchObject({ kind: "timeout" });
  }, TIMEOUT);

  it("reports a segfault as a runtime error", async ({ skip }) => {
    if (!available.cpp) skip();
    const report = await judge("p-valid-parentheses", "cpp", "class Solution {\npublic:\n    bool isValid(string s) { int* volatile p = nullptr; *p = 1; return true; }\n};");
    expect(report.status).toBe("runtime_error");
  }, TIMEOUT);

  it("does not leak server secrets into user code", async ({ skip }) => {
    if (!available.typescript) skip();
    process.env.PREPR_TEST_SECRET = "hunter2";
    const code = 'function isValid(s: string): boolean { console.log(String(process.env.PREPR_TEST_SECRET)); return true; }';
    const report = await judge("p-valid-parentheses", "typescript", code);
    expect(report.cases[0]!.logs).toEqual(["undefined"]);
    delete process.env.PREPR_TEST_SECRET;
  }, TIMEOUT);
});
