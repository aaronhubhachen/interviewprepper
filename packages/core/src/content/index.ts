import { BEHAVIORAL } from "./behavioral";
import { MICROCARDS_A } from "./microcards-a";
import { MICROCARDS_B } from "./microcards-b";
import { PROBLEMS as PROBLEMS_A } from "./problems";
import { PROBLEMS_B } from "./problems-b";
import { PROBLEMS_C } from "./problems-c";
import { TAG_IDS } from "./types";
import type {
  BehavioralQuestion,
  CardDifficulty,
  MicroCard,
  Problem,
  ProblemDifficulty,
  ReviewCard,
  Tag,
} from "./types";

export * from "./types";

const MICROCARDS: readonly MicroCard[] = [...MICROCARDS_A, ...MICROCARDS_B];
const PROBLEMS: readonly Problem[] = [...PROBLEMS_A, ...PROBLEMS_B, ...PROBLEMS_C];

const PROBLEM_DIFFICULTY: Record<ProblemDifficulty, CardDifficulty> = { easy: 1, medium: 2, hard: 3 };

function microToCard(card: MicroCard): ReviewCard {
  return { ...card, kind: "micro" };
}

/** Problems are reviewed via their Stage 1 invariant prompt; the explanation is the edge-case trap. */
function problemToCard(problem: Problem): ReviewCard {
  const { invariant, edgeCase } = problem.stages;
  return {
    id: problem.id,
    kind: "problem",
    title: problem.title,
    prompt: invariant.prompt,
    answerKey: invariant.answerKey,
    keyPoints: invariant.keyPoints,
    hint: invariant.hint,
    explanation: `${invariant.answerKey} Watch the trap: ${edgeCase.answerKey}`,
    tags: problem.tags,
    difficulty: PROBLEM_DIFFICULTY[problem.difficulty],
    relatedProblem: { title: problem.title, leetcodeSlug: problem.leetcodeSlug },
    problemId: problem.id,
  };
}

const CARDS: readonly ReviewCard[] = [...MICROCARDS.map(microToCard), ...PROBLEMS.map(problemToCard)];

const TAG_ORDER = new Map<Tag, number>(TAG_IDS.map((tag, index) => [tag, index]));

const cardById = new Map(CARDS.map((card) => [card.id, card]));
const microById = new Map(MICROCARDS.map((card) => [card.id, card]));
const problemById = new Map(PROBLEMS.map((problem) => [problem.id, problem]));
const problemBySlug = new Map(PROBLEMS.map((problem) => [problem.leetcodeSlug, problem]));
const behavioralById = new Map(BEHAVIORAL.map((question) => [question.id, question]));

/** Every reviewable card (micro-cards first, then problems), in stable registry order. */
export function allCards(): readonly ReviewCard[] {
  return CARDS;
}

export function getCard(id: string): ReviewCard | undefined {
  return cardById.get(id);
}

export function cardsByTag(tag: Tag): ReviewCard[] {
  return CARDS.filter((card) => card.tags.includes(tag));
}

export function listMicroCards(): readonly MicroCard[] {
  return MICROCARDS;
}

export function getMicroCard(id: string): MicroCard | undefined {
  return microById.get(id);
}

export function listProblems(): readonly Problem[] {
  return PROBLEMS;
}

/** Looks up by id ("p-...") or LeetCode slug. */
export function getProblem(idOrSlug: string): Problem | undefined {
  return problemById.get(idOrSlug) ?? problemBySlug.get(idOrSlug);
}

export function listBehavioral(): readonly BehavioralQuestion[] {
  return BEHAVIORAL;
}

export function getBehavioral(id: string): BehavioralQuestion | undefined {
  return behavioralById.get(id);
}

/**
 * Micro-cards to drill after struggling with a problem: its explicit
 * relatedCardIds first, then micro-cards sharing any of its weakTags.
 */
export function drillCardsForProblem(problem: Problem): ReviewCard[] {
  const explicit = problem.relatedCardIds
    .map((id) => cardById.get(id))
    .filter((card): card is ReviewCard => card?.kind === "micro");
  const seen = new Set(explicit.map((card) => card.id));
  const byWeakTag = CARDS.filter(
    (card) =>
      card.kind === "micro" && !seen.has(card.id) && card.tags.some((tag) => problem.weakTags.includes(tag)),
  );
  return [...explicit, ...byWeakTag];
}

/** Tags that have at least one reviewable card, in canonical TAGS order. */
export function tagsWithContent(): Tag[] {
  const present = new Set(CARDS.flatMap((card) => card.tags));
  return [...present].sort((a, b) => TAG_ORDER.get(a)! - TAG_ORDER.get(b)!);
}

