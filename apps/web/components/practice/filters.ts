/** Problem-list filtering, URL sync, and the "Up next" pick (pure). */
import { isTag, tagLabel, type ProblemDifficulty, type Tag } from "@synapse/core/content";
import type { ProblemSummary } from "@/lib/types";

export interface ProblemFilters {
  tag: Tag | null;
  difficulty: ProblemDifficulty | null;
  /** Only problems touching one of the user's current weak tags. */
  weakOnly: boolean;
  query: string;
}

export const EMPTY_FILTERS: ProblemFilters = { tag: null, difficulty: null, weakOnly: false, query: "" };

export const DIFFICULTIES: readonly ProblemDifficulty[] = ["easy", "medium", "hard"];

const DIFFICULTY_SET = new Set<string>(DIFFICULTIES);

type SearchParamRecord = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseFilters(params: SearchParamRecord): ProblemFilters {
  const tag = first(params.tag);
  const difficulty = first(params.difficulty);
  const weak = first(params.weak);
  return {
    tag: tag && isTag(tag) ? tag : null,
    difficulty: difficulty && DIFFICULTY_SET.has(difficulty) ? (difficulty as ProblemDifficulty) : null,
    weakOnly: weak === "1" || weak === "true",
    query: (first(params.q) ?? "").trim().slice(0, 80),
  };
}

export function filtersToQuery(filters: ProblemFilters): string {
  const params = new URLSearchParams();
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.difficulty) params.set("difficulty", filters.difficulty);
  if (filters.weakOnly) params.set("weak", "1");
  if (filters.query.trim()) params.set("q", filters.query.trim());
  return params.toString();
}

export function hasActiveFilters(filters: ProblemFilters): boolean {
  return Boolean(filters.tag || filters.difficulty || filters.weakOnly || filters.query.trim());
}

/** The problem's tags (and struggle-flag tags) that are currently weak for the user. */
export function weakHits(problem: Pick<ProblemSummary, "tags" | "weakTags">, weak: ReadonlySet<Tag>): Tag[] {
  const hits = new Set<Tag>();
  for (const tag of [...problem.weakTags, ...problem.tags]) if (weak.has(tag)) hits.add(tag);
  return [...hits];
}

function matchesQuery(problem: ProblemSummary, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [problem.title, problem.leetcodeSlug, ...problem.tags.map(tagLabel), ...problem.tags].join(" ").toLowerCase();
  return needle.split(/\s+/).every((word) => haystack.includes(word));
}

export function filterProblems(problems: readonly ProblemSummary[], filters: ProblemFilters, weak: ReadonlySet<Tag>): ProblemSummary[] {
  return problems.filter(
    (problem) =>
      (!filters.difficulty || problem.difficulty === filters.difficulty) &&
      (!filters.tag || problem.tags.includes(filters.tag) || problem.weakTags.includes(filters.tag)) &&
      (!filters.weakOnly || weakHits(problem, weak).length > 0) &&
      matchesQuery(problem, filters.query),
  );
}

export type ProblemStatus = "due" | "solved" | "in-progress" | "new";

export function problemStatus(problem: ProblemSummary): ProblemStatus {
  if (problem.progress.card.due) return "due";
  if (problem.progress.solved) return "solved";
  if (problem.progress.attempts > 0) return "in-progress";
  return "new";
}

export type RecommendReason = "due" | "weak" | "new" | "review";

export interface Recommendation {
  problem: ProblemSummary;
  reason: RecommendReason;
  weakHits: Tag[];
}

/** Due problem cards first, then unsolved problems on a weak tag, then fresh ones, then the soonest review. */
export function recommendProblem(problems: readonly ProblemSummary[], weak: ReadonlySet<Tag>): Recommendation | null {
  const byDue = (a: ProblemSummary, b: ProblemSummary) => (a.progress.card.dueAt ?? Infinity) - (b.progress.card.dueAt ?? Infinity);
  const due = problems.filter((p) => p.progress.card.due).sort(byDue)[0];
  if (due) return { problem: due, reason: "due", weakHits: weakHits(due, weak) };
  const weakPick = problems.find((p) => !p.progress.solved && weakHits(p, weak).length > 0);
  if (weakPick) return { problem: weakPick, reason: "weak", weakHits: weakHits(weakPick, weak) };
  const fresh = problems.find((p) => p.progress.attempts === 0) ?? problems.find((p) => !p.progress.solved);
  if (fresh) return { problem: fresh, reason: "new", weakHits: weakHits(fresh, weak) };
  const review = [...problems].sort(byDue)[0];
  return review ? { problem: review, reason: "review", weakHits: weakHits(review, weak) } : null;
}

/** Tags that appear on at least one problem, in canonical order, with counts. */
export function tagOptions(problems: readonly ProblemSummary[], order: readonly Tag[]): Array<{ tag: Tag; label: string; count: number }> {
  const counts = new Map<Tag, number>();
  for (const problem of problems) {
    for (const tag of new Set([...problem.tags, ...problem.weakTags])) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return order.filter((tag) => counts.has(tag)).map((tag) => ({ tag, label: tagLabel(tag), count: counts.get(tag)! }));
}
