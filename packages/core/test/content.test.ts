/**
 * Validates ALL content (seed or agent-authored). Content files may be replaced
 * wholesale; these rules are the contract they must satisfy.
 */
import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "vitest";
import {
  allCards,
  getCard,
  getProblem,
  isTag,
  listBehavioral,
  listMicroCards,
  listProblems,
  type KeyPoint,
  type StagePrompt,
} from "../src/content";
import { heuristicEvaluation } from "../src/grading";
import { buildJsRunner, PYODIDE_VERSION, runJsTests } from "../src/judge";
import { loadPythonRunner, type PythonRunner } from "./support/pyodide";

const KEBAB = (prefix: string) => new RegExp(`^${prefix}-[a-z0-9]+(?:-[a-z0-9]+)*$`);
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** iMessage renders plain text: markdown and LaTeX would show up literally. */
const NOT_PLAIN_TEXT = /\*\*|__|`|\$/;

const micro = listMicroCards();
const problems = listProblems();
const behavioral = listBehavioral();

function expectKeyPoints(where: string, keyPoints: KeyPoint[]) {
  expect(keyPoints.length, `${where}: 2-5 key points`).toBeGreaterThanOrEqual(2);
  expect(keyPoints.length, `${where}: 2-5 key points`).toBeLessThanOrEqual(5);
  for (const point of keyPoints) {
    expect(point.label.trim(), `${where}: key point label`).not.toBe("");
    expect(point.anyOf.length, `${where}: "${point.label}" needs synonyms`).toBeGreaterThan(0);
    for (const phrase of point.anyOf) {
      expect(phrase.trim(), `${where}: empty phrase in "${point.label}"`).not.toBe("");
      expect(phrase, `${where}: phrases must be lowercase`).toBe(phrase.toLowerCase());
    }
  }
}

function expectPlainText(where: string, ...texts: string[]) {
  for (const text of texts) {
    expect(text.trim(), `${where}: empty text`).not.toBe("");
    expect(text, `${where}: markdown/LaTeX in "${text.slice(0, 60)}"`).not.toMatch(NOT_PLAIN_TEXT);
  }
}

function expectAnswerKeyRecognized(where: string, stage: Pick<StagePrompt, "prompt" | "answerKey" | "keyPoints">) {
  const result = heuristicEvaluation({
    question: stage.prompt,
    answerKey: stage.answerKey,
    keyPoints: stage.keyPoints,
    answer: stage.answerKey,
  });
  expect(result.verdict, `${where}: the answer key itself should grade as correct; missed ${result.missed.join(", ")}`).toBe(
    "correct",
  );
}

describe("content registry", () => {
  it("has content in every collection", () => {
    expect(micro.length).toBeGreaterThan(0);
    expect(problems.length).toBeGreaterThan(0);
    expect(behavioral.length).toBeGreaterThan(0);
  });

  it("uses unique, stable, prefixed kebab-case ids", () => {
    const cardIds = allCards().map((card) => card.id);
    expect(new Set(cardIds).size).toBe(cardIds.length);
    for (const card of micro) expect(card.id).toMatch(KEBAB("mc"));
    for (const problem of problems) expect(problem.id).toMatch(KEBAB("p"));
    const behavioralIds = behavioral.map((question) => question.id);
    expect(new Set(behavioralIds).size).toBe(behavioralIds.length);
    for (const id of behavioralIds) expect(id).toMatch(KEBAB("bq"));
  });

  it("keeps every reviewable prompt iMessage-sized", () => {
    for (const card of allCards()) {
      expect(card.prompt.length, `${card.id} prompt is ${card.prompt.length} chars`).toBeLessThanOrEqual(280);
    }
  });

  it("resolves cards by id and problems by id or slug", () => {
    for (const card of allCards()) expect(getCard(card.id)).toBe(card);
    for (const problem of problems) {
      expect(getProblem(problem.id)).toBe(problem);
      expect(getProblem(problem.leetcodeSlug)).toBe(problem);
    }
  });
});

describe.each(micro.map((card) => [card.id, card] as const))("micro-card %s", (id, card) => {
  it("is well-formed", () => {
    expect(card.title.trim()).not.toBe("");
    expect(card.tags.length).toBeGreaterThan(0);
    for (const tag of card.tags) expect(isTag(tag), `${id}: unknown tag ${tag}`).toBe(true);
    expect([1, 2, 3]).toContain(card.difficulty);
    expectKeyPoints(id, card.keyPoints);
    expectPlainText(id, card.title, card.prompt, card.answerKey, card.hint, card.explanation);
    if (card.relatedProblem) {
      expect(card.relatedProblem.title.trim()).not.toBe("");
      expect(card.relatedProblem.leetcodeSlug).toMatch(SLUG);
    }
  });

  it("has key points that recognize its own answer key", () => {
    expectAnswerKeyRecognized(id, card);
  });
});

describe.each(problems.map((problem) => [problem.id, problem] as const))("problem %s", (id, problem) => {
  const { invariant, edgeCase, code } = problem.stages;

  it("is well-formed", () => {
    expect(problem.title.trim()).not.toBe("");
    expect(problem.leetcodeSlug).toMatch(SLUG);
    expect(["easy", "medium", "hard"]).toContain(problem.difficulty);
    expect(problem.statement.trim()).not.toBe("");
    expect(problem.examples.length).toBeGreaterThan(0);
    expect(problem.constraints.length).toBeGreaterThan(0);
    for (const tag of [...problem.tags, ...problem.weakTags]) expect(isTag(tag), `${id}: unknown tag ${tag}`).toBe(true);
    expect(problem.tags.length).toBeGreaterThan(0);
    expect(problem.weakTags.length).toBeGreaterThan(0);
  });

  it("has iMessage-safe Stage 1 and Stage 2 prompts whose keys grade as correct", () => {
    for (const [stageName, stage] of [
      ["invariant", invariant],
      ["edgeCase", edgeCase],
    ] as const) {
      const where = `${id}.${stageName}`;
      expectKeyPoints(where, stage.keyPoints);
      expectPlainText(where, stage.prompt, stage.hint);
      expect(stage.prompt.length, `${where} prompt length`).toBeLessThanOrEqual(280);
      expectAnswerKeyRecognized(where, stage);
    }
  });

  it("links related micro-cards that exist", () => {
    for (const cardId of problem.relatedCardIds) {
      expect(getCard(cardId)?.kind, `${id}: relatedCardIds must reference micro-cards (${cardId})`).toBe("micro");
    }
  });

  it("has JSON-only tests that match the declared parameters", () => {
    expect(code.functionName).toMatch(/^[A-Za-z_$][\w$]*$/);
    expect(code.tests.length, `${id}: at least 5 tests`).toBeGreaterThanOrEqual(5);
    for (const test of code.tests) {
      expect(test.args).toHaveLength(code.params.length);
      expect(JSON.parse(JSON.stringify(test))).toEqual(test);
    }
  });

  it("passes every test with the JavaScript reference; the starter compiles but does not", () => {
    const reference = runJsTests(code.reference.javascript, code);
    const failures = reference.cases.filter((testCase) => !testCase.passed);
    expect(failures, `${id}: JS reference failures`).toEqual([]);
    expect(() => new Function(buildJsRunner(code.starter.javascript, code.functionName))()).not.toThrow();
    expect(runJsTests(code.starter.javascript, code).status).not.toBe("accepted");
  });
});

describe("Python references (Pyodide)", () => {
  let python: PythonRunner | null = null;
  beforeAll(async () => {
    python = await loadPythonRunner();
  }, 120_000);

  it.for(problems.map((problem) => [problem.id, problem] as const))("%s passes with the Python reference", ([id, problem], ctx) => {
    if (!python) return ctx.skip();
    const { code } = problem.stages;
    const reference = python.runTests(code.reference.python, code);
    expect(reference.cases.filter((testCase) => !testCase.passed), `${id}: Python reference failures`).toEqual([]);
    const starter = python.runTests(code.starter.python, code);
    expect(starter.status, `${id}: Python starter must load`).not.toBe("compile_error");
    expect(starter.status).not.toBe("accepted");
  });

  it("pins PYODIDE_VERSION to the installed pyodide package", () => {
    const installed = createRequire(import.meta.url)("pyodide/package.json") as { version: string };
    expect(PYODIDE_VERSION).toBe(installed.version);
  });
});

describe.each(behavioral.map((question) => [question.id, question] as const))("behavioral %s", (id, question) => {
  it("is well-formed", () => {
    expect(question.prompt.trim()).not.toBe("");
    expect(question.competency.trim()).not.toBe("");
    expect(question.followUps.length, `${id}: follow-ups`).toBeGreaterThan(0);
    expect(question.lookFor.length, `${id}: lookFor`).toBeGreaterThanOrEqual(2);
    expect(question.redFlags.length, `${id}: redFlags`).toBeGreaterThanOrEqual(2);
  });
});
