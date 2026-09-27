import "server-only";

import { planProgress, STUDY_PLANS, titleFromSlug } from "@synapse/core/plans";
import type { SynapseStore } from "@synapse/core";
import type { PlansResponse } from "@/lib/types";
import { listProblemSummaries } from "./practice";

/** Study plans with per-category progress, ready to render (the phone has no plan data of its own). */
export function plansPayload(store: SynapseStore, userId: string, now: number): PlansResponse {
  const problems = listProblemSummaries(store, userId, now).problems;
  const bySlug = new Map(problems.map((problem) => [problem.leetcodeSlug, problem]));
  const catalog = new Set(bySlug.keys());
  const solved = new Set(problems.filter((problem) => problem.progress.solved).map((problem) => problem.leetcodeSlug));
  return {
    plans: STUDY_PLANS.map((plan) => ({
      id: plan.id,
      title: plan.title,
      description: plan.description,
      ...planProgress(plan, catalog, solved),
      categories: plan.categories.map((category) => ({
        name: category.name,
        ...planProgress({ ...plan, categories: [category] }, catalog, solved),
        items: category.slugs.map((slug) => {
          const problem = bySlug.get(slug);
          return {
            slug,
            title: problem?.title ?? titleFromSlug(slug),
            problemId: problem?.id ?? null,
            difficulty: problem?.difficulty ?? null,
            solved: solved.has(slug),
          };
        }),
      })),
    })),
  };
}
