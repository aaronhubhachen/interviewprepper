import { describe, expect, it } from "vitest";
import { listProblems } from "../src/content";
import { getStudyPlan, planProgress, planSlugs, STUDY_PLANS, titleFromSlug } from "../src/plans";

describe("study plans", () => {
  it("has the Blind 75 and NeetCode 150 with unique slugs", () => {
    expect(planSlugs(getStudyPlan("blind75")!)).toHaveLength(75);
    expect(planSlugs(getStudyPlan("neetcode150")!)).toHaveLength(150);
    for (const plan of STUDY_PLANS) expect(new Set(planSlugs(plan)).size).toBe(planSlugs(plan).length);
  });

  it("keeps the Blind 75 inside the NeetCode 150", () => {
    const neetcode = new Set(planSlugs(getStudyPlan("neetcode150")!));
    expect(planSlugs(getStudyPlan("blind75")!).filter((slug) => !neetcode.has(slug))).toEqual([]);
  });

  it("counts progress against the catalog", () => {
    const plan = getStudyPlan("blind75")!;
    const catalog = new Set(listProblems().map((problem) => problem.leetcodeSlug));
    const progress = planProgress(plan, catalog, new Set(["two-sum", "not-a-plan-problem"]));
    expect(progress).toMatchObject({ total: 75, solved: 1 });
    expect(progress.available).toBeGreaterThan(20);
  });

  it("titles slugs for problems Prepr doesn't have", () => {
    expect(titleFromSlug("two-sum-ii-input-array-is-sorted")).toBe("Two Sum II Input Array Is Sorted");
    expect(titleFromSlug("kth-smallest-element-in-a-bst")).toBe("Kth Smallest Element in a BST");
    expect(titleFromSlug("powx-n")).toBe("Pow(x, n)");
  });
});
