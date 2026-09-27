import "server-only";

import {
  drillCardsForProblem,
  evaluateAnswer,
  getProblem,
  listProblems,
  tagLabel,
  type IdeAttempt,
  type IdeStage,
  type CodeLanguage,
  type Problem,
  type SynapseStore,
  type TextGrade,
} from "@synapse/core";
import type {
  PracticeAttemptResponse,
  PracticeEvaluateResponse,
  ProblemProgress,
  ProblemResponse,
  ProblemSolutionResponse,
  ProblemsResponse,
  TextStage,
} from "@/lib/types";
import { nativeReference } from "@synapse/core/content";
import { NATIVE_LANGUAGES } from "@synapse/core/judge";
import { forbidden, notFound } from "./http";
import { withLlmBudget } from "./llm-budget";
import { intervalLabel, ratingForGrade, tagRefs, toAttemptSummary, toClientProblem } from "./serialize";

const STAGE_ORDER: readonly IdeStage[] = ["invariant", "edgeCase", "code"];

export function requireProblem(idOrSlug: string): Problem {
  const problem = getProblem(idOrSlug);
  if (!problem) throw notFound(`Unknown problem "${idOrSlug}".`);
  return problem;
}

function progressFor(
  store: SynapseStore,
  userId: string,
  now: number,
  problem: Problem,
  attempts: readonly IdeAttempt[],
): ProblemProgress {
  const passed = new Set(attempts.filter((attempt) => attempt.passed).map((attempt) => attempt.stage));
  const card = store.getProgress(userId, problem.id);
  return {
    attempts: attempts.length,
    lastAttemptAt: attempts.reduce<number | null>((latest, a) => (latest === null || a.createdAt > latest ? a.createdAt : latest), null),
    stagesPassed: STAGE_ORDER.filter((stage) => passed.has(stage)),
    solved: passed.has("code"),
    struggled: attempts.some((attempt) => attempt.struggled),
    card: card
      ? { phase: card.phase, dueAt: card.dueAt, due: card.dueAt <= now, intervalLabel: intervalLabel(card.intervalDays) }
      : { phase: "new", dueAt: null, due: false, intervalLabel: null },
  };
}

export function listProblemSummaries(store: SynapseStore, userId: string, now: number): ProblemsResponse {
  const byProblem = new Map<string, IdeAttempt[]>();
  for (const attempt of store.listIdeAttempts(userId, undefined, 10_000)) {
    const list = byProblem.get(attempt.problemId) ?? [];
    list.push(attempt);
    byProblem.set(attempt.problemId, list);
  }
  return {
    problems: listProblems().map((problem) => ({
      id: problem.id,
      title: problem.title,
      leetcodeSlug: problem.leetcodeSlug,
      difficulty: problem.difficulty,
      tags: [...problem.tags],
      weakTags: [...problem.weakTags],
      progress: progressFor(store, userId, now, problem, byProblem.get(problem.id) ?? []),
    })),
  };
}

export function problemDetail(store: SynapseStore, userId: string, now: number, idOrSlug: string): ProblemResponse {
  const problem = requireProblem(idOrSlug);
  const attempts = store.listIdeAttempts(userId, problem.id, 500);
  const relatedCards = drillCardsForProblem(problem)
    .slice(0, 6)
    .map((card) => ({ id: card.id, title: card.title }));
  return {
    problem: toClientProblem(problem, relatedCards),
    progress: progressFor(store, userId, now, problem, attempts),
    recentAttempts: attempts.slice(0, 20).map(toAttemptSummary),
    solutionAvailable: attempts.some((attempt) => attempt.stage === "code"),
  };
}

/** Reference solutions unlock only after the code stage has been attempted (pass, fail, or give up). */
export function problemSolution(store: SynapseStore, userId: string, idOrSlug: string): ProblemSolutionResponse {
  const problem = requireProblem(idOrSlug);
  const attempted = store.listIdeAttempts(userId, problem.id, 500).some((attempt) => attempt.stage === "code");
  if (!attempted) throw forbidden("Attempt the code stage (or give up) before viewing the reference solution.");
  return {
    problemId: problem.id,
    reference: {
      ...problem.stages.code.reference,
      ...Object.fromEntries(NATIVE_LANGUAGES.flatMap((language) => {
        const code = nativeReference(problem.id, language);
        return code ? [[language, code]] : [];
      })),
    },
    invariantAnswer: problem.stages.invariant.answerKey,
    edgeCaseAnswer: problem.stages.edgeCase.answerKey,
  };
}

export async function evaluatePractice(
  input: { problemId: string; stage: TextStage; answer: string },
  now: number,
): Promise<PracticeEvaluateResponse> {
  const problem = requireProblem(input.problemId);
  const stage = problem.stages[input.stage];
  const evaluation = await withLlmBudget(now, (useLlm) =>
    evaluateAnswer(
      { question: stage.prompt, answerKey: stage.answerKey, keyPoints: stage.keyPoints, answer: input.answer },
      { useLlm },
    ),
  );
  return {
    problemId: problem.id,
    stage: input.stage,
    evaluation,
    answerKey: stage.answerKey,
    keyPoints: stage.keyPoints.map((point) => point.label),
    suggestedRating: ratingForGrade(evaluation.suggestedGrade),
  };
}

export interface AttemptInput {
  problemId: string;
  stage: IdeStage;
  grade?: TextGrade;
  passed?: boolean;
  failedRuns?: number;
  usedHint?: boolean;
  hintsUsed?: number;
  gaveUp?: boolean;
  durationMs?: number;
  language?: CodeLanguage;
  testsPassed?: number;
  testsTotal?: number;
  code?: string;
  answer?: string;
}

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

export function recordAttempt(store: SynapseStore, userId: string, now: number, input: AttemptInput): PracticeAttemptResponse {
  const problem = requireProblem(input.problemId);
  store.ensureUser(userId, now);
  const passed = input.passed ?? (input.grade !== undefined ? input.grade >= 3 : false);
  const hintsUsed = input.hintsUsed ?? (input.usedHint ? 1 : 0);
  const result = store.recordIdeAttempt({
    userId,
    problemId: problem.id,
    stage: input.stage,
    passed,
    now,
    language: input.language,
    testsPassed: input.testsPassed,
    testsTotal: input.testsTotal,
    hintsUsed,
    attemptNumber: (input.failedRuns ?? 0) + 1,
    gaveUp: input.gaveUp,
    durationMs: input.durationMs,
    code: input.code,
    answer: input.answer,
  });

  const flaggedTags = tagRefs(result.flaggedTags);
  const scheduled =
    result.drills.length > 0
      ? {
          cardIds: result.drills.map((drill) => drill.cardId),
          titles: result.drills.map((drill) => drill.title),
          dueAt: result.drillAt,
          dueLabel: result.drillLabel,
        }
      : null;
  // Mirrors the store's rule for grading the problem card when the code stage ends.
  const codeGrade: TextGrade = passed ? (result.struggled ? 3 : 5) : 1;
  const graded = result.graded
    ? { grade: codeGrade, nextLabel: result.graded.nextLabel, dueAt: result.graded.after.dueAt }
    : null;

  const sentences: string[] = [];
  if (scheduled) {
    const drills = scheduled.cardIds.length === 1 ? "a drill" : `${scheduled.cardIds.length} drills`;
    if (flaggedTags.length > 0) {
      const spots = flaggedTags.length === 1 ? "a weak spot" : "weak spots";
      sentences.push(`Flagged ${joinLabels(flaggedTags.map((t) => t.label))} as ${spots}.`);
      sentences.push(`Prepr will text you ${drills} ${scheduled.dueLabel ?? "soon"}.`);
    } else {
      // dueLabel reads "shortly", "in 1 min" or "tomorrow at 9 AM", so "will arrive …" fits every form.
      const queued = scheduled.cardIds.length === 1 ? "A drill is already queued and will arrive" : "Drills are already queued and will arrive";
      sentences.push(`${queued} ${scheduled.dueLabel ?? "soon"}.`);
    }
  } else if (result.struggled && problem.weakTags.length > 0) {
    sentences.push(`Noted: ${joinLabels(problem.weakTags.map(tagLabel))} needs more reps.`);
  }
  if (graded) sentences.push(`Problem card scheduled: next review in ${graded.nextLabel}.`);

  return {
    attemptId: result.attemptId,
    problemId: problem.id,
    stage: input.stage,
    passed,
    struggled: result.struggled,
    flaggedTags,
    scheduled,
    graded,
    message: sentences.length > 0 ? sentences.join(" ") : null,
  };
}
