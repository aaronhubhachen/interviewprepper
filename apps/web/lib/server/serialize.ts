import "server-only";

import {
  formatInterval,
  humanizeDuration,
  tagLabel,
  type IdeAttempt,
  type Problem,
  type Rating,
  type ReviewCard,
  type ReviewState,
  type SynapseStore,
  type Tag,
  type TextGrade,
} from "@synapse/core";
import type {
  ClientCard,
  ClientProblem,
  ClientReviewState,
  IdeAttemptSummary,
  TagRef,
  TimeScale,
} from "@/lib/types";

export function tagRefs(tags: readonly Tag[]): TagRef[] {
  return tags.map((tag) => ({ tag, label: tagLabel(tag) }));
}

const GRADE_RATING: Record<TextGrade, Rating> = { 5: "love", 3: "like", 1: "dislike" };

export function ratingForGrade(grade: TextGrade): Rating {
  return GRADE_RATING[grade];
}

/** Strips the answer key, key points, and explanation. */
export function toClientCard(card: ReviewCard): ClientCard {
  return {
    id: card.id,
    kind: card.kind,
    title: card.title,
    prompt: card.prompt,
    hint: card.hint,
    tags: [...card.tags],
    difficulty: card.difficulty,
    ...(card.relatedProblem ? { relatedProblem: { ...card.relatedProblem } } : {}),
    ...(card.problemId ? { problemId: card.problemId } : {}),
  };
}

export function toClientState(state: ReviewState): ClientReviewState {
  return {
    phase: state.phase,
    repetition: state.repetition,
    intervalDays: state.intervalDays,
    easeFactor: state.easeFactor,
    dueAt: state.dueAt,
    lapses: state.lapses,
    lastReviewedAt: state.lastReviewedAt,
  };
}

/**
 * Strips reference solutions and stage answer keys / key points. Hidden tests
 * keep args + expected because the judge runs in the browser.
 */
export function toClientProblem(problem: Problem, relatedCards: { id: string; title: string }[]): ClientProblem {
  const { invariant, edgeCase, code } = problem.stages;
  return {
    id: problem.id,
    title: problem.title,
    leetcodeSlug: problem.leetcodeSlug,
    difficulty: problem.difficulty,
    tags: [...problem.tags],
    statement: problem.statement,
    examples: problem.examples.map((example) => ({ ...example })),
    constraints: [...problem.constraints],
    stages: {
      invariant: { prompt: invariant.prompt, hint: invariant.hint },
      edgeCase: { prompt: edgeCase.prompt, hint: edgeCase.hint },
      code: {
        functionName: code.functionName,
        params: [...code.params],
        starter: { ...code.starter },
        tests: code.tests.map((test) => ({ args: test.args, expected: test.expected, ...(test.hidden ? { hidden: true } : {}) })),
        compare: code.compare,
      },
    },
    weakTags: tagRefs(problem.weakTags),
    relatedCards,
  };
}

export function toAttemptSummary(attempt: IdeAttempt): IdeAttemptSummary {
  return {
    id: attempt.id,
    stage: attempt.stage,
    passed: attempt.passed,
    struggled: attempt.struggled,
    gaveUp: attempt.gaveUp,
    language: attempt.language,
    testsPassed: attempt.testsPassed,
    testsTotal: attempt.testsTotal,
    createdAt: attempt.createdAt,
  };
}

/** "1 SRS day = 1 min" at demo scale, "Real time" at 86400000. */
export function timeScale(store: SynapseStore): TimeScale {
  const { dayMs, relearnMs } = store.scheduler;
  const description = dayMs === 86_400_000 ? "Real time" : `1 SRS day = ${humanizeDuration(dayMs)}`;
  return { dayMs, relearnMs, demoScale: store.demoScale, timezone: store.policy.timezone, description };
}

/** Interval label in SRS units for a stored interval in days ("6d"); null for 0. */
export function intervalLabel(intervalDays: number): string | null {
  return intervalDays > 0 ? formatInterval(intervalDays) : null;
}
